"Tests for SocialAgent (fake-handle / impersonation detection on social profiles).

ASSUMED INTERFACE - the team document does not define SocialAgent's API, so
check these against the real agent and edit ONLY the adapter section below:

    from app.agents.social_agent import SocialAgent
    SocialAgent().detect(brand, profiles) -> list[dict]

    brand    = {"name": "zomato", "official_handles": ["zomato", ...]}
    profiles = [{"handle": "zomato_support", ...optional fields...}, ...]

    Each returned detection is a dict with at least:
        handle       str
        similarity   float in 0.0-1.0
        is_official  bool   (official handles are MARKED, not dropped;
                             ScoringAgent removes them - see the team document)
        evidence     non-empty str (shown to judges by the frontend)

    An empty brand name raises ValueError.
"""

import copy

import pytest

from app.agents.social_agent import SocialAgent

# ------------------------------------------------------------------ adapter
BRAND = {"name": "zomato", "official_handles": ["zomato", "zomato_care"]}


def run(profiles, brand=None):
    """Single place that calls the real agent. Change here if the API differs."""
    return SocialAgent().detect(copy.deepcopy(brand or BRAND), copy.deepcopy(profiles))


def p(handle, **extra):
    return {"handle": handle, **extra}


def flagged(detections):
    """Handles reported as impersonation candidates (not marked official)."""
    return {d["handle"].lower() for d in detections if not d["is_official"]}


# -------------------------------------------------------------------- tests
class TestOfficialHandles:
    def test_official_handle_is_marked_official(self):
        out = run([p("zomato")])
        official = [d for d in out if d["handle"].lower() == "zomato"]
        assert all(d["is_official"] is True for d in official)

    def test_official_handle_never_flagged_as_fake(self):
        out = run([p("zomato"), p("zomato_care"), p("zomato_support")])
        assert "zomato" not in flagged(out)
        assert "zomato_care" not in flagged(out)

    def test_official_match_ignores_case_and_whitespace(self):
        out = run([p("  Zomato "), p("ZOMATO_CARE")])
        assert flagged(out) == set()


class TestLookalikeDetection:
    def test_obvious_lookalikes_are_flagged(self):
        handles = ["zomato_support", "zomatoo", "zomaot", "zomato-official"]
        assert set(handles) <= flagged(run([p(h) for h in handles]))

    def test_cyrillic_homoglyph_handle_is_flagged(self):
        fake = "z\u043emato"  # Cyrillic 'o'
        assert fake in flagged(run([p(fake)]))

    def test_unrelated_handles_are_not_flagged(self):
        assert flagged(run([p("swiggy"), p("pizza_lover_99")])) == set()

    def test_mixed_list_flags_only_the_fakes(self):
        out = run([p("zomato"), p("zomatoo"), p("swiggy")])
        assert flagged(out) == {"zomatoo"}


class TestOutputShape:
    def test_required_fields_present(self):
        for d in run([p("zomatoo"), p("zomato")]):
            for key in ("handle", "similarity", "is_official", "evidence"):
                assert key in d

    def test_similarity_in_range(self):
        for d in run([p("zomatoo"), p("zomato_support"), p("zomato")]):
            assert 0.0 <= d["similarity"] <= 1.0

    def test_evidence_is_non_empty_text_for_flagged(self):
        for d in run([p("zomatoo"), p("zomato_support")]):
            if not d["is_official"]:
                assert isinstance(d["evidence"], str) and d["evidence"].strip()

    def test_is_official_is_a_real_bool(self):
        for d in run([p("zomato"), p("zomatoo")]):
            assert isinstance(d["is_official"], bool)


class TestEdgeCases:
    def test_empty_profile_list(self):
        assert run([]) == []

    def test_profile_with_only_a_handle(self):
        
