"""Social media monitoring agent — calls the trained social model."""
import os
import joblib
import json
import numpy as np
from core.agents.base_agent import BaseAgent, AgentResult
from core.models.schemas import Detection
from core.detection.similarity import name_similarity


MODEL_PATH = os.getenv("SOCIAL_MODEL_PATH", "models/social_model_v2.pkl")
FEATURES_PATH = os.getenv("SOCIAL_FEATURES_PATH", "models/social_features_v2.json")

LABEL_MAP = {0: "Legit", 1: "Monitor", 2: "Fake"}


class SocialAgent(BaseAgent):
    def __init__(self, brand_profile):
        super().__init__(brand_profile)
        self.model = joblib.load(MODEL_PATH)
        with open(FEATURES_PATH) as f:
            self.features = json.load(f)
        self.official_handles = {
            acc["handle"].lower().strip("@")
            for acc in brand_profile.official_social_accounts
            if isinstance(acc, dict) and "handle" in acc
        }

    def detect(self, profiles: list) -> AgentResult:
        detections = []
        for p in profiles:
            handle = str(p.get("handle", "")).lower().strip("@")

            # Official exclusion FIRST
            if handle in self.official_handles:
                continue

            # Build feature vector
            try:
                X = np.array([[float(p.get(f, 0) or 0) for f in self.features]])
            except (ValueError, KeyError):
                continue

            proba = self.model.predict_proba(X)[0]
            pred = int(np.argmax(proba))
            label = LABEL_MAP[pred]
            confidence = float(proba[pred])

            # Rule-based signal
            sim = name_similarity(self.brand.brand_name, handle)

            # Only flag Monitor or Fake with meaningful confidence
            if label == "Legit" and confidence > 0.7:
                continue

            evidence = [
                f"Model classified as {label} (confidence {confidence:.2f})",
                f"Handle similarity to brand: {sim:.2f}",
            ]
            if p.get("scam_dm_reports", 0) > 0:
                evidence.append(f"{p['scam_dm_reports']} scam DM reports")
            if p.get("giveaway_post_ratio", 0) > 0.5:
                evidence.append(f"Giveaway ratio {p['giveaway_post_ratio']:.2f}")

            det = Detection(
                source="social",
                brand_name=self.brand.brand_name,
                identifier=p.get("handle", ""),
                model_score=confidence,
                rule_score=sim,
                is_official=False,
                evidence=evidence,
                raw_data=p,
            )
            detections.append(det)

        return AgentResult(
            detections=detections,
            summary=f"Found {len(detections)} suspicious social profiles",
        )
