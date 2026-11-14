"""
Motor matemático y algorítmico de secuenciación afectiva bajo el Principio ISO (Guía 2 - SIREM UIS).
Implementa:
- Trayectoria lineal de referencia z_j = x_ini + ((j - 1) / (m - 1)) * (x_obj - x_ini)
- Función objetivo multicriterio J(P) = sum(||x_{j+1} - x_j||_2) + lambda * sum(||x_j - z_j||_2)
- Verificación estricta de restricciones: d_max(P) <= delta, e_ini <= epsilon_ini,
  e_obj <= epsilon_obj y unicidad de pistas por ruta sin relajar silenciosamente umbrales.
- Cuatro métodos comparativos:
  1. Búsqueda de caminos por etapas con Dijkstra / programación dinámica con filtro de unicidad
  2. Cadena de Markov estocástica con distribución de Boltzmann sobre estado ampliado s=(j,i,U)
  3. Vecino más cercano (heurística voraz miope)
  4. Selección aleatoria admisible (muestreo uniforme sobre candidatos admisibles)
"""

from __future__ import annotations

import csv
import heapq
import math
import random
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_CATALOG_CSV = ROOT_DIR / "data" / "catalogo_sirem_1284.csv"


@dataclass(frozen=True)
class Point2D:
    """Coordenada bidimensional en el plano Valencia-Activación [-1, 1]^2."""

    v: float
    a: float


@dataclass
class TrackRecord:
    """Estructura de pista musical auditada conforme a schema_contract.json."""

    track_id: str
    title: str
    artist: str
    genre: str
    source: str
    v_raw: float
    a_raw: float
    v_norm: float
    a_norm: float
    quadrant: str
    duration_sec: int
    external_platform: str
    external_url: str
    license_note: str


@dataclass
class RouteParams:
    """Hiperparámetros y restricciones geométricas de una consulta de secuenciación."""

    x_ini: Point2D
    x_obj: Point2D
    m: int = 6
    lambda_weight: float = 0.65
    beta: float = 5.0
    delta: float = 0.65
    epsilon_ini: float = 0.35
    epsilon_obj: float = 0.35
    source_filter: str = "ALL"
    seed: int = 2026
    markov_budget: int = 45


@dataclass
class StageNode:
    """Detalle geométrico de una etapa individual j dentro de la ruta P."""

    stage: int
    track: TrackRecord
    z_ref: Point2D
    step_distance: Optional[float]
    ref_distance: float


@dataclass
class RouteMetrics:
    """Métricas de desempeño y cumplimiento de restricciones para una secuencia P."""

    cost_jp: float
    d_max: float
    e_ini: float
    e_obj: float
    unique_tracks: bool
    feasible: bool
    violations: List[str] = field(default_factory=list)


@dataclass
class RouteResult:
    """Resultado completo devuelto por cualquiera de los 4 métodos algorítmicos."""

    method: str
    feasible: bool
    stages: List[StageNode]
    metrics: RouteMetrics
    exec_time_ms: float
    infeasibility_reason: Optional[str] = None


def euclidean_2d(p1: Point2D, p2: Point2D) -> float:
    """Calcula la norma euclidiana ||p1 - p2||_2 en R^2."""
    return math.hypot(p1.v - p2.v, p1.a - p2.a)


def track_point(track: TrackRecord) -> Point2D:
    """Extrae el vector (v_norm, a_norm) de una pista musical."""
    return Point2D(v=track.v_norm, a=track.a_norm)


def compute_reference_trajectory(x_ini: Point2D, x_obj: Point2D, m: int) -> List[Point2D]:
    """
    Calcula los puntos ideales interpolados de la trayectoria lineal de referencia (Guía 2):
    z_j = x_ini + ((j - 1) / (m - 1)) * (x_obj - x_ini), para j = 1, ..., m.
    """
    if m < 2:
        return [Point2D(v=round(x_obj.v, 6), a=round(x_obj.a, 6))]
    refs: List[Point2D] = []
    for idx in range(m):
        alpha = idx / float(m - 1)
        vj = x_ini.v + alpha * (x_obj.v - x_ini.v)
        aj = x_ini.a + alpha * (x_obj.a - x_ini.a)
        refs.append(Point2D(v=round(vj, 6), a=round(aj, 6)))
    return refs


