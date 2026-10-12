"""Detect Unicode confusable characters that could impersonate Latin text."""
from confusable_homoglyphs import confusables


def detect_homoglyphs(text: str) -> list:
    """Return list of {char, position, alias} for suspicious non-ASCII characters.

    We only flag characters that are NOT plain ASCII alphanumerics. That is
    because the underlying library reports every Latin character as
    "confusable" (since it can be confused with itself in other scripts).
    We care about the reverse: non-Latin characters posing as Latin.
    """
    if not text:
        return []
    hits = []
    for i, char in enumerate(text):
        # Skip plain ASCII letters and digits
        if char.isascii() and char.isalnum():
            continue
        # Skip common punctuation and whitespace
        if char in " .,-_@#:/?&=+!":
            continue
        conf = confusables.is_confusable(char)
        if conf:
            hits.append({
                "char": char,
                "position": i,
                "alias": conf[0].get("alias") if conf else None,
            })
    return hits


def has_homoglyphs(text: str) -> bool:
    return len(detect_homoglyphs(text)) > 0
