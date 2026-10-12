"""Perceptual hashing for logo/icon similarity."""
from PIL import Image
import imagehash


def perceptual_hash(image_path: str) -> str:
    img = Image.open(image_path)
    return str(imagehash.phash(img))


def hash_similarity(hash1: str, hash2: str) -> float:
    if not hash1 or not hash2:
        return 0.0
    h1 = imagehash.hex_to_hash(hash1)
    h2 = imagehash.hex_to_hash(hash2)
    distance = h1 - h2
    return round(1.0 - (distance / 64.0), 4)


def compare_images(path1: str, path2: str) -> float:
    return hash_similarity(perceptual_hash(path1), perceptual_hash(path2))
