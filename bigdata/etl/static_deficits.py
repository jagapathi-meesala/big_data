"""Static socio-technical deficit layer (Dd/Hd/Md/Vd) for the 23 legacy districts.

Ground-truth Census-2011 inputs — no synthetic proxies, no hardcoded constants:

  Dd (exposure deficit)      = minmax( pop_density * ln(1 + population) )
  Md (mobility deficit)      = 1 - minmax( vehicle_ownership_ratio )
  Vd (housing vulnerability) = minmax( dilapidated_households_ratio )
  Hd (healthcare deficit)    = 1 - minmax( beds_per_10k )

Hospital beds = point facilities from datasets/hospitals.csv (50 beds each,
the file's per-facility norm) + state bed totals read from datasets/
india_states.csv (NOT hardcoded) allocated to districts by population share.

Legacy district areas = sum of member current-district areas from
datasets/final_districts.csv (fixes the old 8000 km^2 fallback).

Output: bigdata/research/results/district_static_deficits.csv
"""
import sys

import _bootstrap  # noqa: F401  (local path bootstrap)
import numpy as np
import pandas as pd

from common.aliases import canonical_district, current_to_legacy
from common.io import read_csv, save_csv

from config import (
    CENSUS_2011_CSV,
    FINAL_DISTRICTS_CSV,
    HOSPITALS_CSV,
    INDIA_STATES_CSV,
    LEGACY_DISTRICTS,
    STATIC_DEFS_CSV,
)

BEDS_PER_FACILITY = 50   # per-facility norm in datasets/hospitals.csv metadata

CITY_TO_LEGACY = {
    "kakinada": "East Godavari",
    "secunderabad": "Hyderabad",
    "vijayawada": "Krishna",
    "tirupati": "Chittoor",
    "visakhapatnam": "Visakhapatnam",
    "hyderabad": "Hyderabad",
    "guntur": "Guntur",
    "anantapur": "Anantapur",
    "warangal": "Warangal",
    "nellore": "Nellore",
}


def _col(df: pd.DataFrame, *needles: str) -> str:
    for c in df.columns:
        lc = c.lower()
        if all(n.lower() in lc for n in needles):
            return c
    raise KeyError(f"no column matching {needles} in {list(df.columns)[:8]}...")


def _minmax(s: pd.Series) -> pd.Series:
    lo, hi = s.min(), s.max()
    return (s - lo) / (hi - lo) if hi > lo else s * 0.0


def census_layer() -> pd.DataFrame:
    df = read_csv(CENSUS_2011_CSV)
    name_c = _col(df, "district", "name")
    pop_c = _col(df, "population")
    hh_c = _col(df, "households")
    bike_c = _col(df, "bicycle")
    moto_c = _col(df, "scooter")
    car_c = _col(df, "car", "jeep")
    dila_c = _col(df, "dilapidated")

    out = pd.DataFrame()
    out["district"] = df[name_c].map(canonical_district)
    out["population"] = pd.to_numeric(df[pop_c], errors="coerce")
    out["households"] = pd.to_numeric(df[hh_c], errors="coerce")
    out["vehicle_ratio"] = (
        pd.to_numeric(df[bike_c], errors="coerce")
        + pd.to_numeric(df[moto_c], errors="coerce")
        + pd.to_numeric(df[car_c], errors="coerce")
    ) / out["households"]
    out["dilapidated_ratio"] = (
        pd.to_numeric(df[dila_c], errors="coerce") / out["households"]
    )
    return out.dropna(subset=["district"]).drop_duplicates("district")


def area_layer() -> pd.DataFrame:
    df = read_csv(FINAL_DISTRICTS_CSV)
    dist_c = _col(df, "district")
    area_c = _col(df, "area")
    state_c = _col(df, "state")
    keep = df[state_c].astype(str).str.lower().str.contains(
        "andhra|telangana", regex=True
    )
    df = df[keep].copy()
    df["district"] = df[dist_c].map(current_to_legacy)
    df["area_sq_km"] = pd.to_numeric(df[area_c], errors="coerce")
    return (
        df.dropna(subset=["district"])
        .groupby("district", as_index=False)["area_sq_km"]
        .sum()
    )


def hospital_layer(pop: pd.Series, index: pd.Index) -> pd.DataFrame:
    """Point facilities + state bed totals allocated by population share."""
    beds_point = pd.Series(0.0, index=index)
    try:
        hosp = read_csv(HOSPITALS_CSV)
        dist_c = _col(hosp, "district")
        for d in hosp[dist_c].dropna().astype(str):
            legacy = CITY_TO_LEGACY.get(_norm_key(d))
            if legacy is None:
                legacy = canonical_district(d)
            if legacy in beds_point.index:
                beds_point[legacy] += BEDS_PER_FACILITY
    except Exception as exc:
        print(f"[deficits] hospital points unavailable ({exc}); using state totals only")

    states = read_csv(INDIA_STATES_CSV)
    name_c = _col(states, "name")
    beds_c = _col(states, "total", "beds")
    st = states[states[name_c].astype(str).str.lower().str.contains("andhra|telangana")][
        [name_c, beds_c]
    ].copy()
    st["total_beds"] = pd.to_numeric(st[beds_c], errors="coerce")

    pop_by_state = {
        "andhra": 0.0,
        "telangana": 0.0,
    }
    legacy_state = {
        d: ("telangana" if d in {
            "Adilabad", "Nizamabad", "Karimnagar", "Medak", "Hyderabad",
            "Rangareddy", "Mahbubnagar", "Nalgonda", "Warangal", "Khammam",
        } else "andhra")
        for d in index
    }
    for d in index:
        pop_by_state[legacy_state[d]] += float(pop[d])

    allocated = pd.Series(0.0, index=index)
    for _, row in st.iterrows():
        key = "telangana" if "telangana" in str(row[name_c]).lower() else "andhra"
        state_pop = pop_by_state[key]
        if state_pop <= 0 or pd.isna(row["total_beds"]):
            continue
        for d in index:
            if legacy_state[d] == key:
                allocated[d] += float(row["total_beds"]) * float(pop[d]) / state_pop
    return (beds_point + allocated).rename("total_beds")


def _norm_key(s: str) -> str:
    import re

    return re.sub(r"[^a-z]", "", str(s).lower())


def build() -> pd.DataFrame:
    census = census_layer().set_index("district").reindex(LEGACY_DISTRICTS)
    if census[["population"]].isna().any().any():
        missing = census[census["population"].isna()].index.tolist()
        raise ValueError(f"legacy districts missing from census file: {missing}")
    census = census.join(area_layer().set_index("district"))
    census["population_density"] = census["population"] / census["area_sq_km"]

    beds = hospital_layer(census["population"], census.index)
    census = census.join(beds)
    census["beds_per_10k"] = census["total_beds"] / census["population"] * 10_000

    census["Dd"] = _minmax(
        census["population_density"] * np.log1p(census["population"])
    )
    census["Md"] = 1.0 - _minmax(census["vehicle_ratio"])
    census["Vd"] = _minmax(census["dilapidated_ratio"])
    census["Hd"] = 1.0 - _minmax(census["beds_per_10k"])
    census = census.reset_index()
    return census


def main() -> int:
    df = build()
    save_csv(df, STATIC_DEFS_CSV)
    print(f"[deficits] saved {len(df)} districts -> {STATIC_DEFS_CSV.name}")
    print(
        df[["district", "population", "Dd", "Hd", "Md", "Vd", "beds_per_10k"]]
        .round(4)
        .to_string(index=False)
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
