# From Meteorological Risk to Response Priority: Uncertainty-Aware District-Level Disaster Resource Pre-Positioning Validated on Historical Flood Events

**Track:** Big Data Systems / Spatio-temporal Data Mining
**System:** RADAR (Risk-Aware District Allocation & Response) on the AID-DRAS platform
**Study region:** 23 legacy (Census-2011) districts of Andhra Pradesh & Telangana, India
**Status:** draft — all `[RESULTS: …]` placeholders are injected from
`bigdata/research/results/` by running the pipeline (`./run_pipeline.sh all`)
and `bigdata/research/generate_report.py`.

---

## Abstract

Disaster-resource pre-positioning is usually driven by meteorological hazard
forecasts. Using 124 years of IMD 0.25° gridded daily rainfall (1901–2024) for
23 districts of Andhra Pradesh and Telangana, we show that the districts with
the highest *hazard* are not the districts where pre-positioned relief does
the most good: hazard risk is spatially homogeneous relative to the
socio-technical deficits that determine response outcomes. We build a
leakage-free spatio-temporal hazard model (Spark MLlib Random Forest / GBT
over district-day panels with a fixed 1901–1990 baseline climatology), convert
its scores into decision-grade probabilities via isotonic calibration and
split-conformal bounds with 90% coverage, and fuse them with Census-2011
deficit indicators (exposure, healthcare capacity, mobility, housing) into a
composite response-priority score (DDRPS 2.0). We then solve a
budget-constrained pre-positioning LP that minimizes expected unmet demand,
where the risk-averse variant hedges district-level model uncertainty using
the conformal upper bounds. Replay against held-out historical flood events
(India Flood Inventory / EM-DAT ground truth) shows [RESULTS: strategy
comparison table] — in particular, the uncertainty-aware DDRPS strategy
reduces unmet demand by [RESULTS: X]% relative to uniform allocation and by
[RESULTS: Y]% relative to a hazard-only policy, while top-5 ranking overlap
between hazard and response priority is only [RESULTS: Z]% (Spearman
ρ = [RESULTS: ρ]). The full pipeline is implemented on HDFS/PySpark with
scale-up throughput of [RESULTS: max rec/s] and scale-out behaviour across
[RESULTS: worker counts] workers.

**Keywords:** disaster management, resource pre-positioning, conformal
prediction, spatio-temporal modeling, Apache Spark, HDFS, district-level
flood risk.

---

## 1. Introduction

1.1 **Problem.** Where should a finite stock of relief units be placed
*before* the monsoon? Operational systems answer with hazard maps; we argue
the answer must couple (i) calibrated hazard probability, (ii) static
socio-technical deficits, and (iii) an explicit statement of model
uncertainty — because the three rank districts very differently.

1.2 **Why existing practice falls short.** Hazard-only ranking treats two
districts with identical rainfall as identical, ignoring who lives there,
how mobile they are, and what healthcare exists. Point probabilities hide
model error exactly where data is thinnest. And evaluations are usually
meteorological (did we predict heavy rain?) rather than operational (did
pre-positioning there reduce unmet demand when floods actually happened?).

1.3 **Contributions.**
- **C1 (Outcome validation):** first district-level, event-validated
  comparison of hazard-only, deficit-only, composite (DDRPS), and
  uncertainty-aware rankings for the AP/Telangana region, using historical
  flood events as ground truth rather than rainfall as its own proxy.
- **C2 (Uncertainty-aware allocation):** a split-conformal upper risk bound
  feeding a pre-positioning LP; risk-averse allocation is compared against
  risk-neutral and oracle allocations under an identical replay protocol.
- **C3 (Leakage-free gridded modeling):** district-day panels from IMD 0.25°
  daily grids with a fixed pre-test baseline climatology (±7-day day-of-year
  window), eliminating the full-period climatology leakage and the
  subdivision-broadcast degeneracy of prior monthly pipelines.
- **C4 (Distributed implementation):** the entire ETL/model/benchmark stack
  runs on HDFS + PySpark (MLlib + Structured Streaming) with reproducible
  scale-up/scale-out benchmarks and a live alerting layer into PostGIS.

