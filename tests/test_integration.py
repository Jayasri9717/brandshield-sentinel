"""
test_integration.py
===================
End-to-End integration tests for the SocialAgent pipeline.
Verifies the orchestration of external API fetching, similarity computation, 
metadata evaluation, caching, and final report generation.

Author: Expert Dev Team
Target: SocialAgent Integration Pipeline
"""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta

# ==========================================
# MOCKING THE OUTER WORLD (APIs & Databases)
# ==========================================

class MockHTTPResponse:
    """Simulates an async HTTP response (e.g., from httpx or aiohttp)."""
    def __init__(self, status_code=200, json_data=None):
        self.status_code = status_code
        self._json_data = json_data or {}

    def json(self):
        return self._json_data

    def raise_for_status(self):
        if self.status_code >= 400:
            raise Exception(f"HTTP Error: {self.status_code}")

@pytest_asyncio.fixture
async def mock_http_client():
    """Mocks the external HTTP client used for scraping social APIs."""
    client = AsyncMock()
    return client

@pytest_asyncio.fixture
async def mock_cache():
    """Mocks the Redis/Database cache layer."""
    cache = AsyncMock()
    cache.get.return_value = None  # Default to cache miss
    return cache

@pytest_asyncio.fixture
async def mock_similarity_engine():
    """
    Mocks the SimilarityEngine (from test_similarity.py).
    In integration tests, we mock the heavy ML math to focus purely on pipeline flow.
    """
    engine = MagicMock()
    engine.compute_composite_score.return_value = 0.95 # Default to high risk for testing
    return engine

@pytest_asyncio.fixture
async def integration_agent(mock_http_client, mock_cache, mock_similarity_engine):
    """
    Wires up the SocialAgent with mocked external dependencies.
    This is the System Under Test (SUT) for integration.
    """
    # Assuming SocialAgent accepts these via Dependency Injection
    agent = SocialAgent(
        http_client=mock_http_client,
        cache=mock_cache,
        similarity_engine=mock_similarity_engine
    )
    return agent


# ==========================================
# 1. END-TO-END PIPELINE TESTS (HAPPY PATHS)
# ==========================================

class TestEndToEndPipeline:
    """Tests the full flow from handle input to final ImpersonationReport."""

    @pytest.mark.asyncio
    async def test_pipeline_flags_sophisticated_impersonator(self, integration_agent, mock_http_client):
        """
        Scenario: Suspect uses a homoglyph handle, stolen profile pic, and scam bio.
        Expected: High risk score, multiple flags, is_impersonator=True.
        """
        # 1. Setup Mock API Response (The "Fake" Profile)
        fake_profile_payload = {
            "handle": "@еlonmusk_official", # Cyrillic 'е'
            "display_name": "Elon Musk (CEO)",
            "bio": "Giving away 100 BTC! DM me.",
            "followers": 15,
            "following": 5000,
            "created_at": (datetime.now() - timedelta(days=2)).isoformat(),
            "profile_pic_url": "http://img.com/stolen_pic.jpg",
            "verified": False
        }
        mock_http_client.get.return_value = MockHTTPResponse(200, fake_profile_payload)

        # 2. Execute Pipeline
        report = await integration_agent.run_full_impersonation_check(
            suspect_handle="@еlonmusk_official", 
            target_entity="elonmusk"
        )

        # 3. Assertions
        assert report.is_impersonator is True
        assert report.risk_score >= 0.85
        assert "homoglyph_detected" in report.flags
        assert "metadata_anomaly" in report.flags
        
        # Verify the agent actually called the API
        mock_http_client.get.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_pipeline_clears_legitimate_verified_account(self, integration_agent, mock_http_client, mock_similarity_engine):
        """
        Scenario: Exact handle match, verified badge, aged account.
        Expected: Low risk score, no flags, is_impersonator=False.
        """
        # 1. Setup Mock API Response (The "Real" Profile)
        real_profile_payload = {
            "handle": "@elonmusk",
            "display_name": "Elon Musk",
            "bio": "Tesla, SpaceX, X",
            "followers": 180000000,
            "following": 300,
            "created_at": (datetime.now() - timedelta(days=5000)).isoformat(),
            "profile_pic_url": "http://img.com/real_pic.jpg",
            "verified": True
        }
        mock_http_client.get.return_value = MockHTTPResponse(200, real_profile_payload)
        
        # Override similarity engine to return a safe score for this test
        mock_similarity_engine.compute_composite_score.return_value = 0.05

        # 2. Execute Pipeline
        report = await integration_agent.run_full_impersonation_check(
            suspect_handle="@elonmusk", 
            target_entity="elonmusk"
        )

        # 3. Assertions
        assert report.is_impersonator is False
        assert report.risk_score < 0.20
        assert len(report.flags) == 0


