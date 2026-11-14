"""
Módulo de revisión y sustitución profesional de pistas del mismo cuadrante (mitigación de R3).
Recalcula de inmediato J(P), d_max(P), e_obj(P) y el estado de factibilidad tras un reemplazo.
"""

from __future__ import annotations

from typing import List, Tuple

from src.routing_engine import (
    RouteMetrics,
    RouteParams,
    StageNode,
    TrackRecord,
    euclidean_2d,
    evaluate_sequence,
    track_point,
)


def find_same_quadrant_substitutes(
    current_track: TrackRecord,
    catalog: List[TrackRecord],
    excluded_ids: set[str],
    top_k: int = 5,
) -> List[TrackRecord]:
    """Retorna las k pistas vecinas más cercanas dentro del mismo cuadrante de Russell."""
    cur_pt = track_point(current_track)
    candidates = [
        t
        for t in catalog
        if t.quadrant == current_track.quadrant
        and t.track_id != current_track.track_id
        and t.track_id not in excluded_ids
    ]
    candidates.sort(key=lambda t: euclidean_2d(cur_pt, track_point(t)))
    return candidates[:top_k]


def substitute_track_and_recalculate(
    current_tracks: List[TrackRecord],
    stage_index: int,
    new_track: TrackRecord,
    params: RouteParams,
) -> Tuple[List[StageNode], RouteMetrics]:
    """Reemplaza la pista en stage_index (0-based) y recalcula inmediatamente todas las métricas."""
    updated = list(current_tracks)
    updated[stage_index] = new_track
    return evaluate_sequence(updated, params)
