from core.detection.homoglyph import detect_homoglyphs
from core.models.schemas import risk_level_from_score


def test_homoglyph_detects_cyrillic():
    hits = detect_homoglyphs("z\u043emato")
    assert len(hits) > 0


def test_no_homoglyph_on_plain():
    hits = detect_homoglyphs("zomato")
    assert hits == []


def test_risk_boundaries():
    assert risk_level_from_score(0.8) == "Critical"
    assert risk_level_from_score(0.6) == "High"
    assert risk_level_from_score(0.4) == "Medium"
    assert risk_level_from_score(0.2) == "Low"


def test_risk_high_band():
    assert risk_level_from_score(0.95) == "Critical"
    assert risk_level_from_score(0.7) == "High"
    assert risk_level_from_score(0.5) == "Medium"
    assert risk_level_from_score(0.1) == "Low"
