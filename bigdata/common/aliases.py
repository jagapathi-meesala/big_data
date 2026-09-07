"""Canonical district names and alias resolution.

RADAR uses the 23 legacy (undivided) Census-2011 district names as the single
join key across rainfall, census, hospitals and flood-event layers. This fixes
the legacy pipeline's Rangareddy spelling bug by mapping *every* known variant
explicitly instead of relying on exact string equality.
"""
import re

from config import LEGACY_DISTRICTS


def _norm(name: str) -> str:
    return re.sub(r"[^a-z]", "", str(name).lower())


_ALIASES = {
    "srikakulam": "Srikakulam",
    "vizianagaram": "Vizianagaram",
    "visakhapatnam": "Visakhapatnam",
    "visakhapatanam": "Visakhapatnam",
    "eastgodavari": "East Godavari",
    "westgodavari": "West Godavari",
    "krishna": "Krishna",
    "guntur": "Guntur",
    "prakasam": "Prakasam",
    "nellore": "Nellore",
    "spsnellore": "Nellore",
    "sripottisriramulunellore": "Nellore",
    "chittoor": "Chittoor",
    "ysr": "Y.S.R.",
    "kadapa": "Y.S.R.",
    "ysrkadapa": "Y.S.R.",
    "cuddapah": "Y.S.R.",
    "anantapur": "Anantapur",
    "ananthapuramu": "Anantapur",
    "anantapuramu": "Anantapur",
    "kurnool": "Kurnool",
    "adilabad": "Adilabad",
    "nizamabad": "Nizamabad",
    "karimnagar": "Karimnagar",
    "medak": "Medak",
    "hyderabad": "Hyderabad",
    "rangareddy": "Rangareddy",
    "rangareddi": "Rangareddy",
    "rangareddynagar": "Rangareddy",
    "rangareddy": "Rangareddy",
    "mahbubnagar": "Mahbubnagar",
    "mahabubnagar": "Mahbubnagar",
    "mahbubnagaru": "Mahbubnagar",
    "nalgonda": "Nalgonda",
    "warangal": "Warangal",
    "khammam": "Khammam",
}


def canonical_district(name) -> str | None:
    """Map any known spelling/variant to a canonical legacy district name."""
    key = _norm(name)
    if key in _ALIASES:
        return _ALIASES[key]
    # tolerant fallback: substring containment over alias keys
    for k, v in _ALIASES.items():
        if k and (k in key or key in k) and abs(len(k) - len(key)) <= 4:
            return v
    return None


# --- mapping of CURRENT (post-bifurcation) districts to the 23 legacy ones ---
# Values are normalized current-district names; unmatched members fall back to
# the nearest legacy centroid (see data_acquisition.district_grid_map).
CURRENT_TO_LEGACY = {
    # Andhra Pradesh: the 13 current districts match the legacy AP districts
    "srikakulam": "Srikakulam",
    "vizianagaram": "Vizianagaram",
    "visakhapatnam": "Visakhapatnam",
    "eastgodavari": "East Godavari",
    "westgodavari": "West Godavari",
    "eluru": "West Godavari",
    "krishna": "Krishna",
    "ntr": "Krishna",
    "guntur": "Guntur",
    "bapatla": "Guntur",
    "palnadu": "Guntur",
    "prakasam": "Prakasam",
    "nellore": "Nellore",
    "chittoor": "Chittoor",
    "tirupati": "Chittoor",
    "ysr": "Y.S.R.",
    "annamayya": "Y.S.R.",
    "anantapur": "Anantapur",
    "ananthapuramu": "Anantapur",
    "srisathyasai": "Anantapur",
    "kurnool": "Kurnool",
    "nandyal": "Kurnool",
    # Telangana: 33 current districts aggregate into the 10 legacy ones
    "adilabad": "Adilabad",
    "mancherial": "Adilabad",
    "nirmal": "Adilabad",
    "komarambheemasifabad": "Adilabad",
    "komarambheem": "Adilabad",
    "nizamabad": "Nizamabad",
    "kamareddy": "Nizamabad",
    "karimnagar": "Karimnagar",
    "rajannasircilla": "Karimnagar",
    "jagtial": "Karimnagar",
    "peddapalli": "Karimnagar",
    "medak": "Medak",
    "sangareddy": "Medak",
    "siddipet": "Medak",
    "hyderabad": "Hyderabad",
    "rangareddy": "Rangareddy",
    "rangareddi": "Rangareddy",
    "vikarabad": "Rangareddy",
    "medchalmalkajgiri": "Rangareddy",
    "medchalmalkajgirii": "Rangareddy",
    "mahbubnagar": "Mahbubnagar",
    "mahabubnagar": "Mahbubnagar",
    "wanaparthy": "Mahbubnagar",
    "nagarkurnool": "Mahbubnagar",
    "jogulambagadwal": "Mahbubnagar",
    "narayanpet": "Mahbubnagar",
    "nalgonda": "Nalgonda",
    "suryapet": "Nalgonda",
    "yadadribhuvanagiri": "Nalgonda",
    "yadadribhuvanagirii": "Nalgonda",
    "warangal": "Warangal",
    "warangalurban": "Warangal",
    "warangalrural": "Warangal",
    "hanamkonda": "Warangal",
    "jangaon": "Warangal",
    "jayashankarbhupalpally": "Warangal",
    "mulugu": "Warangal",
    "mahabubabad": "Warangal",
    "khammam": "Khammam",
    "bhadradrikothagudem": "Khammam",
}


def current_to_legacy(name):
    """Map a current (post-bifurcation) district name to its legacy parent."""
    key = _norm(name)
    if key in CURRENT_TO_LEGACY:
        return CURRENT_TO_LEGACY[key]
    for k, v in CURRENT_TO_LEGACY.items():
        if k and (k in key or key in k) and abs(len(k) - len(key)) <= 4:
            return v
    return None


def is_legacy(name) -> bool:
    return canonical_district(name) in LEGACY_DISTRICTS
