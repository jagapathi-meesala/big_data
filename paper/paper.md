# RADAR Research Protocol: District-Level Disaster Prioritization and Pre-Positioning

**Track:** Big Data Systems / Spatio-temporal Data Mining
**System:** RADAR (Risk-Aware District Allocation & Response) on the AID-DRAS platform
**Study region:** 23 legacy (Census-2011) districts of Andhra Pradesh & Telangana, India
**Status:** research protocol, not a submission-ready manuscript. The newer
IMD-grid / conformal / allocation pipeline has no completed result bundle in
`bigdata/research/results/`. The checked-in legacy pilot is separate and has
known target-climatology leakage and replicated subdivision rainfall; see
`main.tex` and `PAPER_REVIEW.md` before citing any pilot metric.

---

## Abstract

This document specifies a proposed district-level disaster-risk and
pre-positioning study for 23 legacy districts in Andhra Pradesh and Telangana.
It describes candidate gridded-rainfall processing, temporal model evaluation,
calibration, composite priority scoring, and event-based allocation replay.
These steps are not, by themselves, evidence of calibrated flood prediction,
90% empirical coverage, reduced unmet demand, or distributed scalability. No
such results should be claimed until the relevant code has run on versioned
inputs and the raw outputs, environment, and evaluation protocol have been
archived and independently checked. This protocol must also distinguish the
new district-grid pipeline from the legacy subdivision-level pilot described
in the LaTeX draft.

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
- **Planned C1 (Outcome evaluation):** compare hazard-only, deficit-only,
  composite (DDRPS), and uncertainty-aware strategies after a held-out-event
  replay is complete.
- **Planned C2 (Uncertainty-aware allocation):** evaluate a split-conformal
  upper-risk input to the pre-positioning optimizer; empirical coverage and
  operational utility remain unmeasured.
- **Planned C3 (Gridded modeling):** construct district-day panels from IMD
  0.25° rainfall with a fixed pre-test climatology; geographic mapping and
  temporal leakage checks still require end-to-end verification.
- **Planned C4 (Distributed implementation):** run ETL/model/benchmark stages
  on a documented HDFS/PySpark cluster. Structured Streaming, scale-out, and
  PostGIS alerting are separate engineering claims and require their own
  reproducible tests.

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

**District reconstruction (proposed).** Current district names are mapped to
23 legacy Census-2011 units. The mapping, centroid construction, and
grid-weight assignment require validation against authoritative boundaries
and published coverage diagnostics. Centroid-kernel aggregation is a proxy
and should be compared with polygon-based areal aggregation; it does not by
itself establish precise district-level hazard measurements.

## 4. Methods

### 4.1 Proposed district-day panel (PySpark)

For district *d* and day *t*: rainfall $r_{d,t}$ (area-weighted mean of
cells), fixed-baseline climatology

$$\mu_{d,\mathrm{doy}} = \mathbb{E}[r_{d,u} \mid \mathrm{doy}(u) \in \mathrm{doy}(t) \pm 7,\ u \in 1901..1990], \quad \sigma_{d,\mathrm{doy}} = \mathrm{sd}(\cdot)$$

anomaly $z_{d,t} = (r_{d,t} - \mu)/\sigma$; candidate features at forecast time *t*:
lags (1, 7), rolling sums (7, 30), monsoon-cumulative rainfall (June reset),
seasonal encodings (month/doy sin-cos), monsoon indicator, ONI. The
This is the intended design, not a verified result. Confirm the actual source
coverage and ensure that climatology, imputation, normalization, and label
thresholds are fitted without test-period observations. Missing rainfall must
not silently become a negative event label.

### 4.2 Targets and models

- **Extreme-rain-day:** $y^{E}_{d,t} = \mathbf{1}[r_{d,t} \ge q^{99}_{d}]$
  where $q^{99}_{d}$ is the district's baseline p99.
- **Flood incidence:** $y^{F,K}_{d,t} = \mathbf{1}[\exists$ flood event at
  $d$ starting in $(t, t+K]]$, $K = 14$ days (ground truth).

Proposed models (Spark MLlib, class-weighted): Logistic Regression, Random
Forest (100 trees, depth 10), and GBT (100 iterations, depth 5). Proposed
temporal split: train ≤ 2005, validation 2006–2010, test > 2010 (flood-target
rows begin no earlier than the event-source coverage). These settings have not
been validated by an end-to-end run. Report ROC-AUC, average precision, Brier
score, reliability plots, prevalence, and thresholded confusion metrics.

### 4.3 Calibration and conformal bounds