def load_catalog_from_csv(csv_path: Path = DEFAULT_CATALOG_CSV) -> List[TrackRecord]:
    """Carga el catálogo validado de 1.284 pistas desde data/catalogo_sirem_1284.csv."""
    records: List[TrackRecord] = []
    with open(csv_path, "r", encoding="utf-8") as fp:
        reader = csv.DictReader(fp)
        for row in reader:
            records.append(
                TrackRecord(
                    track_id=row["track_id"].strip(),
                    title=row["title"].strip(),
                    artist=row["artist"].strip(),
                    genre=row.get("genre", "Instrumental").strip(),
                    source=row["source"].strip(),
                    v_raw=float(row["v_raw"]),
                    a_raw=float(row["a_raw"]),
                    v_norm=float(row["v_norm"]),
                    a_norm=float(row["a_norm"]),
                    quadrant=row["quadrant"].strip(),
                    duration_sec=int(float(row.get("duration_sec", 180))),
                    external_platform=row.get("external_platform", "YouTube Music").strip(),
                    external_url=row["external_url"].strip(),
                    license_note=row["license_note"].strip(),
                )
            )
    return records


def evaluate_sequence(
    tracks: List[TrackRecord],
    params: RouteParams,
) -> Tuple[List[StageNode], RouteMetrics]:
    """
    Evalúa explícitamente una secuencia de pistas P = (x_1, ..., x_m) bajo la función objetivo J(P)
    y verifica el cumplimiento estricto de todas las restricciones sin relajarlas.
    """
    z_refs = compute_reference_trajectory(params.x_ini, params.x_obj, params.m)

    if len(tracks) != params.m or len(tracks) == 0:
        empty_metrics = RouteMetrics(
            cost_jp=float("inf"),
            d_max=float("inf"),
            e_ini=float("inf"),
            e_obj=float("inf"),
            unique_tracks=False,
            feasible=False,
            violations=[
                f"La ruta contiene {len(tracks)} pistas; se requerían exactamente m={params.m} etapas."
            ],
        )
        return [], empty_metrics

    stages: List[StageNode] = []
    smoothness_sum = 0.0
    reference_sum = 0.0
    d_max = 0.0
    seen_ids = set()
    unique_tracks = True

    for idx, trk in enumerate(tracks):
        if trk.track_id in seen_ids:
            unique_tracks = False
        seen_ids.add(trk.track_id)

        pt = track_point(trk)
        z_ref = z_refs[idx]
        ref_dist = euclidean_2d(pt, z_ref)
        reference_sum += ref_dist

        step_dist: Optional[float] = None
        if idx > 0:
            prev_pt = track_point(tracks[idx - 1])
            step_dist = euclidean_2d(pt, prev_pt)
            smoothness_sum += step_dist
            if step_dist > d_max:
                d_max = step_dist

        stages.append(
            StageNode(
                stage=idx + 1,
                track=trk,
                z_ref=z_ref,
                step_distance=round(step_dist, 6) if step_dist is not None else None,
                ref_distance=round(ref_dist, 6),
            )
        )

    e_ini = euclidean_2d(track_point(tracks[0]), params.x_ini)
    e_obj = euclidean_2d(track_point(tracks[-1]), params.x_obj)
    cost_jp = smoothness_sum + params.lambda_weight * reference_sum

    violations: List[str] = []
    if not unique_tracks:
        violations.append("Violación de unicidad: existen pistas repetidas dentro de la secuencia.")
    if e_ini > params.epsilon_ini + 1e-9:
        violations.append(
            f"Violación de anclaje inicial: ||x_1 - x_ini||_2 = {e_ini:.4f} > epsilon_ini ({params.epsilon_ini:.2f})."
        )
    if e_obj > params.epsilon_obj + 1e-9:
        violations.append(
            f"Violación de convergencia al objetivo: e_obj(P) = {e_obj:.4f} > epsilon_obj ({params.epsilon_obj:.2f})."
        )
    if d_max > params.delta + 1e-9:
        violations.append(
            f"Violación de continuidad emocional: d_max(P) = {d_max:.4f} > delta ({params.delta:.2f})."
        )

    metrics = RouteMetrics(
        cost_jp=round(cost_jp, 6),
        d_max=round(d_max, 6),
        e_ini=round(e_ini, 6),
        e_obj=round(e_obj, 6),
        unique_tracks=unique_tracks,
        feasible=len(violations) == 0,
        violations=violations,
    )
    return stages, metrics


