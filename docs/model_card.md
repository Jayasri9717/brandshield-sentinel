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


Note: `is_official` is deliberately NOT a feature. It would dominate the
model and make it trivially correct on training data. Official exclusion
happens as a rule in `ScoringAgent`, not as a learned pattern.

### Performance (test set)

F1 per class on 670 held-out rows:

| Class | Precision | Recall | F1 |
|---|---|---|---|
| Legit | (fill in) | (fill in) | (fill in) |
| Monitor | (fill in) | (fill in) | (fill in) |
| Fake | (fill in) | (fill in) | (fill in) |

Overall accuracy: (fill in)

### Top Features

(Fill in from `model.feature_importances_` after training.)

Expected order:
1. `scam_dm_reports`
2. `giveaway_post_ratio`
3. `handle_edit_score`
4. `account_age_days`
5. `has_crypto`

If `brand_encoded` is in the top 3, the model is overfitting to brand
identity instead of learning impersonation patterns. Drop it and retrain.

### Limitations

- Synthetic training data. The model learned patterns from a generator,
  not from real-world accounts.
- Monitor class is the hardest. It sits between Legit and Fake by design.
  Expect F1 around 0.75–0.85, not 0.95.
- 26 brands. A brand outside the training set will still be classified,
  but with less confidence.
- No temporal features. A model trained on today's data will not adapt if
  the scam pattern changes next month.

### Ethical Notes

No real user data. No real social media accounts were scraped. The model
outputs a probability, not a verdict. Any decision to suspend or report an
account should involve human review.

---

## App Impersonation Model

**File:** `models/app_model.pkl`
**Type:** RandomForestClassifier
**Trees:** 300
**Max depth:** 15
**Class weight:** balanced
**Trained on:** `data/raw/app_impersonation_dataset.csv`
**Training date:** 2026-10-12

### Task

Binary classification:
- 0 = Legit
- 1 = Fake

### Features (16)



### Performance (test set)

| Class | Precision | Recall | F1 |
|---|---|---|---|
| Legit | (fill in) | (fill in) | (fill in) |
| Fake | (fill in) | (fill in) | (fill in) |

Overall accuracy: (fill in)

### Limitations

- Synthetic data. Same caveat as social model.
- The 16 features assume you already have icon embeddings and description
  TF-IDF. In production, those would come from a live pipeline.
- No real app store integration.

---

## How to Retrain Both Models

```bash
python scripts/train_models.py


---

## 4. `docs/member4_detection_plan.md`

```markdown
# Member 4 — Detection Logic & Data Pipeline

## Ownership

- `core/detection/similarity.py`
- `core/detection/homoglyph.py`
- `core/detection/image_hash.py`
- `core/detection/dns_check.py`
- `core/agents/lookalike_agent.py`
- `core/agents/scoring_agent.py`
- `core/data/loader.py`
- `tests/test_similarity.py`
- `tests/test_detection.py`

You do NOT own `social_agent.py` or `app_agent.py`. Those call the trained
models and are owned by Jayasri. You consume their `Detection` objects.

## Work Order

| Hours | Task | Why |
|---|---|---|
| 0–4 | Similarity functions + official exclusion logic | Official exclusion is worth 60% of score |
| 2–8 | Homoglyph detection and image hashing | Feeds evidence strings |
| 6–11 | DNS/HTTP checks, end-to-end path wired | Hard rule: end-to-end by Hour 11 |
| 8–16 | Lookalike agent, full ScoringAgent weights, loader | |
| 14–18 | Unit tests, fix bugs from QA | |
| 18–24 | Bug fixes only; rehearse demo | |

## Detection Format (Agreed With Jayasri and Member 3)

Every agent returns a list of `Detection` objects:

```python
@dataclass
class Detection:
    id: str
    source: str           # "social" / "app" / "lookalike"
    brand_name: str
    identifier: str       # handle / package_id / domain
    model_score: float    # 0.0-1.0 from ML model
    rule_score: float     # 0.0-1.0 from rules
    is_official: bool
    evidence: list[str]
    raw_data: dict
    risk_score: float = 0.0
    risk_level: str = ""


WEIGHTS = {
    "model_score": 0.40,
    "rule_score": 0.20,
    "evidence_count": 0.10,
}


---

## Order To Fill In

1. **`docs/architecture.md`** — most important. Judges will read this.
2. **`docs/model_card.md`** — fill in the F1 numbers from your test run.
3. **`docs/dataset_card.md`** — the metadata about your data.
4. **`docs/member4_detection_plan.md`** — internal plan. Lower priority.

---

## Commit and Push

```bash
git add docs/
git commit -m "docs: fill in architecture, dataset card, model card, and detection plan"
git push origin main


| Legit | 0.94 | 0.96 | 0.95 |
| Monitor | 0.84 | 0.80 | 0.82 |
| Fake | 0.98 | 0.96 | 0.97 |
