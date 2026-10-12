"""Levenshtein and Jaro-Winkler similarity."""
from rapidfuzz.distance import Levenshtein, JaroWinkler


def levenshtein_similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    max_len = max(len(a), len(b))
    return 1.0 - (Levenshtein.distance(a, b) / max_len)


def jaro_winkler_similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return JaroWinkler.similarity(a.lower(), b.lower())


def name_similarity(a: str, b: str) -> float:
    """Weighted combination — Jaro-Winkler weighted higher for prefix matches."""
    if not a or not b:
        return 0.0
    lev = levenshtein_similarity(a.lower(), b.lower())
    jw = jaro_winkler_similarity(a, b)
    return round(lev * 0.4 + jw * 0.6, 4)
