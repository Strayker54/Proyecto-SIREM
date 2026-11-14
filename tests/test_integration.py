"""Pruebas de integración extremo a extremo (catálogo -> motor -> sustitución R3 -> ficha técnica)."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from src.ficha_exporter import build_technical_sheet_dict
from src.routing_engine import Point2D, RouteParams, load_catalog_from_csv, solve_dijkstra
from src.ui.review_module import find_same_quadrant_substitutes, substitute_track_and_recalculate


class TestEndToEndIntegration(unittest.TestCase):
    """Pruebas de integración del flujo completo SIREM."""

    def test_route_substitution_and_sheet_export(self) -> None:
        catalog = load_catalog_from_csv()
        lookup = {t.track_id: t for t in catalog}
        params = RouteParams(x_ini=Point2D(-0.65, 0.70), x_obj=Point2D(0.60, -0.55), m=6)
        res = solve_dijkstra(catalog, params)
        self.assertTrue(res.feasible)

        used_ids = {s.track.track_id for s in res.stages}
        subs = find_same_quadrant_substitutes(res.stages[2].track, catalog, used_ids, top_k=3)
        self.assertGreaterEqual(len(subs), 1)

        orig_tracks = [s.track for s in res.stages]
        new_stages, new_metrics = substitute_track_and_recalculate(orig_tracks, 2, subs[0], params)
        self.assertEqual(len(new_stages), 6)
        self.assertTrue(new_metrics.unique_tracks)

        sheet = build_technical_sheet_dict(
            {"case_id": "SIREM-SYN-01", "title": "Prueba Integración", "context": "UIS"},
            params,
            res,
            lookup,
        )
        self.assertTrue(sheet["verification_checklist"]["all_passed"])


if __name__ == "__main__":
    unittest.main()
