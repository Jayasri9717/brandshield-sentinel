markdown
# Dataset Card

Two datasets are used. Both are synthetic. Neither contains real user data.

## 1. Social Impersonation Dataset

**File:** `data/processed/social_v2_clean.csv`
**Source:** Generated using pattern templates across 26 real brand names
**Size:** 4,466 rows (after cleaning)
**Splits:** 70% train, 15% validation, 15% test

### Labels

| Label | Meaning | Count |
|---|---|---|
| Legit | Official accounts, verified partners, fan clubs | ~1,412 |
| Monitor | Unofficial resellers, fan communities, parody accounts | ~941 |
| Fake | Airdrops, giveaway scams, fake support accounts | ~2,113 |

### Features

| Column | Type | Description |
|---|---|---|
| account_id | string | Unique ID |
| handle | string | Account handle including @ |
| platform | string | X, Instagram, Telegram, Facebook, TikTok, LinkedIn, YouTube |
| bio_text | string | Profile bio text |
| account_age_days | int | Days since account creation |
| follower_count | int | Number of followers |
| is_verified | 0/1 | Has platform verification badge |
| logo_similarity | float | pHash similarity to official logo (0–1) |
| handle_edit_score | float | How much the handle deviates from official (0–1) |
| giveaway_post_ratio | float | Fraction of posts that are giveaways (0–1) |
| scam_dm_reports | int | Number of user-reported scam DMs |
| url_similarity | float | Bio URL similarity to official domain (0–1) |
| brand_name | string | Derived from handle |
| is_official | 0/1 | True if handle matches brand name + verified + old enough |
| has_urgent | 0/1 | Bio contains "claim", "free", "now", "limited" |
| has_crypto | 0/1 | Bio contains "token", "airdrop", "USDT" |
| has_whatsapp | 0/1 | Bio contains "WhatsApp" |
| platform_encoded | int | Numeric encoding of platform |
| brand_encoded | int | Numeric encoding of brand |
| label | string | Legit / Monitor / Fake |
| label_encoded | int | 0=Legit, 1=Monitor, 2=Fake |
| split | string | train / val / test |

### Brands Covered

26 brands including Discord, Zoom, Amazon, Apple, Slack, Nike, Google,
PayPal, Meta, Adobe, Netflix, Spotify, Shopify, Microsoft, Tesla, Binance,
Coinbase, Ethereum, Canva, Sephora, OpenAI, Stripe, and others.

### Known Issues

- The bio text is formulaic. Every Fake account says "Claim your free X
  tokens now." Every Legit says "Official X account." A model that trains
  only on raw text would learn the template, not the pattern. That is why
  we use the derived flags instead of raw text.
- Handle patterns leak the label. Fake handles end in `_Airdrop_` or
  `_Giveaway_`. Legit handles are the brand name alone. We do not feed the
  raw handle to the model — only the derived `handle_edit_score`.
- Small. 4,466 rows is enough for a Random Forest but not for deep learning.
- Synthetic. Real-world distribution will differ.

### How It Was Generated

A Python script (`scripts/generate_synthetic_data.py`) applies known
impersonation patterns to a set of 6–26 brands. For each brand it generates:

- Legit accounts: exact handle, verified, old, zero scam reports
- Monitor accounts: "unofficial_" prefix, fan club bios, low scam reports
- Fake accounts: "_Airdrop_" or "_Giveaway_" suffix, urgent bios, high
  giveaway ratios, multiple scam reports

Then it computes the derived features, encodes categoricals, and splits
stratified by label and brand.

### Ethical Notes

No real user data was used. No scraping of real social media. No real
brand's account was targeted. All handles are fictional.

If this system were deployed in production, it would need to be retrained
on real-world labeled data. Nothing about the current version is
production-ready for actual brand protection.

---

## 2. App Impersonation Dataset

**File:** `data/raw/app_impersonation_dataset.csv`
**Source:** Synthetic app store listings
**Size:** ~1,700 rows
**Splits:** Pre-assigned train/val/test columns

### Labels

| Label | Meaning |
|---|---|
| 0 | Legitimate app |
| 1 | Fake or impersonating app |

### Fake Subtypes

| Type | Description |
|---|---|
| typosquat | Similar name with character swaps |
| logo_clone | Same icon, different app |
| added_word | Brand name plus "Plus", "Pro", "Wallet" |
| full_clone | Name, icon, and description all copied |
| partner | Third-party reseller (legitimate) |
| unrelated | Completely different app that happens to match on one feature |

### Features

16 engineered features including `name_levenshtein`, `name_jaro_winkler`,
`icon_phash_dist`, `icon_embedding_cosine`, `desc_tfidf_cosine`,
`dev_name_similarity`, `dev_account_age_days`, and others.

### Known Issues

- Synthetic only. No real apps from Google Play or App Store.
- Brand names are fictional (FlyEasy, PayNova, NovaTel, ShopSphere, MediCore,
  QuickCart). Not real brands.
- The "official" examples are realistic, but the fake examples follow a
  template just like the social data.
