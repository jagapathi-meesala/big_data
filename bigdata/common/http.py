"""Hardened HTTP fetch for dataset downloads.

Enforces: https only, a hostname allowlist of the public data sources used by
RADAR, rejection of private/loopback/link-local/reserved resolved addresses,
and hop-by-hop redirect re-validation (no blind redirect following).
"""
import ipaddress
import socket
from urllib.parse import urlparse

import requests

ALLOWED_HOSTS = {
    # IMD gridded rainfall
    "www.imdpune.gov.in", "imdpune.gov.in",
    # NOAA ONI index
    "www.cpc.ncep.noaa.gov", "cpc.ncep.noaa.gov",
    "psl.noaa.gov", "www.psl.noaa.gov",
    "origin.csl.noaa.gov",
    # GADM polygons
    "geodata.ucdavis.edu",
    # live feeds used by the streaming layer
    "www.gdacs.org", "gdacs.org",
    "api.open-meteo.com", "archive-api.open-meteo.com",
    "router.project-osrm.org",
    "api.worldbank.org",
    "api.usgs.gov", "earthquake.usgs.gov",
    "eonet.sci.gsfc.nasa.gov", "api.nasa.gov",
}


class FetchError(RuntimeError):
    pass


def _validate_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise FetchError("only https URLs are allowed")
    host = parsed.hostname
    if not host or host.lower() not in ALLOWED_HOSTS:
        raise FetchError("host not in the dataset-source allowlist")
    try:
        infos = socket.getaddrinfo(host, 443, proto=socket.IPPROTO_TCP)
    except OSError as exc:
        raise FetchError(f"DNS resolution failed: {exc}")
    if not infos:
        raise FetchError("no DNS resolution results")
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            raise FetchError("resolved address is not a public IP")
    return host


def safe_fetch(url: str, timeout: int = 120, stream: bool = False) -> requests.Response:
    """GET with scheme/host/IP validation; every redirect hop re-validated."""
    session = requests.Session()
    current = url
    for _ in range(6):
        _validate_url(current)
        resp = session.get(current, timeout=timeout, stream=stream, allow_redirects=False)
        if resp.is_redirect:
            location = resp.headers.get("Location", "")
            resp.close()
            if not location:
                raise FetchError("empty redirect target")
            current = location
            continue
        return resp
    raise FetchError("too many redirects")
