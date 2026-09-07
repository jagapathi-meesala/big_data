"""Publish research artifacts to Postgres for the dashboard.

Tables created/refreshed:
  research_ddrps_ranking        district ranking rows (all weight schemes)
  research_model_metrics        model metric rows
  research_validation_summary   single JSONB document (ranking + allocation)

The live_alerts table is written continuously by streaming/stream_job.py.
All statements are literal strings; row values are always bound via %s.
"""
import json
import sys

import _bootstrap  # noqa: F401
import pandas as pd

from common.db import connect_pg

from config import (
    DDRPS_RANKING_CSV,
    MODEL_METRICS_CSV,
    VALIDATION_SUMMARY_JSON,
)


def main() -> int:
    try:
        conn = connect_pg()
    except Exception as exc:
        print(f"[serve] postgres connect failed: {exc}")
        return 1

    with conn.cursor() as cur:
        cur.execute(
            "CREATE TABLE IF NOT EXISTS research_ddrps_ranking (district VARCHAR(100), scheme VARCHAR(30), qd DOUBLE PRECISION, qd_upper DOUBLE PRECISION, dd DOUBLE PRECISION, hd DOUBLE PRECISION, md DOUBLE PRECISION, vd DOUBLE PRECISION, ddrps DOUBLE PRECISION, risk_rank INT, priority_rank INT, category VARCHAR(40), population DOUBLE PRECISION)"
        )
        cur.execute(
            "CREATE TABLE IF NOT EXISTS research_model_metrics (target VARCHAR(30), model VARCHAR(30), split VARCHAR(20), roc_auc DOUBLE PRECISION, pr_auc DOUBLE PRECISION, n_pos BIGINT, n BIGINT)"
        )
        cur.execute(
            "CREATE TABLE IF NOT EXISTS research_validation_summary (id INT PRIMARY KEY, payload JSONB, updated_at TIMESTAMPTZ DEFAULT now())"
        )

        if DDRPS_RANKING_CSV.exists():
            df = read_csv(DDRPS_RANKING_CSV)
            cur.execute("DELETE FROM research_ddrps_ranking")
            for _, r in df.iterrows():
                cur.execute(
                    "INSERT INTO research_ddrps_ranking (district, scheme, qd, qd_upper, dd, hd, md, vd, ddrps, risk_rank, priority_rank, category, population) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                    (
                        r["district"], r["scheme"], r.get("Qd"), r.get("Qd_upper"),
                        r.get("Dd"), r.get("Hd"), r.get("Md"), r.get("Vd"),
                        r.get("ddrps"), r.get("risk_rank"), r.get("priority_rank"),
                        r.get("category"), r.get("population"),
                    ),
                )
            print(f"[serve] research_ddrps_ranking: {len(df)} rows")

        if MODEL_METRICS_CSV.exists():
            df = read_csv(MODEL_METRICS_CSV)
            cur.execute("DELETE FROM research_model_metrics")
            for _, r in df.iterrows():
                cur.execute(
                    "INSERT INTO research_model_metrics (target, model, split, roc_auc, pr_auc, n_pos, n) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                    (
                        r.get("target"), r.get("model"), r.get("split"),
                        r.get("roc_auc"), r.get("pr_auc"), r.get("n_pos"), r.get("n"),
                    ),
                )
            print(f"[serve] research_model_metrics: {len(df)} rows")

        if VALIDATION_SUMMARY_JSON.exists():
            payload = json.loads(VALIDATION_SUMMARY_JSON.read_text(encoding="utf-8"))
            cur.execute("DELETE FROM research_validation_summary")
            cur.execute(
                "INSERT INTO research_validation_summary (id, payload) VALUES (%s, %s)",
                (1, json.dumps(payload)),
            )
            print("[serve] research_validation_summary published")

    conn.commit()
    conn.close()
    print("[serve] done")
    return 0


if __name__ == "__main__":
    sys.exit(main())
