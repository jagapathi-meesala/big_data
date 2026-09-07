# Paper

`paper.md` is the full IEEE-transactions-style draft. All `[RESULTS: …]`
placeholders are filled from the pipeline artifacts:

```bash
./run_pipeline.sh all          # produces bigdata/research/results/*
python bigdata/research/figures.py        # -> bigdata/research/figures/*.png
python bigdata/research/generate_report.py  # -> bigdata/research/results/REPORT.md
```

Then either:
- **Overleaf/LaTeX:** paste paper.md sections into the IEEE template
  (https://www.ieee.org/conferences/publishing/templates.html); figures live in
  `bigdata/research/figures/`.
- **Pandoc:** `pandoc paper.md -o paper.pdf --citeproc` once `refs.bib` is added.

## Suggested section-to-artifact map

| Paper section | Artifact |
|---|---|
| 3 Data | `datasets/raw/*`, `district_centroids.csv`, `district_grid_map.csv` |
| 5.1 Model quality | `results/model_metrics.csv` |
| 5.2 Coverage | `results/conformal_settings.json` |
| 5.3 Risk vs priority | `results/ranking_metrics.json` |
| 5.4 Allocation replay | `results/allocation_evaluation.csv` |
| 5.5 Scalability | `results/scalability_results.csv` |
| Figures | `research/figures/fig1..fig6` |
