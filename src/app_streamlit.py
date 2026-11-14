"""
Interfaz puente en Streamlit para el Sistema Inteligente de Regulación Emocional Musical (SIREM - UIS).
Consume directamente src/routing_engine.py, src/ficha_exporter.py y data/catalogo_sirem_1284.csv.
Si se ejecuta desde terminal estándar (python src/app_streamlit.py), ejecuta una prueba funcional
en consola del motor y el catálogo; si se lanza con `streamlit run src/app_streamlit.py`,
despliega la interfaz web interactiva en español.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from src.ficha_exporter import NON_CLINICAL_NOTICE, build_technical_sheet_dict
from src.routing_engine import (
    Point2D,
    RouteParams,
    load_catalog_from_csv,
    solve_dijkstra,
    solve_markov,
    solve_nearest,
    solve_random,
)


def run_streamlit_ui() -> None:
    """Renderiza la interfaz de usuario en Streamlit cuando el paquete está activo."""
    import streamlit as st  # type: ignore

    st.set_page_config(
        page_title="SIREM - Regulación Emocional Musical (UIS)",
        layout="wide",
    )
    st.title("SIREM — Sistema Inteligente de Regulación Emocional Musical (UIS)")
    st.warning(NON_CLINICAL_NOTICE)

    catalog = load_catalog_from_csv()
    st.caption(
        f"Catálogo auditado cargado: {len(catalog)} pistas válidas en [-1, 1]^2 "
        "(522 DEAM + 762 PMEmo · Ley 23 de 1982 y Ley 1581 de 2012)."
    )

    col1, col2, col3 = st.columns(3)
    with col1:
        v_ini = st.slider("Valencia Inicial (V0)", -1.0, 1.0, -0.65, 0.05)
        a_ini = st.slider("Activación Inicial (A0)", -1.0, 1.0, 0.70, 0.05)
    with col2:
        v_obj = st.slider("Valencia Objetivo (Vf)", -1.0, 1.0, 0.60, 0.05)
        a_obj = st.slider("Activación Objetivo (Af)", -1.0, 1.0, -0.55, 0.05)
    with col3:
        m_stages = st.slider("Número de Etapas (m)", 4, 8, 6, 1)
        lambda_w = st.slider("Peso de Adherencia (lambda)", 0.1, 1.5, 0.65, 0.05)
        delta_max = st.slider("Salto Máximo Permitido (delta)", 0.35, 1.0, 0.65, 0.05)

    params = RouteParams(
        x_ini=Point2D(v_ini, a_ini),
        x_obj=Point2D(v_obj, a_obj),
        m=m_stages,
        lambda_weight=lambda_w,
        delta=delta_max,
    )

    res_dijkstra = solve_dijkstra(catalog, params)
    res_markov = solve_markov(catalog, params)
    res_nearest = solve_nearest(catalog, params)
    res_random = solve_random(catalog, params)

    st.subheader("Resultados de Optimización bajo el Principio ISO")
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Costo J(P) Dijkstra", f"{res_dijkstra.metrics.cost_jp:.4f}")
    m2.metric("Salto Máximo d_max(P)", f"{res_dijkstra.metrics.d_max:.4f}")
    m3.metric("Error al Objetivo e_obj(P)", f"{res_dijkstra.metrics.e_obj:.4f}")
    m4.metric("Latencia de Cómputo", f"{res_dijkstra.exec_time_ms:.2f} ms")

    rows = [
        {
            "Etapa": s.stage,
            "ID Pista": s.track.track_id,
            "Título": s.track.title,
            "Intérprete": s.track.artist,
            "Fuente": s.track.source,
            "V_norm": s.track.v_norm,
            "A_norm": s.track.a_norm,
            "Cuadrante": s.track.quadrant,
            "Salto Etapa": s.step_distance or 0.0,
            "Desviación z_j": s.ref_distance,
            "Enlace Externo": s.track.external_url,
        }
        for s in res_dijkstra.stages
    ]
    st.dataframe(rows, use_container_width=True)

    st.subheader("Comparación de Métodos Algorítmicos")
    comp_rows = [
        {
            "Método": r.method,
            "Factible": "SÍ" if r.feasible else "NO",
            "J(P)": r.metrics.cost_jp,
            "d_max(P)": r.metrics.d_max,
            "e_obj(P)": r.metrics.e_obj,
            "Tiempo (ms)": r.exec_time_ms,
        }
        for r in [res_dijkstra, res_markov, res_nearest, res_random]
    ]
    st.table(comp_rows)


def run_cli_smoke_check() -> None:
    """Ejecuta una verificación funcional en consola cuando se invoca con python estándar."""
    catalog = load_catalog_from_csv()
    lookup = {t.track_id: t for t in catalog}
    params = RouteParams(x_ini=Point2D(-0.65, 0.70), x_obj=Point2D(0.60, -0.55), m=6)
    res = solve_dijkstra(catalog, params)
    sheet = build_technical_sheet_dict(
        {
            "case_id": "SIREM-SYN-01",
            "title": "Estrés pre-parcial a calma base",
            "context": "Orientación universitaria · C-II -> C-IV",
        },
        params,
        res,
        lookup,
    )
    print(
        f"[STREAMLIT BRIDGE OK] Catálogo={len(catalog)} pistas | Ruta Dijkstra J(P)={res.metrics.cost_jp:.4f} | "
        f"d_max={res.metrics.d_max:.4f} | e_obj={res.metrics.e_obj:.4f} | Ficha={sheet['guide_code']}"
    )


if __name__ == "__main__":
    try:
        import streamlit.runtime.scriptrunner as sr  # type: ignore

        if sr.get_script_run_ctx() is not None:
            run_streamlit_ui()
        else:
            run_cli_smoke_check()
    except ImportError:
        run_cli_smoke_check()
