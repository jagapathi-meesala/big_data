"""IMD 0.25-degree gridded daily rainfall — download + convert to Parquet.

Primary path: the IMDLIB package (pip install imdlib) downloads yearwise IMD
gridded rainfall files. Fallback: manually download yearwise .grd files into
datasets/raw/imd_gridded/ (see README_RADAR.md for mirror URLs) — the parser
below handles the standard IMD yearwise ASCII .grd format either way.

Output: datasets/raw/imd_parquet/rain_<year>.parquet with columns
    date (datetime64[ns]), lat, lon, rain_mm
filtered to the RADAR study region (default) or all-India (--all-india).

Usage:
    python download_imd_grid.py --start 1901 --end 2024            # via imdlib
    python download_imd_grid.py --convert-only                     # convert existing .grd
    python download_imd_grid.py --all-india --start 1901 --end 2024
"""
import argparse
import sys
from pathlib import Path

import _bootstrap  # noqa: F401
import numpy as np
import pandas as pd

from config import (
    CLIMATOLOGY_BASELINE,
    IMD_GRID_DIR,
    IMD_PARQUET_DIR,
    IMD_REGION,
)
from common.io import save_parquet

YEARWISE_URL_HINT = (
    "IMD Pune gridded data page: https://www.imdpune.gov.in/Clim_Pred_Lrf_New/Grided_Data_Download.html\n"
    "Place yearwise files as datasets/raw/imd_gridded/rain_<year>.grd (or <year>.grd)."
)


def _grd_candidates(year: int):
    stem = IMD_GRID_DIR / f"rain_{year}.grd"
    if stem.exists():
        return stem
    alt = IMD_GRID_DIR / f"{year}.grd"
    if alt.exists():
        return alt
    return None


def parse_yearwise_grd(path: Path) -> pd.DataFrame:
    """Parse one IMD yearwise .grd file into a long-form DataFrame.

    Format (IMD yearwise ASCII grid):
        header: lon_min lat_min grid_res n_lon n_lat year
        then n_days * n_lat * n_lon floats (day-major, latitude rows south->north),
        -99.0 marks missing (ocean cells).
    """
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        header = f.readline().split()
        if len(header) < 6:
            raise ValueError(f"unexpected .grd header in {path.name}: {header}")
        lon0, lat0, res = float(header[0]), float(header[1]), float(header[2])
        nlon, nlat, year = int(header[3]), int(header[4]), int(header[5])
        raw = np.array(f.read().split(), dtype=np.float64)

    ncell = nlat * nlon
    if raw.size < ncell or raw.size % ncell != 0:
        raise ValueError(f"{path.name}: {raw.size} values not divisible by {ncell}")
    ndays = raw.size // ncell
    grid = raw.reshape(ndays, nlat, nlon)

    lats = lat0 + res * np.arange(nlat)
    lons = lon0 + res * np.arange(nlon)
    dates = pd.date_range(f"{year}-01-01", periods=ndays, freq="D")

    # long form, region-filtered (vectorised reshape per day is too big for
    # all-India in one frame; we iterate days and keep only non-missing cells)
    frames = []
    for i, day in enumerate(dates):
        day_grid = grid[i]
        mask = day_grid > -90.0  # -99 (and any sentinel) is missing
        if not mask.any():
            continue
        jj, ii = np.nonzero(mask)
        frames.append(
            pd.DataFrame(
                {
                    "date": day,
                    "lat": lats[jj],
                    "lon": lons[ii],
                    "rain_mm": day_grid[jj, ii],
                }
            )
        )
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame(
        columns=["date", "lat", "lon", "rain_mm"]
    )


def _region_filter(df: pd.DataFrame, all_india: bool) -> pd.DataFrame:
    if all_india:
        return df
    r = IMD_REGION
    keep = (
        (df["lon"] >= r["lon_min"])
        & (df["lon"] <= r["lon_max"])
        & (df["lat"] >= r["lat_min"])
        & (df["lat"] <= r["lat_max"])
    )
    return df[keep].reset_index(drop=True)


def convert_existing(start: int, end: int, all_india: bool) -> int:
    IMD_PARQUET_DIR.mkdir(parents=True, exist_ok=True)
    done = 0
    for year in range(start, end + 1):
        out = IMD_PARQUET_DIR / f"rain_{year}.parquet"
        if out.exists():
            done += 1
            continue
        src = _grd_candidates(year)
        if src is None:
            print(f"[imd] missing {year} (no .grd found) — {YEARWISE_URL_HINT}")
            continue
        df = _region_filter(parse_yearwise_grd(src), all_india)
        save_parquet(df, out)
        done += 1
        print(f"[imd] converted {year}: {len(df):,} cells-days")
    return done


def download_via_imdlib(start: int, end: int) -> int:
    """Download yearwise .grd files using IMDLIB (best-effort)."""
    try:
        import imdlib as imd
    except ImportError:
        print("[imd] imdlib not installed — pip install imdlib, or use --convert-only "
              "with manually downloaded .grd files.")
        print(YEARWISE_URL_HINT)
        return 0
    IMD_GRID_DIR.mkdir(parents=True, exist_ok=True)
    ok = 0
    for year in range(start, end + 1):
        if _grd_candidates(year):
            ok += 1
            continue
        try:
            data = imd.get_data("rain", year, year, fn_format="yearwise")
            # imdlib writes to its own data dir; locate and copy
            src_dir = Path(getattr(imd, "file_dir", Path.cwd() / "data"))
            for candidate in src_dir.rglob(f"*{year}*.grd"):
                target = IMD_GRID_DIR / f"rain_{year}.grd"
                if not target.exists():
                    target.write_bytes(candidate.read_bytes())
                ok += 1
                break
            else:
                print(f"[imd] imdlib returned no .grd for {year}")
            del data
        except Exception as exc:  # network failures are expected; keep going
            print(f"[imd] download failed for {year}: {exc}")
    return ok


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--start", type=int, default=1901)
    ap.add_argument("--end", type=int, default=2024)
    ap.add_argument("--all-india", action="store_true",
                    help="keep the full India grid instead of the AP+TS window")
    ap.add_argument("--convert-only", action="store_true",
                    help="skip downloads, convert existing .grd files")
    ap.add_argument("--baseline-check", action="store_true",
                    help="print coverage of the climatology baseline period")
    args = ap.parse_args()

    if not args.convert_only:
        download_via_imdlib(args.start, args.end)

    n = convert_existing(args.start, args.end, args.all_india)
    print(f"[imd] parquet years available: {n}/{args.end - args.start + 1}")

    if args.baseline_check:
        lo, hi = CLIMATOLOGY_BASELINE
        have = sorted(
            int(p.stem.split("_")[-1])
            for p in IMD_PARQUET_DIR.glob("rain_*.parquet")
            if lo <= int(p.stem.split("_")[-1]) <= hi
        )
        missing = [y for y in range(lo, hi + 1) if y not in set(have)]
        print(f"[imd] baseline {lo}-{hi}: {len(have)} years present, missing: {missing[:10]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
