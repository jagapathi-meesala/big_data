"""District <-> IMD-grid mapping (the fix for the old subdivision broadcast).

Builds two artifacts:

1. district_centroids.csv — the 23 legacy (Census-2011) district centroids,
   derived as population-weighted means of their member post-bifurcation
   districts from datasets/final_districts.csv (population from the same file).

2. district_grid_map.csv — long table (lat, lon, district, weight) mapping
   0.25-degree grid cell centres to legacy districts with inverse-distance
   weights. Two methods:
     * polygon (default if GADM exists): cell assigned to the legacy district
       whose member polygons contain the cell centre; remaining cells fall
       back to the nearest centroid;
     * radius (default otherwise): all cells within RADIUS_DEG of a legacy
       centroid are assigned to it (a cell may serve multiple districts;
       weights are inverse-distance normalized per district).

Usage: python district_grid_map.py [--radius 0.7] [--force-radius]
"""
import argparse
import sys
import zipfile
from pathlib import Path

import _bootstrap  # noqa: F401
import numpy as np
import pandas as pd

from common.aliases import _norm, current_to_legacy
from common.io import read_csv, save_csv

from config import (
    DISTRICT_CENTROIDS_CSV,
    DISTRICT_MAP_CSV,
    FINAL_DISTRICTS_CSV,
    GADM_DIR,
    IMD_REGION,
    LEGACY_DISTRICTS,
)

RADIUS_DEG = 0.7   # ~78 km; documented in the paper as the aggregation kernel


# ------------------------------------------------------------- centroids ---
def build_centroids() -> pd.DataFrame:
    df = read_csv(FINAL_DISTRICTS_CSV)
    df.columns = [c.strip() for c in df.columns]
    dist_col = next(c for c in df.columns if c.lower().startswith("district"))
    pop_col = next(c for c in df.columns if "population" in c.lower())
    lat_col = next(c for c in df.columns if "latitude" in c.lower())
    lon_col = next(c for c in df.columns if "longitude" in c.lower())

    rows = []
    unmatched = []
    for _, r in df.iterrows():
        legacy = current_to_legacy(r[dist_col])
        if legacy is None:
            unmatched.append(str(r[dist_col]))
            continue
        rows.append(
            {
                "district": legacy,
                "population": float(r[pop_col]),
                "lat": float(r[lat_col]),
                "lon": float(r[lon_col]),
            }
        )
    if unmatched:
        print(f"[map] current districts not mapped by name (fallback: nearest "
              f"centroid later): {unmatched}")

    cur = pd.DataFrame(rows)
    cur["wx"] = cur["lon"] * np.cos(np.radians(cur["lat"]))  # approx metric x
    centroids = (
        cur.groupby("district")
        .apply(
            lambda g: pd.Series(
                {
                    "population": g["population"].sum(),
                    "lat": (g["lat"] * g["population"]).sum() / g["population"].sum(),
                    "lon": (g["wx"] * g["population"]).sum()
                    / g["population"].sum()
                    / np.cos(np.radians((g["lat"] * g["population"]).sum()
                                        / g["population"].sum())),
                }
            )
        )
        .reset_index()
    )
    centroids = centroids.set_index("district").reindex(LEGACY_DISTRICTS).reset_index()
    if centroids[["lat", "lon"]].isna().any().any():
        missing = centroids[centroids["lat"].isna()]["district"].tolist()
        raise ValueError(f"legacy districts with no member mapping: {missing}")
    return centroids


def _assign_unmatched_to_nearest(cur: pd.DataFrame) -> pd.DataFrame:
    """For current districts that failed name mapping, attach nearest legacy
    centroid (computed from the matched subset)."""
    known = cur.dropna(subset=["district"])
    cent = (
        known.groupby("district")[["lat", "lon"]].mean().reset_index()
    )
    unmatched = cur[cur["district"].isna()]
    if unmatched.empty:
        return cur
    lats = cent["lat"].to_numpy()
    lons = cent["lon"].to_numpy()
    d = np.sqrt(
        (unmatched["lat"].to_numpy()[:, None] - lats[None, :]) ** 2
        + (unmatched["lon"].to_numpy()[:, None] - lons[None, :]) ** 2
    )
    nearest = cent["district"].to_numpy()[d.argmin(axis=1)]
    cur.loc[unmatched.index, "district"] = nearest
    return cur


# -------------------------------------------------------------- polygons ---
def _load_gadm_polygons():
    """Return list of (legacy_district, rings) for AP+TS current districts."""
    zip_path = GADM_DIR / "gadm41_IND_2.json.zip"
    raw = GADM_DIR / "gadm41_IND_2.json"
    if not raw.exists():
        if not zip_path.exists():
            return None
        with zipfile.ZipFile(zip_path) as z:
            for member in z.namelist():
                member_path = Path(member)
                if member_path.is_absolute() or ".." in member_path.parts:
                    raise ValueError(f"unsafe zip member: {member}")
            z.extractall(GADM_DIR)
    import json

    data = json.loads(raw.read_text(encoding="utf-8", errors="ignore"))
    feats = data.get("features", [])
    out = []
    states = ("andhrapradesh", "telangana")
    for f in feats:
        props = f.get("properties", {})
        name = str(props.get("NAME_2", ""))
        state = _norm(props.get("NAME_1", ""))
        if state not in states:
            continue
        legacy = current_to_legacy(name)
        if legacy is None:
            continue
        geom = f.get("geometry", {})
        if geom.get("type") == "Polygon":
            rings = [geom["coordinates"]]
        elif geom.get("type") == "MultiPolygon":
            rings = geom["coordinates"]
        else:
            continue
        out.append((legacy, rings))
    return out or None


