"""Shared data schemas for all agents and storage."""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from enum import Enum
import uuid


class Platform(str, Enum):
    TWITTER = "twitter"
    INSTAGRAM = "instagram"
    TELEGRAM = "telegram"
    FACEBOOK = "facebook"
    TIKTOK = "tiktok"
    LINKEDIN = "linkedin"
    YOUTUBE = "youtube"
    DISCORD = "discord"
    UNKNOWN = "unknown"


class DetectionType(str, Enum):
    SOCIAL_PROFILE = "social_profile"
    APP_LISTING = "app_listing"
    DOMAIN = "domain"


class RiskLevel(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


@dataclass
class BrandProfile:
    brand_name: str
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    official_logo_path: Optional[str] = None
    official_social_accounts: list = field(default_factory=list)
    official_app_ids: list = field(default_factory=list)
    brand_keywords: list = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class Detection:
    source: str
    brand_name: str
    identifier: str
    model_score: float = 0.0
    rule_score: float = 0.0
    is_official: bool = False
    evidence: list = field(default_factory=list)
    raw_data: dict = field(default_factory=dict)
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    risk_score: float = 0.0
    risk_level: str = ""

    def to_dict(self):
        return {
            "id": self.id,
            "source": self.source,
            "brand_name": self.brand_name,
            "identifier": self.identifier,
            "model_score": round(self.model_score, 3),
            "rule_score": round(self.rule_score, 3),
            "is_official": self.is_official,
            "evidence": self.evidence,
            "risk_score": round(self.risk_score, 3),
            "risk_level": self.risk_level,
        }


def risk_level_from_score(score: float) -> str:
    if score >= 0.8:
        return RiskLevel.CRITICAL.value
    if score >= 0.6:
        return RiskLevel.HIGH.value
    if score >= 0.4:
        return RiskLevel.MEDIUM.value
    return RiskLevel.LOW.value
