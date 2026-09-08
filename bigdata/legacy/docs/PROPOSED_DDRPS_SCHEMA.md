# PROPOSED DDRPS (DISTRIBUTED DISASTER RESOURCE PROVISIONING SYSTEM) SCHEMA

> **Audit Date:** August 2026  
> **Core Scientific Principle:** RISK $\neq$ RESPONSE PRIORITY  
> **Integrity Guarantee:** Zero hardcoded fake constants ($S_d \neq 0.50$), Zero degenerate inverse proxies  

---

## 1. Philosophical & Mathematical Foundation

In disaster operations management, **Hazard Risk ($Q_d$)** measures the probability of a physical hazard occurrence (e.g. extreme flood inundation). However, hazard risk alone does NOT dictate emergency resource allocation. 

A high-risk unpopulated wetland requires lower immediate emergency supply priority than a medium-risk densely populated district with crippled hospitals and fragile housing infrastructure.

The **Distributed Disaster Resource Provisioning System (DDRPS)** integrates predicted hazard risk ($Q_d$) with four empirical socio-technical deficit components:

$$
\text{DDRPS}_d = w_q Q_d + w_d D_d + w_h H_d + w_r R_d + w_s S_d
$$

Where all sub-scores $Q_d, D_d, H_d, R_d, S_d \in [0, 1]$ are min-max normalized, and weights sum to $1.0$:
- $w_q = 0.30$ (Predicted Hazard Risk Weight)
- $w_d = 0.25$ (Population Exposure Deficit Weight)
- $w_h = 0.20$ (Healthcare Capacity Deficit Weight)
- $w_r = 0.15$ (Road & Transport Accessibility Deficit Weight)
- $w_s = 0.10$ (Shelter & Structural Vulnerability Deficit Weight)

---

## 2. Comprehensive DDRPS Component Matrix

| Component | Component Name | Source Dataset | Source Column(s) | Exact Mathematical Formula | Normalization Method | Physical / Operational Interpretation | Observed vs Proxy Status |
|---|---|---|---|---|---|---|---|
| $Q_d$ | **Predicted Hazard Risk** | Random Forest / XGBoost Model Predictions | Model output probability $\hat{P}(Y_{d,t+1}=1 \| X_{d,t})$ | $Q_d = \text{Clip}(\hat{P}, 0.0, 1.0)$ | Direct Probability $[0, 1]$ | Estimated probability of extreme flood hazard event in district $d$ during month $t+1$. | Model Predicted Probability |
| $D_d$ | **Population Exposure Deficit** | `india-districts-census-2011.csv` & `final_districts.csv` | `Population`, `Area (in km^2)` | $\text{Exposure}_d = \left(\frac{\text{Population}_d}{\text{Area}_d}\right) \times \ln(1 + \text{Population}_d)$ | $\text{MinMax}(\text{Exposure}_d)$ | Quantifies total human exposure combining population density and total population scale. | Observed Ground-Truth Census |
| $H_d$ | **Healthcare Capacity Deficit** | `hospitals.csv`, `india_states.csv`, `india-districts-census-2011.csv` | `id`, `Total Beds`, `Population` | $\text{BedRate}_d = \frac{\text{EstBeds}_d}{\text{Population}_d / 10000}$; $H_d = 1.0 - \text{MinMax}(\text{BedRate}_d)$ | Inverted MinMax $[0, 1]$ | Measures shortage of hospital beds per 10,000 residents; higher $H_d$ indicates acute medical deficit. | Combined Observed Points & Scaled Census |
| $R_d$ | **Transport Isolation Deficit** | `india-districts-census-2011.csv` | `Households`, `Households_with_Bicycle`, `Households_with_Scooter_Motorcycle_Moped`, `Households_with_Car_Jeep_Van` | $\text{VehRatio}_d = \frac{\text{VehHouseholds}_d}{\text{Households}_d}$; $R_d = 1.0 - \text{MinMax}(\text{VehRatio}_d)$ | Inverted MinMax $[0, 1]$ | Quantifies transport isolation (lack of private/mobile transport for evacuation); higher $R_d$ means greater isolation. | Ground-Truth Census Infrastructure Indicator |
| $S_d$ | **Shelter Structural Vulnerability Deficit** | `india-districts-census-2011.csv` | `Condition_of_occupied_census_houses_Dilapidated_Households`, `Households` | $\text{DilapRatio}_d = \frac{\text{Dilapidated\_Households}_d}{\text{Households}_d}$; $S_d = \text{MinMax}(\text{DilapRatio}_d)$ | Direct MinMax $[0, 1]$ | Measures structural fragility of housing stock and lack of safe shelter capacity; replaces old fake constant $S_d = 0.50$. | Ground-Truth Census Housing Vulnerability |

---

## 3. Key Improvements Over Previous Codebase

1. **Elimination of Hardcoded Constant $S_d = 0.50$:** Replaced with Census 2011 dilapidated dwelling ratio ($	ext{DilapRatio}_d$), providing real spatial variance across districts ($S_d \in [0, 1]$).
2. **Elimination of Degenerate Road Formula:** Old formula $R_d = 1.0 - 	ext{MinMax}(1 / 	ext{PopDensity}_d)$ reduced algebraically to a redundant function of population density. Replaced with Census 2011 household transportation availability ratio.
3. **Multi-Factor Operational Breakdown:** Computes exact percentage contributions of each deficit factor to total DDRPS score:
   $$
   \text{Risk\_Contrib}_d = \frac{w_q Q_d}{\text{DDRPS}_d}, \quad \text{Healthcare\_Contrib}_d = \frac{w_h H_d}{\text{DDRPS}_d}, \dots
   $$
4. **Actionable Operational Tiers:** Priority ranks ($1 \dots 46$) and 4 operational categories:
   - `PRIORITY_1_CRITICAL` ($	ext{DDRPS}_d \ge 0.70$)
   - `PRIORITY_2_HIGH` ($0.50 \le 	ext{DDRPS}_d < 0.70$)
   - `PRIORITY_3_MEDIUM` ($0.30 \le 	ext{DDRPS}_d < 0.50$)
   - `PRIORITY_4_LOW` ($	ext{DDRPS}_d < 0.30$)
