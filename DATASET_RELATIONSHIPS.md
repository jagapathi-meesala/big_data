# DATASET RELATIONSHIPS AND JOIN ARCHITECTURE

> **Audit Date:** August 2026  
> **Target Dataset Folder:** `datasets/`  
> **Purpose:** Define exact relational join keys, spatial mapping hierarchies, canonical district name alignment, and temporal multi-table linkage for the big-data research pipeline.  

---

## 1. Master Spatio-Temporal Join Architecture

The datasets present in `datasets/` operate across three primary layers:
1. **Meteorological Layer (Subdivision & Time):** Monthly rainfall time series across 115 years (1901-2015) and recent annual datasets (2016-2021).
2. **Demographic & Infrastructure Deficit Layer (District):** Official Census 2011 metrics, hospital facilities, and state healthcare totals.
3. **Geospatial & Exposure Layer (Point & Polygon Centroids):** City, place, and district latitude/longitude coordinates.

### Entity-Relationship Architecture Diagram

```
+-------------------------------------------------------------+
|    WEATHER DATASET (Subdivision level, 1901-2015 & 2016-21)  |
|    - Monthly Rainfall - flood Data 1901-2015.csv            |
|    - 2016-2021 monthly rainfall.xlsx                         |
+-------------------------------------------------------------+
                              |
                              | Join Key: SUBDIVISION (Coastal AP / Telangana)
                              v
+-------------------------------------------------------------+
|             CANONICAL DISTRICT SPATIAL MAPPING              |
|    - Maps Subdivisions -> Legacy (23) & Bifurcated (46)     |
|      Districts of Andhra Pradesh and Telangana              |
+-------------------------------------------------------------+
                              |
        +---------------------+---------------------+
        | Join: District Name                       | Join: District Name
        v                                           v
+------------------------------------+   +------------------------------------+
|  CENSUS DEMOGRAPHICS (Census 2011) |   |    DISTRICT SPATIAL REGISTRY       |
|  - india-districts-census-2011.csv |   |    - final_districts.csv            |
|  - Demography, Housing, Sanitation  |   |    - Population, Area, Lat/Lon      |
+------------------------------------+   +------------------------------------+
        |                                           |
        | Join: District Name                       | Spatial Distance / Lat-Lon
        v                                           v
+------------------------------------+   +------------------------------------+
|   HEALTHCARE & HOSPITALS DATA      |   |   URBAN PLACES & CITY EXPOSURE     |
|   - hospitals.csv (18 point hosp)  |   |   - final_cities.csv (67 cities)   |
|   - india_states.csv (State beds)  |   |   - india_places.csv (115 places)  |
+------------------------------------+   +------------------------------------+
```

---

## 2. Relational Join Table

| Primary Dataset | Secondary Dataset | Join Type | Join Key(s) | Cardinality | Validation & Normalization Requirement |
|---|---|---|---|---|---|
| `Monthly Rainfall...1901-2015.csv` | Master District Registry (`final_districts.csv`) | Spatial-Subdivision Broadcast | `SUBDIVISION` -> District Parent Region | 1 : N (1 Subdiv to N Districts) | Map Coastal AP & Telangana subdivisions to member districts. |
| `Monthly Rainfall...1901-2015.csv` | `2016-2021 monthly rainfall.xlsx` | Union / Temporal Append | `SUBDIVISION`, `YEAR`, Month | 1 : 1 | Normalize subdivision name variants (`COASTAL A. P.& YANAM` vs `COASTAL ANDHRA PRADESH`). |
| District-Time Series | `india-districts-census-2011.csv` | Inner Join / Lookup | `district` == `District name` | N : 1 | Apply Canonical Name Mapping (e.g. `Rangareddy` -> `Ranga Reddy`, `Y.S.R.` -> `Kadapa`). |
| District-Time Series | `hospitals.csv` | Left Join / Aggregation | `district` == `district` | N : M | Aggregate facility count per district; fallback to state-level scaling for non-covered districts. |
| District-Time Series | `final_cities.csv` / `india_places.csv` | Spatial Point Join | `district` == `District` | 1 : N | Compute urban density weighting and spatial center coordinates. |

