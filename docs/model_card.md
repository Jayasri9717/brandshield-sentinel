# Model Card — BrandShield Sentinel

## Social Impersonation Model

**File:** `models/social_model_v2.pkl`
**Type:** RandomForestClassifier (scikit-learn)
**Trees:** 300
**Max depth:** 20
**Class weight:** balanced
**Trained on:** `data/processed/social_v2_clean.csv`
**Training date:** 2026-10-12

### Task

Three-class classification:
- 0 = Legit
- 1 = Monitor
- 2 = Fake

### Features (13)

