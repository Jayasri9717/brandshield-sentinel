"""DNS resolution and HTTP liveness checks."""
import socket
import requests


def domain_resolves(domain: str, timeout: int = 3) -> bool:
    try:
        socket.setdefaulttimeout(timeout)
        socket.gethostbyname(domain)
        return True
    except (socket.gaierror, socket.timeout):
        return False


def http_status(url: str, timeout: int = 5) -> int | None:
    try:
        resp = requests.head(url, timeout=timeout, allow_redirects=True)
        return resp.status_code
    except requests.RequestException:
        return None


def brand_on_page(url: str, brand: str, timeout: int = 5) -> bool:
    try:
        resp = requests.get(url, timeout=timeout)
        return brand.lower() in resp.text.lower()
    except requests.RequestException:
        return False