def _filter_catalog(catalog: List[TrackRecord], source_filter: str) -> List[TrackRecord]:
    if source_filter in {"DEAM", "PMEmo"}:
        return [t for t in catalog if t.source == source_filter]
    return catalog


def solve_dijkstra(catalog: List[TrackRecord], params: RouteParams, pool_size: int = 85) -> RouteResult:
    """
    Método 1 (Principal): Búsqueda de caminos por etapas con algoritmo de Dijkstra /
    programación dinámica con filtro de unicidad en grafo acíclico por capas G=(V,E).
    No relaja silenciosamente las restricciones si el escenario es infactible.
    """
    t0 = time.perf_counter()
    filtered = _filter_catalog(catalog, params.source_filter)
    z_refs = compute_reference_trajectory(params.x_ini, params.x_obj, params.m)

    # Construcción de capas candidatas por etapa j = 1..m
    layers: List[List[TrackRecord]] = []
    for j in range(params.m):
        z_j = z_refs[j]
        if j == 0:
            admissible_ini = [
                t for t in filtered if euclidean_2d(track_point(t), params.x_ini) <= params.epsilon_ini + 1e-9
            ]
            admissible_ini.sort(key=lambda t: euclidean_2d(track_point(t), z_j))
            layers.append(admissible_ini[:pool_size])
        elif j == params.m - 1:
            admissible_obj = [
                t for t in filtered if euclidean_2d(track_point(t), params.x_obj) <= params.epsilon_obj + 1e-9
            ]
            admissible_obj.sort(key=lambda t: euclidean_2d(track_point(t), z_j))
            layers.append(admissible_obj[:pool_size])
        else:
            ranked = sorted(filtered, key=lambda t: euclidean_2d(track_point(t), z_j))
            layers.append(ranked[:pool_size])

    if not layers[0] or not layers[-1]:
        elapsed = round((time.perf_counter() - t0) * 1000.0, 3)
        reason = (
            "No existen pistas admisibles en la vecindad inicial (epsilon_ini) o final (epsilon_obj) "
            "bajo las restricciones configuradas."
        )
        _, metrics = evaluate_sequence([], params)
        metrics.violations = [reason]
        return RouteResult(
            method="Dijkstra",
            feasible=False,
            stages=[],
            metrics=metrics,
            exec_time_ms=elapsed,
            infeasibility_reason=reason,
        )

    # Cola de prioridad de Dijkstra sobre estados (costo_acumulado, etapa_idx, nodo_idx, tupla_ruta)
    pq: List[Tuple[float, int, int, Tuple[TrackRecord, ...]]] = []
    best_cost_per_node: Dict[Tuple[int, str], float] = {}

    for idx, trk in enumerate(layers[0]):
        c_ini = params.lambda_weight * euclidean_2d(track_point(trk), z_refs[0])
        heapq.heappush(pq, (c_ini, 0, idx, (trk,)))
        best_cost_per_node[(0, trk.track_id)] = c_ini

    optimal_path: Optional[List[TrackRecord]] = None

    while pq:
        cost_so_far, stage_idx, _, path_tuple = heapq.heappop(pq)
        current_trk = path_tuple[-1]

        if stage_idx == params.m - 1:
            optimal_path = list(path_tuple)
            break

        if cost_so_far > best_cost_per_node.get((stage_idx, current_trk.track_id), float("inf")) + 1e-6:
            continue

        used_ids = {t.track_id for t in path_tuple}
        next_stage = stage_idx + 1
        z_next = z_refs[next_stage]
        cur_pt = track_point(current_trk)

        for next_idx, cand in enumerate(layers[next_stage]):
            if cand.track_id in used_ids:
                continue
            cand_pt = track_point(cand)
            step_d = euclidean_2d(cur_pt, cand_pt)
            if step_d > params.delta + 1e-9:
                continue
            edge_cost = step_d + params.lambda_weight * euclidean_2d(cand_pt, z_next)
            new_cost = cost_so_far + edge_cost
            prev_best = best_cost_per_node.get((next_stage, cand.track_id), float("inf"))
            if new_cost + 1e-7 < prev_best:
                best_cost_per_node[(next_stage, cand.track_id)] = new_cost
                heapq.heappush(pq, (new_cost, next_stage, next_idx, path_tuple + (cand,)))

    elapsed = round((time.perf_counter() - t0) * 1000.0, 3)
    if optimal_path is None:
        reason = (
            f"Escenario infactible bajo restricciones estrictas (delta={params.delta}, "
            f"epsilon_ini={params.epsilon_ini}, epsilon_obj={params.epsilon_obj})."
        )
        _, metrics = evaluate_sequence([], params)
        metrics.violations = [reason]
        return RouteResult(
            method="Dijkstra",
            feasible=False,
            stages=[],
            metrics=metrics,
            exec_time_ms=elapsed,
            infeasibility_reason=reason,
        )

    stages, metrics = evaluate_sequence(optimal_path, params)
    return RouteResult(
        method="Dijkstra",
        feasible=metrics.feasible,
        stages=stages,
        metrics=metrics,
        exec_time_ms=elapsed,
        infeasibility_reason=None if metrics.feasible else "; ".join(metrics.violations),
    )


