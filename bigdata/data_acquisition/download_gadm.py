"""Optional: GADM level-2 district polygons for polygon-based grid mapping.

Downloads the GADM 4.1 India level-2 GeoJSON archive (~60 MB) into
datasets/raw/gadm/. If this fails or is skipped, district_grid_map.py falls
back to the centroid-radius method, which needs no external file.

Usage: python download_gadm.py
"""
import sys

import _bootstrap  # noqa: F401

from common.http import safe_fetch
from common.io import save_bytes

from config import GADM_DIR

GADM_URL = "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_IND_2.json.zip"


def main() -> int:
    GADM_DIR.mkdir(parents=True, exist_ok=True)
    target = GADM_DIR / "gadm41_IND_2.json.zip"
    if target.exists():
        print(f"[gadm] already present: {target}")
        return 0
    try:
        resp = safe_fetch(GADM_URL, timeout=300, stream=True)
        resp.raise_for_status()
        payload = resp.content
        resp.close()
        saved = save_bytes(payload, target)
        print(f"[gadm] saved {saved} ({len(payload) / 1e6:.1f} MB)")
        return 0
    except Exception as exc:
        print(f"[gadm] download failed ({exc}). The centroid-radius mapping works "
              "without this file — polygon mapping is an optional refinement.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
