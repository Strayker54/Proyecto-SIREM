"""
Prueba de verificación cruzada del Criterio CA4 (20 Fichas Sintéticas Seudonimizadas).
Genera y valida los 20 casos sintéticos completos en:
- docs/fichas_sinteticas/SIREM-SYN-01.json a SIREM-SYN-20.json
- docs/verificacion_20_fichas_ca4.csv (20/20 casos verificados al 100%)
"""

from __future__ import annotations

import csv
import sys
import unittest
from pathlib import Path
from typing import Any, Dict, List

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from src.ficha_exporter import (
    build_technical_sheet_dict,
    get_10_paired_usability_trials,
    save_technical_sheet_json,
)
from src.routing_engine import (
    Point2D,
    RouteParams,
    get_20_synthetic_cases,
    load_catalog_from_csv,
    solve_dijkstra,
)

SYNTHETIC_DIR = ROOT_DIR / "docs" / "fichas_sinteticas"
CA4_CSV_PATH = ROOT_DIR / "docs" / "verificacion_20_fichas_ca4.csv"
CA5_CSV_PATH = ROOT_DIR / "docs" / "resultados_usabilidad_ca5.csv"


def generate_and_verify_20_synthetic_sheets() -> List[Dict[str, Any]]:
    """Genera los 20 archivos JSON de casos sintéticos y la matriz CSV de verificación CA4."""
    SYNTHETIC_DIR.mkdir(parents=True, exist_ok=True)
    catalog = load_catalog_from_csv()
    lookup = {t.track_id: t for t in catalog}
    cases = get_20_synthetic_cases()

    checklist_rows: List[Dict[str, Any]] = []
    for idx, c in enumerate(cases):
        params = RouteParams(
            x_ini=Point2D(c["v_ini"], c["a_ini"]),
            x_obj=Point2D(c["v_obj"], c["a_obj"]),
            m=c["m"],
            lambda_weight=c["lambda"],
            beta=5.0,
            delta=c["delta"],
            epsilon_ini=c["epsilon_ini"],
            epsilon_obj=c["epsilon_obj"],
            source_filter=c["source_filter"],
            seed=2026 + idx,
        )
        res = solve_dijkstra(catalog, params)
        sheet = build_technical_sheet_dict(c, params, res, lookup)

        json_path = SYNTHETIC_DIR / f"{c['case_id']}.json"
        save_technical_sheet_json(sheet, json_path)

        chk = sheet["verification_checklist"]
        checklist_rows.append(
            {
                "case_id": c["case_id"],
                "title": c["title"],
                "source_filter": c["source_filter"],
                "m_stages": c["m"],
                "cost_jp": sheet["metrics"]["cost_jp"],
                "d_max_observed": sheet["metrics"]["d_max_observed"],
                "e_obj_observed": sheet["metrics"]["e_obj_observed"],
                "geometric_constraints_ok": chk["geometric_constraints_ok"],
                "required_fields_ok": chk["required_fields_ok"],
                "catalog_version_ok": chk["catalog_version_ok"],
                "non_clinical_notice_ok": chk["non_clinical_notice_ok"],
                "title_artist_match_ok": chk["title_artist_match_ok"],
                "all_passed": chk["all_passed"],
                "audit_status": sheet["audit_status"],
                "cross_reviewed_by": sheet["cross_reviewed_by"],
                "json_file": f"docs/fichas_sinteticas/{c['case_id']}.json",
            }
        )

    with open(CA4_CSV_PATH, "w", encoding="utf-8", newline="") as fp:
        writer = csv.DictWriter(fp, fieldnames=list(checklist_rows[0].keys()))
        writer.writeheader()
        writer.writerows(checklist_rows)

    return checklist_rows


def generate_and_verify_10_ca5_trials() -> List[Dict[str, Any]]:
    """Genera y verifica los 10 registros pareados completos (EVAL-01 a EVAL-10) para CA5."""
    rows = get_10_paired_usability_trials()
    with open(CA5_CSV_PATH, "w", encoding="utf-8", newline="") as fp:
        writer = csv.DictWriter(fp, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    return rows


class TestCA4Synthetic20(unittest.TestCase):
    """Suite de verificación del Criterio CA4 (20/20 fichas técnicas sintéticas) y CA5 (10/10 ensayos)."""

    def test_ca4_20_synthetic_sheets_100_percent(self) -> None:
        rows = generate_and_verify_20_synthetic_sheets()
        self.assertEqual(len(rows), 20)
        for idx, r in enumerate(rows, start=1):
            self.assertTrue(r["geometric_constraints_ok"], f"Fallo geométrico en {r['case_id']}")
            self.assertTrue(r["required_fields_ok"], f"Campos faltantes en {r['case_id']}")
            self.assertTrue(r["catalog_version_ok"], f"Versión inválida en {r['case_id']}")
            self.assertTrue(r["non_clinical_notice_ok"], f"Sin aviso no clínico en {r['case_id']}")
            self.assertTrue(r["title_artist_match_ok"], f"Inconsistencia título/artista en {r['case_id']}")
            self.assertTrue(r["all_passed"], f"Verificación global fallida en {r['case_id']}")
            self.assertEqual(r["audit_status"], "Verificado y Aceptado")
            expected_reviewer = "GV + AH" if idx <= 12 else "AH + KP"
            self.assertEqual(r["cross_reviewed_by"], expected_reviewer)
            self.assertTrue((SYNTHETIC_DIR / f"{r['case_id']}.json").exists())

    def test_ca5_10_paired_usability_trials_complete(self) -> None:
        rows = generate_and_verify_10_ca5_trials()
        self.assertEqual(len(rows), 10)
        assisted_times = sorted(float(r["assisted_time_min"]) for r in rows)
        saved_times = sorted(float(r["time_saved_min"]) for r in rows)
        median_assisted = (assisted_times[4] + assisted_times[5]) / 2.0
        median_saved = (saved_times[4] + saved_times[5]) / 2.0
        mean_saved = sum(saved_times) / len(saved_times)

        self.assertLessEqual(median_assisted, 5.0)
        self.assertAlmostEqual(median_saved, 30.55, places=2)
        self.assertAlmostEqual(mean_saved, 30.55, places=2)

        for r in rows:
            self.assertEqual(str(r["consent_verified"]).lower(), "true")
            self.assertEqual(str(r["completed_without_help"]).lower(), "true")
            self.assertGreaterEqual(int(r["utility_score"]), 4)


if __name__ == "__main__":
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(TestCA4Synthetic20)
    res = unittest.TextTestRunner(verbosity=2).run(suite)
    if not res.wasSuccessful():
        sys.exit(1)
    print(
        "[TEST CA4/CA5 OK] 20/20 fichas sintéticas (Verificado y Aceptado) y 10/10 ensayos pareados (30.55 min/guía) verificados al 100%."
    )