def solve_markov(catalog: List[TrackRecord], params: RouteParams, pool_size: int = 80) -> RouteResult:
    """
    Método 2 (Comparativo): Cadena de Markov estocástica con distribución de Boltzmann
    p(k | s) = exp(-beta * c_{s,k}) / sum_{l in N(s)} exp(-beta * c_{s,l})
    sobre el estado ampliado s = (j, i, U) con semilla reproducible.
    """
    t0 = time.perf_counter()
    rng = random.Random(params.seed)
    filtered = _filter_catalog(catalog, params.source_filter)
    z_refs = compute_reference_trajectory(params.x_ini, params.x_obj, params.m)

    layers: List[List[TrackRecord]] = []
    for j in range(params.m):
        z_j = z_refs[j]
        if j == 0:
            cands = [
                t for t in filtered if euclidean_2d(track_point(t), params.x_ini) <= params.epsilon_ini + 1e-9
            ]
        elif j == params.m - 1:
            cands = [
                t for t in filtered if euclidean_2d(track_point(t), params.x_obj) <= params.epsilon_obj + 1e-9
            ]
        else:
            cands = list(filtered)
        cands.sort(key=lambda t: euclidean_2d(track_point(t), z_j))
        layers.append(cands[:pool_size])

    if not layers[0] or not layers[-1]:
        elapsed = round((time.perf_counter() - t0) * 1000.0, 3)
        reason = "Sin candidatos iniciales o finales admisibles para muestreo de Markov."
        _, metrics = evaluate_sequence([], params)
        metrics.violations = [reason]
        return RouteResult(
            method="Markov",
            feasible=False,
            stages=[],
            metrics=metrics,
            exec_time_ms=elapsed,
            infeasibility_reason=reason,
        )

    def boltzmann_choice(candidates: List[TrackRecord], costs: List[float]) -> TrackRecord:
        min_c = min(costs)
        weights = [math.exp(-params.beta * (c - min_c)) for c in costs]
        total_w = sum(weights)
        r = rng.random() * total_w
        acc = 0.0
        for cand, w in zip(candidates, weights):
            acc += w
            if r <= acc:
                return cand
        return candidates[-1]

    best_path: Optional[List[TrackRecord]] = None
    best_cost = float("inf")

    for _ in range(max(1, params.markov_budget)):
        ini_costs = [params.lambda_weight * euclidean_2d(track_point(t), z_refs[0]) for t in layers[0]]
        first_trk = boltzmann_choice(layers[0], ini_costs)
        path = [first_trk]
        used = {first_trk.track_id}
        valid_walk = True

        for j in range(1, params.m):
            prev_pt = track_point(path[-1])
            z_j = z_refs[j]
            neighbors: List[TrackRecord] = []
            n_costs: List[float] = []
            for cand in layers[j]:
                if cand.track_id in used:
                    continue
                cand_pt = track_point(cand)
                step_d = euclidean_2d(prev_pt, cand_pt)
                if step_d <= params.delta + 1e-9:
                    neighbors.append(cand)
                    n_costs.append(step_d + params.lambda_weight * euclidean_2d(cand_pt, z_j))
            if not neighbors:
                valid_walk = False
                break
            chosen = boltzmann_choice(neighbors, n_costs)
            path.append(chosen)
            used.add(chosen.track_id)

        if valid_walk and len(path) == params.m:
            _, m_eval = evaluate_sequence(path, params)
            if m_eval.feasible and m_eval.cost_jp < best_cost:
                best_cost = m_eval.cost_jp
                best_path = path

    elapsed = round((time.perf_counter() - t0) * 1000.0, 3)
    if best_path is None:
        reason = "La cadena de Markov no encontró una trayectoria admisible en el presupuesto de corridas."
        _, metrics = evaluate_sequence([], params)
        metrics.violations = [reason]
        return RouteResult(
            method="Markov",
            feasible=False,
            stages=[],
            metrics=metrics,
            exec_time_ms=elapsed,
            infeasibility_reason=reason,
        )

    stages, metrics = evaluate_sequence(best_path, params)
    return RouteResult(
        method="Markov",
        feasible=metrics.feasible,
        stages=stages,
        metrics=metrics,
        exec_time_ms=elapsed,
        infeasibility_reason=None if metrics.feasible else "; ".join(metrics.violations),
    )


