"""
Configuración global, cargador nativo de variables de entorno (.env) e hiperparámetros
calibrados del sistema SIREM (UIS).
Carga los contratos y parámetros desde config/schema_contract.json y config/parameters.json,
así como las 3 credenciales de Supabase desde el archivo /.env de la raíz.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict

CONFIG_DIR = Path(__file__).resolve().parent
ROOT_DIR = CONFIG_DIR.parent
ENV_FILE_PATH = ROOT_DIR / ".env"
SCHEMA_CONTRACT_PATH = CONFIG_DIR / "schema_contract.json"
PARAMETERS_PATH = CONFIG_DIR / "parameters.json"
CATALOG_CSV_PATH = ROOT_DIR / "data" / "catalogo_sirem_1284.csv"


FRONTEND_ENV_FILE_PATH = ROOT_DIR / "frontend" / ".env"


def load_root_dotenv(dotenv_path: Path = ENV_FILE_PATH) -> Dict[str, str]:
    """
    Cargador nativo de archivo .env en la raíz del proyecto sin depender de librerías externas.
    Lee pares CLAVE=VALOR, ignora comentarios (#) y limpia comillas simples o dobles.
    """
    loaded_vars: Dict[str, str] = {}
    if not dotenv_path.exists():
        return loaded_vars

    with open(dotenv_path, "r", encoding="utf-8") as fp:
        for raw_line in fp:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, raw_val = line.split("=", 1)
            key = key.strip()
            val = raw_val.strip()
            if (val.startswith('"') and val.endswith('"')) or (
                val.startswith("'") and val.endswith("'")
            ):
                val = val[1:-1].strip()
            loaded_vars[key] = val
            if key not in os.environ or "tu-proyecto.supabase.co" in os.environ.get(key, ""):
                os.environ[key] = val

    return loaded_vars


# Inicialización automática de variables de entorno al importar config.settings
_DOTENV_VARS = load_root_dotenv()

SUPABASE_URL: str = os.environ.get("SUPABASE_URL", _DOTENV_VARS.get("SUPABASE_URL", "")).strip()
SUPABASE_ANON_KEY: str = os.environ.get(
    "SUPABASE_ANON_KEY", _DOTENV_VARS.get("SUPABASE_ANON_KEY", "")
).strip()
SUPABASE_SERVICE_ROLE_KEY: str = os.environ.get(
    "SUPABASE_SERVICE_ROLE_KEY", _DOTENV_VARS.get("SUPABASE_SERVICE_ROLE_KEY", "")
).strip()


def get_supabase_credentials() -> Dict[str, Any]:
    """
    Retorna el diccionario de credenciales de Supabase, priorizando SUPABASE_SERVICE_ROLE_KEY
    para operaciones administrativas de sincronización desde backend Python y usando
    SUPABASE_ANON_KEY (o VITE_SUPABASE_ANON_KEY desde frontend/.env) como respaldo.
    """
    root_vars = load_root_dotenv(ENV_FILE_PATH)
    fe_vars = load_root_dotenv(FRONTEND_ENV_FILE_PATH)

    url = (
        root_vars.get("SUPABASE_URL")
        or os.environ.get("SUPABASE_URL")
        or fe_vars.get("VITE_SUPABASE_URL")
        or ""
    ).strip().rstrip("/")
    if "tu-proyecto.supabase.co" in url and fe_vars.get("VITE_SUPABASE_URL"):
        alt_url = fe_vars["VITE_SUPABASE_URL"].strip().rstrip("/")
        if "tu-proyecto.supabase.co" not in alt_url:
            url = alt_url

    anon_key = (
        root_vars.get("SUPABASE_ANON_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or fe_vars.get("VITE_SUPABASE_ANON_KEY")
        or ""
    ).strip()
    if "tu-clave-publica" in anon_key and fe_vars.get("VITE_SUPABASE_ANON_KEY"):
        alt_anon = fe_vars["VITE_SUPABASE_ANON_KEY"].strip()
        if "tu-clave-publica" not in alt_anon:
            anon_key = alt_anon

    service_key = (
        root_vars.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or ""
    ).strip()

    is_placeholder_url = (not url) or ("tu-proyecto.supabase.co" in url)
    is_valid_service = bool(service_key) and ("tu-clave-privada" not in service_key)
    is_valid_anon = bool(anon_key) and ("tu-clave-publica" not in anon_key)

    active_key = service_key if is_valid_service else (anon_key if is_valid_anon else "")
    active_role = (
        "service_role"
        if is_valid_service
        else ("anon" if is_valid_anon else "no_configurada")
    )

    return {
        "url": url,
        "anon_key": anon_key,
        "service_role_key": service_key,
        "active_key": active_key,
        "active_role": active_role,
        "is_configured": (not is_placeholder_url) and bool(active_key),
    }


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