## 2. Related Work

- Flood hazard prediction with ML (RF/GBT on rainfall and reanalysis data);
  district-scale vulnerability indices from census data; UN/DRR
  pre-positioning literature; conformal prediction for distribution-free
  uncertainty; facility location & maximal-coverage pre-positioning
  formulations. (Fill with 15–20 citations: IMD data papers; Saharia et al.
  India Flood Inventory; conformal prediction — Vovk, Papadopoulos; facility
  location — Toregas et al., Church & ReVelle; Spark MLlib; Indian monsoon
  climatology studies.)

## 3. Data

| Layer | Source | Period | Resolution |
|---|---|---|---|
| Daily rainfall | IMD 0.25° gridded | 1901–2024 | grid cell / day |
| Population, housing, vehicles, households | Census of India 2011 | 2011 | 23 legacy districts |
| Hospital points / state bed totals | facilities CSV + india_states.csv | static | point / state |
| District registry (areas, centroids) | final_districts.csv | current | 46 districts → 23 legacy |
| Flood events (ground truth) | India Flood Inventory / EM-DAT / GDACS | 1978– | district / event |
| ENSO covariate | NOAA ONI | 1950– | month |

**District reconstruction.** Current (post-bifurcation) districts are mapped
to the 23 legacy Census-2011 districts by an explicit alias/mapping table;
legacy centroids are population-weighted means of member centroids; IMD cells
within a 0.7° kernel of each centroid are aggregated with inverse-distance
weights (polygon membership used when GADM is available). This removes the
subdivision broadcast of the legacy monthly pipeline under which all 23
districts shared two identical hazard values.

## 4. Methods

### 4.1 District-day panel (PySpark)

For district *d* and day *t*: rainfall $r_{d,t}$ (area-weighted mean of
cells), fixed-baseline climatology

$$\mu_{d,\mathrm{doy}} = \mathbb{E}[r_{d,u} \mid \mathrm{doy}(u) \in \mathrm{doy}(t) \pm 7,\ u \in 1901..1990], \quad \sigma_{d,\mathrm{doy}} = \mathrm{sd}(\cdot)$$

anomaly $z_{d,t} = (r_{d,t} - \mu)/\sigma$; features at forecast time *t*:
lags (1, 7), rolling sums (7, 30), monsoon-cumulative rainfall (June reset),
seasonal encodings (month/doy sin-cos), monsoon indicator, ONI. The
climatology is computed **only from the fixed 1901–1990 baseline**, so no
post-baseline observation enters feature or label construction.

### 4.2 Targets and models

- **Extreme-rain-day:** $y^{E}_{d,t} = \mathbf{1}[r_{d,t} \ge q^{99}_{d}]$
  where $q^{99}_{d}$ is the district's baseline p99.
- **Flood incidence:** $y^{F,K}_{d,t} = \mathbf{1}[\exists$ flood event at
  $d$ starting in $(t, t+K]]$, $K = 14$ days (ground truth).

Models (Spark MLlib, class-weighted): Logistic Regression, Random Forest
(100×10), GBT (100×5). Temporal split train ≤ 2005, val 2006–2010, test >
2010 (flood target: rows ≥ 1978). Metrics: ROC-AUC, PR-AUC, Brier, reliability.

### 4.3 Calibration and conformal bounds

Isotonic regression on the validation split maps raw scores to calibrated
probabilities $\hat{p}$. Split conformal on the same split: nonconformity
$s_i = y_i - \hat{p}_i$; finite-sample quantile

$$\hat{q} = \mathrm{Quantile}\left(\{s_i\},\ \lceil (n+1)(1-\alpha)\rceil / n\right), \quad \alpha = 0.10,$$

upper bound $\tilde{p} = \min(1, \hat{p} + \hat{q})$, guaranteeing marginal
coverage $\Pr(y \le \tilde{p}) \ge 0.90$, verified empirically on the test
split.

### 4.4 DDRPS 2.0 (response priority)

