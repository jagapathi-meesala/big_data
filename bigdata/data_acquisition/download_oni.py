"""NOAA ONI (Oceanic Nino Index) — monthly ENSO covariate.

Downloads the CPC ONI ascii table (3-month running mean SST anomaly for the
Nino 3.4 region, 1950-present) and maps each season to its middle month:
DJF->Jan, JFM->Feb, ... NDJ->Dec.

Output: datasets/raw/oni_monthly.csv  (date, oni)

Usage: python download_oni.py
"""
import sys
from datetime import date
from io import StringIO
from pathlib import Path

import _bootstrap  # noqa: F401
import pandas as pd

from common.http import safe_fetch
from common.io import read_text_raw, save_csv

from config import ONI_CSV, RAW_DIR

URLS = [
    "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt",
    "https://psl.noaa.gov/gcos_wgsp/Timeseries/Data/oni.ascii.txt",
]

SEASON_TO_MONTH = {
    "DJF": 1, "JFM": 2, "FMA": 3, "MAM": 4, "AMJ": 5, "MJJ": 6,
    "JJA": 7, "JAS": 8, "ASO": 9, "SON": 10, "OND": 11, "NDJ": 12,
}


def fetch() -> str | None:
    for url in URLS:
        try:
            resp = safe_fetch(url, timeout=60)
            resp.raise_for_status()
            text = resp.text
            resp.close()
            if "SEASONS" in text[:200] or "YR" in text[:200]:
                return text
        except Exception as exc:
            print(f"[oni] {url} failed: {exc}")
    return None


def parse(text: str) -> pd.DataFrame:
    df = pd.read_csv(StringIO(text), sep=r"\s+")
    df.columns = [c.strip().upper() for c in df.columns]
    rows = []
    for _, r in df.iterrows():
        month = SEASON_TO_MONTH.get(str(r["SEASONS"]).strip())
        if month is None:
            continue
        rows.append({"date": date(int(r["YR"]), month, 1), "oni": float(r["ANOM"])})
    return pd.DataFrame(rows).dropna().sort_values("date").reset_index(drop=True)


def main() -> int:
    text = fetch()
    if text is None:
        local = RAW_DIR / "oni.ascii.txt"
        if local.exists():
            text = read_text_raw(local)
            print("[oni] using locally saved oni.ascii.txt")
        else:
            print(f"[oni] all mirrors failed. Manually save the CPC ONI table as "
                  f"{local} and re-run.")
            return 1
    out = parse(text)
    save_csv(out, ONI_CSV)
    print(f"[oni] saved {len(out):,} monthly values "
          f"({out['date'].min()} .. {out['date'].max()})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
