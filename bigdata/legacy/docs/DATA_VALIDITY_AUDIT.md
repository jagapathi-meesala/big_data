# DATA VALIDITY AND INTEGRITY AUDIT

> **Audit Date:** August 2026  
> **Target Path:** `datasets/`  
> **Scientific Rigor Standard:** Full IEEE-compliant audit of ground-truth evidence vs synthetic proxies  

---

## 1. Executive Summary

This document presents a rigorous scientific audit of all 17 datasets in the project. The purpose is to establish what ground-truth data actually exists, eliminate synthetic or fabricated variables (such as hardcoded constants or mathematical toy proxies), and define a scientifically defensible data architecture.

---

## 2. Topic-by-Topic Empirical Audit Findings

### A. Real Disaster Event Data Audit
- **Audit Methodology:** Full text and column-level search for `flood`, `cyclone`, `disaster`, `incident`, `event`, `severity`, `casualty`, `affected`, `damage`.
- **Empirical Findings:**
  1. `Monthly Rainfall - flood Data 1901-2015.csv`: The column `Flood` exists, but its value is string `"No"` across all 230 rows (which cover Coastal Andhra Pradesh and Telangana from 1901 to 2015).
  2. Yearly Excel files (`2016` to `2021`): Contain an annual subdivision/state flag `FLOOD` (`YES`/`NO`). In 2019, `COASTAL A. P.& YANAM` is flagged `YES`. All other years for AP/Telangana are `NO`.
  3. No granular district-level event log containing disaster dates, casualty counts, affected population, or monetary damage exists in the workspace.
- **Scientific Resolution:**
  - Because no historical event log exists at district-month granularity, defining a flood hazard target purely via an arbitrary threshold (`rainfall >= 180 mm`) or using a constant column (`Flood = 'No'`) is scientifically ungrounded.
  - The most scientifically defensible approach is to define the **Flood Hazard Target** $Y(d, t+1)$ based on **Meteorological Extreme Precipitation Anomalies**: a binary indicator equal to `1` when future month $t+1$ monsoon precipitation exceeds the historical 90th percentile (or $Z$-score $\ge +1.5$ standard deviations above the historical monthly mean for that district/subdivision), and `0` otherwise.

### B. District-Level Weather Data Audit
- **Audit Methodology:** Inspected geographic scope of all weather datasets.
- **Empirical Findings:**
  - Weather datasets in `datasets/` (`Monthly Rainfall...1901-2015.csv` and 2016-2021 Excel files) provide monthly rainfall exclusively at the **Subdivision Level** (`COASTAL ANDHRA PRADESH`, `TELANGANA`, `RAYALASEEMA`).
  - No station-level or district-level daily/monthly weather measurement dataset exists in `datasets/`.
- **Scientific Resolution:**
  - District-level weather features are derived by mapping each district to its parent meteorological subdivision (`COASTAL ANDHRA PRADESH`, `TELANGANA`, or `RAYALASEEMA`).
  - This spatial broadcast limitation MUST be explicitly stated in the paper's dataset section.

### C. Temperature and Humidity Audit
- **Audit Methodology:** Searched all 17 datasets for observed temperature and humidity metrics.
- **Empirical Findings:**
  - ZERO observed temperature or humidity columns exist in any dataset in `datasets/`.
  - The previous codebase contained synthetic generation logic:
    `temp = 85.0 + 10.0 * sin(...)`
    `humidity = clip(60.0 + rainfall/10.0)`
- **Scientific Resolution:**
  - Fabricating synthetic weather measurements severely undermines IEEE paper validity.
  - Synthetic temperature and humidity generation is COMPLETELY REMOVED from the feature engineering pipeline.
  - The prediction model will rely strictly on observed precipitation metrics (rolling monthly rainfall, 3-month cumulative monsoon rainfall, lag-1 rainfall, precipitation anomaly Z-scores, and seasonal month indicators).

