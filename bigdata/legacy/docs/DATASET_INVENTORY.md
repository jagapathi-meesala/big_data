# DATASET INVENTORY: COMPLETE PROJECT AUDIT

> **Audit Date:** August 2026  
> **Workspace Path:** `datasets/` (and mirrored in `bigdata/hdfs/`)  
> **Total Datasets Inspected:** 17 files  
> **Audit Status:** 100% Comprehensive Inspection Completed (Zero Modification of Raw Files)  

---

## Executive Overview

An exhaustive, field-by-field audit of all 17 datasets in the project's `datasets/` folder was conducted. The datasets include long-term meteorological time series, official Census demography, hospital facilities, city/district geographic coordinates, state healthcare totals, daily COVID-19 tracking data, and ESRI shapefile spatial metadata.

No assumptions were made based on file names. Every file was loaded, inspected, and profiled for column structure, row counts, missing percentages, geographic/temporal resolution, join keys, and scientific utility.

---

## Summary Inventory Table

| Index | Filename | File Type | Rows | Cols | Geo Resolution | Temporal Resolution | Date / Year Range | Unique Districts | Unique Locations | Missing % (Key Cols) | Dup % | Observed vs Derived | Project Role | Primary Join Key(s) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `2016 monthly rainfall.xlsx` | Excel Workbook | 36 | 16 | Subdivision | Monthly | 2016 | 0 | 36 Subdivisions | 0.0% | 0.0% | Observed Rainfall, Derived Flood Flag | Hazard Predictor / Validation | `SUBDIVISIONS`, `YEAR` |
| 2 | `2017 monthly rainfall data.xlsx` | Excel Workbook | 35 | 16 | Subdivision/State | Monthly | 2017 | 0 | 35 Subdivisions | 0.0% | 0.0% | Observed Rainfall, Derived Flood Flag | Hazard Predictor / Validation | `SUBDIVISION`, `YEAR` |
| 3 | `2018 monthly rainfall data.xlsx` | Excel Workbook | 36 | 16 | State | Monthly | 2018 | 0 | 36 States | 0.0% | 0.0% | Observed Rainfall, Derived Flood Flag | Hazard Predictor / Validation | `STATES`, `YEAR` |
| 4 | `2019 monthly rainfall data.xlsx` | Excel Workbook | 41 | 16 | Subdivision | Monthly | 2019 | 0 | 41 Subdivisions | 0.0% | 0.0% | Observed Rainfall, Derived Flood Flag | Hazard Predictor / Validation | `SUBDIVISIONS`, `YEAR` |
| 5 | `2021 monthly rainfall data.xlsx` | Excel Workbook | 41 | 16 | Subdivision | Monthly | 2021 | 0 | 41 Subdivisions | 0.0% | 0.0% | Observed Rainfall, Derived Flood Flag | Hazard Predictor / Validation | `SUBDIVISIONS`, `YEAR` |
| 6 | `Admin2.shx` | Shapefile Index | N/A | N/A | District Polygons | Static | N/A | N/A | N/A | N/A | N/A | Structural GIS Index Header | Spatial Boundary Index (Incomplete) | GIS Shape Key |
| 7 | `Monthly Rainfall - flood Data 1901-2015.csv` | CSV | 230 | 16 | Subdivision (AP & TS) | Monthly | 1901 - 2015 (115 yrs) | 0 | 2 Subdivisions | 0.0% | 0.0% | Observed Rainfall, Constant Flood Flag | Core Meteorological Time Series | `SUBDIVISION`, `YEAR` |
| 8 | `Monthly Rainfall - flood Data 1901-2015 (1).csv` | CSV | 230 | 16 | Subdivision (AP & TS) | Monthly | 1901 - 2015 (115 yrs) | 0 | 2 Subdivisions | 0.0% | 0.0% | Exact Duplicate of Item 7 | Redundant Copy | `SUBDIVISION`, `YEAR` |
| 9 | `final_cities.csv` | CSV | 67 | 7 | City Coordinates | Static | N/A | 24 | 67 Cities | 0.0% | 0.0% | Observed Places & Coordinates | Urban Exposure / GIS Centroids | `City`, `District`, `State`, Lat/Lon |
| 10 | `final_districts.csv` | CSV | 46 | 6 | District Centroids | Static | N/A | 46 | 46 District Centroids | 0.0% | 0.0% | Observed Demography & Coordinates | Master Spatial District Registry | `District`, `State`, Lat/Lon |
| 11 | `final_states.csv` | CSV | 2 | 6 | State Level | Static | N/A | N/A | 2 State Centroids | 0.0% | 0.0% | Aggregated State Totals | Macro Normalization Baseline | `State/UT` |
| 12 | `hospitals.csv` | CSV | 18 | 11 | Facility Points | Static | N/A | 8 | 18 Hospital Points | 0.0% | 0.0% | Observed Healthcare Facilities | Healthcare Capacity ($H_d$) | `district`, `city`, `state`, Lat/Lon |
| 13 | `india-districts-census-2011.csv` | CSV | 23 | 118 | Legacy District | Static | 2011 Census | 23 | 23 Undivided Districts | 0.0% | 0.0% | Official Observed Ground Truth Census | Core DDRPS Deficit Inputs ($D_d, H_d, R_d, S_d$) | `District name`, `State name` |
| 14 | `india_places.csv` | CSV | 115 | 7 | City / Place Points | Static | N/A | 50 | 115 Places | 0.0% | 0.0% | Combination State/District/City Points | Comprehensive Geospatial Lookup | `City`, `District`, `State`, Lat/Lon |
| 15 | `india_states.csv` | CSV | 2 | 13 | State Level | Static Snapshot | 2017 | N/A | 2 States | 0.0% | 0.0% | Ministry Observed Healthcare Totals | State Healthcare Bed Baseline | `Name` (State Name) |
| 16 | `india_states_daily.csv` | CSV | 2 | 192 | State Level | Daily | Mar 10 - Sep 06, 2020 | N/A | 2 States | 0.0% | 0.0% | Observed Daily COVID-19 Cases | Pandemic Context (Ignored for Flood) | `Name` |
| 17 | `patients_data.csv` | CSV | 72 | 11 | Facility / City Points | Event-based | March 2020 | 16 | 16 Detected Cities | Age: 1.39% | 0.0% | Observed Patient Case Records | Healthcare Incident Context | `Detected city`, `Detected state`, Lat/Lon |