Isotonic regression would map raw scores to calibrated probabilities
$\hat{p}$. Calibration and conformal-quantile fitting should use disjoint
chronological calibration sets (or a justified cross-fitting procedure).
For $n$ conformal observations, use the conservative order statistic
$k=\lceil(n+1)(1-\alpha)\rceil$ of scores $s_i=y_i-\hat{p}_i$, with explicit
handling if $k>n$, rather than an interpolated sample quantile. The candidate
upper bound is $\tilde{p}=\min(1,\hat{p}+\hat{q})$. Nominal coverage depends on
exchangeability assumptions; temporal dependence and distribution shift mean
that 90% coverage must not be claimed without a justified time-series method
and held-out coverage and sharpness results. No such result is currently
available.

### 4.4 DDRPS 2.0 (response priority)

$$\mathrm{DDRPS}_d = w_Q Q_d + w_D D_d + w_H H_d + w_M M_d + w_V V_d$$

with calibrated hazard $Q_d = \mathbb{E}_{\text{horizon}}[\hat{p}_{d,t}]$ and
Census-2011 deficits: exposure
$D_d = \mathrm{mm}(\rho_d \ln(1+\mathrm{pop}_d))$; healthcare
$H_d = 1 - \mathrm{mm}(\text{beds}/10\text{k})$; mobility
$M_d = 1 - \mathrm{mm}(\text{vehicles/household})$; housing
$V_d = \mathrm{mm}(\text{dilapidated share})$; $\mathrm{mm}$ = min-max.
Weight schemes under consideration: fixed baseline
(0.30/0.25/0.20/0.15/0.10) and a documented AHP sensitivity variant. No
independently elicited experts or valid learned-weight experiment is currently
documented; claims about ElasticNet failure are unsupported.

### 4.5 Uncertainty-aware pre-positioning (core experiment)

Decision variables: stock $x_d \ge 0$, $\sum_d x_d \le B$ (B = 200 units;
one unit ≈ relief for 5,000 affected people). Neighbouring districts share
stock at efficiency $T = 0.5$ (adjacency = centroid distance ≤ 1.2°).

$$\min_{x} \ \sum_{s \in \mathcal{S}} \pi_s \sum_d u_{s,d} \quad
\text{s.t. } u_{s,d} \ge n_{s,d} - x_d - T\!\!\sum_{d' \sim d} x_{d'},\ u_{s,d} \ge 0$$

Scenarios $\mathcal{S}$ = historical events with demand
$n_{s,d} = \text{affected}_{s,d}/5000$ (fallback: 2% of population).
Candidate policies: **uniform**, **hazard-only**, **deficit-only**, **DDRPS**,
and an uncertainty-aware policy whose objective explicitly combines hazard
uncertainty with exposure/need. The current script's conformal policy is
proportional to upper hazard alone; it is not a conformal DDRPS policy. Fit
policy stocks using training events only, then replay untouched held-out
events. An oracle fitted to event outcomes is a hindsight benchmark, not a
deployable policy. Demand units, fallback affected-population rates, neighbor
definition, and transfer efficiency require sourced justification and
sensitivity tests.

## 5. Results

No completed results are available for the proposed gridded/conformal/event-
replay workflow. Populate this section only after a versioned end-to-end run;
include sample sizes, event provenance, uncertainty intervals, all baselines,
and negative or inconclusive findings. Legacy pilot results are reported
separately and caveated in `main.tex`.

Figures are planned. Include only generated files that exist, retain their
source data and scripts, and verify that each plot corresponds to the final
evaluation split.

## 6. Discussion

- Why hazard rank ≠ response rank (spatial homogeneity of meteorology vs
  heterogeneity of deficits); implications for pre-positioning policy.
- What conformal bounds buy: a distribution-free hedge that concentrates
  stock in districts where the model is *both* uncertain and exposed —
  compare conformal vs risk-neutral columns.
- The failure of naive data-driven weight learning (ElasticNet on static deficits
  assigning hazard ≈ 0) as a cautionary tale for black-box feature selection 
  in high-stakes pre-positioning.

## 7. Threats to Validity

- Ground-truth events may be sparse and geocoding may be uncertain; source
  coverage, location matching, duplicate handling, and negative-label
  assumptions need an explicit audit before event-based claims.
- Centroid-kernel aggregation vs exact polygon weighting (ablation when GADM
  is available).
- District-boundary vintage mismatch (2018+ Telangana reorganisation) handled
  by a fixed mapping table; intra-district heterogeneity is smoothed.
- **Data staleness**: Census-2011 is old for current response planning. Do not
  assume relative vulnerability ranks remain stable without validation; seek
  current population and facility data.

## 8. Conclusion & Future Work

This document is a proposed protocol, not evidence that the planned
contributions have been achieved. The immediate work is to verify inputs and
labels, correct temporal leakage, run held-out experiments, and report
limitations before considering architectural extensions.

## Reproducibility

The checked-in unit tests exercise selected helper invariants, but do not
establish end-to-end data validity, conformal coverage under temporal
dependence, or allocation-policy correctness. Pin environment and input
checksums, record commands/configuration, archive outputs, and rerun the
complete pipeline from a clean state before claiming reproducibility.
