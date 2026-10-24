# AID-DRAS / RADAR IEEE Research Paper Workspace

This directory contains the IEEE research paper source for **RADAR (Risk-Aware District Allocation & Response)** on the **AID-DRAS** platform:
> *"From Meteorological Risk to Response Priority: Uncertainty-Aware District-Level Disaster Resource Pre-Positioning Validated on Historical Flood Events"*

---

## Directory Structure

```
paper/
├── main.tex                       # Complete IEEEtran LaTeX paper (18 sections)
├── references.bib                 # Verified IEEE BibTeX bibliography
├── figures/                       # Paper figures and diagrams
│   ├── architecture_diagram.mmd   # Mermaid source diagram of system architecture
│   └── system_architecture.tex   # LaTeX TikZ diagram source (included in main.tex)
├── tables/                        # LaTeX table source files
│   ├── dataset_summary.tex       # Table I: Summary of verified datasets
│   └── strategy_comparison.tex   # Table II: Pre-positioning allocation strategy results
├── results/                       # Pipeline output artifacts & report docs
│   └── README.md                  # Results documentation & artifact specifications
├── paper.md                       # Original Markdown research draft summary
└── README.md                      # This workspace documentation file
```

---

## Content & Verification Status

### Verified Technical Implementation
- **Architecture**: Complete full-stack integration (PySpark/HDFS ML pipeline + Node.js/PostGIS API + React/Leaflet Web GIS).
- **Study Region**: 23 legacy Census-2011 districts of Andhra Pradesh & Telangana, India.
- **Data Layers**: IMD $0.25^\circ$ daily gridded rainfall (1901--2024), Census-2011 deficits, NOAA ONI ENSO index, India Flood Inventory / EM-DAT ground truth events, live external feeds (USGS, GDACS, NASA EONET, Open-Meteo).
- **AI/ML Methods**: Spark MLlib Random Forest, GBT, and Logistic Regression; leakage-free 1901--1990 climatological baseline; Isotonic Calibration; Split-Conformal Prediction bounds ($\alpha=0.10, 90\%$ coverage).
- **Priority Scoring & LP Optimization**: DDRPS 2.0 weighted composite score ($w_Q Q_d + w_D D_d + w_H H_d + w_M M_d + w_V V_d$) and pre-positioning stock allocation Linear Program ($B=200$ units, $T=0.5$ inter-district transfer efficiency).
- **Routing**: OSRM multi-risk emergency route candidate generation (Routes A, B, C) via offset waypoints and transit friction scoring.

### Missing Data & Experimental TODOs
> **Important Note:** In accordance with scientific integrity guidelines, no quantitative experiment numbers or accuracy metrics were fabricated.

- **Pipeline Execution**: To populate the exact numerical values in Table II and the results section, run the PySpark pipeline scripts:
  ```bash
  ./run_pipeline.sh download
  ./run_pipeline.sh all
  python bigdata/research/generate_report.py
  ```
- **Generated Result Artifacts**: Running the pipeline populates:
  - `bigdata/research/results/model_metrics.csv` (Exact ROC-AUC, PR-AUC, Brier scores across splits)
  - `bigdata/research/results/conformal_settings.json` (Exact empirical coverage and quantile $\hat{q}$)
  - `bigdata/research/results/ddrps_ranking.csv` & `ranking_metrics.json` (Spearman $\rho$, MARC, and Top-5 overlap stats)
  - `bigdata/research/results/allocation_results.csv` & `validation_summary.json` (Unmet demand numbers across Uniform, Hazard-Only, DDRPS, Conformal, and Oracle policies)
  - `bigdata/research/results/scalability_results.csv` (PySpark scale-up/scale-out throughput benchmarks)

---

## How to Compile the LaTeX Paper

### Option 1: Using Local TeX Live / pdflatex
If TeX Live is installed locally:
```bash
cd paper
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
```

### Option 2: Using Overleaf or Online LaTeX Compilers
1. Zip the `paper/` directory contents (`main.tex`, `references.bib`, `figures/`, `tables/`).
2. Upload the zip archive to [Overleaf](https://www.overleaf.com/).
3. Select `pdfLaTeX` as the compiler. `main.tex` is configured to compile cleanly with `IEEEtran.cls`.

---

## Submission Checklist Before Journal / Conference Submission

- [ ] Execute `./run_pipeline.sh all` on the full IMD $0.25^\circ$ dataset.
- [ ] Run `python bigdata/research/generate_report.py` and `python bigdata/research/figures.py`.
- [ ] Inject exact numbers from `bigdata/research/results/` into `tables/strategy_comparison.tex` and Section XIV of `main.tex`.
- [ ] Include generated PNG figures from `bigdata/research/figures/` into the LaTeX `figures/` directory.
- [ ] Verify clean PDF compilation with zero TeX warnings/errors.