$$\mathrm{DDRPS}_d = w_Q Q_d + w_D D_d + w_H H_d + w_M M_d + w_V V_d$$

with calibrated hazard $Q_d = \mathbb{E}_{\text{horizon}}[\hat{p}_{d,t}]$ and
Census-2011 deficits: exposure
$D_d = \mathrm{mm}(\rho_d \ln(1+\mathrm{pop}_d))$; healthcare
$H_d = 1 - \mathrm{mm}(\text{beds}/10\text{k})$; mobility
$M_d = 1 - \mathrm{mm}(\text{vehicles/household})$; housing
$V_d = \mathrm{mm}(\text{dilapidated share})$; $\mathrm{mm}$ = min-max.
Weight schemes: fixed baseline (0.30/0.25/0.20/0.15/0.10), an AHP-expert
variant, and the legacy elastic-net-learned weights (comparison; the legacy
scheme nearly silences hazard, which we analyze).

### 4.5 Uncertainty-aware pre-positioning (core experiment)

Decision variables: stock $x_d \ge 0$, $\sum_d x_d \le B$ (B = 200 units;
one unit ≈ relief for 5,000 affected people). Neighbouring districts share
stock at efficiency $T = 0.5$ (adjacency = centroid distance ≤ 1.2°).

$$\min_{x} \ \sum_{s \in \mathcal{S}} \pi_s \sum_d u_{s,d} \quad
\text{s.t. } u_{s,d} \ge n_{s,d} - x_d - T\!\!\sum_{d' \sim d} x_{d'},\ u_{s,d} \ge 0$$

Scenarios $\mathcal{S}$ = historical events with demand
$n_{s,d} = \text{affected}_{s,d}/5000$ (fallback: 2% of population).
Strategies: **uniform**, **risk-only** ($x \propto \hat{p}$), **DDRPS**
($x \propto$ composite), **conformal** ($x \propto \tilde{p}$ — risk-averse),
**oracle** (LP on the true event distribution — upper bound). Evaluation
replays held-out events (> 2010) under the identical demand model.

## 5. Results

`[RESULTS: auto-injected from bigdata/research/results/REPORT.md — model
metrics, conformal coverage, ranking metrics per weight scheme, allocation
replay, scalability curves.]`

Figures: `fig1_study_region`, `fig2_model_metrics`,
`fig3_ranking_scatter`, `fig4_allocation`, `fig5_scalability`,
`fig6_events_timeline` (auto-generated by `bigdata/research/figures.py`).

## 6. Discussion

- Why hazard rank ≠ response rank (spatial homogeneity of meteorology vs
  heterogeneity of deficits); implications for pre-positioning policy.
- What conformal bounds buy: a distribution-free hedge that concentrates
  stock in districts where the model is *both* uncertain and exposed —
  compare conformal vs risk-neutral columns.
- The legacy learned-weight failure (ElasticNet on static deficits
  assigning hazard ≈ 0) as a cautionary tale for naive weight learning.

## 7. Threats to Validity

- Ground-truth events are sparse/one-sided (IFI starts 1978; EM-DAT free-text
  locations mapped by name matching); results are reported per source.
- Centroid-kernel aggregation vs exact polygon weighting (ablation when GADM
  is available).
- District-boundary vintage mismatch (2018+ Telangana reorganisation) handled
  by a fixed mapping table; intra-district heterogeneity is smoothed.
- Static 2011 deficits; no migration/dynamic population.

## 8. Conclusion & Future Work

Contributions C1–C4 deliver an outcome-validated, uncertainty-aware,
end-to-end distributed decision pipeline. Future: LSTM/temporal transformers
on the gridded panel; Bayesian deep ensembles replacing conformal bounds;
multi-resource LP; human-in-the-loop weight elicitation at scale.

## Reproducibility

All artifacts regenerate from `./run_pipeline.sh download && ./run_pipeline.sh all`
on the repo's docker-compose stack; unit tests pin the leakage, coverage, and
allocation invariants (`bigdata/tests/test_units.py`).
