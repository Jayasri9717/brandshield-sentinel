from core.detection.similarity import (
    levenshtein_similarity,
    jaro_winkler_similarity,
    name_similarity,
)


def test_identical_strings():
    assert levenshtein_similarity("zomato", "zomato") == 1.0
    assert name_similarity("zomato", "zomato") == 1.0


def test_similar_handles():
    score = name_similarity("zomato", "zomato_support")
    assert score > 0.6


def test_very_different():
    score = name_similarity("zomato", "paypal")
    assert score < 0.3


def test_empty_strings():
    assert levenshtein_similarity("", "") == 0.0
    assert name_similarity("", "x") == 0.0


def test_case_insensitive():
    a = name_similarity("Zomato", "zomato")
    b = name_similarity("zomato", "zomato")
    assert a == b


def test_jaro_winkler_prefix_bonus():
    score = jaro_winkler_similarity("zomato", "zomato_delivery")
    assert score > 0.7


def test_very_long_handle():
    long_handle = "zomato_" + "x" * 500
    score = name_similarity("zomato", long_handle)
    assert 0.0 <= score <= 1.0
