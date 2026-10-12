"""Generate synthetic social data if you lose the original CSV."""
import csv
import random
import uuid
from pathlib import Path

random.seed(42)

BRANDS = [
    {"name": "FlyEasy", "category": "travel", "domain": "flyeasy.com"},
    {"name": "PayNova", "category": "fintech", "domain": "paynova.io"},
    {"name": "NovaTel", "category": "telecom", "domain": "novatel.net"},
    {"name": "ShopSphere", "category": "shopping", "domain": "shopsphere.com"},
    {"name": "MediCore", "category": "health", "domain": "medicore.health"},
    {"name": "QuickCart", "category": "shopping", "domain": "quickcart.com"},
]

PLATFORMS = ["X", "Instagram", "Telegram", "Facebook", "TikTok", "LinkedIn", "YouTube"]


def make(handle, platform, label, **kw):
    row = {
        "account_id": str(uuid.uuid4()),
        "handle": handle,
        "platform": platform,
        "bio_text": "",
        "account_age_days": 0,
        "follower_count": 0,
        "is_verified": 0,
        "logo_similarity": 0.0,
        "handle_edit_score": 0.0,
        "giveaway_post_ratio": 0.0,
        "scam_dm_reports": 0,
        "url_similarity": 0.0,
        "label": label,
    }
    row.update(kw)
    return row


def build():
    rows = []
    for b in BRANDS:
        name = b["name"].lower()
        for _ in range(40):
            rows.append(make(
                f"@{name}", random.choice(PLATFORMS), "Legit",
                bio_text=f"Official {b['name']} account. {b['domain']}",
                account_age_days=random.randint(1500, 4000),
                follower_count=random.randint(50000, 900000),
                is_verified=1,
                logo_similarity=1.0,
                handle_edit_score=random.uniform(0, 0.1),
                giveaway_post_ratio=random.uniform(0, 0.05),
                scam_dm_reports=0,
                url_similarity=random.uniform(0.9, 1.0),
            ))
        for _ in range(30):
            rows.append(make(
                f"unofficial_{name}", random.choice(PLATFORMS), "Monitor",
                bio_text=f"Fan and community updates for {b['name']}",
                account_age_days=random.randint(100, 500),
                follower_count=random.randint(500, 30000),
                logo_similarity=random.uniform(0.3, 0.7),
                handle_edit_score=random.uniform(0.3, 0.7),
                giveaway_post_ratio=random.uniform(0.1, 0.4),
                scam_dm_reports=random.randint(1, 3),
                url_similarity=random.uniform(0.3, 0.7),
            ))
        for _ in range(70):
            rows.append(make(
                f"@{name}_Airdrop_{random.randint(1, 99)}",
                random.choice(PLATFORMS), "Fake",
                bio_text=f"Claim your free {b['name']} tokens now",
                account_age_days=random.randint(1, 100),
                follower_count=random.randint(100, 10000),
                logo_similarity=random.uniform(0.7, 1.0),
                handle_edit_score=random.uniform(0.5, 0.95),
                giveaway_post_ratio=random.uniform(0.5, 0.99),
                scam_dm_reports=random.randint(2, 5),
                url_similarity=random.uniform(0.2, 0.7),
            ))

    # Derived
    for r in rows:
        bio = r["bio_text"].lower()
        r["has_urgent"] = int(any(w in bio for w in ["claim", "free", "now", "limited"]))
        r["has_crypto"] = int(any(w in bio for w in ["token", "airdrop"]))
        r["has_whatsapp"] = int("whatsapp" in bio)
        r["brand_name"] = next(
            (b["name"] for b in BRANDS if b["name"].lower() in r["handle"].lower()),
            "Unknown",
        )
        r["is_official"] = int(
            r["handle"].replace("@", "").lower() == r["brand_name"].lower()
            and r["is_verified"] == 1
        )

    brands = sorted({r["brand_name"] for r in rows})
    plats = sorted({r["platform"] for r in rows})
    bmap = {b: i for i, b in enumerate(brands)}
    pmap = {p: i for i, p in enumerate(plats)}
    lmap = {"Legit": 0, "Monitor": 1, "Fake": 2}

    for r in rows:
        r["brand_encoded"] = bmap[r["brand_name"]]
        r["platform_encoded"] = pmap[r["platform"]]
        r["label_encoded"] = lmap[r["label"]]

    random.shuffle(rows)
    n = len(rows)
    t = int(n * 0.70)
    v = int(n * 0.85)
    for i, r in enumerate(rows):
        r["split"] = "train" if i < t else ("val" if i < v else "test")

    Path("data/processed").mkdir(parents=True, exist_ok=True)
    out = "data/processed/social_v2_clean.csv"
    with open(out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=rows[0].keys())
        w.writeheader()
        w.writerows(rows)
    print(f"Wrote {len(rows)} rows to {out}")


if __name__ == "__main__":
    build()