---

## 3. Canonical District Mapping Audit

A major finding of the spatial audit is the distinction between the **23 Legacy Undivided Districts** (Census 2011) and the **46 Bifurcated Districts** present in `final_districts.csv` (reflecting post-2014 Andhra Pradesh & Telangana district reorganizations).

### Canonical District Name Standardization Table

| Official 2011 Census District Name | State | Subdivision Mapping | `final_districts.csv` Equivalent / Bifurcated Child Districts |
|---|---|---|---|
| Adilabad | Telangana | TELANGANA | Adilabad, Mancherial, Nirmal, Komaram Bheem |
| Nizamabad | Telangana | TELANGANA | Nizamabad, Kamareddy |
| Karimnagar | Telangana | TELANGANA | Karimnagar, Jagtial, Peddapalli, Rajanna Sircilla |
| Medak | Telangana | TELANGANA | Medak, Sangareddy, Siddipet |
| Hyderabad | Telangana | TELANGANA | Hyderabad, Secunderabad |
| Rangareddy / Ranga Reddy | Telangana | TELANGANA | Ranga Reddy, Medchal-Malkajgiri, Vikarabad |
| Mahbubnagar | Telangana | TELANGANA | Mahbubnagar, Nagarkurnool, Wanaparthy, Jogulamba Gadwal, Narayanpet |
| Nalgonda | Telangana | TELANGANA | Nalgonda, Suryapet, Yadadri Bhuvanagiri |
| Warangal | Telangana | TELANGANA | Warangal Urban, Warangal Rural, Jangaon, Mahabubabad, Jayashankar Bhupalpally, Mulugu |
| Khammam | Telangana | TELANGANA | Khammam, Bhadradri Kothagudem |
| Srikakulam | Andhra Pradesh | COASTAL ANDHRA PRADESH | Srikakulam |
| Vizianagaram | Andhra Pradesh | COASTAL ANDHRA PRADESH | Vizianagaram |
| Visakhapatnam | Andhra Pradesh | COASTAL ANDHRA PRADESH | Visakhapatnam |
| East Godavari | Andhra Pradesh | COASTAL ANDHRA PRADESH | East Godavari |
| West Godavari | Andhra Pradesh | COASTAL ANDHRA PRADESH | West Godavari |
| Krishna | Andhra Pradesh | COASTAL ANDHRA PRADESH | Krishna |
| Guntur | Andhra Pradesh | COASTAL ANDHRA PRADESH | Guntur |
| Prakasam | Andhra Pradesh | COASTAL ANDHRA PRADESH | Prakasam |
| Sri Potti Sriramulu Nellore | Andhra Pradesh | COASTAL ANDHRA PRADESH | Sri Potti Sriramulu Nellore / Nellore |
| Kurnool | Andhra Pradesh | RAYALASEEMA | Kurnool |
| Anantapur | Andhra Pradesh | RAYALASEEMA | Anantapur |
| Chittoor | Andhra Pradesh | RAYALASEEMA | Chittoor |
| Y.S.R. / Kadapa | Andhra Pradesh | RAYALASEEMA | Kadapa / Y.S.R. |

---

## 4. Strongest Scientifically Defensible Join Strategy

To maintain full data integrity and prevent false spatial precision:
1. **Meteorological Linkage:** Monthly rainfall is broadcast from the 2 primary subdivisions (`COASTAL ANDHRA PRADESH` and `TELANGANA`) to all member districts.
2. **Demographic & Deficit Linkage:** Census 2011 ground-truth features are joined at the legacy district level (23 districts) where exact Census 2011 measurements exist, or mapped proportionally to the 46 bifurcated districts using `final_districts.csv` population weights.
3. **Healthcare Linkage:** Point hospital locations in `hospitals.csv` are aggregated per district, supplemented by state-level hospital bed totals from `india_states.csv`.
