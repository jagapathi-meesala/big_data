"""RADAR: Risk-Aware District Allocation & Response research pipeline.

Subpackages:
    data_acquisition  one-time downloads (IMD gridded rainfall, flood events,
                      ENSO index) and the district<->grid mapping
    etl               district-day panel construction (PySpark or pandas)
    models            Spark MLlib hazard models + calibration/conformal
    ddrps             DDRPS 2.0 scoring and ranking experiments
    allocation        uncertainty-aware pre-positioning optimizer + replay
    streaming         live Open-Meteo/GDACS ingestion (Structured Streaming)
    benchmarks        scale-up / scale-out benchmark runners
    serving           writes result panels to Postgres for the dashboard
    research          figures + report generation

See bigdata/README_RADAR.md for the full pipeline map.
"""