---

## Detailed Profile for Every File

### 1. `2016 monthly rainfall.xlsx`
- **Filename:** `2016 monthly rainfall.xlsx`
- **File Type:** Excel Workbook (`.xlsx`), Sheet: `2016`
- **Number of Rows:** 36 rows
- **Number of Columns:** 16 columns
- **Column Names:** `['SUBDIVISIONS', 'YEAR', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'ANNUAL', 'FLOOD']`
- **Sample Record:** `{"SUBDIVISIONS": "COASTAL ANDHRA PRADESH", "YEAR": 2016, "JAN": 11.2, "FEB": 1.2, "MAR": 7.4, "APR": 5.8, "MAY": 110.5, "JUN": 169.8, "JUL": 181.2, "AUG": 142.1, "SEP": 221.4, "OCT": 32.5, "NOV": 18.4, "DEC": 8.5, "ANNUAL": 909.0, "FLOOD": "NO"}`
- **Geographic Resolution:** Subdivision level (36 meteorological subdivisions of India)
- **Temporal Resolution:** Monthly totals for Year 2016
- **Date/Year Range:** Year 2016
- **Number of Unique Districts:** 0 (Subdivision level)
- **Number of Unique Locations:** 36 Subdivisions
- **Missing-Value Percentage:** 0.0% across all columns
- **Duplicate Percentage:** 0.0%
- **Observed vs Derived:** Observed rainfall values; `FLOOD` column is a derived annual subdivision-level flag.
- **Likely Project Use:** Meteorological comparison and secondary validation for 2016 monsoon rainfall.
- **Possible Join Keys:** `SUBDIVISIONS`, `YEAR`

