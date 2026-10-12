"""Merge detections, apply official exclusion, rank by risk."""
from core.models.schemas import risk_level_from_score


WEIGHTS = {
    "model_score": 0.40,
    "rule_score": 0.20,
    "evidence_count": 0.10,
}


class ScoringAgent:
    def rank_all(self, results: dict) -> dict:
        all_dets = []
        for key, val in results.items():
            if hasattr(val, "detections"):
                all_dets.extend(val.detections)

        # Official exclusion
        all_dets = [d for d in all_dets if not d.is_official]

        # Score
        for d in all_dets:
            score = (
                WEIGHTS["model_score"] * d.model_score
                + WEIGHTS["rule_score"] * d.rule_score
                + WEIGHTS["evidence_count"] * min(len(d.evidence) / 5.0, 1.0)
            )
            d.risk_score = round(min(score, 1.0), 3)
            d.risk_level = risk_level_from_score(d.risk_score)

        all_dets.sort(key=lambda x: x.risk_score, reverse=True)
        results["ranked"] = all_dets
        return results
