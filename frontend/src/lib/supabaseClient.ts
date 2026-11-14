/**
 * Cliente de conexión a Supabase con respaldo autónomo en localStorage y semilla determinista.
 * Soporta sincronización opcional con las 4 tablas del esquema PostgreSQL de SIREM:
 * 1. catalog_tracks
 * 2. musical_guides
 * 3. benchmark_scenarios
 * 4. usability_trials
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  ScenarioEvalRow,
  SupabaseConfig,
  Track,
  UsabilityTrialRecord,
} from '../types/sirem';

/** Claves de almacenamiento persistente en el navegador (fallback local) */
const STORAGE_KEYS = {
  supabaseConfig: 'sirem_uis_supabase_config_v1',
  usabilityTrials: 'sirem_uis_usability_trials_v1',
  customCatalog: 'sirem_uis_custom_catalog_v1',
  fichaObservations: 'sirem_uis_ficha_obs_v1',
};

const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/** Configuración inicial por defecto para el cliente de Supabase */
export const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  url: envUrl,
  anonKey: envKey,
  tablePrefix: 'public.',
  connected: false,
  lastSyncAt: null,
};

/** Carga la configuración de Supabase almacenada localmente o desde variables de entorno */
export function loadSupabaseConfig(): SupabaseConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.supabaseConfig);
    if (!raw) return DEFAULT_SUPABASE_CONFIG;
    const parsed = JSON.parse(raw) as Partial<SupabaseConfig>;
    return {
      ...DEFAULT_SUPABASE_CONFIG,
      ...parsed,
      url: parsed.url || envUrl,
      anonKey: parsed.anonKey || envKey,
    };
  } catch {
    return DEFAULT_SUPABASE_CONFIG;
  }
}

/** Guarda la configuración de Supabase en localStorage */
export function saveSupabaseConfig(cfg: SupabaseConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.supabaseConfig, JSON.stringify(cfg));
  } catch {
    // Se ignora si el navegador restringe el almacenamiento local
  }
}

/** Instancia un cliente de Supabase si existen credenciales válidas configuradas */
export function createSiremSupabaseClient(customConfig?: SupabaseConfig): SupabaseClient | null {
  const cfg = customConfig ?? loadSupabaseConfig();
  const cleanUrl = cfg.url.trim().replace(/\/+$/, '');
  const cleanKey = cfg.anonKey.trim();
  if (!cleanUrl.startsWith('https://') || !cleanKey) {
    return null;
  }
  try {
    return createClient(cleanUrl, cleanKey);
  } catch (error) {
    console.error('Error al inicializar el cliente de Supabase en SIREM:', error);
    return null;
  }
}

