"""FastAPI backend for BrandShield Sentinel."""
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import pandas as pd
import io
import json
import joblib
import os
from core.models.schemas import BrandProfile
from core.pipeline import DetectionPipeline
from core.data.loader import validate_social_csv, validate_app_csv, normalize_handles
from core.storage.database import init_db, save_brand, save_detections


app = FastAPI(title="BrandShield Sentinel", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()


class BrandIn(BaseModel):
    brand_name: str
    official_social_accounts: List[dict] = []
    official_app_ids: List[dict] = []


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "social_model": os.path.exists("models/social_model_v2.pkl"),
        "app_model": os.path.exists("models/app_model.pkl"),
    }


@app.post("/api/brand-profile")
def create_brand(payload: BrandIn):
    brand = BrandProfile(
        brand_name=payload.brand_name,
        official_social_accounts=payload.official_social_accounts,
        official_app_ids=payload.official_app_ids,
        brand_keywords=[payload.brand_name.lower()],
    )
    save_brand(brand)
    return {"id": brand.id, "brand_name": brand.brand_name}


@app.post("/api/social/detect")
async def detect_social(brand_name: str, file: UploadFile = File(...)):
    raw = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(raw))
    except Exception as e:
        raise HTTPException(400, f"Could not parse CSV: {e}")

    ok, msg = validate_social_csv(df)
    if not ok:
        raise HTTPException(400, msg)

    df = normalize_handles(df)
    brand = BrandProfile(
        brand_name=brand_name,
        official_social_accounts=[],
        official_app_ids=[],
        brand_keywords=[brand_name.lower()],
    )
    pipeline = DetectionPipeline(brand)
    results = pipeline.run({"social_profiles": df.to_dict("records")})

    ranked = results.get("ranked", [])
    return {
        "total": len(ranked),
        "detections": [d.to_dict() for d in ranked],
    }


@app.post("/api/app/detect")
async def detect_apps(brand_name: str, file: UploadFile = File(...)):
    raw = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(raw))
    except Exception as e:
        raise HTTPException(400, f"Could not parse CSV: {e}")

    ok, msg = validate_app_csv(df)
    if not ok:
        raise HTTPException(400, msg)

    brand = BrandProfile(
        brand_name=brand_name,
        official_social_accounts=[],
        official_app_ids=[],
        brand_keywords=[brand_name.lower()],
    )
    pipeline = DetectionPipeline(brand)
    results = pipeline.run({"app_listings": df.to_dict("records")})

    ranked = results.get("ranked", [])
    return {
        "total": len(ranked),
        "detections": [d.to_dict() for d in ranked],
    }


@app.get("/api/dashboard/stats")
def dashboard():
    from core.storage.database import get_conn
    conn = get_conn()
    rows = conn.execute("SELECT source, risk_score FROM detections").fetchall()
    conn.close()

    total = len(rows)
    high_risk = sum(1 for r in rows if r["risk_score"] >= 0.6)
    by_source = {}
    for r in rows:
        by_source[r["source"]] = by_source.get(r["source"], 0) + 1

    return {
        "total_threats": total,
        "high_risk_count": high_risk,
        "by_source": by_source,
    }
