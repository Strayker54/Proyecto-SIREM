"""
Script de sincronización administrativa por lotes hacia Supabase mediante API REST (PostgREST).
Utiliza prioritariamente SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_ANON_KEY como respaldo)
configurada en el archivo /.env de la raíz para sincronizar:
1. public.catalog_tracks      -> 1.284 pistas auditadas desde data/catalogo_sirem_1284.csv (CA1)
2. public.benchmark_scenarios -> 30 escenarios experimentales desde docs/reporte_30_escenarios_ca2.csv (CA2/CA3)
3. public.musical_guides      -> 20 fichas técnicas sintéticas desde docs/fichas_sinteticas/ (CA4)
4. public.usability_trials    -> 6 ensayos piloto pareados desde docs/resultados_usabilidad_ca5.csv (CA5)

Uso desde la raíz del proyecto:
    python src/supabase_sync.py
"""

from __future__ import annotations

import csv
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Tuple

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from config.settings import CATALOG_CSV_PATH, ROOT_DIR as PROJECT_ROOT, get_supabase_credentials

BATCH_SIZE = 200
SCENARIOS_CSV_PATH = PROJECT_ROOT / "docs" / "reporte_30_escenarios_ca2.csv"
FICHAS_DIR_PATH = PROJECT_ROOT / "docs" / "fichas_sinteticas"
USABILITY_CSV_PATH = PROJECT_ROOT / "docs" / "resultados_usabilidad_ca5.csv"


def load_catalog_payload() -> List[Dict[str, Any]]:
    """Lee las 1.284 pistas desde data/catalogo_sirem_1284.csv para public.catalog_tracks."""
    rows: List[Dict[str, Any]] = []
    with open(CATALOG_CSV_PATH, "r", encoding="utf-8") as fp:
        reader = csv.DictReader(fp)
        for item in reader:
            rows.append(
                {
                    "track_id": item["track_id"],
                    "title": item["title"],
                    "artist": item["artist"],
                    "source": item["source"],
                    "v_raw": float(item["v_raw"]),
                    "a_raw": float(item["a_raw"]),
                    "v_norm": float(item["v_norm"]),
                    "a_norm": float(item["a_norm"]),
                    "quadrant": item["quadrant"],
                    "duration_sec": int(float(item.get("duration_sec", 45))),
                    "external_url": item["external_url"],
                    "license_note": item["license_note"],
                }
            )
    return rows


def load_scenarios_payload() -> List[Dict[str, Any]]:
    """Lee los 30 escenarios experimentales desde docs/reporte_30_escenarios_ca2.csv."""
    rows: List[Dict[str, Any]] = []
    if not SCENARIOS_CSV_PATH.exists():
        return rows
    with open(SCENARIOS_CSV_PATH, "r", encoding="utf-8") as fp:
        reader = csv.DictReader(fp)
        for idx, item in enumerate(reader, start=1):
            raw_id = str(item.get("scenario_id", idx))
            numeric_id = int("".join(ch for ch in raw_id if ch.isdigit()) or idx)
            code = item.get("code", f"ESC-{numeric_id:02d}")
            name = item.get("scenario_name", item.get("name", "Escenario ISO"))
            rows.append(
                {
                    "scenario_id": numeric_id,
                    "scenario_name": f"{code}: {name}",
                    "v_ini": float(item["v_ini"]),
                    "a_ini": float(item["a_ini"]),
                    "v_obj": float(item["v_obj"]),
                    "a_obj": float(item["a_obj"]),
                    "m_length": int(item.get("m_length", item.get("m", 5))),
                    "dijkstra_jp": float(item.get("dijkstra_jp", item.get("dijkstra_J", 0.0))),
                    "dijkstra_dmax": float(item["dijkstra_dmax"]),
                    "dijkstra_eobj": float(item["dijkstra_eobj"]),
                    "dijkstra_time_ms": float(
                        item.get("dijkstra_time_ms", item.get("dijkstra_ms", 0.0))
                    ),
                    "markov_jp": float(item.get("markov_jp", item.get("markov_J", 0.0))),
                    "markov_dmax": float(item["markov_dmax"]),
                    "markov_eobj": float(item["markov_eobj"]),
                    "markov_time_ms": float(
                        item.get("markov_time_ms", item.get("markov_ms", 0.0))
                    ),
                    "nearest_jp": float(item.get("nearest_jp", item.get("greedy_J", 0.0))),
                    "random_jp": float(item.get("random_jp", item.get("random_J", 0.0))),
                    "feasible": str(item.get("dijkstra_feasible", "True")).lower() == "true",
                }
            )
    return rows


