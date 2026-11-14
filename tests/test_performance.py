"""Prueba de rendimiento de latencia extremo a extremo para el Criterio CA3."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from src.routing_engine import Point2D, RouteParams, load_catalog_from_csv, solve_dijkstra


class TestPerformanceLatency(unittest.TestCase):
    """Verifica que una consulta individual se resuelva muy por debajo de 2.000 ms."""

    def test_single_query_under_threshold(self) -> None:
        catalog = load_catalog_from_csv()
        params = RouteParams(x_ini=Point2D(-0.65, 0.70), x_obj=Point2D(0.60, -0.55), m=6)
        res = solve_dijkstra(catalog, params)
        self.assertTrue(res.feasible)
        self.assertLessEqual(res.exec_time_ms, 2000.0)


if __name__ == "__main__":
    unittest.main()