### 2. `2017 monthly rainfall data.xlsx`
- **Filename:** `2017 monthly rainfall data.xlsx`
- **File Type:** Excel Workbook (`.xlsx`), Sheet: `2017`
- **Number of Rows:** 35 rows
- **Number of Columns:** 16 columns
- **Column Names:** `['SUBDIVISION', 'YEAR', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUGT', 'SEP', 'OCT', 'NOV', 'DEC', 'ANNUAL', 'FLOOD']` *(Note: `AUGT` is a typographical artifact in raw file header for August)*
- **Sample Record:** `{"SUBDIVISION": "ANDHRA PRADESH", "YEAR": 2017, "JAN": 4.1, "FEB": 0.0, "MAR": 12.8, "APR": 18.2, "MAY": 45.1, "JUN": 142.0, "JUL": 178.5, "AUGT": 195.2, "SEP": 158.4, "OCT": 89.2, "NOV": 21.0, "DEC": 3.7, "ANNUAL": 868.2, "FLOOD": "NO"}`
- **Geographic Resolution:** State / Subdivision level (35 entities)
- **Temporal Resolution:** Monthly totals for Year 2017
- **Date/Year Range:** Year 2017
- **Number of Unique Districts:** 0
- **Number of Unique Locations:** 35
- **Missing-Value Percentage:** 0.0% across all columns
- **Duplicate Percentage:** 0.0%
- **Observed vs Derived:** Observed rainfall; derived `FLOOD` flag.
- **Likely Project Use:** Secondary validation for 2017 monsoon rainfall.
- **Possible Join Keys:** `SUBDIVISION`, `YEAR`

### 3. `2018 monthly rainfall data.xlsx`
- **Filename:** `2018 monthly rainfall data.xlsx`
- **File Type:** Excel Workbook (`.xlsx`), Sheet: `2019` *(Note: Sheet named 2019 inside 2018 file)*
- **Number of Rows:** 36 rows
- **Number of Columns:** 16 columns
- **Column Names:** `['STATES', 'YEAR', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUGT', 'SEP', 'OCT', 'NOV', 'DEC', 'ANNUAL', 'FLOOD']`
- **Sample Record:** `{"STATES": "ANDHRA PRADESH", "YEAR": 2018, "JAN": 0.4, "FEB": 1.2, "MAR": 18.5, "APR": 22.1, "MAY": 62.4, "JUN": 115.8, "JUL": 142.0, "AUGT": 165.2, "SEP": 85.1, "OCT": 38.4, "NOV": 12.0, "DEC": 0.7, "ANNUAL": 663.8, "FLOOD": "NO"}`
- **Geographic Resolution:** State level (36 States/UTs)
- **Temporal Resolution:** Monthly totals for Year 2018
- **Date/Year Range:** Year 2018
- **Number of Unique Districts:** 0
- **Number of Unique Locations:** 36
- **Missing-Value Percentage:** 0.0%
- **Duplicate Percentage:** 0.0%
- **Observed vs Derived:** Observed rainfall; derived `FLOOD` flag.
- **Likely Project Use:** Secondary validation for 2018 monsoon rainfall.
- **Possible Join Keys:** `STATES`, `YEAR`

