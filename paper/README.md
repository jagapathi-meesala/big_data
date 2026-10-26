# AID-DRAS / RADAR IEEE Research Paper Workspace

This directory contains the IEEE research paper source for **RADAR (Risk-Aware District Allocation & Response)** on the **AID-DRAS** platform:
> *"From Meteorological Risk to Response Priority: Uncertainty-Aware District-Level Disaster Resource Pre-Positioning Validated on Historical Flood Events"*

---

## Directory Structure

```
paper/
├── main.tex                       # Complete IEEEtran LaTeX paper (18 sections)
├── references.bib                 # Bibliography draft; entries need verification
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

## Evidence and Readiness

This is a **research draft, not a submission-ready paper**. The repository
contains an exploratory legacy monthly pilot with saved classifier and ranking
artifacts. That pilot repeats only two mapped subdivision rainfall series
across districts and derives anomalies from the full 1901--2015 record,
including the test period; it cannot substantiate leakage-free district-level
flood prediction. The newer IMD-grid RADAR workflow (calibration, conformal
bounds, event replay, pre-positioning and scale benchmarks) is a separate
design and currently has no completed result bundle. See [PAPER_REVIEW.md](PAPER_REVIEW.md)
for blockers and [main.tex](main.tex) for the carefully caveated legacy
results.

### Results currently present

- Legacy model metrics and ranking CSV/JSON artifacts under
  `bigdata/legacy/results/`.
- A constructed AHP comparison matrix under
  `bigdata/research/results/ahp_weights.json`; its consistency ratio does not
  constitute expert or outcome validation.
- No verified output bundle for the newer RADAR result paths described in
  `bigdata/research/README` and `bigdata/README_RADAR.md`.

Do not treat listed inputs, model classes, or architecture components as
validated methods merely because code or plans exist. No operational benefit,
conformal coverage, or multi-node scalability claim should be made without the
corresponding archived run, test protocol, and raw measurements.

### Reproduction and compilation

For the newer research pipeline, first verify source data, acquisition status,
and environment, then run the documented stages:
  ```bash
  ./run_pipeline.sh download
  ./run_pipeline.sh all
  python bigdata/research/generate_report.py
  ```
- **Expected artifacts** (not currently present): model metrics, calibration and
  coverage diagnostics, rankings, event-replay allocations, scalability outputs,
  and generated figures/reports. Running the runner does not by itself prove
  that each stage succeeded; inspect logs and verify the files and provenance.

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
3. Select `pdfLaTeX` as the compiler and verify the output; local LaTeX/BibTeX
  tools were unavailable during this review, so a clean compilation is not
  yet established.

---

## Submission Checklist Before Journal / Conference Submission

- [ ] Resolve P0 validity and code issues listed in [PAPER_REVIEW.md](PAPER_REVIEW.md).
- [ ] Execute the newer pipeline from versioned raw inputs; retain checksums, configs, software versions, logs, and outputs.
- [ ] Independently audit labels, splits, event geocoding, calibration, allocation policies, and all table-generation inputs.
- [ ] Report complete baselines, uncertainty intervals, negative results, and sensitivity analyses; populate tables only from archived outputs.
- [ ] Include only figures generated from those exact outputs and retain figure-generation source.
- [ ] Verify citations and compile the final target-venue version after LaTeX/BibTeX tools are available.