def _point_in_ring(x, y, ring) -> bool:
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if (yi > y) != (yj > y):
            xint = (xj - xi) * (y - yi) / (yj - yi) + xi
            if x < xint:
                inside = not inside
        j = i
    return inside


def _point_in_rings(x, y, multipolygon) -> bool:
    for polygon in multipolygon:
        outer = polygon[0]
        if not _point_in_ring(x, y, outer):
            continue
        if all(not _point_in_ring(x, y, hole) for hole in polygon[1:]):
            return True
    return False


def polygon_map(polygons, lats, lons):
    """Assign each cell centre to the legacy district containing it (first
    containing member polygon wins)."""
    assign = np.full(len(lats), None, dtype=object)
    order = sorted(set(d for d, _ in polygons))
    for legacy in order:
        rings = [r for d, r in polygons if d == legacy]
        for i in range(len(lats)):
            if assign[i] is not None:
                continue
            for mp in rings:
                if _point_in_rings(lons[i], lats[i], mp):
                    assign[i] = legacy
                    break
    return assign


# ------------------------------------------------------------------- map ---
def build_grid_map(centroids: pd.DataFrame, radius: float, force_radius: bool) -> pd.DataFrame:
    r = IMD_REGION
    lats = np.arange(r["lat_min"], r["lat_max"] + 0.125, 0.25)
    lons = np.arange(r["lon_min"], r["lon_max"] + 0.125, 0.25)
    LON, LAT = np.meshgrid(lons, lats)
    flat_lat = LAT.ravel()
    flat_lon = LON.ravel()

    polygons = None if force_radius else _load_gadm_polygons()
    method = "radius"
    if polygons:
        assign = polygon_map(polygons, flat_lat, flat_lon)
        method = "polygon+nearest"
    else:
        assign = np.full(len(flat_lat), None, dtype=object)

    rows = []
    for legacy in LEGACY_DISTRICTS:
        crow = centroids[centroids["district"] == legacy].iloc[0]
        clat, clon = float(crow["lat"]), float(crow["lon"])
        # distance of every cell to this centroid (degrees, lat-corrected lon)
        dx = (flat_lon - clon) * np.cos(np.radians(clat))
        dy = flat_lat - clat
        dist = np.sqrt(dx**2 + dy**2)
        near = dist <= radius
        for i in np.nonzero(near)[0]:
            if assign[i] is not None and assign[i] != legacy:
                continue
            rows.append(
                {
                    "lat": flat_lat[i],
                    "lon": flat_lon[i],
                    "district": legacy,
                    "weight": 1.0 / (1.0 + dist[i] ** 2),
                }
            )
    grid = pd.DataFrame(rows)
    if grid.empty:
        raise ValueError("empty grid map — check IMD_REGION / centroids")
    # unassigned cells: nearest centroid (documented fallback)
    assigned_cells = set(zip(grid["lat"].round(6), grid["lon"].round(6)))
    for i in range(len(flat_lat)):
        key = (round(flat_lat[i], 6), round(flat_lon[i], 6))
        if key in assigned_cells:
            continue
        dx = (flat_lon[i] - centroids["lon"].to_numpy()) * np.cos(
            np.radians(flat_lat[i])
        )
        dy = flat_lat[i] - centroids["lat"].to_numpy()
        d = np.sqrt(dx**2 + dy**2)
        j = int(np.argmin(d))
        if d[j] <= 1.5 * radius:
            grid.loc[len(grid)] = {
                "lat": flat_lat[i],
                "lon": flat_lon[i],
                "district": centroids.iloc[j]["district"],
                "weight": 1.0 / (1.0 + d[j] ** 2),
            }
    grid = grid.groupby(["lat", "lon", "district"], as_index=False)["weight"].sum()
    grid["method"] = method
    return grid


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--radius", type=float, default=RADIUS_DEG)
    ap.add_argument("--force-radius", action="store_true",
                    help="skip polygon mapping even if GADM exists")
    args = ap.parse_args()

    centroids = build_centroids()
    save_csv(centroids, DISTRICT_CENTROIDS_CSV)
    print(f"[map] centroids: {len(centroids)} legacy districts")
    print(centroids.to_string(index=False))

    grid = build_grid_map(centroids, args.radius, args.force_radius)
    save_csv(grid, DISTRICT_MAP_CSV)
    per_d = grid.groupby("district").size()
    print(f"[map] grid map: {len(grid):,} cell-district pairs "
          f"(method={grid['method'].iloc[0]})")
    print(per_d.to_string())
    return 0


if __name__ == "__main__":
    sys.exit(main())