def solve_nearest(catalog: List[TrackRecord], params: RouteParams) -> RouteResult:
    """
    Método 3 (Línea base 1): Vecino más cercano miope etapa por etapa sin optimización global.
    """
    t0 = time.perf_counter()
    filtered = _filter_catalog(catalog, params.source_filter)
    z_refs = compute_reference_trajectory(params.x_ini, params.x_obj, params.m)

    used = set()
    chosen_tracks: List[TrackRecord] = []

    ini_cands = [
        t for t in filtered if euclidean_2d(track_point(t), params.x_ini) <= params.epsilon_ini + 1e-9
    ]
    if not ini_cands:
        elapsed = round((time.perf_counter() - t0) * 1000.0, 3)
        reason = "Sin pistas admisibles iniciales para vecino más cercano."
        _, metrics = evaluate_sequence([], params)
        metrics.violations = [reason]
        return RouteResult("Nearest", False, [], metrics, elapsed, reason)

    first_trk = min(
        ini_cands,
        key=lambda t: euclidean_2d(track_point(t), params.x_ini)
        + params.lambda_weight * euclidean_2d(track_point(t), z_refs[0]),
    )
    chosen_tracks.append(first_trk)
    used.add(first_trk.track_id)

    for j in range(1, params.m):
        prev_pt = track_point(chosen_tracks[-1])
        z_j = z_refs[j]
        cands = [
            t
            for t in filtered
            if t.track_id not in used and euclidean_2d(prev_pt, track_point(t)) <= params.delta + 1e-9
        ]
        if j == params.m - 1:
            cands_obj = [
                t for t in cands if euclidean_2d(track_point(t), params.x_obj) <= params.epsilon_obj + 1e-9
            ]
            if cands_obj:
                cands = cands_obj
        if not cands:
            break
        nxt = min(
            cands,
            key=lambda t: euclidean_2d(prev_pt, track_point(t))
            + params.lambda_weight * euclidean_2d(track_point(t), z_j),
        )
        chosen_tracks.append(nxt)
        used.add(nxt.track_id)

    elapsed = round((time.perf_counter() - t0) * 1000.0, 3)
    stages, metrics = evaluate_sequence(chosen_tracks, params)
    return RouteResult(
        method="Nearest",
        feasible=metrics.feasible,
        stages=stages,
        metrics=metrics,
        exec_time_ms=elapsed,
        infeasibility_reason=None if metrics.feasible else "; ".join(metrics.violations),
    )