### D. Population and Area Audit
- **Audit Methodology:** Inspected Census 2011 and district demography files.
- **Empirical Findings:**
  - Ground-truth population and area exist in `india-districts-census-2011.csv` (23 legacy districts) and `final_districts.csv` (46 post-bifurcation districts).
  - Multiple census years (e.g. 2001, 2021) DO NOT exist in the datasets. All demographic metrics represent static 2011 Census snapshots.
- **Scientific Resolution:**
  - The static Census 2011 population and official district area (in $	ext{km}^2$) are used directly to compute population density $	ext{PopDensity}_d = 	ext{Population}_d / 	ext{Area}_d$.
  - We do NOT fabricate synthetic multi-year population growth curves.

### E. Hospitals / Healthcare Audit
- **Audit Methodology:** Inspected `hospitals.csv`, `india_states.csv`, and `india_states_daily.csv`.
- **Empirical Findings:**
  - `hospitals.csv` contains 18 point hospital facility records with exact latitude/longitude coordinates across major cities (Guntur, Visakhapatnam, Hyderabad, Anantapur, etc.).
  - `india_states.csv` provides Ministry of Health official totals for state hospital capacity:
    - Andhra Pradesh: 258 Total Hospitals, 23,138 Total Beds
    - Telangana: 802 Total Hospitals, 20,983 Total Beds
- **Scientific Resolution:**
  - District hospital bed capacity $H_d^{	ext{beds}}$ is constructed by combining observed point facility counts from `hospitals.csv` with state-level bed totals scaled by Census district population proportions.
  - The previous arbitrary formula (`total_beds = hospital_count * 150`) is replaced with this empirical multi-level healthcare calculation.

### F. Roads / Transportation Audit
- **Audit Methodology:** Searched all datasets for road length, highway density, or transit network columns.
- **Empirical Findings:**
  - No explicit road GIS network dataset exists in `datasets/`.
  - The previous codebase used a mathematically degenerate proxy:
    `Rd = 1.0 - min_max(1.0 / (pop_density + 1e-5))`
- **Scientific Resolution:**
  - Instead of degenerate inverse density, Road/Accessibility Deficit $R_d$ is constructed using ground-truth Census 2011 infrastructure isolation indicators: the proportion of households without vehicle access or in unpaved rural areas (`1.0 - (Households_with_Bicycle + Households_with_Scooter_Motorcycle_Moped + Households_with_Car_Jeep_Van) / Households`).

### G. Shelters Audit
- **Audit Methodology:** Searched for shelter, relief camp, or evacuation center datasets.
- **Empirical Findings:**
  - No dedicated shelter dataset exists in `datasets/`.
  - The previous codebase hardcoded a fake constant: `Sd = 0.50`.
- **Scientific Resolution:**
  - Hardcoded constants ($S_d = 0.50$) violate mathematical non-degeneracy.
  - Shelter Deficit $S_d$ is constructed from ground-truth Census 2011 housing structural vulnerability: the proportion of dilapidated dwellings (`Condition_of_occupied_census_houses_Dilapidated_Households / Households`), measuring the lack of sturdy evacuation shelter structures in each district.

### H. Historical Disaster Information Audit
- **Audit Methodology:** Inspected long-term historical records in `Monthly Rainfall...1901-2015.csv`.
- **Empirical Findings:**
  - The 115-year dataset contains 1,380 monthly observations per subdivision.
  - Historical extreme precipitation frequency, 10-year rolling maximum monthly rainfall, and historical heavy rainfall anomaly counts can be aggregated per district-month up to time $t-1$ (strictly past information).
- **Scientific Resolution:**
  - Features such as `hist_extreme_events_count` (cumulative count of months with rainfall anomaly $Z \ge +1.5$ prior to month $t$) and `rainfall_roll3` (3-month rolling mean up to month $t$) provide zero-leakage historical predictors.
