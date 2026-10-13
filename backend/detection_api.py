"""API endpoints for brand profiles and local detection analysis."""

import re
import uuid
from difflib import SequenceMatcher
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator

from core.storage.database import (
    create_api_brand_profile,
    get_api_brand_profile,
    get_dashboard_statistics,
    save_detection_run,
)

router = APIRouter(prefix="/api")


class BrandProfileInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    brand_name: str = Field(min_length=1, max_length=120)
    industry: str = Field(default="", max_length=120)
    region: str = Field(default="", max_length=120)
    description: str = Field(default="", max_length=2000)
    logo_base64: str | None = None
    verified_domains: list[str] = Field(default_factory=list, max_length=100)
    social_accounts: list[str] = Field(default_factory=list, max_length=100)
    app_ids: list[str] = Field(default_factory=list, max_length=100)

    @field_validator("brand_name")
    @classmethod
    def validate_brand_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Brand name cannot be blank.")
        return normalized


class SocialProfileInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    platform: str = Field(min_length=1, max_length=40)
    handle: str = Field(min_length=1, max_length=500)
    display_name: str = Field(default="", max_length=200)
    bio: str = Field(default="", max_length=2000)
    profile_image_url: str | None = Field(default=None, max_length=2000)


class SocialDetectionInput(BaseModel):
    brand_profile_id: str
    profiles: list[SocialProfileInput] = Field(max_length=500)


class AppInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    app_name: str = Field(min_length=1, max_length=200)
    publisher: str = Field(default="", max_length=200)
    package_id: str = Field(min_length=1, max_length=500)
    source: str = Field(default="", max_length=100)
    description: str = Field(default="", max_length=4000)
    icon_url: str | None = Field(default=None, max_length=2000)


class AppDetectionInput(BaseModel):
    brand_profile_id: str
    apps: list[AppInput] = Field(max_length=500)


class LookalikeDetectionInput(BaseModel):
    brand_profile_id: str
    candidates: list[str] = Field(max_length=500)


def _require_profile(profile_id: str) -> dict[str, Any]:
    profile = get_api_brand_profile(profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Brand profile not found. Save a profile before running detection.")
    return profile


def _similarity(left: str, right: str) -> float:
    left_normalized = re.sub(r"[^a-z0-9]", "", left.casefold())
    right_normalized = re.sub(r"[^a-z0-9]", "", right.casefold())
    if not left_normalized or not right_normalized:
        return 0.0
    return round(SequenceMatcher(None, left_normalized, right_normalized).ratio(), 4)


def _detection_response(detections: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "detections": detections,
        "total": len(detections),
        "high_risk_count": sum(item["risk_score"] >= 0.7 for item in detections),
    }


def _finish_detection(profile_id: str, kind: str, detections: list[dict[str, Any]]) -> dict[str, Any]:
    response = _detection_response(detections)
    save_detection_run(profile_id, kind, response)
    return response


@router.post("/brand-profile", status_code=201)
def create_brand_profile(payload: BrandProfileInput) -> dict[str, Any]:
    return create_api_brand_profile(str(uuid.uuid4()), payload.model_dump())


@router.get("/brand-profile/{profile_id}")
def read_brand_profile(profile_id: str) -> dict[str, Any]:
    profile = get_api_brand_profile(profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Brand profile not found.")
    return profile


@router.post("/social/detect")
def detect_social_profiles(payload: SocialDetectionInput) -> dict[str, Any]:
    profile = _require_profile(payload.brand_profile_id)
    official_accounts = {account.casefold().strip() for account in profile["social_accounts"]}
    detections: list[dict[str, Any]] = []
    for candidate in payload.profiles:
        similarity = max(
            _similarity(profile["brand_name"], candidate.display_name),
            _similarity(profile["brand_name"], candidate.handle),
        )
        is_official = candidate.handle.casefold().strip() in official_accounts
        risk = 0.0 if is_official else similarity
        evidence = (
            "This handle is listed as an official account."
            if is_official
            else f"Profile name and handle similarity to {profile['brand_name']} is {similarity:.0%}."
        )
        detections.append(
            {
                "platform": candidate.platform,
                "profile_handle": candidate.handle,
                "display_name": candidate.display_name,
                "bio": candidate.bio,
                "similarity_score": similarity,
                "risk_score": risk,
                "evidence": evidence,
                "is_official": is_official,
            }
        )
    return _finish_detection(payload.brand_profile_id, "social", detections)


@router.post("/app/detect")
def detect_apps(payload: AppDetectionInput) -> dict[str, Any]:
    profile = _require_profile(payload.brand_profile_id)
    official_ids = {item.casefold().strip() for item in profile["app_ids"]}
    detections: list[dict[str, Any]] = []
    for candidate in payload.apps:
        name_similarity = _similarity(profile["brand_name"], candidate.app_name)
        description_similarity = _similarity(profile["brand_name"], candidate.description)
        is_official = candidate.package_id.casefold().strip() in official_ids
        risk = 0.0 if is_official else max(name_similarity, description_similarity)
        detections.append(
            {
                "app_name": candidate.app_name,
                "publisher": candidate.publisher,
                "package_id": candidate.package_id,
                "source": candidate.source,
                "description_similarity": description_similarity,
                "logo_similarity": 0.0,
                "risk_score": risk,
                "evidence": (
                    "This package ID is listed as an official app."
                    if is_official
                    else f"App name similarity to {profile['brand_name']} is {name_similarity:.0%}."
                ),
                "is_official": is_official,
            }
        )
    return _finish_detection(payload.brand_profile_id, "apps", detections)


@router.post("/lookalike/detect")
def detect_lookalike_domains(payload: LookalikeDetectionInput) -> dict[str, Any]:
    profile = _require_profile(payload.brand_profile_id)
    official_domains = {domain.casefold().strip() for domain in profile["verified_domains"]}
    brand_label = re.sub(r"[^a-z0-9]", "", profile["brand_name"].casefold())
    detections: list[dict[str, Any]] = []
    for candidate_value in payload.candidates:
        domain = candidate_value.strip().casefold().rstrip(".")
        if not domain or len(domain) > 253 or not re.fullmatch(r"[a-z0-9.-]+", domain):
            continue
        is_official = domain in official_domains
        domain_label = domain.split(".", maxsplit=1)[0]
        similarity = _similarity(brand_label, domain_label)
        homoglyph = bool(re.search(r"[0-9]", domain_label))
        variation_type = (
            "Official domain"
            if is_official
            else "Homoglyph"
            if homoglyph
            else "Typosquat"
            if similarity >= 0.65
            else "Keyword or TLD variation"
        )
        risk = 0.0 if is_official else similarity
        detections.append(
            {
                "domain": domain,
                "variation_type": variation_type,
                "dns_resolves": None,
                "http_status": None,
                "brand_on_page": None,
                "homoglyph": homoglyph,
                "risk_score": risk,
                "evidence": (
                    "This domain is listed as an official domain."
                    if is_official
                    else f"Domain label similarity to {profile['brand_name']} is {similarity:.0%}. DNS and page-content checks are unavailable."
                ),
                "is_official": is_official,
            }
        )
    return _finish_detection(payload.brand_profile_id, "domains", detections)


@router.get("/dashboard/stats")
def dashboard_stats() -> dict[str, Any]:
    return get_dashboard_statistics()
