"""
Cargador de datos del catálogo auditado SIREM (1.284 pistas en [-1, 1]^2).
Reexporta las funciones de carga y limpieza de src/data_cleaning.py y src/routing_engine.py.
"""

from src.data_cleaning import extract_deam_raw_records, generate_pmemo_records, normalize_linear, run_cleaning_pipeline
from src.routing_engine import TrackRecord, load_catalog_from_csv

__all__ = [
    "TrackRecord",
    "load_catalog_from_csv",
    "normalize_linear",
    "extract_deam_raw_records",
    "generate_pmemo_records",
    "run_cleaning_pipeline",
]