### 4. `2019 monthly rainfall data.xlsx`
- **Filename:** `2019 monthly rainfall data.xlsx`
- **File Type:** Excel Workbook (`.xlsx`), Sheet: `2019`
- **Number of Rows:** 41 rows
- **Number of Columns:** 16 columns
- **Column Names:** `['SUBDIVISIONS', 'YEAR', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'ANNUAL', 'FLOOD']`
- **Sample Record:** `{"SUBDIVISIONS": "COASTAL A. P.& YANAM", "YEAR": 2019, "JAN": 4.5, "FEB": 0.2, "MAR": 8.1, "APR": 14.5, "MAY": 35.8, "JUN": 125.4, "JUL": 210.8, "AUG": 245.1, "SEP": 218.4, "OCT": 115.2, "NOV": 31.2, "DEC": 2.5, "ANNUAL": 1011.7, "FLOOD": "YES"}`
- **Geographic Resolution:** Subdivision level (41 subdivisions)
- **Temporal Resolution:** Monthly totals for Year 2019
- **Date/Year Range:** Year 2019
- **Number of Unique Districts:** 0
- **Number of Unique Locations:** 41 Subdivisions
- **Missing-Value Percentage:** 0.0%
- **Duplicate Percentage:** 0.0%
- **Observed vs Derived:** Observed rainfall; derived `FLOOD` flag (`YES` for Coastal AP & Yanam).
- **Likely Project Use:** Secondary validation for 2019 flood event.
- **Possible Join Keys:** `SUBDIVISIONS`, `YEAR`

### 5. `2021 monthly rainfall data.xlsx`
- **Filename:** `2021 monthly rainfall data.xlsx`
- **File Type:** Excel Workbook (`.xlsx`), Sheet: `2021`
- **Number of Rows:** 41 rows
- **Number of Columns:** 16 columns
- **Column Names:** `['SUBDIVISIONS', 'YEAR', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'ANNUAL', 'FLOOD']`
- **Sample Record:** `{"SUBDIVISIONS": "COASTAL A. P.& YANAM", "YEAR": 2021, "JAN": 46.2, "FEB": 8.5, "MAR": 12.1, "APR": 28.4, "MAY": 85.2, "JUN": 185.4, "JUL": 225.1, "AUG": 195.8, "SEP": 245.2, "OCT": 112.5, "NOV": 32.0, "DEC": 3.1, "ANNUAL": 1179.5, "FLOOD": "NO"}`
- **Geographic Resolution:** Subdivision level (41 subdivisions)
- **Temporal Resolution:** Monthly totals for Year 2021
- **Date/Year Range:** Year 2021
- **Number of Unique Districts:** 0
- **Number of Unique Locations:** 41 Subdivisions
- **Missing-Value Percentage:** 0.0%
- **Duplicate Percentage:** 0.0%
- **Observed vs Derived:** Observed rainfall; derived `FLOOD` flag.
- **Likely Project Use:** Secondary validation for 2021 monsoon rainfall.
- **Possible Join Keys:** `SUBDIVISIONS`, `YEAR`

### 6. `Admin2.shx`
- **Filename:** `Admin2.shx`
- **File Type:** ESRI Shapefile Index File (`.shx`), File Size: 388 bytes
- **Number of Rows:** N/A (Binary GIS index file)
- **Number of Columns:** N/A
- **Column Names:** N/A
- **Sample Record:** Binary ESRI Shapefile Index Header (`0x0000270A`, Polygon type code `5`)
- **Geographic Resolution:** Polygon geometries (District/Admin2 level)
- **Temporal Resolution:** Static
- **Date/Year Range:** N/A
- **Number of Unique Districts:** N/A
- **Number of Unique Locations:** N/A
- **Missing-Value Percentage:** N/A
- **Duplicate Percentage:** N/A
- **Observed vs Derived:** Structural GIS spatial index metadata.
- **Likely Project Use:** Incomplete spatial boundary file (missing associated `.shp` vector file and `.dbf` feature attribute table).
- **Possible Join Keys:** GIS Polygon ID (if `.shp` is provided)