# ==========================================
# 2. RESILIENCE & ERROR HANDLING
# ==========================================

class TestPipelineResilience:
    """Tests how the agent handles external network and API failures."""

    @pytest.mark.asyncio
    async def test_handles_api_timeout_gracefully(self, integration_agent, mock_http_client):
        """If the social API times out, agent should not crash, but flag a network error."""
        mock_http_client.get.side_effect = TimeoutError("API connection timed out")

        report = await integration_agent.run_full_impersonation_check(
            suspect_handle="@elonmusk", target_entity="elonmusk"
        )

        assert report.is_impersonator is False # Fail safe: don't flag as impersonator if we can't verify
        assert "network_error" in report.flags
        assert "timeout" in report.metadata.get("error_details", "").lower()

    @pytest.mark.asyncio
    async def test_handles_deleted_account_404(self, integration_agent, mock_http_client):
        """If the account is deleted (404), agent should report 'account_not_found'."""
        mock_http_client.get.return_value = MockHTTPResponse(404)

        report = await integration_agent.run_full_impersonation_check(
            suspect_handle="@deleted_user", target_entity="elonmusk"
        )

        assert report.is_impersonator is False
        assert "account_not_found" in report.flags

    @pytest.mark.asyncio
    async def test_handles_rate_limiting_429(self, integration_agent, mock_http_client):
        """If rate limited, agent should raise a specific RateLimitException."""
        mock_http_client.get.return_value = MockHTTPResponse(429)

        with pytest.raises(RateLimitException): # Assuming you have a custom exception
            await integration_agent.run_full_impersonation_check(
                suspect_handle="@elonmusk", target_entity="elonmusk"
            )


# ==========================================
# 3. CACHING & STATE MANAGEMENT
# ==========================================

class TestCachingIntegration:
    """Tests interaction with the Redis/DB cache layer to prevent redundant API calls."""

    @pytest.mark.asyncio
    async def test_cache_hit_prevents_api_call(self, integration_agent, mock_http_client, mock_cache):
        """If the profile is already in the cache, the HTTP client should NOT be called."""
        # 1. Setup Cache Hit
        cached_report_data = {"risk_score": 0.10, "is_impersonator": False, "flags": []}
        mock_cache.get.return_value = cached_report_data

        # 2. Execute Pipeline
        report = await integration_agent.run_full_impersonation_check(
            suspect_handle="@elonmusk", target_entity="elonmusk"
        )

        # 3. Assertions
        assert report.risk_score == 0.10
        mock_http_client.get.assert_not_awaited() # Crucial: No API call made!
        mock_cache.get.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_cache_miss_triggers_api_call_and_saves_result(self, integration_agent, mock_http_client, mock_cache):
        """If cache misses, agent fetches from API and saves the result to cache."""
        # 1. Setup Cache Miss & API Response
        mock_cache.get.return_value = None
        mock_http_client.get.return_value = MockHTTPResponse(200, {"handle": "@elonmusk", "verified": True})

        # 2. Execute Pipeline
        await integration_agent.run_full_impersonation_check(
            suspect_handle="@elonmusk", target_entity="elonmusk"
        )

        # 3. Assertions
        mock_http_client.get.assert_awaited_once()
        mock_cache.set.assert_awaited_once() # Verify it saved the result for next time


# ==========================================
# 4. MULTI-PLATFORM CROSS-REFERENCING
# ==========================================

class TestMultiPlatformAggregation:
    """Tests checking a target across multiple social networks (e.g., Twitter + Instagram)."""

    @pytest.mark.asyncio
    async def test_aggregates_risk_across_multiple_platforms(self, integration_agent, mock_http_client):
        """
        Scenario: Handle is clean on Twitter, but flagged as impersonator on Instagram.
        Expected: Final report should reflect the highest risk or aggregate the flags.
        """
        # Mocking a multi-platform fetch method
        async def mock_multi_fetch(handle):
            return {
                "twitter": {"verified": True, "risk_score": 0.05},
                "instagram": {"verified": False, "risk_score": 0.95, "flags": ["bio_scam"]}
            }
        
        integration_agent.fetch_cross_platform = mock_multi_fetch

        report = await integration_agent.run_cross_platform_check("@elonmusk", "elonmusk")

        assert report.is_impersonator is True # Instagram flagged it
        assert report.platform_breakdown["twitter"]["risk_score"] == 0.05
        assert report.platform_breakdown["instagram"]["risk_score"] == 0.95
        assert "bio_scam" in report.flags
