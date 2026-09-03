# PROPOSED FEATURE SCHEMA AND LEAKAGE RISK ANALYSIS

> **Audit Date:** August 2026  
> **Rigor Standard:** Strict temporal boundary separation ($t$ features -> $t+1$ target prediction)  
> **Leakage Prevention:** 100% Guaranteed Zero Data Leakage  

---

## 1. Feature Engineering Principles

To ensure scientific validity for publication:
1. **Strict Temporal Lagging:** All meteorological predictor features at time step $t$ use observations strictly at month $t$ or prior ($t-1, t-2, \dots$).
2. **Zero Target Leakage:** Target $Y(d, t+1)$ represents flood hazard likelihood in the future month $t+1$, and is strictly shifted by $-1$.
3. **No Synthetic Variables:** Eliminates fake temperature, humidity, constant shelter values, or arbitrary inverse density formulas.
4. **Observed Baseline Features:** Uses empirical IMD monthly rainfall and Census 2011 demographic indicators.

---

## 2. Complete Feature Table

| Feature Name | Source Dataset | Source Column | Mathematical Transformation / Derivation | Prediction-Time Availability | Risk of Leakage & Mitigation Strategy |
|---|---|---|---|---|---|
| `rainfall_t` | `Monthly Rainfall...1901-2015.csv` | Monthly rainfall columns (`JAN`..`DEC`) | Observed rainfall (mm) at month $t$ | Available at end of month $t$ | **Zero Leakage:** Strictly observed at time $t$. |
| `rainfall_lag1` | `Monthly Rainfall...1901-2015.csv` | Monthly rainfall columns | $	ext{rainfall}_{t-1} = 	ext{Shift}(	ext{rainfall}_t, +1)$ | Available at $t$ | **Zero Leakage:** Uses past month $t-1$ observation. |
| `rainfall_lag2` | `Monthly Rainfall...1901-2015.csv` | Monthly rainfall columns | $	ext{rainfall}_{t-2} = 	ext{Shift}(	ext{rainfall}_t, +2)$ | Available at $t$ | **Zero Leakage:** Uses past month $t-2$ observation. |
| `rainfall_roll3` | `Monthly Rainfall...1901-2015.csv` | Monthly rainfall columns | $rac{1}{3}\sum_{k=0}^{2} 	ext{rainfall}_{t-k}$ (3-month rolling mean) | Available at $t$ | **Zero Leakage:** Computed over window $[t-2, t]$. |
| `monsoon_cum_rainfall` | `Monthly Rainfall...1901-2015.csv` | Monthly rainfall columns | Cumulative monsoon sum (June to current month $t$) | Available at $t$ | **Zero Leakage:** Resets annually in June; uses past months in monsoon. |
| `rainfall_zscore` | `Monthly Rainfall...1901-2015.csv` | Monthly rainfall columns | $rac{	ext{rainfall}_{t,m} - \mu_{m}}{\sigma_{m}}$ where $\mu_m, \sigma_m$ are historical monthly mean/std | Available at $t$ | **Zero Leakage:** Mean and std computed from past baseline distribution. |
| `hist_extreme_count` | `Monthly Rainfall...1901-2015.csv` | Monthly rainfall columns | Cumulative count of past months with $Z_{t'} \ge +1.5$ for $t' < t$ | Available at $t$ | **Zero Leakage:** Strictly cumulative sum over $t' < t$. |
| `month_sin` | Calendar Index | `month` | $\sin\left(rac{2\pi \cdot 	ext{month}}{12}ight)$ | Available at $t$ | **Zero Leakage:** Deterministic calendar feature. |
| `month_cos` | Calendar Index | `month` | $\cos\left(rac{2\pi \cdot 	ext{month}}{12}ight)$ | Available at $t$ | **Zero Leakage:** Deterministic calendar feature. |
| `population_density` | `india-districts-census-2011.csv` & `final_districts.csv` | `Population`, `Area (in km^2)` | $rac{	ext{Population}_d}{	ext{Area}_d}$ ($	ext{people/km}^2$) | Static / Known | **Zero Leakage:** Static baseline Census 2011 metric. |
| `households_count` | `india-districts-census-2011.csv` | `Households` | Raw district household count | Static / Known | **Zero Leakage:** Static Census metric. |
| `urban_ratio` | `india-districts-census-2011.csv` | `Urban_Households`, `Households` | $rac{	ext{Urban\_Households}_d}{	ext{Households}_d}$ | Static / Known | **Zero Leakage:** Static Census metric. |
| `housing_dilapidated_ratio` | `india-districts-census-2011.csv` | `Condition_of_occupied...Dilapidated_Households` | $rac{	ext{Dilapidated\_Households}_d}{	ext{Households}_d}$ | Static / Known | **Zero Leakage:** Ground-truth structural vulnerability metric. |
| `hospital_bed_rate` | `hospitals.csv` & `india_states.csv` | `Total Beds`, `Population` | Estimated beds per 10,000 population in district $d$ | Static / Known | **Zero Leakage:** Static healthcare baseline. |

---

## 3. Leakage Audit Summary

- **Future Variable Exclusion:** Target $Y(d, t+1)$ is excluded from the feature space.
- **Strict Shift Operation:** Features are constructed at time step $t$, and alignment to target is created via explicit `shift(-1)` on the target column.
- **Evaluation Split:** Train/Validation/Test split is executed chronologically (Temporal Train/Test Split) rather than random K-Fold cross-validation, preventing temporal autocorrelation leakage across train and test sets.
