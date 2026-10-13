"""SQLite persistence for the BrandShield API."""

import json
import os
import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Any


def _database_path() -> Path:
    configured_path = os.environ.get("BRANDSHIELD_DB_PATH")
    path = Path(configured_path) if configured_path else Path(__file__).resolve().parents[2] / "data" / "brandshield.sqlite3"
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def get_conn() -> sqlite3.Connection:
    connection = sqlite3.connect(_database_path())
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db() -> None:
    with closing(get_conn()) as connection:
        with connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS brand_profile (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    payload TEXT NOT NULL,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                    display_name TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS auth_sessions (
                    token_hash TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    expires_at REAL NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS user_brand_profiles (
                    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                    payload TEXT NOT NULL,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS api_brand_profiles (
                    id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS detection_runs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    profile_id TEXT NOT NULL REFERENCES api_brand_profiles(id) ON DELETE CASCADE,
                    kind TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )


def create_user(user_id: str, email: str, display_name: str, password_hash: str) -> bool:
    with closing(get_conn()) as connection:
        with connection:
            cursor = connection.execute(
                "INSERT OR IGNORE INTO users (id, email, display_name, password_hash) VALUES (?, ?, ?, ?)",
                (user_id, email, display_name, password_hash),
            )
            return cursor.rowcount == 1


def get_user_by_email(email: str) -> dict[str, Any] | None:
    with closing(get_conn()) as connection:
        row = connection.execute(
            "SELECT id, email, display_name, password_hash FROM users WHERE email = ? COLLATE NOCASE",
            (email,),
        ).fetchone()
    return dict(row) if row is not None else None


def create_auth_session(token_hash: str, user_id: str, expires_at: float) -> None:
    with closing(get_conn()) as connection:
        with connection:
            connection.execute(
                "INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
                (token_hash, user_id, expires_at),
            )


def get_user_for_session(token_hash: str, now: float) -> dict[str, Any] | None:
    with closing(get_conn()) as connection:
        row = connection.execute(
            """
            SELECT users.id, users.email, users.display_name
            FROM auth_sessions
            JOIN users ON users.id = auth_sessions.user_id
            WHERE auth_sessions.token_hash = ? AND auth_sessions.expires_at > ?
            """,
            (token_hash, now),
        ).fetchone()
    return dict(row) if row is not None else None


def delete_auth_session(token_hash: str) -> None:
    with closing(get_conn()) as connection:
        with connection:
            connection.execute("DELETE FROM auth_sessions WHERE token_hash = ?", (token_hash,))


def get_brand_profile(user_id: str) -> dict[str, Any] | None:
    with closing(get_conn()) as connection:
        row = connection.execute(
            "SELECT payload FROM user_brand_profiles WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    return json.loads(row["payload"]) if row is not None else None


def save_brand_profile(user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    serialized = json.dumps(payload, ensure_ascii=False)
    with closing(get_conn()) as connection:
        with connection:
            connection.execute(
                """
                INSERT INTO user_brand_profiles (user_id, payload)
                VALUES (?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    payload = excluded.payload,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (user_id, serialized),
            )
    return payload


def create_api_brand_profile(profile_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    with closing(get_conn()) as connection:
        with connection:
            connection.execute(
                "INSERT INTO api_brand_profiles (id, payload) VALUES (?, ?)",
                (profile_id, json.dumps(payload, ensure_ascii=False)),
            )
    return {"id": profile_id, **payload}


def get_api_brand_profile(profile_id: str) -> dict[str, Any] | None:
    with closing(get_conn()) as connection:
        row = connection.execute(
            "SELECT id, payload FROM api_brand_profiles WHERE id = ?",
            (profile_id,),
        ).fetchone()
    if row is None:
        return None
    return {"id": row["id"], **json.loads(row["payload"])}


def save_detection_run(profile_id: str, kind: str, payload: dict[str, Any]) -> None:
    with closing(get_conn()) as connection:
        with connection:
            connection.execute(
                "INSERT INTO detection_runs (profile_id, kind, payload) VALUES (?, ?, ?)",
                (profile_id, kind, json.dumps(payload, ensure_ascii=False)),
            )


def get_dashboard_statistics() -> dict[str, Any]:
    with closing(get_conn()) as connection:
        totals = connection.execute(
            """
            SELECT COUNT(*) AS total_threats,
                   SUM(CASE WHEN json_extract(item.value, '$.risk_score') >= 0.7 THEN 1 ELSE 0 END) AS high_risk
            FROM detection_runs runs,
                 json_each(runs.payload, '$.detections') item
            """
        ).fetchone()
        platforms = connection.execute(
            """
            SELECT runs.kind AS platform, COUNT(*) AS threats
            FROM detection_runs runs,
                 json_each(runs.payload, '$.detections')
            GROUP BY runs.kind
            ORDER BY threats DESC
            """
        ).fetchall()
    return {
        "total_threats": totals["total_threats"] or 0,
        "high_risk": totals["high_risk"] or 0,
        "platforms": [{"platform": row["platform"], "threats": row["threats"]} for row in platforms],
    }