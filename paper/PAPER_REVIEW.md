# Strict Research Review — RADAR / AID-DRAS

## Editorial decision

**Not ready for conference submission.** The repository contains an exploratory legacy rainfall/DDRPS pilot and a separate, newer RADAR pipeline design. It does not contain completed results for the newer district-grid, conformal-calibration, or event-replay study. The current evidence does not support claims of operational benefit, flood prediction, distribution-free coverage in deployment, or multi-node scalability.

The LaTeX draft has been revised to report the legacy pilot accurately and to disclose its key validity threats. Do not submit it as a validated flood-allocation paper until the blockers below are resolved.

## Verified findings

1. **The legacy weather data are not district-resolved.** `bigdata/legacy/spark_monthly/district_time_features.py` maps districts to only two rainfall subdivisions in practice: Telangana districts use `TELANGANA`; every other district is assigned `COASTAL ANDHRA PRADESH`, including Rayalaseema. Thus 31,740 rows are repeated district-month rows, not 31,740 independent weather observations. This makes the DDRPS weather ranks highly tied and undermines district-level predictive interpretation.
2. **The legacy target/anomaly construction uses future data.** `bigdata/legacy/spark_monthly/data_cleaning.py` computes subdivision-month mean and standard deviation over the whole 1901–2015 input before making the anomaly label. `rainfall_zscore` also appears as a model feature. The test interval 2006–2015 therefore contributes to label construction and features. The chronological model split does not repair this leakage.
3. **The reported `Persistence Baseline` is mislabeled.** In `bigdata/legacy/spark_monthly/evaluate_models.py`, `_persistence_baseline()` differences `historical_extreme_count` and thresholds that difference. It is not a conventional previous-label persistence forecast. The manuscript now calls it a historical-count heuristic.
4. **The saved classifier artifacts show poor discrimination.** `bigdata/legacy/results/model_metrics_detailed.json` reports learned-model ROC-AUC values from 0.4219 to 0.4869. Both tree models have zero positive-class recall at the default threshold. The GBT PR-AUC is 0.1287 versus 0.1111 for the heuristic, a relative difference that is not persuasive evidence of useful predictive skill—especially with the leakage above.
5. **Ranking results are descriptive and tie-sensitive.** `bigdata/legacy/results/ddrps_priorities.csv` contains only two distinct risk probabilities replicated within the two mapped weather groups. Its top-five hazard list is therefore sensitive to ordering ties; the Spearman p-value is not reliable confirmatory evidence for this design. The checked-in ranking artifacts also conflict: `ranking_metrics.json` top-five priority districts differ from the ranking CSV. The paper avoids listing top-five overlap as a headline result.
6. **AHP consistency is not weight validation.** `bigdata/research/results/ahp_weights.json` reports a consistency ratio for a matrix, but this does not establish independent expert elicitation or empirically validate the fixed baseline weights.
7. **The newer pipeline has no result bundle.** `bigdata/research/results/` currently contains only `ahp_weights.json`; expected panel, predictions, calibrated outputs, conformal settings, DDRPS ranks, event allocation, report, and benchmark artifacts are absent. The current `paper/paper.md` had presented these intended computations and placeholder outcomes as if the pipeline was already implemented and measured; it now describes a protocol instead.
8. **The new pipeline needs technical review before results can be trusted.** In `bigdata/models/train_risk_model.py`, the class weight is computed over all splits, rather than only the training split; the `Imputer` is fitted in a pipeline but inputs are already filled with zero, and the fitting/data-label flow needs review. In `bigdata/models/calibrate_conformal.py`, calibration and conformal quantile fitting use the same validation split; the current quantile uses NumPy interpolation instead of a conservative finite-sample order statistic. In `bigdata/allocation/optimize_prepositioning.py`, hazard-only and conformal policies do not actually allocate using the stated DDRPS composition, while scenario frequencies are uniform and the so-called oracle is fitted on pre-test events. These are blockers for interpreting reported calibration/allocation outcomes as currently specified.
9. **Claims of reproducibility need actual environment and data manifests.** `run_pipeline.sh` installs dependencies opportunistically inside the container and suppresses acquisition failures for event sources; no versioned run manifest or checked-in raw result bundle supports the paper’s earlier claims of complete results.