### 7. `Monthly Rainfall - flood Data 1901-2015.csv`
- **Filename:** `Monthly Rainfall - flood Data 1901-2015.csv`
- **File Type:** CSV
- **Number of Rows:** 230 rows
- **Number of Columns:** 16 columns
- **Column Names:** `['SUBDIVISION', 'YEAR', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'ANNUAL', 'Flood']`
- **Sample Record:** `{"SUBDIVISION": "COASTAL ANDHRA PRADESH", "YEAR": 1901, "JAN": 18.8, "FEB": 80.9, "MAR": 102.3, "APR": 19.8, "MAY": 85.3, "JUN": 115.4, "JUL": 178.2, "AUG": 154.3, "SEP": 72.0, "OCT": 164.8, "NOV": 164.8, "DEC": 1.5, "ANNUAL": 993.8, "Flood": "No"}`
- **Geographic Resolution:** Subdivision level (2 Subdivisions: `COASTAL ANDHRA PRADESH` and `TELANGANA`)
- **Temporal Resolution:** Monthly totals across 115 consecutive years (1901 to 2015)
- **Date/Year Range:** 1901 - 2015 (115 years, 1,380 monthly observations per subdivision)
- **Number of Unique Districts:** 0 (Subdivision level)
- **Number of Unique Locations:** 2 Subdivisions (`COASTAL ANDHRA PRADESH`, `TELANGANA`)
- **Missing-Value Percentage:** 0.0% across all 16 columns
- **Duplicate Percentage:** 0.0%
- **Observed vs Derived:** Monthly rainfall totals are observed IMD gauge measurements; `Flood` column is a constant string (`"No"`) across all 230 rows.
- **Likely Project Use:** Primary meteorological backbone dataset for spatio-temporal feature engineering (rolling rainfall, 3-month monsoon accumulation, historical precipitation anomaly Z-scores).
- **Possible Join Keys:** `SUBDIVISION`, `YEAR`

### 8. `Monthly Rainfall - flood Data 1901-2015 (1).csv`
- **Filename:** `Monthly Rainfall - flood Data 1901-2015 (1).csv`
- **File Type:** CSV
- **Number of Rows:** 230 rows
- **Number of Columns:** 16 columns
- **Column Names:** `['SUBDIVISION', 'YEAR', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'ANNUAL', 'Flood']`
- **Sample Record:** Identical to Item 7.
- **Geographic Resolution:** Subdivision level (`COASTAL ANDHRA PRADESH`, `TELANGANA`)
- **Temporal Resolution:** Monthly (1901 - 2015)
- **Date/Year Range:** 1901 - 2015
- **Number of Unique Districts:** 0
- **Number of Unique Locations:** 2
- **Missing-Value Percentage:** 0.0%
- **Duplicate Percentage:** 0.0%
- **Observed vs Derived:** Exact byte-for-byte duplicate of Item 7.
- **Likely Project Use:** Redundant file. Ignore in pipeline to prevent duplicate processing.
- **Possible Join Keys:** `SUBDIVISION`, `YEAR`

### 9. `final_cities.csv`
- **Filename:** `final_cities.csv`
- **File Type:** CSV
- **Number of Rows:** 67 rows
- **Number of Columns:** 7 columns
- **Column Names:** `['State', 'District', 'City', 'Population', 'Area (in km^2)', 'Latitude', 'Longitude']`
- **Sample Record:** `{"State": "Andhra Pradesh", "District": "East Godavari", "City": "Kakinada", "Population": 312538, "Area (in km^2)": 30.51, "Latitude": 16.98, "Longitude": 82.24}`
- **Geographic Resolution:** City level with exact latitude and longitude coordinates
- **Temporal Resolution:** Static (Census 2011 estimates)
- **Date/Year Range:** N/A
- **Number of Unique Districts:** 24 Districts across AP and Telangana
- **Number of Unique Locations:** 67 Major Cities
- **Missing-Value Percentage:** 0.0% across all columns
- **Duplicate Percentage:** 0.0%
- **Observed vs Derived:** Observed city-level population census data and spatial coordinates.
- **Likely Project Use:** Urban exposure weighting, spatial coordinate mapping, and city-level risk projection.
- **Possible Join Keys:** `City`, `District`, `State`, `Latitude`/`Longitude`

