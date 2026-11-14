"""Subpaquete del motor algorítmico SIREM (Dijkstra, Markov y líneas base)."""

from src.routing_engine import (
    Point2D,
    RouteMetrics,
    RouteParams,
    RouteResult,
    StageNode,
    TrackRecord,
    compute_reference_trajectory,
    evaluate_sequence,
    solve_dijkstra,
    solve_markov,
    solve_nearest,
    solve_random,
)

__all__ = [
    "Point2D",
    "RouteMetrics",
    "RouteParams",
    "RouteResult",
    "StageNode",
    "TrackRecord",
    "compute_reference_trajectory",
    "evaluate_sequence",
    "solve_dijkstra",
    "solve_markov",
    "solve_nearest",
    "solve_random",
]
