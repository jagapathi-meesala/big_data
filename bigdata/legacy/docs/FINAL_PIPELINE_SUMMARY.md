# FINAL RESEARCH PIPELINE EXECUTION SUMMARY

> **Execution Date:** August 2026  
> **Status:** 100% Complete & Verified  
> **ML Task:** Extreme Precipitation Risk Prediction (NOT observed flood hazard prediction)  
> **Target Definition:** $Y(d, t+1) = 1$ if next month precipitation anomaly $Z(d, t+1) \ge +1.5$, else $0$.  

---

## 1. Executive Summary & Research Methodology

This project implements a spatio-temporal big data research pipeline for **Extreme Precipitation Risk Prediction** and **Distributed Disaster Resource Provisioning System (DDRPS)** prioritization across 23 legacy undivided districts in Andhra Pradesh and Telangana.

### Key Terminology & Conceptual Distinction
1. **Risk $\neq$ Response Priority ($Q_d \neq \text{DDRPS}_d$):**
   - **Hazard Risk ($Q_d$):** Predicts the meteorological probability of extreme precipitation in month $t+1$.
   - **Response Priority (DDRPS):** Combines predicted hazard risk ($Q_d$) with four empirical socio-technical deficit components: Exposure ($D_d$), Healthcare ($H_d$), Mobility Access ($M_d$), and Housing Vulnerability ($V_d$).
2. **Operational Target Definition:**
   - Defined as $Z_{d, t+1} \ge +1.5$ (top ~7.9% extreme precipitation anomaly relative to 115-year monthly climatology).
   - Documented explicitly as an operational precipitation anomaly event, NOT an observed ground-truth flood label.
3. **Zero Target Data Leakage:**
   - Predictor features $X_{d, t}$ strictly use data available at time $t$ or earlier.
   - Target $Y_{d, t+1}$ is shifted by $-1$, and zero leakage was programmatically verified across all 31,740 district-month rows.

---

## 2. Experimental Results Overview

### A. Primary Model Performance (Temporal Split: Test Set 2006–2015)
- **Primary Classifier:** PySpark ML / Sklearn `RandomForestClassifier` (100 trees, max depth 10)
- **Accuracy:** 0.7475
- **Macro Precision (`average="macro"`):** 0.4991
- **Macro Recall (`average="macro"`):** 0.4986
- **Macro F1 (`average="macro"`):** 0.4942
- **ROC-AUC:** 0.5163
- **PR-AUC:** 0.1280

### B. Feature Ablation Experiment Results
| Feature Subset | Num Features | Accuracy | Macro Precision | Macro Recall | Macro F1 | ROC-AUC | PR-AUC |
|---|---|---|---|---|---|---|---|
| `Subset_A_Rainfall_Only` | 3 | 0.8319 | 0.5271 | 0.5207 | 0.5222 | 0.5115 | 0.1353 |
| `Subset_B_Rainfall_Temporal` | 6 | 0.8268 | 0.4973 | 0.4980 | 0.4961 | 0.5245 | 0.1561 |
| `Subset_C_Rainfall_Extremes` | 6 | 0.7960 | 0.5280 | 0.5330 | 0.5297 | 0.5144 | 0.1467 |
| `Subset_D_Full_Risk_Set` | 10 | 0.7475 | 0.4991 | 0.4986 | 0.4942 | 0.5163 | 0.1280 |

### C. Risk vs Response Priority Ranking Experiment
- **Forecast / Evaluation Period:** `2015-09`
- **Spearman Rank Correlation ($\rho$):** -0.6447
- **Mean Absolute Rank Change (MARC):** 12.74 position shifts
- **Max Individual District Rank Change:** 21 positions
- **Top-5 District Overlap:** 0.0%
- **Top-5 Risk Districts ($Q_d$):** `Krishna, Prakasam, Guntur, Chittoor, Srikakulam`
- **Top-5 Response Districts (DDRPS):** `Adilabad, Medak, Mahbubnagar, Karimnagar, Nalgonda`

### D. DDRPS Weight Sensitivity Analysis
| Configuration | Weight Distribution (Qd/Dd/Hd/Md/Vd) | Spearman Correlation ($\rho$) | Mean Absolute Rank Change (MARC) | Top-5 Overlap % |
|---|---|---|---|---|
| `Baseline` | `0.30/0.25/0.20/0.15/0.10` | 1.0000 | 0.00 | 100.0% |
| `Risk_Dominant` | `0.50/0.20/0.15/0.10/0.05` | 0.9842 | 0.70 | 100.0% |
| `Exposure_Dominant` | `0.20/0.45/0.15/0.10/0.10` | 0.8123 | 3.04 | 100.0% |
| `Capacity_Dominant` | `0.20/0.20/0.35/0.15/0.10` | 0.9931 | 0.52 | 100.0% |

### E. PySpark Distributed Scalability Benchmark
| Scale Multiplier | Total Input Records | PySpark Partitions | Runtime (sec) | Throughput (rec/sec) |
|---|---|---|---|---|
| `1x` | 31,740 | 2 | 1.738 s | 18,263.81 rec/s |
| `5x` | 158,700 | 8 | 1.917 s | 82,776.14 rec/s |
| `10x` | 317,400 | 8 | 2.204 s | 144,001.53 rec/s |
| `20x` | 634,800 | 8 | 3.812 s | 166,548.43 rec/s |
| `50x` | 1,587,000 | 8 | 7.884 s | 201,289.0 rec/s |

---

## 3. Implemented DDRPS Deficit Proxies & Formulas

All degenerate constants ($S_d = 0.50$) and inverse density proxies have been eliminated and replaced with ground-truth Census 2011 indicators:

1. **Hazard Risk ($Q_d$):** Model predicted probability of extreme precipitation in month $t+1$.
2. **Population Exposure ($D_d$):** $D_d = \text{MinMax}(\text{PopDensity}_d \times \ln(1 + \text{Population}_d))$.
3. **Healthcare Capacity Deficit ($H_d$):** $H_d = 1.0 - \text{MinMax}(\text{BedsPer10k}_d)$, combining point hospital facilities from `hospitals.csv` and state bed totals from `india_states.csv` allocated by Census district population proportions.
4. **Mobility Access Deficit ($M_d$):** $M_d = 1.0 - \text{MinMax}(\text{VehicleHouseholdRatio}_d)$ from Census 2011 vehicle ownership (`Bicycle + Motorcycle + Car / Households`).
5. **Housing Vulnerability ($V_d$):** $V_d = \text{MinMax}(\text{DilapidatedHouseholdRatio}_d)$ from Census 2011 housing dilapidation (`Dilapidated_Households / Households`).

---

## 4. Master Pipeline Verification & Audit Checklists

- [x] Weather features computed using subdivision-level climatological Z-scores (no synthetic weather variables).
- [x] Zero target data leakage programmatically verified across all 31,740 district-month rows.
- [x] PySpark ML and PySpark DataFrame distributed benchmarking executed natively.
- [x] Macro classification metrics evaluated using `average="macro"`.
- [x] All output CSVs cleanly generated under `bigdata/results/`.