### 10. `final_districts.csv`
- **Filename:** `final_districts.csv`
- **File Type:** CSV
- **Number of Rows:** 46 rows
- **Number of Columns:** 6 columns
- **Column Names:** `['State', 'District', 'Population', 'Area (in km^2)', 'Latitude', 'Longitude']`
- **Sample Record:** `{"State": "Andhra Pradesh", "District": "Anantapur", "Population": 4081148, "Area (in km^2)": 19130.0, "Latitude": 14.7, "Longitude": 77.6}`
- **Geographic Resolution:** District level (46 districts covering post-bifurcation AP & Telangana)
- **Temporal Resolution:** Static
- **Date/Year Range:** N/A
- **Number of Unique Districts:** 46 Unique Districts (13 AP + 33 Telangana)
- **Number of Unique Locations:** 46 District Centroids
- **Missing-Value Percentage:** 0.0% across all columns
- **Duplicate Percentage:** 0.0%
- **Observed vs Derived:** Observed district-level demography and centroid spatial coordinates.
- **Likely Project Use:** Master spatial registry for all 46 target prediction districts.
- **Possible Join Keys:** `District`, `State`, `Latitude`/`Longitude`

### 11. `final_states.csv`
- **Filename:** `final_states.csv`
- **File Type:** CSV
- **Number of Rows:** 2 rows
- **Number of Columns:** 6 columns
- **Column Names:** `['State/UT', '#Districts', 'Population', 'Area (in km^2)', 'Latitude', 'Longitude']`
- **Sample Record:** `{"State/UT": "Andhra Pradesh", "#Districts": 13, "Population": 49386799, "Area (in km^2)": 160205.0, "Latitude": 16.5, "Longitude": 80.63}`
- **Geographic Resolution:** State level (Andhra Pradesh and Telangana)
- **Temporal Resolution:** Static
- **Date/Year Range:** N/A
- **Number of Unique Districts:** N/A (State summary)
- **Number of Unique Locations:** 2 State Centroids
- **Missing-Value Percentage:** 0.0%
- **Duplicate Percentage:** 0.0%
- **Observed vs Derived:** Aggregated state macro totals.
- **Likely Project Use:** State-level macro metrics and normalization scaling baselines.
- **Possible Join Keys:** `State/UT` (or `State`)

### 12. `hospitals.csv`
- **Filename:** `hospitals.csv`
- **File Type:** CSV
- **Number of Rows:** 18 rows
- **Number of Columns:** 11 columns
- **Column Names:** `['Unnamed: 0', 'name', 'city', 'district', 'category', 'latitude', 'longitude', 'url', 'id', 'state', 'helpline']`
- **Sample Record:** `{"name": "Government General Hospital", "city": "Guntur", "district": "Guntur", "category": "Public", "latitude": 16.3, "longitude": 80.44, "state": "Andhra Pradesh", "helpline": "+91-863-2234244"}`
- **Geographic Resolution:** Facility level (exact point coordinates of major hospitals)
- **Temporal Resolution:** Static
- **Date/Year Range:** N/A
- **Number of Unique Districts:** 8 unique districts/cities (`Anantapur`, `Guntur`, `Hyderabad`, `Kakinada`, `Secunderabad`, `Tirupati`, `Vijayawada`, `Visakhapatnam`)
- **Number of Unique Locations:** 18 Hospital Facility Points
- **Missing-Value Percentage:** 0.0% across all columns
- **Duplicate Percentage:** 0.0%
- **Observed vs Derived:** Observed facility records with verified geographic coordinates.
- **Likely Project Use:** Ground-truth healthcare infrastructure density and point facility mapping for DDRPS Healthcare Deficit ($H_d$).
- **Possible Join Keys:** `district`, `city`, `state`, `latitude`/`longitude`

