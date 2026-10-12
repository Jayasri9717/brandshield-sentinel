# BrandShield Sentinel

BrandShield Sentinel is a college-project prototype for evidence-led digital risk triage. Its current backend compares data submitted by the caller; it does not crawl social networks, scan APK binaries, query threat-intelligence services, or claim to use a trained machine-learning model.

## Run the backend

Use Python 3.11 or newer:

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

The server listens at `http://127.0.0.1:8000`. Interactive Swagger documentation is at `/docs`; the health checks are `/health` and `/api/health` (the latter stays available for the current frontend).

The default SQLite database is `brandshield.db` in the working directory. Set `DATABASE_URL` to use another SQLAlchemy-compatible database engine (and install its driver). Set `FRONTEND_ORIGINS` to a comma-separated list if the frontend runs on a different origin.

## API routes

| Method | Path | Purpose |
| --- | --- | --- |
| `GET`, `POST` | `/api/brands` | List or register verified brand profiles |
| `GET`, `PUT` | `/api/brands/{brand_id}` | Read or update a brand profile |
| `POST` | `/api/detections/social` | Compare submitted handles with official handles |
| `POST` | `/api/detections/apps` | Triage submitted app metadata and permission names |
| `POST` | `/api/detections/domains` | Compare a submitted domain with official domains |
| `GET` | `/api/dashboard/stats` | Return brand and detection totals |
| `GET` | `/api/history` | Return newest detections (`kind`, `limit`, and `offset` filters) |

Detection scores are explainable heuristic indicators, not proof that an account, app, or domain is malicious. APK analysis uses only the metadata included in the JSON request; no binary is uploaded or inspected.

## Run tests

```bash
python -m pytest -q
```

GitHub Actions runs this test suite on pushes and pull requests with Python 3.11 and 3.13.
# brandshield-sentinel
An AI-powered platform to detect and investigate brand impersonation across social media and mobile apps.
<div align="center">

# 🕵️‍♂️ SocialAgent

### Enterprise-Grade Multi-Modal Impersonation Detection Engine

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](#)
[![Coverage](https://img.shields.io/badge/coverage-95%25-brightgreen.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Async](https://img.shields.io/badge/asyncio-native-purple.svg)](#)

**Detect fake handles, homoglyph attacks, stolen bios, and cloned profile pictures across social networks.**

</div>

---

## 📖 Overview

**SocialAgent** is a high-performance, asynchronous Python engine designed to detect social media impersonation. Modern bad actors don't just copy usernames; they use Cyrillic homoglyphs, steal profile pictures, and mimic bios. 

SocialAgent combats this using a **Multi-Modal Similarity Pipeline**, combining lexical analysis, visual unicode detection, NLP semantic embeddings, and perceptual image hashing to generate a highly accurate, weighted composite risk score.

## ✨ Key Features

- 🧠 **Lexical Analysis:** Detects typosquatting, padding, and structural handle manipulation (e.g., `@e1onmusk` vs `@elonmusk`).
- 👁️ **Homoglyph Detection:** Identifies advanced Unicode evasion tactics (e.g., Cyrillic `е` vs Latin `e`).
- 💬 **Semantic NLP:** Uses SentenceTransformers to evaluate bio and display name cosine similarity.
- 🖼️ **Perceptual Hashing:** Detects cloned or slightly modified profile pictures using pHash/dHash.
- ⚡ **Async-First Architecture:** Built with `httpx` and `asyncio` for non-blocking, high-throughput API scraping.
- 🚀 **Smart Caching:** Redis-backed caching layer to prevent redundant API calls and respect rate limits.
- 🛡️ **Resilient Pipeline:** Gracefully handles API timeouts, 404s, and 429 rate limits without crashing.

---

## 🏗️ Architecture

```text
[ Input: Suspect Handle & Target Entity ]
                  │
                  ▼
        ┌───────────────────┐
        │   Cache Check     │──(Hit)──> [ Return Cached Report ]
        └─────────┬─────────┘
                  │(Miss)
                  ▼
        ┌───────────────────┐
        │  Async API Fetch  │──(Timeout/404)──> [ Return Error Report ]
        └─────────┬─────────┘
                  │(Success)
                  ▼
   ┌──────────────────────────────────┐
   │     Multi-Modal Analysis         │
   │  1. Lexical (Jaro-Winkler)       │
   │  2. Visual (Unicode Confusables) │
   │  3. Semantic (Cosine Embedding)  │
   │  4. Perceptual (Image Hamming)   │
   └────────────────┬─────────────────┘
                    │
                    ▼
          [ Weighted Composite Score ]
                    │
                    ▼
        [ Final Impersonation Report ]
import asyncio
from social_agent import SocialAgent

async def main():
    agent = SocialAgent()
    
    # Run a full multi-modal check
    report = await agent.run_full_impersonation_check(
        suspect_handle="@еlonmusk_official",  # Note the Cyrillic 'е'
        target_entity="elonmusk"
    )
    
    print(f"Risk Score: {report.risk_score:.2f}")
    print(f"Is Impersonator: {report.is_impersonator}")
    print(f"Flags: {report.flags}")

asyncio.run(main())
{
  "risk_score": 0.94,
  "is_impersonator": true,
  "flags": ["homoglyph_detected", "metadata_anomaly", "bio_scam_keywords"],
  "platform_breakdown": { ... }
}