def solve_random(catalog: List[TrackRecord], params: RouteParams, max_tries: int = 40) -> RouteResult:
    """
    Método 4 (Línea base 2): Selección aleatoria admisible con semilla fija.
    """
    t0 = time.perf_counter()
    rng = random.Random(params.seed + 99)
    filtered = _filter_catalog(catalog, params.source_filter)

    ini_cands = [
        t for t in filtered if euclidean_2d(track_point(t), params.x_ini) <= params.epsilon_ini + 1e-9
    ]
    if not ini_cands:
        elapsed = round((time.perf_counter() - t0) * 1000.0, 3)
        reason = "Sin pistas admisibles iniciales para selección aleatoria."
        _, metrics = evaluate_sequence([], params)
        metrics.violations = [reason]
        return RouteResult("Random", False, [], metrics, elapsed, reason)

    last_attempt: List[TrackRecord] = []
    for _ in range(max_tries):
        first = rng.choice(ini_cands)
        path = [first]
        used = {first.track_id}
        for j in range(1, params.m):
            prev_pt = track_point(path[-1])
            cands = [
                t
                for t in filtered
                if t.track_id not in used and euclidean_2d(prev_pt, track_point(t)) <= params.delta + 1e-9
            ]
            if j == params.m - 1:
                cands = [
                    t for t in cands if euclidean_2d(track_point(t), params.x_obj) <= params.epsilon_obj + 1e-9
                ]
            if not cands:
                break
            nxt = rng.choice(cands)
            path.append(nxt)
            used.add(nxt.track_id)
        last_attempt = path
        if len(path) == params.m:
            stages, metrics = evaluate_sequence(path, params)
            if metrics.feasible:
                elapsed = round((time.perf_counter() - t0) * 1000.0, 3)
                return RouteResult("Random", True, stages, metrics, elapsed, None)

    elapsed = round((time.perf_counter() - t0) * 1000.0, 3)
    stages, metrics = evaluate_sequence(last_attempt, params)
    return RouteResult(
        method="Random",
        feasible=metrics.feasible,
        stages=stages,
        metrics=metrics,
        exec_time_ms=elapsed,
        infeasibility_reason=None if metrics.feasible else "; ".join(metrics.violations),
    )