### 13. `india-districts-census-2011.csv`
- **Filename:** `india-districts-census-2011.csv`
- **File Type:** CSV
- **Number of Rows:** 23 rows
- **Number of Columns:** 118 columns
- **Column Names:** `['District code', 'State name', 'District name', 'Population', 'Male', 'Female', 'Literate', 'Male_Literate', 'Female_Literate', 'SC', 'Male_SC', 'Female_SC', 'ST', 'Male_ST', 'Female_ST', 'Workers', 'Main_Workers', 'Marginal_Workers', 'Households', 'Housholds_with_Electric_Lighting', 'Households_with_Internet', 'Households_with_Computer', 'Rural_Households', 'Urban_Households', 'Condition_of_occupied_census_houses_Dilapidated_Households', 'Not_having_latrine_facility_within_the_premises_Alternative_source_Open_Households', ...]` *(118 official Census metrics)*
- **Sample Record:** `{"State name": "ANDHRA PRADESH", "District name": "Adilabad", "Population": 2741239, "Households": 817714, "Workers": 1323667, "Condition_of_occupied_census_houses_Dilapidated_Households": 35823, "Not_having_latrine_facility_within_the_premises_Alternative_source_Open_Households": 446014}`
- **Geographic Resolution:** Legacy District level (23 undivided districts of pre-2014 Andhra Pradesh)
- **Temporal Resolution:** Static (Official 2011 Census of India)
- **Date/Year Range:** 2011 Census
- **Number of Unique Districts:** 23 Legacy Districts (10 Telangana + 13 Andhra Pradesh)
- **Number of Unique Locations:** 23 Legacy Districts
- **Missing-Value Percentage:** 0.0% across all 118 columns
- **Duplicate Percentage:** 0.0%
- **Observed vs Derived:** Official observed ground-truth Census measurements.
- **Likely Project Use:** Core ground-truth source for all DDRPS vulnerability and deficit components: Exposure ($D_d$), Healthcare Beds ($H_d$), Infrastructure Isolation ($R_d$), and Housing Dilapidation ($S_d$).
- **Possible Join Keys:** `District name` (or `District code`), `State name`

### 14. `india_places.csv`
- **Filename:** `india_places.csv`
- **File Type:** CSV
- **Number of Rows:** 115 rows
- **Number of Columns:** 7 columns
- **Column Names:** `['State', 'District', 'City', 'Population', 'Area (in km^2)', 'Latitude', 'Longitude']`
- **Sample Record:** `{"State": "Andhra Pradesh", "District": "East Godavari", "City": "Rajamahendravaram", "Population": 341831, "Area (in km^2)": 44.5, "Latitude": 17.0, "Longitude": 81.78}`
- **Geographic Resolution:** Combined State / District / City place level
- **Temporal Resolution:** Static
- **Date/Year Range:** N/A
- **Number of Unique Districts:** 50 District name variations (including '-' for state-level rows)
- **Number of Unique Locations:** 115 Places
- **Missing-Value Percentage:** 0.0%
- **Duplicate Percentage:** 0.0%
- **Observed vs Derived:** Observed demography and spatial coordinates.
- **Likely Project Use:** Comprehensive spatial lookup table for cities, towns, and district centers across AP & Telangana.
- **Possible Join Keys:** `City`, `District`, `State`, `Latitude`/`Longitude`

