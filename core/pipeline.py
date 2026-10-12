"""End-to-end detection pipeline."""
from core.agents.social_agent import SocialAgent
from core.agents.app_agent import AppAgent
from core.agents.lookalike_agent import LookalikeAgent
from core.agents.scoring_agent import ScoringAgent


class DetectionPipeline:
    def __init__(self, brand_profile):
        self.brand = brand_profile
        self.social = SocialAgent(brand_profile)
        self.app = AppAgent(brand_profile)
        self.lookalike = LookalikeAgent(brand_profile)
        self.scoring = ScoringAgent()

    def run(self, sources: dict) -> dict:
        results = {}
        if sources.get("social_profiles"):
            results["social"] = self.social.detect(sources["social_profiles"])
        if sources.get("app_listings"):
            results["apps"] = self.app.detect(sources["app_listings"])
        if sources.get("run_lookalike", True):
            results["domains"] = self.lookalike.detect()
        return self.scoring.rank_all(results)
