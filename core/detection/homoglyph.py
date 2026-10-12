"""Detect Unicode confusable characters."""
from confusable_homoglyphs import confusables


def detect_homoglyphs(text: str) -> list:
    """Returns list of {char, position, alias} for suspicious characters."""
    if not text:
        return []
    hits = []
    for i, char in enumerate(text):
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
