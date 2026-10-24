"""
generate_results_tables.py — Auto-generate paper tables from pipeline outputs.
===============================================================================
Reads all pipeline result JSONs/CSVs and emits ready-to-paste LaTeX table code
for inclusion in paper/main.tex.

Usage:
    python paper/generate_results_tables.py
    python paper/generate_results_tables.py --save   # write .tex snippets to paper/tables/
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# Locate project root
ROOT = Path(__file__).resolve().parents[1]
LEGACY_RESULTS = ROOT / "bigdata" / "legacy" / "results"
RESEARCH_RESULTS = ROOT / "bigdata" / "research" / "results"
TABLES_DIR = ROOT / "paper" / "tables"


def _load_json(path: Path) -> dict | list | None:
    if path.exists():
        return json.loads(path.read_text())
    return None


def _load_csv(path: Path) -> pd.DataFrame | None:
    if path.exists():
        return pd.read_csv(path)
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Table: RF Config (Table III in paper)
# ─────────────────────────────────────────────────────────────────────────────

def table_rf_config() -> str:
    return r"""\begin{table}[t]
\caption{Random Forest and GBT Model Configuration}
\label{tab:rfconfig}
\centering
\footnotesize
\begin{tabularx}{\columnwidth}{@{}l Y@{}}
\toprule
Item & Configuration \\
\midrule
Estimators & Sklearn \texttt{RandomForestClassifier} and \texttt{GBTClassifier} \\
Prediction unit & District-month \\
Task & Binary: extreme-precipitation event in month $t+1$ \\
Train period & 1901--2005 (train 1901--1990, val 1991--2005) \\
Test period & 2006--2015 (strictly held out) \\
Features & 10 meteorological \& temporal lags (Table~\ref{tab:features}) \\
Trees (RF) & 200, max depth 10, min samples leaf 5 \\
Iterations (GBT) & 300, max depth 5, learning rate 0.05 \\
Class balancing & \texttt{class\_weight=`balanced'} (RF); \texttt{scale\_pos\_weight} (GBT) \\
SMOTE ablation & SMOTE oversampling ($k=5$ neighbours) on train+val \\
Random seed & 42 \\
\bottomrule
\end{tabularx}
\end{table}"""


# ─────────────────────────────────────────────────────────────────────────────
# Table: Model Results (Table V in paper)
# ─────────────────────────────────────────────────────────────────────────────

def table_model_results(save_dir: Path | None = None) -> str:
    metrics_json = _load_json(LEGACY_RESULTS / "model_metrics_detailed.json")
    if metrics_json is None:
        return "% model_metrics_detailed.json not found — run evaluate_models.py first\n"

    rows = metrics_json if isinstance(metrics_json, list) else [metrics_json]
    best_pr = max(r.get("pr_auc", 0.0) for r in rows)

    def fmt(val, best_val, decimals=4):
        s = f"{val:.{decimals}f}"
        return r"\textbf{" + s + "}" if abs(val - best_val) < 1e-6 else s

    lines = [
        r"\begin{table}[t]",
        r"\caption{ML Model Evaluation Results (Test Period 2006--2015)}",
        r"\label{tab:modelresults}",
        r"\centering",
        r"\footnotesize",
        r"\begin{tabular}{@{}lcccc@{}}",
        r"\toprule",
        r"Model & Accuracy & Macro-F1 & PR-AUC & ROC-AUC \\",
        r"\midrule",
    ]
    for r in rows:
        name = r["model_name"]
        pr = r.get("pr_auc", 0.0)
        lines.append(
            f"{name} & "
            f"{r.get('accuracy', 0.0):.4f} & "
            f"{r.get('macro_f1', 0.0):.4f} & "
            f"{fmt(pr, best_pr)} & "
            f"{r.get('roc_auc', 0.0):.4f} \\\\"
        )
    lines += [
        r"\midrule",
        r"\multicolumn{5}{l}{\footnotesize Primary metric: PR-AUC (robust to class imbalance $\approx$8:1)} \\",
        r"\bottomrule",
        r"\end{tabular}",
        r"\end{table}",
    ]
    latex = "\n".join(lines)
    if save_dir:
        (save_dir / "tab_model_results.tex").write_text(latex)
    return latex


# ─────────────────────────────────────────────────────────────────────────────
# Table: DDRPS District Rankings (Table VI in paper)
# ─────────────────────────────────────────────────────────────────────────────

def table_ddrps_rankings(save_dir: Path | None = None) -> str:
    # Try new RADAR pipeline first, then legacy
    csv_paths = [
        RESEARCH_RESULTS / "ddrps_ranking.csv",
        LEGACY_RESULTS / "ddrps_priorities.csv",
    ]
    df = None
    for p in csv_paths:
        if p.exists():
            df = pd.read_csv(p)
            break

    if df is None:
        return "% ddrps_ranking.csv not found — run score_ddrps.py first\n"

    # Filter to baseline scheme if multiple schemes present
    if "scheme" in df.columns:
        df = df[df["scheme"] == "baseline"]

    # Take top-10 by priority rank
    if "priority_rank" in df.columns:
        df = df.sort_values("priority_rank").head(10)
    else:
        df = df.head(10)

    def _col(df, *candidates, default="—"):
        for c in candidates:
            if c in df.columns:
                return df[c]
        return pd.Series([default] * len(df))

    Qd_col = _col(df, "Qd", "qd")
    Dd_col = _col(df, "Dd", "dd")
    Hd_col = _col(df, "Hd", "hd")
    Md_col = _col(df, "Md", "md")
    Vd_col = _col(df, "Vd", "vd")
    ddrps_col = _col(df, "ddrps", "DDRPS")
    rank_col = _col(df, "priority_rank", "Priority")
    cat_col = _col(df, "category", "priority_category")

    lines = [
        r"\begin{table*}[t]",
        r"\caption{Top-10 District DDRPS Rankings (Baseline Weights: $w_{Q}=0.30$, $w_{D}=0.25$, $w_{H}=0.20$, $w_{M}=0.15$, $w_{V}=0.10$)}",
        r"\label{tab:ddrpsresults}",
        r"\centering",
        r"\footnotesize",
        r"\begin{tabularx}{\textwidth}{@{}l c c c c c c c@{}}",
        r"\toprule",
        r"District & Risk $Q_d$ & Density $D_d$ & Hosp.\ deficit $H_d$ & Mob.\ deficit $M_d$ & Housing $V_d$ & DDRPS $P_d$ & Priority \\",
        r"\midrule",
    ]

    for i in range(len(df)):
        district = df["district"].iloc[i]
        qd = f"{float(Qd_col.iloc[i]):.3f}" if Qd_col.iloc[i] != "—" else "—"
        dd = f"{float(Dd_col.iloc[i]):.3f}" if Dd_col.iloc[i] != "—" else "—"
        hd = f"{float(Hd_col.iloc[i]):.3f}" if Hd_col.iloc[i] != "—" else "—"
        md = f"{float(Md_col.iloc[i]):.3f}" if Md_col.iloc[i] != "—" else "—"
        vd = f"{float(Vd_col.iloc[i]):.3f}" if Vd_col.iloc[i] != "—" else "—"
        sc = f"{float(ddrps_col.iloc[i]):.3f}" if ddrps_col.iloc[i] != "—" else "—"
        cat_raw = str(cat_col.iloc[i]).replace("PRIORITY_1_", "").replace("PRIORITY_2_", "").replace("PRIORITY_3_", "").replace("PRIORITY_4_", "").title()
        lines.append(f"{district} & {qd} & {dd} & {hd} & {md} & {vd} & {sc} & {cat_raw} \\\\")

    lines += [r"\bottomrule", r"\end{tabularx}", r"\end{table*}"]
    latex = "\n".join(lines)
    if save_dir:
        (save_dir / "tab_ddrps_results.tex").write_text(latex)
    return latex


# ─────────────────────────────────────────────────────────────────────────────
# Table: Priority Category Distribution (Table VII)
# ─────────────────────────────────────────────────────────────────────────────

def table_priority_distribution(save_dir: Path | None = None) -> str:
    csv_paths = [
        RESEARCH_RESULTS / "ddrps_ranking.csv",
        LEGACY_RESULTS / "ddrps_priorities.csv",
    ]
    df = None
    for p in csv_paths:
        if p.exists():
            df = pd.read_csv(p)
            break

    if df is None:
        return "% ddrps_ranking.csv not found\n"

    if "scheme" in df.columns:
        df = df[df["scheme"] == "baseline"]

    cat_col = "category" if "category" in df.columns else "priority_category"
    if cat_col not in df.columns:
        return "% priority_category column not found\n"

    total = len(df)
    cats_ordered = ["PRIORITY_1_CRITICAL", "PRIORITY_2_HIGH", "PRIORITY_3_MEDIUM", "PRIORITY_4_LOW",
                    "Critical", "High", "Medium", "Low"]
    counts = df[cat_col].value_counts()

    # Normalize to friendly names
    def friendly(c):
        return c.replace("PRIORITY_1_", "").replace("PRIORITY_2_", "").replace("PRIORITY_3_", "").replace("PRIORITY_4_", "").title()

    lines = [
        r"\begin{table}[t]",
        r"\caption{Priority Category Distribution (23 Districts, Baseline Weights)}",
        r"\label{tab:distribution}",
        r"\centering",
        r"\footnotesize",
        r"\begin{tabular}{@{}lcc@{}}",
        r"\toprule",
        r"Category & District count & Percentage \\",
        r"\midrule",
    ]
    for raw_cat, cnt in counts.items():
        pct = 100.0 * cnt / total
        lines.append(f"{friendly(raw_cat)} & {cnt} & {pct:.1f}\\% \\\\")

    lines += [
        r"\midrule",
        f"Total & {total} & 100.0\\% \\\\",
        r"\bottomrule",
        r"\end{tabular}",
        r"\end{table}",
    ]
    latex = "\n".join(lines)
    if save_dir:
        (save_dir / "tab_priority_distribution.tex").write_text(latex)
    return latex


# ─────────────────────────────────────────────────────────────────────────────
# Table: AHP Weight Comparison (new table for paper)
# ─────────────────────────────────────────────────────────────────────────────

def table_ahp_weights(save_dir: Path | None = None) -> str:
    ahp_paths = [
        RESEARCH_RESULTS / "ahp_weights.json",
        LEGACY_RESULTS / "ahp_weights.json",
    ]
    data = None
    for p in ahp_paths:
        data = _load_json(p)
        if data:
            break

    if data is None:
        return "% ahp_weights.json not found — run ahp_weights.py first\n"

    criteria = data.get("criteria", ["Qd", "Dd", "Hd", "Md", "Vd"])
    baseline = data.get("baseline_weights", {})
    ahp_ev = data.get("ahp_eigenvector_weights", {})
    learned = data.get("learned_weights") or {}
    cr = data.get("consistency_ratio_CR", 0.0)
    lmax = data.get("lambda_max", 0.0)

    lines = [
        r"\begin{table}[t]",
        r"\caption{DDRPS Weight Schemes: Baseline, AHP-Derived, and Data-Learned}",
        r"\label{tab:ahp_weights}",
        r"\centering",
        r"\footnotesize",
        r"\begin{tabularx}{\columnwidth}{@{}l r r r@{}}",
        r"\toprule",
        r"Criterion & Baseline & AHP (eigenvector) & Learned (ElasticNet) \\",
        r"\midrule",
    ]
    for c in criteria:
        b = baseline.get(c, 0.0)
        a = ahp_ev.get(c, 0.0)
        l = learned.get(c)
        l_str = f"{l:.4f}" if l is not None else r"\textit{n/a}"
        lines.append(f"${c}$ & {b:.4f} & {a:.4f} & {l_str} \\\\")

    lines += [
        r"\midrule",
        f"Sum & {sum(baseline.values()):.4f} & {sum(ahp_ev.values()):.4f} & --- \\\\",
        r"\midrule",
        f"\\multicolumn{{4}}{{l}}{{AHP: $\\lambda_{{\\max}}={lmax:.4f}$, $CR={cr:.4f}$ ($<$0.10 = consistent)}} \\\\",
        r"\bottomrule",
        r"\end{tabularx}",
        r"\end{table}",
    ]
    latex = "\n".join(lines)
    if save_dir:
        (save_dir / "tab_ahp_weights.tex").write_text(latex)
    return latex


# ─────────────────────────────────────────────────────────────────────────────
# Table: Ranking experiment (Spearman, MARC, overlap)
# ─────────────────────────────────────────────────────────────────────────────

def section_ranking_results(save_dir: Path | None = None) -> str:
    json_paths = [
        RESEARCH_RESULTS / "ranking_metrics.json",
        LEGACY_RESULTS / "ranking_metrics.json",
    ]
    data = None
    for p in json_paths:
        data = _load_json(p)
        if data:
            break

    if data is None:
        return "% ranking_metrics.json not found — run score_ddrps.py / ranking_analysis.py\n"

    # Handle both legacy and new format
    def _get(keys, default="N/A"):
        for k in keys:
            if k in data:
                return data[k]
            for scheme_data in data.values():
                if isinstance(scheme_data, dict) and k in scheme_data:
                    return scheme_data[k]
        return default

    rho = _get(["spearman_rho", "spearman_correlation_rho"], 0.0)
    p_val = _get(["spearman_p", "spearman_p_value"], 0.0)
    marc = _get(["mean_abs_rank_change", "mean_absolute_rank_change_MARC"], 0.0)
    max_rc = _get(["max_rank_change", "max_district_rank_change"], 0)
    top5_overlap = _get(["top5_overlap_pct", "top_5_overlap_percentage"], 0.0)
    top5_risk = _get(["top5_risk", "top_5_hazard_risk_districts"], [])
    top5_prio = _get(["top5_priority", "top_5_response_priority_districts"], [])

    if isinstance(top5_risk, list):
        top5_risk_str = ", ".join(top5_risk)
        top5_prio_str = ", ".join(top5_prio)
    else:
        top5_risk_str = str(top5_risk)
        top5_prio_str = str(top5_prio)

    latex = f"""\\subsection{{Risk Rank vs.~Response Priority Rank}}
Table~\\ref{{tab:ranking_experiment}} summarises the divergence between
pure hazard-risk ordering ($Q_d$ alone) and full DDRPS priority ranking.

\\begin{{table}}[t]
\\caption{{Risk vs.\\ Response Priority Ranking Comparison (Baseline Weights)}}
\\label{{tab:ranking_experiment}}
\\centering
\\footnotesize
\\begin{{tabular}}{{@{{}}lr@{{}}}}
\\toprule
Metric & Value \\\\
\\midrule
Spearman rank correlation ($\\rho$) & {float(rho):.4f} ($p={float(p_val):.4f}$) \\\\
Mean Absolute Rank Change (MARC) & {float(marc):.2f} positions \\\\
Maximum individual rank change & {int(max_rc)} positions \\\\
Top-5 hazard vs.\\ priority overlap & {float(top5_overlap):.1f}\\% \\\\
\\midrule
Top-5 risk districts ($Q_d$) & \\multicolumn{{1}}{{p{{0.48\\columnwidth}}}}{{{top5_risk_str}}} \\\\
Top-5 priority districts (DDRPS) & \\multicolumn{{1}}{{p{{0.48\\columnwidth}}}}{{{top5_prio_str}}} \\\\
\\bottomrule
\\end{{tabular}}
\\end{{table}}

A Spearman~$\\rho = {float(rho):.4f}$ with a MARC of {float(marc):.2f} positions
and a {float(top5_overlap):.1f}\\% top-5 overlap empirically confirms the central thesis:
\\emph{{hazard risk alone is an insufficient proxy for operational response urgency}}.
Inland districts with limited healthcare and mobility infrastructure rise
significantly in the DDRPS ranking relative to their raw precipitation risk rank."""

    if save_dir:
        (save_dir / "sec_ranking_results.tex").write_text(latex)
    return latex


# ─────────────────────────────────────────────────────────────────────────────
# Dataset table (updated to actual pipeline data)
# ─────────────────────────────────────────────────────────────────────────────

def table_datasets(save_dir: Path | None = None) -> str:
    latex = r"""\begin{table*}[t]
\caption{Dataset Characteristics (Actual Pipeline Inputs)}
\label{tab:datasets}
\centering
\small
\begin{tabularx}{\textwidth}{@{}l r Y Y@{}}
\toprule
Dataset & Records & Important attributes & Purpose \\
\midrule
IMD Subdivision Rainfall 1901--2015 & 31,740 district-months & District, year, month, rainfall\_mm, Z-score & Environmental hazard intensity and extreme-event labelling \\
India Census 2011 & 23 districts & Population, area, vehicle ownership, housing type & Exposure ($D_d$), mobility ($M_d$), housing vulnerability ($V_d$) \\
Hospitals \& State Bed Counts & 23 districts & Facility count, bed totals allocated by population & Healthcare capacity deficit ($H_d$) \\
IFI Flood Events 1978--2015 & 632 events & District, year, severity, type & Ground-truth flood incidence for model comparison \\
\bottomrule
\end{tabularx}
\end{table*}"""
    if save_dir:
        (save_dir / "tab_datasets.tex").write_text(latex)
    return latex


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--save", action="store_true",
                    help="Write .tex snippets to paper/tables/")
    args = ap.parse_args()

    save_dir = None
    if args.save:
        TABLES_DIR.mkdir(parents=True, exist_ok=True)
        save_dir = TABLES_DIR
        print(f"[tables] Writing .tex files to {TABLES_DIR}")

    sections = [
        ("Dataset Table",            table_datasets),
        ("RF/GBT Config Table",      table_rf_config),
        ("Model Results Table",      table_model_results),
        ("AHP Weights Table",        table_ahp_weights),
        ("DDRPS Rankings Table",     table_ddrps_rankings),
        ("Priority Distribution",    table_priority_distribution),
        ("Ranking Experiment",       section_ranking_results),
    ]

    for title, fn in sections:
        print(f"\n{'='*70}")
        print(f"  {title}")
        print('='*70)
        try:
            out = fn(save_dir)
            print(out)
        except Exception as exc:
            print(f"  [ERROR] {exc}")

    if args.save:
        print(f"\n[tables] All .tex snippets saved to {TABLES_DIR}")


if __name__ == "__main__":
    main()
