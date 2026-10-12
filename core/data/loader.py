"""CSV validation and normalization."""
import pandas as pd


REQUIRED_SOCIAL_COLS = {"handle", "platform", "bio_text"}
REQUIRED_APP_COLS = {"app_title", "package_id"}


def validate_social_csv(df: pd.DataFrame) -> tuple[bool, str]:
    missing = REQUIRED_SOCIAL_COLS - set(df.columns)
    if missing:
        return False, f"Missing columns: {sorted(missing)}"
    if df.empty:
        return False, "CSV is empty"
    if df["handle"].isnull().any():
        return False, "Some rows have empty handles"
    return True, "OK"


def validate_app_csv(df: pd.DataFrame) -> tuple[bool, str]:
    missing = REQUIRED_APP_COLS - set(df.columns)
    if missing:
        return False, f"Missing columns: {sorted(missing)}"
    if df.empty:
        return False, "CSV is empty"
    return True, "OK"


def normalize_handles(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if "handle" in df.columns:
        df["handle"] = df["handle"].astype(str).str.strip()
    return df