/** Verifica la conectividad con la API REST / PostgREST de Supabase */
export async function testSupabaseConnection(
  url: string,
  anonKey: string,
): Promise<{ ok: boolean; message: string }> {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  if (!cleanUrl.startsWith('https://') || !anonKey.trim()) {
    return {
      ok: false,
      message: 'Ingrese una URL HTTPS válida del proyecto Supabase y su clave pública ANON.',
    };
  }
  try {
    const res = await fetch(`${cleanUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        apikey: anonKey.trim(),
        Authorization: `Bearer ${anonKey.trim()}`,
      },
    });
    if (res.ok || res.status === 200 || res.status === 404) {
      return {
        ok: true,
        message: 'Conexión verificada correctamente con el endpoint REST de Supabase.',
      };
    }
    return {
      ok: false,
      message: `Respuesta HTTP ${res.status} desde Supabase. Verifique la URL y la clave ANON.`,
    };
  } catch (err) {
    return {
      ok: false,
      message: `No fue posible contactar el servidor remoto (${
        err instanceof Error ? err.message : 'error de red'
      }). El modo autónomo local continúa activo.`,
    };
  }
}

/** Sincroniza una muestra o lote de datos con las tablas remotas de Supabase */
export async function syncDataToSupabase(
  config: SupabaseConfig,
  catalog: Track[],
  trials: UsabilityTrialRecord[],
  scenarios?: ScenarioEvalRow[],
): Promise<{ ok: boolean; message: string }> {
  const client = createSiremSupabaseClient(config);
  if (!client) {
    return {
      ok: false,
      message: 'No hay cliente de Supabase activo. Configure primero las credenciales válidas.',
    };
  }

  try {
    // Sincronizar muestra representativa del catálogo (primeros 100 registros por lote para rapidez)
    const sampleTracks = catalog.slice(0, 100).map((t) => ({
      track_id: t.track_id,
      title: t.title,
      artist: t.artist,
      source: t.source,
      v_raw: t.v_raw,
      a_raw: t.a_raw,
      v_norm: t.v_norm,
      a_norm: t.a_norm,
      quadrant: t.quadrant,
      duration_sec: t.duration_sec,
      external_url: t.external_url,
      license_note: t.license_note,
    }));

    const { error: catErr } = await client
      .from('catalog_tracks')
      .upsert(sampleTracks, { onConflict: 'track_id' });

    if (catErr) {
      return {
        ok: false,
        message: `Aviso al sincronizar catalog_tracks: ${catErr.message}. Asegúrese de haber ejecutado la migración SQL.`,
      };
    }

    // Sincronizar registros de usabilidad pareada (CA5)
    if (trials.length > 0) {
      const trialRows = trials.map((tr) => ({
        participant_code: tr.participant_code,
        consent_verified: tr.consent_signed,
        profile_type: tr.profile_type,
        manual_time_min: tr.manual_minutes,
        assisted_time_min: tr.sirem_minutes,
        completed_without_help: tr.completed_without_help,
        utility_score: tr.utility_likert,
        observations: tr.notes,
      }));
      await client.from('usability_trials').insert(trialRows);
    }

    // Sincronizar escenarios de benchmark si están disponibles (CA2/CA3)
    if (scenarios && scenarios.length > 0) {
      const benchRows = scenarios.map((sc, idx) => ({
        scenario_id: idx + 1,
        scenario_name: `${sc.label} · ${sc.transition}`,
        v_ini: sc.v_ini,
        a_ini: sc.a_ini,
        v_obj: sc.v_obj,
        a_obj: sc.a_obj,
        m_length: sc.m,
        dijkstra_jp: sc.dijkstra_J,
        dijkstra_dmax: sc.dijkstra_dmax,
        dijkstra_eobj: sc.dijkstra_eobj,
        dijkstra_time_ms: sc.dijkstra_ms,
        markov_jp: sc.markov_J,
        markov_dmax: sc.markov_dmax,
        markov_eobj: sc.markov_eobj,
        markov_time_ms: sc.markov_ms,
        nearest_jp: sc.greedy_J,
        random_jp: sc.random_J,
        feasible: sc.dijkstra_feasible,
      }));
      await client
        .from('benchmark_scenarios')
        .upsert(benchRows, { onConflict: 'scenario_id' });
    }

    return {
      ok: true,
      message: 'Sincronización completada con las tablas PostgreSQL de Supabase.',
    };
  } catch (err) {
    return {
      ok: false,
      message: `Error durante la sincronización con Supabase: ${
        err instanceof Error ? err.message : 'fallo inesperado'
      }.`,
    };
  }
}

/** Carga los ensayos de usabilidad desde localStorage o retorna la semilla inicial */
export function loadUsabilityTrials(seedFallback: UsabilityTrialRecord[]): UsabilityTrialRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.usabilityTrials);
    if (!raw) return seedFallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : seedFallback;
  } catch {
    return seedFallback;
  }
}

/** Guarda los ensayos de usabilidad en localStorage */
export function saveUsabilityTrials(records: UsabilityTrialRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.usabilityTrials, JSON.stringify(records));
  } catch {
    // Se ignora si hay restricción de almacenamiento
  }
}

/** Carga un catálogo personalizado importado por CSV desde localStorage */
export function loadCustomCatalog(): Track[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.customCatalog);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

/** Guarda o limpia el catálogo personalizado en localStorage */
export function saveCustomCatalog(tracks: Track[] | null): void {
  try {
    if (!tracks) {
      localStorage.removeItem(STORAGE_KEYS.customCatalog);
    } else {
      localStorage.setItem(STORAGE_KEYS.customCatalog, JSON.stringify(tracks));
    }
  } catch {
    // Se ignora si hay restricción de almacenamiento
  }
}

/** Carga el mapa de observaciones técnicas por caso desde localStorage */
export function loadFichaObservations(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.fichaObservations);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

/** Guarda la observación técnica de un caso específico en localStorage */
export function saveFichaObservation(caseId: string, obs: string): void {
  try {
    const all = loadFichaObservations();
    all[caseId] = obs;
    localStorage.setItem(STORAGE_KEYS.fichaObservations, JSON.stringify(all));
  } catch {
    // Se ignora si hay restricción de almacenamiento
  }
}