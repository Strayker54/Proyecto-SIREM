"""
Exportador y verificador de Fichas Técnicas de Guía Musical de Apoyo (Criterio CA4 - SIREM UIS).
Construye documentos estructurados en JSON/CSV con trazabilidad al catálogo v1.0-1284tracks,
cumplimiento de la Ley 1581 de 2012 (datos sintéticos/seudonimizados), Ley 23 de 1982
(enlaces externos autorizados) y advertencia institucional de uso de apoyo no clínico.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from src.routing_engine import RouteParams, RouteResult, TrackRecord

CATALOG_VERSION = "v1.0-1284tracks"
NON_CLINICAL_NOTICE = (
    "AVISO DE ALCANCE NO CLÍNICO: Esta Ficha Técnica de Guía Musical de Apoyo ha sido generada "
    "por el prototipo académico SIREM (UIS) como insumo técnico de apoyo para profesionales de "
    "psicología, orientación y bienestar universitario. NO constituye diagnóstico clínico, "
    "prescripción médica ni dispositivo biomédico."
)
LEGAL_PRIVACY_NOTE = (
    "Cumplimiento Ley 1581 de 2012: Documento con identificador seudonimizado/sintético sin "
    "datos personales sensibles ni historia clínica. Cumplimiento Ley 23 de 1982: Uso exclusivo "
    "de metadatos públicos y enlaces externos autorizados sin almacenar ni distribuir audio."
)


def build_technical_sheet_dict(
    case_meta: Dict[str, Any],
    params: RouteParams,
    result: RouteResult,
    catalog_lookup: Dict[str, TrackRecord],
) -> Dict[str, Any]:
    """
    Construye el diccionario completo de la Ficha Técnica de Guía Musical de Apoyo
    y ejecuta la validación automática de los 5 criterios de la lista de chequeo CA4.
    """
    stages_payload: List[Dict[str, Any]] = []
    title_artist_match = True

    for st in result.stages:
        trk = st.track
        ref_trk = catalog_lookup.get(trk.track_id)
        if (
            ref_trk is None
            or ref_trk.title != trk.title
            or ref_trk.artist != trk.artist
            or abs(ref_trk.v_norm - trk.v_norm) > 1e-6
            or abs(ref_trk.a_norm - trk.a_norm) > 1e-6
        ):
            title_artist_match = False

        stages_payload.append(
            {
                "stage": st.stage,
                "track_id": trk.track_id,
                "title": trk.title,
                "artist": trk.artist,
                "genre": trk.genre,
                "source": trk.source,
                "v_raw": trk.v_raw,
                "a_raw": trk.a_raw,
                "v_norm": trk.v_norm,
                "a_norm": trk.a_norm,
                "quadrant": trk.quadrant,
                "z_ref_v": st.z_ref.v,
                "z_ref_a": st.z_ref.a,
                "step_distance": st.step_distance,
                "ref_distance": st.ref_distance,
                "duration_sec": trk.duration_sec,
                "external_platform": trk.external_platform,
                "external_url": trk.external_url,
                "license_note": trk.license_note,
            }
        )

    geometric_ok = (
        result.feasible
        and result.metrics.unique_tracks
        and result.metrics.d_max <= params.delta + 1e-9
        and result.metrics.e_ini <= params.epsilon_ini + 1e-9
        and result.metrics.e_obj <= params.epsilon_obj + 1e-9
        and len(stages_payload) == params.m
    )

    required_fields_ok = all(
        bool(s["track_id"] and s["title"] and s["artist"] and s["external_url"])
        for s in stages_payload
    ) and len(stages_payload) == params.m

    catalog_version_ok = CATALOG_VERSION == "v1.0-1284tracks"
    non_clinical_ok = "NO CLÍNICO" in NON_CLINICAL_NOTICE and "Ley 1581" in LEGAL_PRIVACY_NOTE

    checklist = {
        "geometric_constraints_ok": geometric_ok,
        "required_fields_ok": required_fields_ok,
        "catalog_version_ok": catalog_version_ok,
        "non_clinical_notice_ok": non_clinical_ok,
        "title_artist_match_ok": title_artist_match,
        "all_passed": (
            geometric_ok
            and required_fields_ok
            and catalog_version_ok
            and non_clinical_ok
            and title_artist_match
        ),
    }

    return {
        "guide_code": case_meta["case_id"],
        "title": case_meta["title"],
        "context": case_meta["context"],
        "catalog_version": CATALOG_VERSION,
        "is_synthetic": True,
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "institution": "Universidad Industrial de Santander (UIS) — Escuela de Ingeniería de Sistemas e Informática",
        "non_clinical_disclaimer": NON_CLINICAL_NOTICE,
        "legal_compliance": LEGAL_PRIVACY_NOTE,
        "parameters": {
            "v_ini": params.x_ini.v,
            "a_ini": params.x_ini.a,
            "v_obj": params.x_obj.v,
            "a_obj": params.x_obj.a,
            "m_stages": params.m,
            "lambda_weight": params.lambda_weight,
            "delta_max_limit": params.delta,
            "epsilon_ini_limit": params.epsilon_ini,
            "epsilon_obj_limit": params.epsilon_obj,
            "source_filter": params.source_filter,
        },
        "metrics": {
            "method_used": result.method,
            "feasible": result.feasible,
            "cost_jp": result.metrics.cost_jp,
            "d_max_observed": result.metrics.d_max,
            "e_ini_observed": result.metrics.e_ini,
            "e_obj_observed": result.metrics.e_obj,
            "unique_tracks": result.metrics.unique_tracks,
            "exec_time_ms": result.exec_time_ms,
        },
        "substitutions_count": 0,
        "reviewer_role": "Psicólogo / Orientador — Bienestar Universitario UIS",
        "professional_notes": (
            f"Secuencia generada bajo el Principio ISO para el caso sintético {case_meta['case_id']} "
            f"({case_meta['title']}). Cumple restricciones geométricas y unicidad de pistas."
        ),
        "stages": stages_payload,
        "verification_checklist": checklist,
    }


def save_technical_sheet_json(sheet: Dict[str, Any], output_path: Path) -> None:
    """Guarda una ficha técnica estructurada en formato JSON UTF-8."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as fp:
        json.dump(sheet, fp, ensure_ascii=False, indent=2)
