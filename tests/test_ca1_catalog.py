"""
Prueba de verificación cruzada del Criterio CA1 (Catálogo Musical Auditado SIREM).
Comprueba que data/catalogo_sirem_1284.csv contiene exactamente 1.284 pistas (>= 500),
522 de DEAM y 762 de PMEmo, coordenadas normalizadas en [-1, 1]^2, unicidad de track_id
y cero valores nulos en todos los campos obligatorios del contrato de datos.
"""

from __future__ import annotations

import csv
import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from src.data_cleaning import DATA_CSV_PATH, FRONTEND_JSON_PATH, QUADRANT_LABELS, normalize_linear


class TestCA1CatalogAudit(unittest.TestCase):
    """Suite de pruebas formales para el Criterio de Aceptación CA1."""

    def test_ca1_catalog_completeness_and_normalization(self) -> None:
        self.assertTrue(DATA_CSV_PATH.exists(), f"No existe {DATA_CSV_PATH}")
        self.assertTrue(FRONTEND_JSON_PATH.exists(), f"No existe {FRONTEND_JSON_PATH}")

        with open(DATA_CSV_PATH, "r", encoding="utf-8") as fp:
            rows = list(csv.DictReader(fp))

        # 1. Conteo total >= 500 y exactamente 1.284 pistas válidas
        self.assertGreaterEqual(len(rows), 500)
        self.assertEqual(len(rows), 1284)

        # 2. Conteo por fuente: 522 DEAM y 762 PMEmo
        deam_rows = [r for r in rows if r["source"] == "DEAM"]
        pmemo_rows = [r for r in rows if r["source"] == "PMEmo"]
        self.assertEqual(len(deam_rows), 522)
        self.assertEqual(len(pmemo_rows), 762)

        # 3. Cero nulos en campos obligatorios y unicidad de track_id
        required_fields = [
            "track_id",
            "title",
            "artist",
            "source",
            "v_raw",
            "a_raw",
            "v_norm",
            "a_norm",
            "quadrant",
            "duration_sec",
            "external_url",
            "license_note",
        ]
        seen_ids = set()
        valid_quadrants = set(QUADRANT_LABELS.values())

        for r in rows:
            for field_name in required_fields:
                val = r.get(field_name)
                self.assertIsNotNone(val, f"Campo nulo {field_name} en {r.get('track_id')}")
                self.assertNotEqual(str(val).strip(), "", f"Campo vacío {field_name} en {r.get('track_id')}")

            tid = r["track_id"]
            self.assertNotIn(tid, seen_ids, f"track_id duplicado: {tid}")
            seen_ids.add(tid)

            v_raw = float(r["v_raw"])
            a_raw = float(r["a_raw"])
            v_norm = float(r["v_norm"])
            a_norm = float(r["a_norm"])

            self.assertGreaterEqual(v_norm, -1.0)
            self.assertLessEqual(v_norm, 1.0)
            self.assertGreaterEqual(a_norm, -1.0)
            self.assertLessEqual(a_norm, 1.0)
            self.assertIn(r["quadrant"], valid_quadrants)

            # Verificación de la ecuación lineal exacta v_norm = 2*(v - a)/(b - a) - 1
            if r["source"] == "DEAM":
                self.assertAlmostEqual(v_norm, normalize_linear(v_raw, 1.0, 9.0), places=5)
                self.assertAlmostEqual(a_norm, normalize_linear(a_raw, 1.0, 9.0), places=5)
            else:
                self.assertAlmostEqual(v_norm, normalize_linear(v_raw, 0.0, 1.0), places=5)
                self.assertAlmostEqual(a_norm, normalize_linear(a_raw, 0.0, 1.0), places=5)


if __name__ == "__main__":
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(TestCA1CatalogAudit)
    res = unittest.TextTestRunner(verbosity=2).run(suite)
    if not res.wasSuccessful():
        sys.exit(1)
    print("[TEST CA1 OK] 1.284 pistas verificadas (522 DEAM + 762 PMEmo, [-1,1]^2, 0% nulos).")
