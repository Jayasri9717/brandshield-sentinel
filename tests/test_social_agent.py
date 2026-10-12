from core.models.schemas import Detection, BrandProfile


def test_detection_to_dict():
    d = Detection(
        source="social",
        brand_name="FlyEasy",
        identifier="@flyeasy_support",
        model_score=0.92,
        rule_score=0.85,
        evidence=["Test evidence"],
    )
    out = d.to_dict()
    assert out["source"] == "social"
    assert out["model_score"] == 0.92
    assert len(out["evidence"]) == 1


def test_brand_profile_defaults():
    b = BrandProfile(brand_name="FlyEasy")
    assert b.brand_name == "FlyEasy"
    assert b.id is not None
    assert b.official_social_accounts == []


def test_brand_profile_with_officials():
    b = BrandProfile(
        brand_name="FlyEasy",
        official_social_accounts=[{"platform": "X", "handle": "@flyeasy"}],
        official_app_ids=[{"store": "play", "package_id": "com.flyeasy.app"}],
    )
    assert len(b.official_social_accounts) == 1
    assert len(b.official_app_ids) == 1


def test_detection_defaults():
    d = Detection(source="app", brand_name="FlyEasy", identifier="com.flyeay.app")
    assert d.is_official is False
    assert d.risk_score == 0.0
    assert d.evidence == []