## Must-do experiments/fixes before submission

### P0 — Correct scientific target and inputs
- Use real district-level rainfall (the IMD gridded source) with a documented district polygon/grid-weight map and publish spatial join coverage, cell counts, and map diagnostics.
- Define one primary target. Do not call extreme rainfall a flood label. If flood incidence is the outcome, document event sources, geocoding, duplicate handling, lead-time window, and negative-label assumptions.
- Fit all climatology, scaling, imputation, and feature-selection transforms strictly within training/reference years. No target period may contribute to label thresholds or predictor statistics.
- Split by time and, where appropriate, by event/year; add a simple climatology and persistence baseline whose implementation matches its name.

### P0 — Validate allocation objective
- Define demand and transfer assumptions with defensible sources and sensitivity analysis; 2% fallback affected share, 5,000 people/unit, centroid-distance neighbors, and 50% transfer efficiency are not self-validating facts.
- Fit policy weights/stock using training scenarios only. Keep holdout events completely untouched until final evaluation; distinguish oracle hindsight as an unattainable upper bound.
- Confirm the LP objective, units, and neighbor-transfer constraints match the intended logistics problem. Compare uniform, hazard-only, deficit-only, DDRPS, uncertainty-aware, and oracle policies on the same held-out event set.
- Report uncertainty intervals over events/years and sensitivity to budget, transfer efficiency, demand assumptions, and event source. Do not infer operational benefit from rank divergence alone.

### P0 — Make calibration claims valid
- Isotonic calibration and conformal quantile estimation should use disjoint calibration and conformal-calibration data (or an explicitly justified cross-fitting design), not the same observations without qualification.
- Use the exact finite-sample conformal order statistic and state the exchangeability assumption. Daily observations are temporally dependent, so a marginal IID-style coverage guarantee cannot be claimed without addressing dependence or using a suitable blocked/time-series method.
- Report test coverage and interval/bound sharpness by target, time period, and district, with uncertainty. Coverage of an upper bound alone is not sufficient to claim useful calibration.

### P1 — Correct analysis and comparisons
- Resolve the conflict between legacy ranking CSV and JSON outputs; regenerate from a single canonical source.
- Specify tie handling before rank metrics; report the number of distinct values and use tie-aware measures. Avoid p-values that assume independent untied districts.
- Provide class prevalence, confusion matrices, PR curves, reliability diagrams, Brier/log loss, and threshold selection using validation data. A high accuracy under severe imbalance must not be presented as success.
- If retaining the AHP section, identify who supplied each pairwise judgment, the protocol, participant count, and the matrix; otherwise label it a constructed sensitivity scenario, not expert validation.

### P1 — Reproducibility and writing
- Check in a run manifest (commit, dataset checksums/licences, dependency versions, config, hardware/cluster, seeds, command, timestamps) and machine-readable outputs for every table/figure.
- Add citations for datasets, official software, and relevant baseline methods; verify each bibliographic entry and DOI/URL independently. The current bibliography has unsupported/unverified items and is too thin for the ambitious novelty claims.
- Remove unsupported “first,” “novel,” “validated,” “real-time,” and “production-ready” language unless a literature review or measured evidence establishes it.
- Compile the IEEE manuscript, check all references/citations, tables and figure legibility, and conform to the target venue’s page and anonymization rules. LaTeX/BibTeX tools were not available during this review.

## Scope boundary for current draft

The edited `main.tex` reports only the legacy classifier metrics, DDRPS pilot ranking and AHP matrix arithmetic, with limitations stated at the point of claim. It explicitly does **not** claim flood-event validation, conformal coverage, allocation improvement, or tested Spark/HDFS scalability. Auxiliary AI/routing/latency numbers without reproducible artifacts have been removed. The Markdown companion is now a proposed protocol rather than a results-bearing abstract.
