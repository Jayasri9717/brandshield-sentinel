
import base64
import binascii
import hashlib
import hmac
import os
import re
import secrets
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.detection_api import router as detection_router
from core.storage.database import (
    create_auth_session,
    create_user,
    delete_auth_session,
    get_brand_profile,
    get_user_by_email,
    get_user_for_session,
    init_db,
    save_brand_profile,
)

PASSWORD_HASH_ITERATIONS = 310_000
SESSION_DURATION_SECONDS = 12 * 60 * 60
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
bearer_scheme = HTTPBearer(auto_error=False)


class RegisterPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str = Field(min_length=1, max_length=80)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=12, max_length=256)

    @field_validator("display_name", "email")
    @classmethod
    def normalize_registration_fields(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field cannot be blank.")
        return normalized

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not EMAIL_PATTERN.fullmatch(normalized):
            raise ValueError("Enter a valid email address.")
        return normalized


class LoginPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=256)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not EMAIL_PATTERN.fullmatch(normalized):
            raise ValueError("Enter a valid email address.")
        return normalized


class AuthenticatedUser(BaseModel):
    id: str
    email: str
    display_name: str


class SessionResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthenticatedUser


def _hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_HASH_ITERATIONS)
    return f"pbkdf2_sha256${PASSWORD_HASH_ITERATIONS}${salt.hex()}${digest.hex()}"


def _verify_password(password: str, encoded_hash: str) -> bool:
    try:
        algorithm, iterations, salt_hex, expected_hex = encoded_hash.split("$", maxsplit=3)
        if algorithm != "pbkdf2_sha256":
            return False
        actual = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            bytes.fromhex(salt_hex),
            int(iterations),
        ).hex()
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(actual, expected_hex)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _issue_session(user: dict[str, str]) -> SessionResponse:
    token = secrets.token_urlsafe(32)
    create_auth_session(_token_hash(token), user["id"], time.time() + SESSION_DURATION_SECONDS)
    return SessionResponse(
        access_token=token,
        user=AuthenticatedUser(id=user["id"], email=user["email"], display_name=user["display_name"]),
    )


_DUMMY_PASSWORD_HASH = _hash_password("unusable-dummy-password")


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, str]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in to continue.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = get_user_for_session(_token_hash(credentials.credentials), time.time())
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired. Sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


class OfficialDomain(BaseModel):
    model_config = ConfigDict(extra="forbid")

    domain: str = Field(min_length=3, max_length=253)
    note: str = Field(max_length=160)
    verified: bool

    @field_validator("domain")
    @classmethod
    def validate_domain(cls, value: str) -> str:
        normalized = value.strip().lower().rstrip(".")
        label = r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?"
        if not re.fullmatch(rf"{label}(?:\.{label})+", normalized):
            raise ValueError("Enter a valid domain name.")
        return normalized


class OfficialAccount(BaseModel):
    model_config = ConfigDict(extra="forbid")

    platform: str = Field(min_length=1, max_length=40)
    identifier: str = Field(min_length=1, max_length=500)
    verified: bool

    @field_validator("platform", "identifier")
    @classmethod
    def reject_blank_account_values(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field cannot be blank.")
        return normalized


class LogoAsset(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    name: str = Field(min_length=1, max_length=255)
    data_url: str = Field(alias="dataUrl")

    @field_validator("data_url")
    @classmethod
    def validate_data_url(cls, value: str) -> str:
        header, separator, encoded_data = value.partition(",")
        allowed_headers = {"data:image/png;base64", "data:image/jpeg;base64", "data:image/webp;base64"}
        if not separator or header not in allowed_headers:
            raise ValueError("Logo must be a PNG, JPEG, or WebP data URL.")
        try:
            image_data = base64.b64decode(encoded_data, validate=True)
        except (binascii.Error, ValueError) as error:
            raise ValueError("Logo data is not valid base64.") from error
        if not image_data or len(image_data) > 1024 * 1024:
            raise ValueError("Logo file must be between 1 byte and 1 MB.")
        return value


class BrandProfilePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=120)
    industry: str = Field(min_length=1, max_length=120)
    region: str = Field(min_length=1, max_length=120)
    description: str = Field(max_length=2000)
    domains: list[OfficialDomain] = Field(default_factory=list, max_length=100)
    accounts: list[OfficialAccount] = Field(default_factory=list, max_length=100)
    logoAsset: LogoAsset | None = None

    @field_validator("name", "industry", "region")
    @classmethod
    def reject_blank_values(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field cannot be blank.")
        return normalized


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="BrandShield Sentinel API",
    description="Detect and investigate potential brand impersonation.",
    version="1.0.0",
    lifespan=lifespan,
)
app.include_router(detection_router)

allowed_origins = [
    origin.strip()
    for origin in os.environ.get(
        "BRANDSHIELD_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "PUT", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/")
def home():
    return {
        "message": "BrandShield Sentinel API is running!",
        "status": "healthy",
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/auth/register", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterPayload):
    user = {
        "id": str(uuid.uuid4()),
        "email": payload.email,
        "display_name": payload.display_name,
    }
    if not create_user(user["id"], user["email"], user["display_name"], _hash_password(payload.password)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with that email already exists.")
    return _issue_session(user)


@app.post("/api/auth/login", response_model=SessionResponse)
def login(payload: LoginPayload):
    user = get_user_by_email(payload.email)
    encoded_hash = user["password_hash"] if user is not None else _DUMMY_PASSWORD_HASH
    password_is_valid = _verify_password(payload.password, encoded_hash)
    if user is None or not password_is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _issue_session(user)


@app.get("/api/auth/me", response_model=AuthenticatedUser)
def read_current_user(user: dict[str, str] = Depends(get_current_user)):
    return user


@app.post("/api/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    _: dict[str, str] = Depends(get_current_user),
):
    delete_auth_session(_token_hash(credentials.credentials))


@app.get("/api/brand-profile", response_model=BrandProfilePayload | None)
def read_brand_profile(user: dict[str, str] = Depends(get_current_user)):
    payload = get_brand_profile(user["id"])
    return BrandProfilePayload.model_validate(payload) if payload is not None else None


@app.put("/api/brand-profile", response_model=BrandProfilePayload)
def update_brand_profile(payload: BrandProfilePayload, user: dict[str, str] = Depends(get_current_user)):
    return save_brand_profile(user["id"], payload.model_dump(by_alias=True))