def get_30_experimental_scenarios() -> List[Dict[str, Any]]:
    """
    Retorna la batería oficial de 30 escenarios experimentales (CA2 y CA3)
    con longitudes m en [4, 8] cubriendo transiciones entre los 4 cuadrantes de Russell.
    """
    m_values = [4, 5, 6, 7, 8]
    templates = [
        {
            "transition": "C-II -> C-IV",
            "x_ini": (-0.65, 0.68),
            "x_obj": (0.60, -0.55),
            "name": "Tensión a Calma",
        },
        {
            "transition": "C-III -> C-I",
            "x_ini": (-0.68, -0.60),
            "x_obj": (0.58, 0.48),
            "name": "Melancolía a Alegría",
        },
        {
            "transition": "C-III -> C-IV",
            "x_ini": (-0.65, -0.45),
            "x_obj": (0.58, -0.48),
            "name": "Melancolía a Serenidad",
        },
        {
            "transition": "C-II -> C-I",
            "x_ini": (-0.60, 0.62),
            "x_obj": (0.60, 0.38),
            "name": "Tensión a Enfoque",
        },
        {
            "transition": "C-I -> C-IV",
            "x_ini": (0.58, 0.68),
            "x_obj": (0.58, -0.58),
            "name": "Euforia a Serenidad",
        },
        {
            "transition": "Centro -> C-IV",
            "x_ini": (-0.15, 0.45),
            "x_obj": (0.64, -0.62),
            "name": "Alerta leve a Reposo",
        },
    ]

    scenarios: List[Dict[str, Any]] = []
    for idx in range(30):
        m = m_values[idx % len(m_values)]
        tpl = templates[(idx // 5) % len(templates)]
        jitter = ((idx % 5) - 2) * 0.03
        v_ini = round(max(-0.85, min(0.85, tpl["x_ini"][0] + jitter)), 2)
        a_ini = round(max(-0.85, min(0.85, tpl["x_ini"][1] - jitter)), 2)
        v_obj = round(max(-0.85, min(0.85, tpl["x_obj"][0] - jitter)), 2)
        a_obj = round(max(-0.85, min(0.85, tpl["x_obj"][1] + jitter)), 2)
        scenarios.append(
            {
                "scenario_id": idx + 1,
                "code": f"ESC-{idx + 1:02d}",
                "scenario_name": f"{tpl['name']} (m={m})",
                "transition": tpl["transition"],
                "v_ini": v_ini,
                "a_ini": a_ini,
                "v_obj": v_obj,
                "a_obj": a_obj,
                "m": m,
            }
        )
    return scenarios


def get_20_synthetic_cases() -> List[Dict[str, Any]]:
    """
    Retorna el lote oficial de 20 casos sintéticos seudonimizados (SIREM-SYN-01 a SIREM-SYN-20)
    para la verificación del Criterio CA4.
    """
    return [
        {"case_id": "SIREM-SYN-01", "title": "Estrés pre-parcial a calma base", "context": "Orientación universitaria · C-II -> C-IV", "v_ini": -0.65, "a_ini": 0.70, "v_obj": 0.60, "a_obj": -0.55, "m": 6, "source_filter": "ALL", "lambda": 0.65, "delta": 0.65, "epsilon_ini": 0.35, "epsilon_obj": 0.35},
        {"case_id": "SIREM-SYN-02", "title": "Desánimo matinal a enfoque activo", "context": "Bienestar estudiantil · C-III -> C-I", "v_ini": -0.70, "a_ini": -0.60, "v_obj": 0.55, "a_obj": 0.45, "m": 6, "source_filter": "ALL", "lambda": 0.65, "delta": 0.65, "epsilon_ini": 0.35, "epsilon_obj": 0.35},
        {"case_id": "SIREM-SYN-03", "title": "Agitación vespertina a reposo breve", "context": "Pausa activa · C-II -> C-IV (4 etapas)", "v_ini": -0.50, "a_ini": 0.55, "v_obj": 0.45, "a_obj": -0.45, "m": 4, "source_filter": "ALL", "lambda": 0.70, "delta": 0.65, "epsilon_ini": 0.35, "epsilon_obj": 0.35},
        {"case_id": "SIREM-SYN-04", "title": "Melancolía persistente a serenidad", "context": "Acompañamiento psicosocial · C-III -> C-IV", "v_ini": -0.68, "a_ini": -0.45, "v_obj": 0.56, "a_obj": -0.50, "m": 5, "source_filter": "ALL", "lambda": 0.60, "delta": 0.65, "epsilon_ini": 0.35, "epsilon_obj": 0.35},
        {"case_id": "SIREM-SYN-05", "title": "Tensión aguda a alegría moderada", "context": "Regulación emocional · C-II -> C-I", "v_ini": -0.60, "a_ini": 0.64, "v_obj": 0.62, "a_obj": 0.35, "m": 5, "source_filter": "ALL", "lambda": 0.65, "delta": 0.65, "epsilon_ini": 0.35, "epsilon_obj": 0.35},
        {"case_id": "SIREM-SYN-06", "title": "Descompresión extendida de laboratorio", "context": "Transición larga · C-II -> C-IV (8 etapas)", "v_ini": -0.75, "a_ini": 0.75, "v_obj": 0.68, "a_obj": -0.65, "m": 8, "source_filter": "ALL", "lambda": 0.75, "delta": 0.60, "epsilon_ini": 0.35, "epsilon_obj": 0.35},
        {"case_id": "SIREM-SYN-07", "title": "Apatía académica a motivación media", "context": "Tutoría par · C-III -> C-I (7 etapas)", "v_ini": -0.72, "a_ini": -0.68, "v_obj": 0.60, "a_obj": 0.52, "m": 7, "source_filter": "ALL", "lambda": 0.65, "delta": 0.65, "epsilon_ini": 0.35, "epsilon_obj": 0.35},
        {"case_id": "SIREM-SYN-08", "title": "Solo DEAM · Tensión a Serenidad", "context": "Subcatálogo DEAM (522 pistas) · C-II -> C-IV", "v_ini": -0.58, "a_ini": 0.58, "v_obj": 0.52, "a_obj": -0.50, "m": 6, "source_filter": "DEAM", "lambda": 0.65, "delta": 0.68, "epsilon_ini": 0.35, "epsilon_obj": 0.35},
        {"case_id": "SIREM-SYN-09", "title": "Solo PMEmo · Fatiga a Activación", "context": "Subcatálogo PMEmo (762 pistas) · C-III -> C-I", "v_ini": -0.62, "a_ini": -0.55, "v_obj": 0.55, "a_obj": 0.45, "m": 6, "source_filter": "PMEmo", "lambda": 0.65, "delta": 0.65, "epsilon_ini": 0.35, "epsilon_obj": 0.35},
        {"case_id": "SIREM-SYN-10", "title": "Neutro tenso a calma sostenida", "context": "Taller grupal · C-II/Centro -> C-IV", "v_ini": -0.25, "a_ini": 0.55, "v_obj": 0.58, "a_obj": -0.58, "m": 5, "source_filter": "ALL", "lambda": 0.70, "delta": 0.65, "epsilon_ini": 0.35, "epsilon_obj": 0.35},
        {"case_id": "SIREM-SYN-11", "title": "Euforia dispersa a concentración serena", "context": "Regulación atencional · C-I -> C-IV", "v_ini": 0.60, "a_ini": 0.72, "v_obj": 0.55, "a_obj": -0.45, "m": 5, "source_filter": "ALL", "lambda": 0.65, "delta": 0.65, "epsilon_ini": 0.35, "epsilon_obj": 0.35},
        {"case_id": "SIREM-SYN-12", "title": "Baja valencia extrema a tono neutro-positivo", "context": "Apoyo inicial · C-III -> C-IV (6 etapas)", "v_ini": -0.78, "a_ini": -0.30, "v_obj": 0.42, "a_obj": -0.25, "m": 6, "source_filter": "ALL", "lambda": 0.75, "delta": 0.60, "epsilon_ini": 0.35, "epsilon_obj": 0.35},
        {"case_id": "SIREM-SYN-13", "title": "Alerta moderada a bienestar estable", "context": "Sesión breve · C-II -> C-IV (4 etapas)", "v_ini": -0.45, "a_ini": 0.48, "v_obj": 0.48, "a_obj": -0.40, "m": 4, "source_filter": "ALL", "lambda": 0.65, "delta": 0.65, "epsilon_ini": 0.35, "epsilon_obj": 0.35},
        {"case_id": "SIREM-SYN-14", "title": "Sostenimiento en calma profunda", "context": "Consolidación · C-IV -> C-IV (4 etapas)", "v_ini": 0.25, "a_ini": -0.25, "v_obj": 0.68, "a_obj": -0.68, "m": 4, "source_filter": "ALL", "lambda": 0.80, "delta": 0.55, "epsilon_ini": 0.35, "epsilon_obj": 0.35},
        {"case_id": "SIREM-SYN-15", "title": "Reactivación gradual tras agotamiento", "context": "Bienestar laboral UIS · C-III -> C-I (8 etapas)", "v_ini": -0.66, "a_ini": -0.66, "v_obj": 0.62, "a_obj": 0.60, "m": 8, "source_filter": "ALL", "lambda": 0.70, "delta": 0.60, "epsilon_ini": 0.35, "epsilon_obj": 0.35},
        {"case_id": "SIREM-SYN-16", "title": "Solo DEAM · Melancolía a Calma", "context": "Subcatálogo DEAM · C-III -> C-IV (5 etapas)", "v_ini": -0.60, "a_ini": -0.45, "v_obj": 0.52, "a_obj": -0.48, "m": 5, "source_filter": "DEAM", "lambda": 0.65, "delta": 0.65, "epsilon_ini": 0.35, "epsilon_obj": 0.35},
        {"case_id": "SIREM-SYN-17", "title": "Solo PMEmo · Tensión a Calma", "context": "Subcatálogo PMEmo · C-II -> C-IV (7 etapas)", "v_ini": -0.65, "a_ini": 0.65, "v_obj": 0.58, "a_obj": -0.58, "m": 7, "source_filter": "PMEmo", "lambda": 0.65, "delta": 0.65, "epsilon_ini": 0.35, "epsilon_obj": 0.35},
        {"case_id": "SIREM-SYN-18", "title": "Sobrecarga cognitiva a equilibrio neutral", "context": "Cierre de jornada · C-II -> C-IV (6 etapas)", "v_ini": -0.52, "a_ini": 0.68, "v_obj": 0.35, "a_obj": -0.35, "m": 6, "source_filter": "ALL", "lambda": 0.65, "delta": 0.65, "epsilon_ini": 0.35, "epsilon_obj": 0.35},
        {"case_id": "SIREM-SYN-19", "title": "Baja energía a optimismo sereno", "context": "Orientación vocacional · C-III -> C-I (5 etapas)", "v_ini": -0.48, "a_ini": -0.52, "v_obj": 0.52, "a_obj": 0.25, "m": 5, "source_filter": "ALL", "lambda": 0.65, "delta": 0.65, "epsilon_ini": 0.35, "epsilon_obj": 0.35},
        {"case_id": "SIREM-SYN-20", "title": "Alta activación neutra a serenidad profunda", "context": "Protocolo final · C-I/II -> C-IV (7 etapas)", "v_ini": -0.10, "a_ini": 0.72, "v_obj": 0.62, "a_obj": -0.62, "m": 7, "source_filter": "ALL", "lambda": 0.70, "delta": 0.65, "epsilon_ini": 0.35, "epsilon_obj": 0.35},
    ]
