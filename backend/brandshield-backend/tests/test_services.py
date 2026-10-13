"""Tests for the rule-based domain and app checks in app/services.py, and the brand schema.

These tests need no database and no web server.
"""

import pytest
from pydantic import ValidationError

from app.schemas import BrandProfileCreate
from app.services import app_metadata_risk, domain_risk, risk_level

OFFICIAL = ["examplebank.com"]


# --- domain checks -----------------------------------------------------------
def test_official_domain_and_its_subdomains_score_zero():
    for host in ["examplebank.com", "login.examplebank.com", "https://www.examplebank.com/login"]:
        score, findings, _ = domain_risk(host, OFFICIAL)
        assert score == 0, host
        assert findings


def test_digit_lookalike_is_high_risk():
    score, _, host = domain_risk("examp1ebank.com", OFFICIAL)

    assert host == "examp1ebank.com"
    assert score == 90
    assert risk_level(score) == "high"


def test_unrelated_domain_is_low_risk():
    score, _, _ = domain_risk("totally-different.org", OFFICIAL)

    assert score == 5
    assert risk_level(score) == "low"


def test_mixed_scripts_and_punycode_are_flagged():
    cyrillic_a = "pаypal.com"
    assert domain_risk(cyrillic_a, ["paypal.com"])[0] == 95
    assert domain_risk("xn--pypal-4ve.com", ["paypal.com"])[0] == 95


def test_two_part_endings_do_not_confuse_the_brand_name():
    # Both domains end in .co.in, but the brand names are completely different.
    assert domain_risk("random-shop.co.in", ["acme.co.in"])[0] == 5
    # The official domain and its subdomains still score zero.
    assert domain_risk("acme.co.in", ["acme.co.in"])[0] == 0
    assert domain_risk("shop.acme.co.in", ["acme.co.in"])[0] == 0


def test_same_brand_name_with_a_different_ending_is_flagged():
    assert domain_risk("zomato.co.in", ["zomato.com"])[0] >= 75
    assert domain_risk("zomato.com", ["zomato.co.in"])[0] >= 75


def test_invalid_domain_input_raises_value_error():
    for bad_value in ["", "   ", "not a domain", "1.2.3.4", "http://[::1"]:
        with pytest.raises(ValueError):
            domain_risk(bad_value, OFFICIAL)


def test_brand_without_usable_official_domains_raises_value_error():
    with pytest.raises(ValueError):
        domain_risk("examplebank.com", [])
    with pytest.raises(ValueError):
        domain_risk("examplebank.com", ["not a domain"])


# --- app permission checks ---------------------------------------------------
def test_sensitive_permissions_add_up():
    score, findings = app_metadata_risk(["android.permission.SEND_SMS", "android.permission.READ_SMS"])

    assert score == 75
    assert risk_level(score) == "high"
    assert any("not scanned" in finding for finding in findings)


def test_permission_names_work_with_or_without_the_android_prefix():
    assert app_metadata_risk(["READ_SMS"])[0] == app_metadata_risk(["android.permission.READ_SMS"])[0] == 30


def test_no_sensitive_permissions_gives_zero_and_no_malware_verdict():
    score, findings = app_metadata_risk(["android.permission.CAMERA"])

    assert score == 0
    assert "not a malware verdict" in findings[0]


def test_app_score_is_capped_at_100():
    every_permission = [
        "SEND_SMS", "RECEIVE_SMS", "READ_SMS", "REQUEST_INSTALL_PACKAGES", "SYSTEM_ALERT_WINDOW",
        "BIND_ACCESSIBILITY_SERVICE", "READ_CONTACTS", "READ_CALL_LOG", "RECORD_AUDIO",
    ]

    assert app_metadata_risk(every_permission)[0] == 100


def test_risk_level_thresholds():
    assert risk_level(0) == "low"
    assert risk_level(39.9) == "low"
    assert risk_level(40) == "medium"
    assert risk_level(74.9) == "medium"
    assert risk_level(75) == "high"


# --- brand profile schema ----------------------------------------------------
def test_brand_profile_accepts_domains_and_urls_as_submitted():
    brand = BrandProfileCreate(name="  Acme ", official_domains=["acme.com", "https://acme.co.in"])

    assert brand.name == "Acme"
    assert brand.official_domains == ["acme.com", "https://acme.co.in"]


def test_brand_profile_without_domains_is_still_allowed():
    assert BrandProfileCreate(name="Acme").official_domains == []


def test_brand_profile_rejects_invalid_official_domains():
    for bad_value in ["not a domain", "1.2.3.4"]:
        with pytest.raises(ValidationError) as error:
            BrandProfileCreate(name="Acme", official_domains=["acme.com", bad_value])
        assert "is not a valid domain name" in str(error.value)
