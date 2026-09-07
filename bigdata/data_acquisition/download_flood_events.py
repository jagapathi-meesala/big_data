"""District-level flood events for AP/Telangana — ground truth for validation.

Normalized output schema (datasets/raw/flood_events.csv):
    district, date_start, date_end, deaths, affected, damage_k_usd, source, notes

Sources, in order of preference:
  ifi    India Flood Inventory (Saharia et al. 2023, Scientific Data) —
         district-coded flood events 1978-2020. Download the release bundle
         manually (Zenodo/HydroShare, see README_RADAR.md) and unzip under
         datasets/raw/ifi/ — this script finds and normalizes the tables.
  emdat  EM-DAT classic CSV (free account at emdat.be) — save as
         datasets/raw/emdat_india.csv. Locations are free text; we map them
         to legacy districts by name matching (state filter AP/TS).
  gdacs  GDACS historical event API (global alerts, ~2000+, sparse for India).
  csv    any pre-normalized file: --source csv --file <path>

Usage:
    python download_flood_events.py --source ifi
    python download_flood_events.py --source emdat
    python download_flood_events.py --source csv --file datasets/raw/events.csv
"""
import argparse
import re
import sys
from datetime import date
from pathlib import Path

import _bootstrap  # noqa: F401
import pandas as pd

from config import FLOOD_EVENTS_CSV, GADM_DIR, PROJECT_ROOT, RAW_DIR
from common.aliases import _norm, canonical_district
from common.io import read_csv, save_csv

IFI_DIR = RAW_DIR / "ifi"
EMDAT_FILE = RAW_DIR / "emdat_india.csv"

STATE_TOKENS = ("andhra pradesh", "telangana", "ap", "ts")


def _empty_frame() -> pd.DataFrame:
    return pd.DataFrame(
        columns=["district", "date_start", "date_end", "deaths", "affected",
                 "damage_k_usd", "source", "notes"]
    )


def _districts_from_text(text: str):
    """Find legacy district names mentioned in a free-text location field."""
    t = _norm(text)
    hits = set()
    for legacy in [
        "Srikakulam", "Vizianagaram", "Visakhapatnam", "East Godavari",
        "West Godavari", "Krishna", "Guntur", "Prakasam", "Nellore",
        "Chittoor", "Y.S.R.", "Anantapur", "Kurnool", "Adilabad",
        "Nizamabad", "Karimnagar", "Medak", "Hyderabad", "Rangareddy",
        "Mahbubnagar", "Nalgonda", "Warangal", "Khammam",
    ]:
        if _norm(legacy) in t:
            hits.add(legacy)
    return hits


# ------------------------------------------------------------------- IFI ---
def load_ifi() -> pd.DataFrame:
    """India Flood Inventory: locate the event/impact table inside the bundle."""
    if not IFI_DIR.exists() or not any(IFI_DIR.iterdir()):
        print(
            "[events] IFI bundle not found. Download from Zenodo/HydroShare "
            "(search 'India Flood Inventory Saharia'), unzip into "
            f"{IFI_DIR} and re-run. Falling back to other sources."
        )
        return _empty_frame()
    frames = []
    for f in IFI_DIR.rglob("*.csv"):
        try:
            df = pd.read_csv(f, low_memory=False)
        except Exception:
            continue
        cols = {c.lower().strip(): c for c in df.columns}
        dist_col = next((cols[c] for c in cols if "district" in c), None)
        date_col = next((cols[c] for c in cols if c in ("date", "start_date", "event_date", "onset_date")), None)
        if not dist_col or not date_col:
            continue
        out = pd.DataFrame()
        out["district"] = df[dist_col].map(canonical_district)
        out["date_start"] = pd.to_datetime(df[date_col], errors="coerce")
        end_col = next((cols[c] for c in cols if c in ("end_date", "to_date")), None)
        out["date_end"] = (
            pd.to_datetime(df[end_col], errors="coerce") if end_col else out["date_start"]
        )
        for target, candidates in (
            ("deaths", ["deaths", "fatalities", "human_lives_lost", "dead"]),
            ("affected", ["affected", "population_affected", "people_affected"]),
            ("damage_k_usd", ["damage", "damage_k_usd", "losses", "damage_k usd"]),
        ):
            col = next((cols[c] for c in cols if c in [x.lower() for x in candidates]), None)
            out[target] = pd.to_numeric(df[col], errors="coerce") if col else float("nan")
        out = out.dropna(subset=["district", "date_start"])
        out["source"] = "ifi"
        out["notes"] = f.name
        frames.append(out)
    if not frames:
        print("[events] IFI folder present but no recognizable district/event table.")
        return _empty_frame()
    return pd.concat(frames, ignore_index=True)


