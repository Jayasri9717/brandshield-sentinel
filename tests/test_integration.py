import pandas as pd
from core.data.loader import validate_social_csv, validate_app_csv


def test_valid_social_csv():
    df = pd.DataFrame({
        "handle": ["@a", "@b"],
        "platform": ["X", "Instagram"],
        "bio_text": ["x", "y"],
    })
    ok, msg = validate_social_csv(df)
    assert ok, msg


def test_missing_columns():
    df = pd.DataFrame({"handle": ["@a"]})
    ok, msg = validate_social_csv(df)
    assert not ok
    assert "Missing" in msg


def test_empty_csv():
    df = pd.DataFrame(columns=["handle", "platform", "bio_text"])
    ok, msg = validate_social_csv(df)
    assert not ok


def test_valid_app_csv():
    df = pd.DataFrame({
        "app_title": ["AppA"],
        "package_id": ["com.a"],
    })
    ok, msg = validate_app_csv(df)
    assert ok, msg


def test_app_missing_columns():
    df = pd.DataFrame({"app_title": ["AppA"]})
    ok, msg = validate_app_csv(df)
    assert not ok