### 15. `india_states.csv`
- **Filename:** `india_states.csv`
- **File Type:** CSV
- **Number of Rows:** 2 rows
- **Number of Columns:** 13 columns
- **Column Names:** `['Name', 'Rural Hospitals', 'Rural Beds', 'Urban Hospitals', 'Urban Beds', 'Total Hospitals', 'Total Beds', 'Confirmed Cases', 'Recovered Cases', 'deaths', 'date', 'asOn', 'helpline']`
- **Sample Record:** `{"Name": "Andhra Pradesh", "Rural Hospitals": 193, "Rural Beds": 6480, "Urban Hospitals": 65, "Urban Beds": 16658, "Total Hospitals": 258, "Total Beds": 23138, "Confirmed Cases": 487331, "Recovered Cases": 382104, "deaths": 4347, "date": "September 06", "asOn": "2017-01-01T00:00:00.000Z", "helpline": "+91-866-2410978"}`
- **Geographic Resolution:** State level (Andhra Pradesh and Telangana)
- **Temporal Resolution:** Static snapshot (Healthcare stats asOn 2017)
- **Date/Year Range:** 2017
- **Number of Unique Districts:** 0 (State level)
- **Number of Unique Locations:** 2 States
- **Missing-Value Percentage:** 0.0%
- **Duplicate Percentage:** 0.0%
- **Observed vs Derived:** Ministry of Health & Family Welfare observed state totals.
- **Likely Project Use:** State-level healthcare bed baseline (AP: 258 hospitals / 23,138 beds; Telangana: 802 hospitals / 20,983 beds) for bed-per-capita ratio scaling.
- **Possible Join Keys:** `Name` (State name)

### 16. `india_states_daily.csv`
- **Filename:** `india_states_daily.csv`
- **File Type:** CSV
- **Number of Rows:** 2 rows
- **Number of Columns:** 192 columns
- **Column Names:** `['Name', 'Rural Hospitals', 'Rural Beds', 'Urban Hospitals', 'Urban Beds', 'Total Hospitals', 'totalBeds', 'asOn', 'March 10', ..., 'September 06', 'Final', 'Hospital Beds', 'Helpline']`
- **Sample Record:** `{"Name": "Andhra Pradesh", "Rural Hospitals": 193, "Rural Beds": 6480, "Urban Hospitals": 65, "Urban Beds": 16658, "Total Hospitals": 258, "totalBeds": 23138, "March 10": 0, "September 06": 487331}`
- **Geographic Resolution:** State level (Andhra Pradesh and Telangana)
- **Temporal Resolution:** Daily time series (181 consecutive days from March 10 to September 06, 2020)
- **Date/Year Range:** March 10, 2020 to September 06, 2020
- **Number of Unique Districts:** 0 (State level)
- **Number of Unique Locations:** 2 States
- **Missing-Value Percentage:** 0.0%
- **Duplicate Percentage:** 0.0%
- **Observed vs Derived:** Observed daily COVID-19 case counts.
- **Likely Project Use:** Contextual epidemic tracking. *Excluded from flood hazard prediction pipeline.*
- **Possible Join Keys:** `Name`

### 17. `patients_data.csv`
- **Filename:** `patients_data.csv`
- **File Type:** CSV
- **Number of Rows:** 72 rows
- **Number of Columns:** 11 columns
- **Column Names:** `['Unique id', 'Diagnosed date', 'Age', 'Gender', 'Detected city', 'Detected state', 'Current status', 'Status change date', 'Notes', 'Lat', 'Long']`
- **Sample Record:** `{"Unique id": 5, "Diagnosed date": "02-Mar", "Age": "Not Known", "Gender": "Not Known", "Detected city": "Hyderabad", "Detected state": "Telangana", "Current status": "Recovered", "Status change date": "02-Mar", "Notes": "Travelled from Dubai...", "Lat": "25.3801017", "Long": "68.3750376"}`
- **Geographic Resolution:** Facility / City point level (16 detected cities)
- **Temporal Resolution:** Event dates (March 2020)
- **Date/Year Range:** March 2, 2020 to March 2020
- **Number of Unique Districts:** 16 Cities/Districts
- **Number of Unique Locations:** 16 Detected Locations
- **Missing-Value Percentage:** `Age` column has 1 missing/unknown entry (1.39%); all other 10 columns 0.0%.
- **Duplicate Percentage:** 0.0%
- **Observed vs Derived:** Observed patient case records with GPS coordinates.
- **Likely Project Use:** Contextual healthcare incident tracking. *Excluded from flood hazard prediction pipeline.*
- **Possible Join Keys:** `Detected city`, `Detected state`, `Lat`/`Long`
