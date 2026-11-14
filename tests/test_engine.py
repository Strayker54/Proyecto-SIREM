"""Pruebas unitarias de las ecuaciones matemáticas del Principio ISO y control de infactibilidad."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from src.routing_engine import Point2D, RouteParams, compute_reference_trajectory, load_catalog_from_csv, solve_dijkstra


class TestMathEngine(unittest.TestCase):
    """Pruebas unitarias del motor geométrico SIREM."""

    def test_reference_trajectory_interpolation(self) -> None:
        refs = compute_reference_trajectory(Point2D(-1.0, 1.0), Point2D(1.0, -1.0), 5)
        self.assertEqual(len(refs), 5)
        self.assertAlmostEqual(refs[0].v, -1.0)
        self.assertAlmostEqual(refs[2].v, 0.0)
        self.assertAlmostEqual(refs[-1].v, 1.0)

    def test_controlled_infeasibility_without_relaxation(self) -> None:
        catalog = load_catalog_from_csv()
        impossible = RouteParams(
            x_ini=Point2D(-0.95, 0.95),
            x_obj=Point2D(0.95, -0.95),
            m=4,
            delta=0.10,
            epsilon_ini=0.05,
            epsilon_obj=0.05,
        )
        res = solve_dijkstra(catalog, impossible)
        self.assertFalse(res.feasible)
        self.assertIsNotNone(res.infeasibility_reason)


if __name__ == "__main__":
    unittest.main()