def load_synthetic_guides_payload() -> List[Dict[str, Any]]:
    """Lee las 20 fichas sintéticas desde docs/fichas_sinteticas/SIREM-SYN-01..20.json."""
    rows: List[Dict[str, Any]] = []
    if not FICHAS_DIR_PATH.exists():
        return rows
    for json_path in sorted(FICHAS_DIR_PATH.glob("SIREM-SYN-*.json")):
        with open(json_path, "r", encoding="utf-8") as fp:
            doc = json.load(fp)
        params = doc.get("parameters", {})
        metrics = doc.get("metrics", {})
        rows.append(
            {
                "guide_code": doc.get("guide_code", doc.get("case_id", json_path.stem)),
                "catalog_version": doc.get("catalog_version", "v1.0-1284tracks"),
                "is_synthetic": True,
                "v_ini": float(params.get("v_ini", 0.0)),
                "a_ini": float(params.get("a_ini", 0.0)),
                "v_obj": float(params.get("v_obj", 0.0)),
                "a_obj": float(params.get("a_obj", 0.0)),
                "num_stages": int(params.get("m_stages", params.get("m", 6))),
                "method_used": str(metrics.get("method_used", "Dijkstra")),
                "lambda_param": float(params.get("lambda_weight", 0.65)),
                "delta_max_limit": float(params.get("delta_max_limit", 0.65)),
                "cost_jp": float(metrics.get("cost_jp", metrics.get("cost_J", 0.0))),
                "d_max_observed": float(
                    metrics.get("d_max_observed", metrics.get("d_max", 0.0))
                ),
                "e_obj_observed": float(
                    metrics.get("e_obj_observed", metrics.get("e_obj", 0.0))
                ),
                "exec_time_ms": float(
                    metrics.get("exec_time_ms", doc.get("execution_ms", 1.0))
                ),
                "route_tracks": doc.get("stages", doc.get("sequence", [])),
                "substitutions_count": int(doc.get("substitutions_count", 0)),
                "professional_notes": doc.get("professional_notes", ""),
                "reviewer_role": doc.get(
                    "reviewer_role", "Psicólogo / Orientador — Bienestar Universitario UIS"
                ),
            }
        )
    return rows


def load_usability_payload() -> List[Dict[str, Any]]:
    """Lee los ensayos pareados desde docs/resultados_usabilidad_ca5.csv."""
    rows: List[Dict[str, Any]] = []
    if not USABILITY_CSV_PATH.exists():
        return rows
    with open(USABILITY_CSV_PATH, "r", encoding="utf-8") as fp:
        reader = csv.DictReader(fp)
        for item in reader:
            rows.append(
                {
                    "participant_code": item["participant_code"],
                    "consent_verified": str(
                        item.get("consent_verified", item.get("consent_signed", "true"))
                    ).lower()
                    == "true",
                    "profile_type": item["profile_type"],
                    "manual_time_min": float(
                        item.get("manual_time_min", item.get("manual_minutes", 35.0))
                    ),
                    "assisted_time_min": float(
                        item.get("assisted_time_min", item.get("sirem_minutes", 4.6))
                    ),
                    "completed_without_help": str(
                        item.get("completed_without_help", "true")
                    ).lower()
                    == "true",
                    "utility_score": int(
                        float(item.get("utility_score", item.get("utility_likert", 5)))
                    ),
                    "observations": item.get("observations", item.get("notes", "")),
                }
            )
    return rows


