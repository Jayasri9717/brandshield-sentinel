"""App store monitoring agent — calls the trained app model."""
import os
import joblib
import json
import numpy as np
from core.agents.base_agent import BaseAgent, AgentResult
from core.models.schemas import Detection


MODEL_PATH = os.getenv("APP_MODEL_PATH", "models/app_model.pkl")
FEATURES_PATH = os.getenv("APP_FEATURES_PATH", "models/app_features.json")


class AppAgent(BaseAgent):
    def __init__(self, brand_profile):
        super().__init__(brand_profile)
        self.model = joblib.load(MODEL_PATH)
        with open(FEATURES_PATH) as f:
            self.features = json.load(f)
        self.official_ids = {
            app["package_id"] for app in brand_profile.official_app_ids
            if isinstance(app, dict) and "package_id" in app
        }

    def detect(self, apps: list) -> AgentResult:
        detections = []
        for a in apps:
            package_id = a.get("package_id", "")

            if package_id in self.official_ids:
                continue

            try:
                X = np.array([[float(a.get(f, 0) or 0) for f in self.features]])
            except (ValueError, KeyError):
                continue

            proba = self.model.predict_proba(X)[0]
            pred = int(np.argmax(proba))
            label = "Fake" if pred == 1 else "Legit"
            confidence = float(proba[pred])

            if label == "Legit" and confidence > 0.7:
                continue

            evidence = [
                f"Model classified as {label} (confidence {confidence:.2f})",
                f"Name similarity: {a.get('name_levenshtein', 0):.2f}",
                f"Icon similarity: {a.get('icon_embedding_cosine', 0):.2f}",
            ]
            if a.get("dev_name_similarity", 1.0) < 0.5:
                evidence.append("Developer name does not match official")

            det = Detection(
                source="app",
                brand_name=self.brand.brand_name,
                identifier=a.get("app_title", package_id),
                model_score=confidence,
                rule_score=a.get("name_levenshtein", 0.0),
                evidence=evidence,
                raw_data=a,
            )
            detections.append(det)

        return AgentResult(
            detections=detections,
            summary=f"Found {len(detections)} suspicious apps",
        )
