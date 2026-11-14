/**
 * Módulo 6: Panel de Estado y Sincronización con las 4 Tablas de Supabase.
 * Permite verificar credenciales, sincronizar el catálogo y ensayos de usabilidad
 * con PostgreSQL / Supabase, o mantener la operación autónoma en localStorage.
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  CloudUpload,
  Database,
  HardDrive,
  RefreshCw,
  Server,
  ShieldCheck,
} from 'lucide-react';
import type { SupabaseConfig, Track } from '../../types/sirem';
import {
  DEFAULT_SUPABASE_CONFIG,
  loadSupabaseConfig,
  loadUsabilityTrials,
  saveSupabaseConfig,
  syncDataToSupabase,
  testSupabaseConnection,
} from '../../lib/supabaseClient';
import { SEED_USABILITY_TRIALS } from '../../data/seedData';

interface SupabaseConfigModuleProps {
  catalog: Track[];
  isCustomCatalog: boolean;
}

const SUPABASE_DDL = `-- Esquema PostgreSQL oficial de las 4 tablas de SIREM (supabase/migrations/20261105_sirem_schema.sql)
CREATE TABLE IF NOT EXISTS public.catalog_tracks (
  track_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('DEAM', 'PMEmo')),
  v_raw NUMERIC NOT NULL,
  a_raw NUMERIC NOT NULL,
  v_norm NUMERIC NOT NULL CHECK (v_norm >= -1 AND v_norm <= 1),
  a_norm NUMERIC NOT NULL CHECK (a_norm >= -1 AND a_norm <= 1),
  quadrant TEXT NOT NULL,
  duration_sec INTEGER DEFAULT 180,
  external_url TEXT NOT NULL,
  license_note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.musical_guides (
  guide_code TEXT PRIMARY KEY,
  catalog_version TEXT NOT NULL DEFAULT 'v1.0-1284tracks',
  is_synthetic BOOLEAN DEFAULT TRUE,
  v_ini NUMERIC NOT NULL,
  a_ini NUMERIC NOT NULL,
  v_obj NUMERIC NOT NULL,
  a_obj NUMERIC NOT NULL,
  num_stages INTEGER NOT NULL CHECK (num_stages BETWEEN 4 AND 8),
  method_used TEXT NOT NULL,
  cost_jp NUMERIC NOT NULL,
  d_max_observed NUMERIC NOT NULL,
  e_obj_observed NUMERIC NOT NULL,
  exec_time_ms NUMERIC NOT NULL,
  route_tracks JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.benchmark_scenarios (
  scenario_id INTEGER PRIMARY KEY,
  scenario_name TEXT NOT NULL,
  v_ini NUMERIC NOT NULL,
  a_ini NUMERIC NOT NULL,
  v_obj NUMERIC NOT NULL,
  a_obj NUMERIC NOT NULL,
  m_length INTEGER NOT NULL,
  dijkstra_jp NUMERIC,
  dijkstra_time_ms NUMERIC,
  markov_jp NUMERIC,
  feasible BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.usability_trials (
  trial_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_code TEXT NOT NULL,
  consent_verified BOOLEAN NOT NULL DEFAULT TRUE,
  profile_type TEXT NOT NULL,
  manual_time_min NUMERIC NOT NULL,
  assisted_time_min NUMERIC NOT NULL,
  utility_score INTEGER CHECK (utility_score BETWEEN 1 AND 5),
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);`;

export const SupabaseConfigModule: React.FC<SupabaseConfigModuleProps> = ({
  catalog,
  isCustomCatalog,
}) => {
  const [config, setConfig] = useState<SupabaseConfig>(() => loadSupabaseConfig());
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    const result = await testSupabaseConnection(config.url, config.anonKey);
    const nextConfig: SupabaseConfig = {
      ...config,
      connected: result.ok,
      lastSyncAt: result.ok ? new Date().toISOString() : config.lastSyncAt,
    };
    setConfig(nextConfig);
    saveSupabaseConfig(nextConfig);
    setStatusMessage(result.message);
    setTesting(false);
  };

  const handleSyncTables = async () => {
    setSyncing(true);
    const trials = loadUsabilityTrials(SEED_USABILITY_TRIALS);
    const res = await syncDataToSupabase(config, catalog, trials);
    if (res.ok) {
      const updated = { ...config, connected: true, lastSyncAt: new Date().toISOString() };
      setConfig(updated);
      saveSupabaseConfig(updated);
    }
    setStatusMessage(res.message);
    setSyncing(false);
  };

  const handleClearCredentials = () => {
    setConfig(DEFAULT_SUPABASE_CONFIG);
    saveSupabaseConfig(DEFAULT_SUPABASE_CONFIG);
    setStatusMessage(
      'Credenciales removidas. SIREM opera en modo local autónomo (localStorage + semilla determinista v1.0).',
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Conexión con Supabase y Estado del Proyecto
        </h2>
        <p className="text-sm text-slate-600 mt-0.5">
          Configuración opcional de repositorio remoto PostgreSQL. Sin credenciales, la aplicación
          opera al 100% con el catálogo integrado (1.284 pistas) y persistencia local.
        </p>
      </div>

      {/* Tarjetas de estado del sistema */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Modo de Persistencia Activo</span>
            <HardDrive className="w-4 h-4 text-[#1B4332]" />
          </div>
          <div className="text-base font-bold text-slate-900">
            {config.connected ? 'Supabase + Respaldo Local' : 'Autónomo Local (localStorage)'}
          </div>
          <p className="text-xs text-slate-600">
            {config.lastSyncAt
              ? `Última sincronización: ${new Date(config.lastSyncAt).toLocaleString('es-CO')}`
              : 'Operativo sin dependencias externas ni claves requeridas.'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Catálogo en Memoria</span>
            <Database className="w-4 h-4 text-[#1B4332]" />
          </div>
          <div className="text-base font-bold font-mono tabular-nums text-slate-900">
            {catalog.length.toLocaleString('es-CO')} pistas v1.0
          </div>
          <p className="text-xs text-slate-600">
            {isCustomCatalog
              ? 'Catálogo CSV personalizado activo'
              : 'Dataset auditado DEAM (522) + PMEmo (762)'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Cumplimiento Normativo</span>
            <ShieldCheck className="w-4 h-4 text-[#1B4332]" />
          </div>
          <div className="text-base font-bold text-slate-900">Ley 23/1982 · Ley 1581/2012</div>
          <p className="text-xs text-slate-600">
            Solo vectores (V, A), metadatos públicos y códigos seudonimizados.
          </p>
        </div>
      </section>

      {/* Formulario opcional de credenciales Supabase y DDL SQL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSaveAndTest}
          className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-[#1B4332]" />
              Credenciales Opcionales de Supabase
            </h3>
            {config.connected && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verificado
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="supabase-url" className="block text-xs font-medium text-slate-700">
              VITE_SUPABASE_URL
            </label>
            <input
              id="supabase-url"
              type="url"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
              placeholder="https://tu-proyecto.supabase.co"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#67B93E]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="supabase-key" className="block text-xs font-medium text-slate-700">
              VITE_SUPABASE_ANON_KEY
            </label>
            <input
              id="supabase-key"
              type="password"
              value={config.anonKey}
              onChange={(e) => setConfig({ ...config, anonKey: e.target.value })}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#67B93E]"
            />
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-md text-xs border ${
                config.connected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              {statusMessage}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={handleClearCredentials}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Restablecer a modo local
            </button>
            <div className="flex flex-wrap items-center gap-2">
              {config.connected && (
                <button
                  type="button"
                  disabled={syncing}
                  onClick={handleSyncTables}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#1B4332] bg-[#67B93E]/20 hover:bg-[#67B93E]/30 rounded-lg cursor-pointer"
                >
                  <CloudUpload className="w-3.5 h-3.5" />
                  {syncing ? 'Sincronizando...' : 'Sincronizar Tablas'}
                </button>
              )}
              <button
                type="submit"
                disabled={testing}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143326] disabled:opacity-50 rounded-lg cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                {testing ? 'Verificando endpoint...' : 'Guardar y Probar Conexión'}
              </button>
            </div>
          </div>
        </form>

        {/* Referencia del esquema SQL de las 4 tablas */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Esquema PostgreSQL de las 4 Tablas de Supabase
          </h3>
          <p className="text-xs text-slate-600">
            Alineado con <code className="font-mono">supabase/migrations/20261105_sirem_schema.sql</code>{' '}
            y <code className="font-mono">config/schema_contract.json</code>.
          </p>
          <pre className="bg-slate-900 text-slate-200 p-4 rounded-md text-[11px] overflow-x-auto max-h-80 leading-relaxed">
            {SUPABASE_DDL}
          </pre>
        </section>
      </div>
    </div>
  );
};
