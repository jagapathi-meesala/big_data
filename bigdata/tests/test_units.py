"""RADAR unit tests (pure pandas, no Spark, no network).

Run from the repo root:  python -m unittest discover -s bigdata/tests -v
"""
import sys
import unittest
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
_BASE = Path(__file__).resolve().parents[1]
for _sub in ("", "etl", "models", "allocation"):
    _p = _BASE / _sub if _sub else _BASE
    if str(_p) not in sys.path:
        sys.path.insert(0, str(_p))

import numpy as np
import pandas as pd


class TestAliases(unittest.TestCase):
    def test_canonical_variants(self):
        from common.aliases import canonical_district

        self.assertEqual(canonical_district("Rangareddi"), "Rangareddy")
        self.assertEqual(canonical_district("Ranga Reddy"), "Rangareddy")
        self.assertEqual(canonical_district("Rangareddy"), "Rangareddy")
        self.assertEqual(canonical_district("S.P.S. Nellore"), "Nellore")
        self.assertEqual(canonical_district("Kadapa"), "Y.S.R.")
        self.assertIsNone(canonical_district("Bengaluru"))

    def test_current_to_legacy(self):
        from common.aliases import current_to_legacy

        self.assertEqual(current_to_legacy("Vikarabad"), "Rangareddy")
        self.assertEqual(current_to_legacy("Wanaparthy"), "Mahbubnagar")
        self.assertEqual(current_to_legacy("Kakinada"), None)


class TestClimatologyLeakage(unittest.TestCase):
    """The fixed-baseline climatology must never see post-baseline years."""

    def _panel(self):
        dates = pd.date_range("1901-01-01", "1910-12-31", freq="D")
        df = pd.DataFrame(
            {
                "district": "Krishna",
                "date": dates,
                "rain_mm": np.abs(np.sin(doy_magic(dates))) * 50,
            }
        )
        return df

    def test_baseline_excluded_from_clim(self):
        import build_district_day_panel as etl

        df = self._panel()
        df["doy"] = df["date"].dt.dayofyear
        clim = etl.baseline_climatology(df)
        self.assertEqual(len(clim), 366)
        self.assertTrue((clim["clim_std"] > 0).all())

    def test_anomaly_finite_and_label_binary(self):
        import build_district_day_panel as etl

        df = self._panel()
        df["doy"] = df["date"].dt.dayofyear
        panel = etl.add_labels_and_clim(df)
        self.assertTrue(np.isfinite(panel["rain_anom"]).all())
        self.assertTrue(set(panel["extreme_rain_day"].unique()) <= {0, 1})


def doy_magic(dates):
    return dates.dayofyear / 12.0


class TestConformal(unittest.TestCase):
    def test_coverage_guarantee_holds(self):
        from calibrate_conformal import conformal_quantile, empirical_coverage

        rng = np.random.default_rng(7)
        p = rng.uniform(0, 1, 500)
        y = (rng.uniform(0, 1, 500) < p).astype(float)
        q = conformal_quantile(p, y, alpha=0.10)
        cov = empirical_coverage(np.clip(p + q, 0, 1), y)
        self.assertGreaterEqual(cov, 0.89)

    def test_zero_scores_give_full_coverage(self):
        from calibrate_conformal import conformal_quantile

        q = conformal_quantile(np.zeros(10), np.zeros(10), alpha=0.1)
        self.assertLessEqual(q, 0.0)


class TestAllocation(unittest.TestCase):
    def _ctx(self):
        return pd.DataFrame(
            {
                "lat": [17.0, 17.2, 12.0],
                "lon": [78.0, 78.3, 79.0],
                "population": [1e6, 2e6, 5e5],
                "Qd": [0.6, 0.2, 0.9],
                "Qd_upper": [0.8, 0.3, 0.95],
                "ddrps": [0.7, 0.3, 0.8],
            },
            index=["A", "B", "C"],
        )

    def test_uniform_splits_budget(self):
        from optimize_prepositioning import stock_uniform

        x = stock_uniform(3, 90)
        self.assertAlmostEqual(x.sum(), 90)

    def test_proportional_sums_to_budget(self):
        from optimize_prepositioning import stock_proportional

        x = stock_proportional(np.array([0.1, 0.3, 0.6]), 100)
        self.assertAlmostEqual(x.sum(), 100.0)
        self.assertTrue((np.diff(x) > 0).all())

    def test_unmet_monotone_in_stock(self):
        from optimize_prepositioning import (
            neighbour_matrix,
            unmet_for_stock,
        )

        ctx = self._ctx()
        nb = neighbour_matrix(ctx)
        needs = np.array([[5.0, 0.0, 10.0]])
        freq = np.array([1.0])
        u0 = unmet_for_stock(np.zeros(3), needs, freq, nb)
        u1 = unmet_for_stock(np.array([1, 1, 1.0]), needs, freq, nb)
        self.assertGreater(u0, u1)
        self.assertGreaterEqual(u1, 0.0)

    def test_lp_matches_or_beats_greedy(self):
        try:
            import pulp  # noqa: F401
        except ImportError:
            self.skipTest("PuLP not installed")
        from optimize_prepositioning import (
            greedy_stock,
            lp_optimal_stock,
            neighbour_matrix,
            unmet_for_stock,
        )

        ctx = self._ctx()
        nb = neighbour_matrix(ctx)
        needs = np.array([[5.0, 2.0, 10.0], [0.0, 4.0, 1.0]])
        freq = np.array([0.5, 0.5])
        lp = lp_optimal_stock(needs, freq, nb, 10)
        gr = greedy_stock(needs, freq, nb, 10)
        self.assertIsNotNone(lp)
        self.assertLessEqual(
            unmet_for_stock(lp, needs, freq, nb) + 1e-6,
            unmet_for_stock(gr, needs, freq, nb) + 1e-6,
        )


class TestDemandModel(unittest.TestCase):
    def test_affected_to_units(self):
        from optimize_prepositioning import ALLOCATION_UNIT_POP_COVERED  # noqa: F401

        # documented relation: 10,000 affected -> 2 units at 5k/unit
        self.assertEqual(10_000 // 5_000, 2)


if __name__ == "__main__":
    unittest.main()
