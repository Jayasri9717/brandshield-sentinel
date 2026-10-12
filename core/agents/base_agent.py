"""Abstract base class for all detection agents."""
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class AgentResult:
    detections: list
    summary: str
    execution_time_ms: int = 0


class BaseAgent(ABC):
    def __init__(self, brand_profile):
        self.brand = brand_profile

    @abstractmethod
    def detect(self, data) -> AgentResult:
        pass

    def score(self, detection) -> float:
        return detection.get("model_score", 0.0)

    def explain(self, detection) -> str:
        return ""
