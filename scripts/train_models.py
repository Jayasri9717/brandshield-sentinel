"""Retrain both models. Run from repo root."""
import pandas as pd
import joblib
import json
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report


SOCIAL_CSV = "data/processed/social_v2_clean.csv"
APP_CSV = "data/raw/app_impersonation_dataset.csv"

SOCIAL_FEATURES = [
    "account_age_days", "follower_count", "is_verified",
    "logo_similarity", "handle_edit_score", "giveaway_post_ratio",
    "scam_dm_reports", "url_similarity",
    "has_urgent", "has_crypto", "has_whatsapp",
    "platform_encoded", "brand_encoded",
]

APP_FEATURES = [
    "name_levenshtein", "name_jaro_winkler", "name_contains_brand",
    "homoglyph_flag", "icon_phash_dist", "icon_embedding_cosine",
    "desc_tfidf_cosine", "shared_url_flag", "dev_in_verified_list",
    "dev_name_similarity", "email_domain_match", "dev_app_count",
    "dev_account_age_days", "rating", "rating_count", "scam_review_count",
]


def train_social():
    df = pd.read_csv(SOCIAL_CSV)
    train = df[df["split"] == "train"]
    test = df[df["split"] == "test"]

    model = RandomForestClassifier(
        n_estimators=300, max_depth=20,
        class_weight="balanced", random_state=42, n_jobs=-1,
    )
    model.fit(train[SOCIAL_FEATURES], train["label_encoded"])

    print("SOCIAL TEST:")
    print(classification_report(
        test["label_encoded"], model.predict(test[SOCIAL_FEATURES]),
        target_names=["Legit", "Monitor", "Fake"],
    ))

    Path("models").mkdir(exist_ok=True)
    joblib.dump(model, "models/social_model_v2.pkl")
    with open("models/social_features_v2.json", "w") as f:
        json.dump(SOCIAL_FEATURES, f, indent=2)


def train_app():
    df = pd.read_csv(APP_CSV)
    train = df[df["split"] == "train"]
    test = df[df["split"] == "test"]

    model = RandomForestClassifier(
        n_estimators=300, max_depth=15,
        class_weight="balanced", random_state=42, n_jobs=-1,
    )
    model.fit(train[APP_FEATURES], train["label"])

    print("APP TEST:")
    print(classification_report(
        test["label"], model.predict(test[APP_FEATURES]),
        target_names=["Legit", "Fake"],
    ))

    joblib.dump(model, "models/app_model.pkl")
    with open("models/app_features.json", "w") as f:
        json.dump(APP_FEATURES, f, indent=2)


if __name__ == "__main__":
    train_social()
    train_app()
    print("Done.")