# ----------------------------------------------------------------- EMDAT ---
def load_emdat() -> pd.DataFrame:
    if not EMDAT_FILE.exists():
        print(
            "[events] EM-DAT csv not found. Register (free) at emdat.be, export "
            "India floods, save as datasets/raw/emdat_india.csv and re-run."
        )
        return _empty_frame()
    df = read_csv(EMDAT_FILE, low_memory=False)
    cols = {c.lower().strip(): c for c in df.columns}
    year = next((cols[c] for c in cols if c in ("start year", "year")), None)
    month = next((cols[c] for c in cols if c in ("start month", "month")), None)
    day = next((cols[c] for c in cols if c in ("start day", "day")), None)
    loc = next((cols[c] for c in cols if "location" in c), None)
    country = next((cols[c] for c in cols if "country" in c), None)
    deaths = next((cols[c] for c in cols if "death" in c), None)
    affected = next((cols[c] for c in cols if "affected" in c and "total" not in c), None)
    damage = next((cols[c] for c in cols if "damage" in c and ("000" in c or "us" in c)), None)

    if country is not None:
        df = df[df[country].astype(str).str.contains("India", case=False, na=False)]
    rows = []
    for _, r in df.iterrows():
        text = f"{r.get(loc, '') if loc else ''} {r.get(country, '') if country else ''}"
        if not any(tok in str(text).lower() for tok in ("andhra", "telangana")):
            # keep state-agnostic rows out — location text must name AP/TS
            if not any(s in str(text).lower() for s in ("andhra", "telangana")):
                continue
        districts = _districts_from_text(str(text))
        if not districts:
            continue
        try:
            y = int(r[year]) if year and pd.notna(r[year]) else None
            m = int(r[month]) if month and pd.notna(r[month]) else 6
            d = int(r[day]) if day and pd.notna(r[day]) else 15
            start = date(y, min(max(m, 1), 12), min(max(d, 1), 28)) if y else None
        except Exception:
            start = None
        if not start:
            continue
        for district in districts:
            rows.append(
                {
                    "district": district,
                    "date_start": start,
                    "date_end": start,
                    "deaths": pd.to_numeric(r[deaths], errors="coerce") if deaths else float("nan"),
                    "affected": pd.to_numeric(r[affected], errors="coerce") if affected else float("nan"),
                    "damage_k_usd": pd.to_numeric(r[damage], errors="coerce") if damage else float("nan"),
                    "source": "emdat",
                    "notes": str(text)[:200],
                }
            )
    return pd.DataFrame(rows)


# ----------------------------------------------------------------- GDACS ---
GDACS_URL = (
    "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?fromDate={f}"
    "&toDate={t}&eventlist=FL"
)


def load_gdacS(year_from: int = 2015, year_to: int = 2024) -> pd.DataFrame:
    import requests

    rows = []
    for y0 in range(year_from, year_to + 1):
        try:
            r = requests.get(
                GDACS_URL.format(f=f"{y0}-01-01", t=f"{y0}-12-31"), timeout=60
            )
            r.raise_for_status()
            events = r.json().get("events", r.json() if isinstance(r.json(), list) else [])
        except Exception as exc:
            print(f"[events] gdacs {y0} failed: {exc}")
            continue
        for ev in events:
            text = " ".join(
                str(ev.get(k, "")) for k in ("eventname", "country", "affectedcountries")
            )
            iso = str(ev.get("isodate", ""))[:10]
            if not iso or "india" not in text.lower():
                continue
            for district in _districts_from_text(text):
                rows.append(
                    {
                        "district": district,
                        "date_start": pd.Timestamp(iso),
                        "date_end": pd.Timestamp(iso),
                        "deaths": float("nan"),
                        "affected": float("nan"),
                        "damage_k_usd": float("nan"),
                        "source": "gdacs",
                        "notes": text[:200],
                    }
                )
    return pd.DataFrame(rows)


# ------------------------------------------------------------------- csv ---
def load_plain_csv(path: Path) -> pd.DataFrame:
    df = read_csv(path)
    out = _empty_frame()
    out["district"] = df["district"].map(canonical_district)
    out["date_start"] = pd.to_datetime(df["date_start"], errors="coerce")
    out["date_end"] = pd.to_datetime(
        df["date_end"], errors="coerce"
    ).fillna(pd.to_datetime(df["date_start"], errors="coerce"))
    for col in ("deaths", "affected", "damage_k_usd"):
        if col in df.columns:
            out[col] = pd.to_numeric(df[col], errors="coerce")
    out["source"] = df.get("source", "csv")
    out["notes"] = df.get("notes", "")
    return out.dropna(subset=["district", "date_start"])


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--source", choices=["ifi", "emdat", "gdacs", "csv"], default="ifi")
    ap.add_argument("--file", type=str, default="")
    ap.add_argument("--append", action="store_true", help="merge into existing output")
    args = ap.parse_args()

    if args.source == "ifi":
        events = load_ifi()
    elif args.source == "emdat":
        events = load_emdat()
    elif args.source == "gdacs":
        events = load_gdacS()
    else:
        if not args.file:
            print("[events] --source csv requires --file")
            return 2
        events = load_plain_csv(Path(PROJECT_ROOT) / args.file)

    if args.append and FLOOD_EVENTS_CSV.exists():
        events = pd.concat([read_csv(FLOOD_EVENTS_CSV), events], ignore_index=True)

    if not events.empty:
        events = events.drop_duplicates(
            subset=["district", "date_start", "source"], keep="first"
        ).sort_values(["date_start", "district"]).reset_index(drop=True)
        save_csv(events, FLOOD_EVENTS_CSV)
        span = (events["date_start"].min(), events["date_start"].max())
        print(f"[events] saved {len(events):,} events ({span[0]} .. {span[1]})")
        print(events["source"].value_counts().to_string())
    else:
        print("[events] no events collected from the requested source.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
