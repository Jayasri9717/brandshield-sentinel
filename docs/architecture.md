markdown
# Architecture — BrandShield Sentinel

## What We Are Building

A Digital Risk Protection platform that finds fake social media profiles and
impersonating mobile apps before they damage a brand. Two detection engines:
one for social, one for apps. Both feed into a single risk scoring layer that
ranks threats so a security team knows what to look at first.

## High-Level Flow
Brand Profile (name, handles, app IDs)
│
▼
┌────────────────────┐
│ Data Ingestion │ ← CSV uploads
└────────────────────┘
│
▼
┌────────────────────┐
│ Detection Agents │
│ - SocialAgent │ ← trained model
│ - AppAgent │ ← trained model
│ - LookalikeAgent │ ← rule-based
└────────────────────┘
│
▼
┌────────────────────┐
│ ScoringAgent │ ← official exclusion + weighted risk
└────────────────────┘
│
▼
┌────────────────────┐
│ SQLite Storage │
└────────────────────┘
│
▼
┌────────────────────┐
│ FastAPI Backend │
└────────────────────┘
│
▼
React UI

text

## Data Sources

| Source | Format | Who Provides It |
|---|---|---|
| Social profiles | CSV | Uploaded by the user |
| App store listings | CSV | Uploaded by the user |
| Look-alike candidates | Generated | LookalikeAgent |
| Brand profile | Form input | User |

## Detection Logic

### Social Agent

Loads `models/social_model_v2.pkl`, a Random Forest classifier trained on
4,466 labeled profiles across 26 brands. Three classes: Legit, Monitor, Fake.

The 13 features it uses:
- `account_age_days`, `follower_count`, `is_verified`
- `logo_similarity`, `handle_edit_score`, `giveaway_post_ratio`
- `scam_dm_reports`, `url_similarity`
- `has_urgent`, `has_crypto`, `has_whatsapp`
- `platform_encoded`, `brand_encoded`

The model returns probabilities for all three classes. If the top class is
Legit with confidence above 0.7, we skip the profile. Otherwise we create a
detection with the confidence score as the model_score.

### App Agent

Loads `models/app_model.pkl`, a Random Forest classifier trained on 1,700
app store listings. Binary: Legit or Fake.

The 16 features include Levenshtein distance between the app name and brand
name, pHash distance between icons, developer name similarity, and description
cosine similarity.

### Lookalike Agent

No model. Rule-based. Generates candidate domains by:
- Character swaps (`zomatoo`, `zomaot`)
- Homoglyph substitution (`zоmato` with Cyrillic о)
- Added words (`zomato-support`, `zomato-official`)
- TLD swaps (`zomato.co`, `zomato.net`)

Each candidate is filtered: DNS must resolve, HTTP must return 2xx or 3xx, and
the page must mention the brand. Dead or irrelevant domains are dropped.

### Scoring Agent

Takes detections from all three agents. Applies official asset exclusion first:

> If `is_official == True`, drop the detection. It is the real account.

Then computes a weighted risk score:
- 40% model confidence
- 20% rule-based similarity
- 10% evidence count (normalized)

Final score mapped to risk level: Critical (0.8+), High (0.6–0.8), Medium
(0.4–0.6), Low (below 0.4). Sorted descending.

## Storage

SQLite with two tables: `brand_profiles` and `detections`. No ORM. Raw
`sqlite3` because we are on a 24-hour clock and want zero configuration.

## Backend

FastAPI with three endpoints:
- `POST /api/brand-profile` — create a brand
- `POST /api/social/detect` — upload CSV, get detections
- `POST /api/app/detect` — upload CSV, get detections
- `GET /api/dashboard/stats` — aggregate numbers
- `GET /api/health` — check that models loaded

Auto-generated Swagger docs at `/docs`.

## How Official Assets Are Excluded

This is the single most important part of the platform.

An account is official if all three are true:
1. The handle matches the brand name exactly (`@zomato`, not `@zomato_support`)
2. The account is verified
3. The account is older than 365 days

An app is official if its `package_id` appears in the brand profile's
`official_app_ids` list.

The exclusion happens inside `ScoringAgent.rank_all()` before any risk
scoring. If a detection is flagged as official, it never reaches the output.

We could have used a model feature for this. We deliberately did not. The
rule is deterministic, explainable, and cannot be gamed by a learned pattern.
A model could learn to misclassify an official account if training data
happens to contain a few examples of official accounts labeled as suspicious.

## Known Limitations

- Synthetic training data. Patterns are formulaic. Real-world validation
  would need labeled examples from brand protection reports.
- Single-tenant. SQLite stores one brand profile at a time. Multi-tenant
  would need Postgres and a proper auth layer.
- No live API integration. Detection runs on uploaded CSVs, not on live
  social platform APIs or app store APIs. That is a data collection problem,
  not a technical one.
- Lookalike domain check is best-effort. If DNS or HTTP fails silently, the
  candidate is dropped without explanation to the user.