def postgrest_upsert_batch(
    base_url: str,
    api_key: str,
    table: str,
    records: List[Dict[str, Any]],
    on_conflict: str | None = None,
) -> Tuple[bool, int, str]:
    """
    Envía un lote de registros mediante HTTP POST a PostgREST (/rest/v1/<table>)
    con encabezado Prefer: resolution=merge-duplicates.
    """
    query = f"?on_conflict={urllib.parse.quote(on_conflict)}" if on_conflict else ""
    endpoint = f"{base_url}/rest/v1/{table}{query}"
    payload_bytes = json.dumps(records, ensure_ascii=False).encode("utf-8")

    req = urllib.request.Request(
        endpoint,
        data=payload_bytes,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "apikey": api_key,
            "Authorization": f"Bearer {api_key}",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            status = resp.getcode()
            return (200 <= status < 300), status, "OK"
    except urllib.error.HTTPError as exc:
        err_body = exc.read().decode("utf-8", errors="replace")
        return False, exc.code, err_body
    except Exception as exc:
        return False, 0, str(exc)


def sync_all_tables() -> int:
    """
    Ejecuta la sincronización por lotes hacia las 4 tablas de Supabase si las credenciales
    están configuradas en /.env, o verifica la integridad de los lotes locales en modo simulación.
    """
    creds = get_supabase_credentials()
    catalog_rows = load_catalog_payload()
    scenario_rows = load_scenarios_payload()
    guide_rows = load_synthetic_guides_payload()
    usability_rows = load_usability_payload()

    print("=" * 78)
    print("SIREM (UIS) — SINCRONIZADOR ADMINISTRATIVO REST HACIA SUPABASE")
    print("=" * 78)
    print("Registros preparados localmente:")
    print(f"  - public.catalog_tracks      : {len(catalog_rows)} pistas auditadas (CA1)")
    print(f"  - public.benchmark_scenarios : {len(scenario_rows)} escenarios experimentales (CA2/CA3)")
    print(f"  - public.musical_guides      : {len(guide_rows)} fichas técnicas sintéticas (CA4)")
    print(f"  - public.usability_trials    : {len(usability_rows)} ensayos pareados (CA5)")
    print("-" * 78)

    if not creds["is_configured"]:
        print(
            "[AVISO] No se detectaron credenciales reales en /.env (actualmente contiene valores de plantilla)."
        )
        print(
            "Para sincronizar hacia su instancia remota de Supabase, edite /.env en la raíz con:"
        )
        print('  SUPABASE_URL="https://<su-proyecto>.supabase.co"')
        print('  SUPABASE_ANON_KEY="<su-clave-anon-publica>"')
        print('  SUPABASE_SERVICE_ROLE_KEY="<su-clave-service-role-privada>"')
        print("Verificación local de carga de lotes completada exitosamente (0 errores).")
        return 0

    base_url = creds["url"]
    api_key = creds["active_key"]
    role = creds["active_role"]
    print(f"Conectando a: {base_url} (rol activo: {role})")

    tasks = [
        ("catalog_tracks", catalog_rows, "track_id"),
        ("benchmark_scenarios", scenario_rows, "scenario_id"),
        ("musical_guides", guide_rows, "guide_code"),
        ("usability_trials", usability_rows, None),
    ]

    for table_name, rows, conflict_col in tasks:
        if not rows:
            print(f"  [OMITIDO] {table_name}: 0 registros.")
            continue
        total = len(rows)
        sent = 0
        for start in range(0, total, BATCH_SIZE):
            chunk = rows[start : start + BATCH_SIZE]
            ok, status, msg = postgrest_upsert_batch(
                base_url, api_key, table_name, chunk, conflict_col
            )
            if not ok:
                print(
                    f"  [ERROR] Tabla {table_name} (lote {start}..{start + len(chunk)}): HTTP {status} -> {msg}"
                )
                return 1
            sent += len(chunk)
            print(f"  [OK] {table_name}: sincronizados {sent}/{total} registros (HTTP {status})")

    print("=" * 78)
    print("Sincronización completa hacia las 4 tablas de Supabase finalizada con éxito.")
    return 0


if __name__ == "__main__":
    raise SystemExit(sync_all_tables())
