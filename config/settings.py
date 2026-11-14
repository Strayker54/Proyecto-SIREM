"""
Configuración global e hiperparámetros calibrados del sistema SIREM (UIS).
Carga los contratos y parámetros desde config/schema_contract.json y config/parameters.json.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

CONFIG_DIR = Path(__file__).resolve().parent
ROOT_DIR = CONFIG_DIR.parent
SCHEMA_CONTRACT_PATH = CONFIG_DIR / "schema_contract.json"
PARAMETERS_PATH = CONFIG_DIR / "parameters.json"
CATALOG_CSV_PATH = ROOT_DIR / "data" / "catalogo_sirem_1284.csv"


def load_schema_contract() -> Dict[str, Any]:
    """Carga el contrato de datos formal del catálogo musical auditado (CA1)."""
    with open(SCHEMA_CONTRACT_PATH, "r", encoding="utf-8") as fp:
        return json.load(fp)


def load_parameters() -> Dict[str, Any]:
    """Carga los hiperparámetros calibrados del motor algorítmico SIREM."""
    with open(PARAMETERS_PATH, "r", encoding="utf-8") as fp:
        return json.load(fp)


DEFAULT_HYPERPARAMETERS: Dict[str, Any] = {
    "lambda": 0.65,
    "delta": 0.65,
    "beta": 5.0,
    "epsilon_ini": 0.35,
    "epsilon_obj": 0.35,
    "default_m_stages": 6,
    "min_stages": 4,
    "max_stages": 8,
    "default_seed": 2026,
    "markov_budget": 50,
}
