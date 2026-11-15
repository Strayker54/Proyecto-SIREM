/**
 * Módulo 6: Panel de Estado y Sincronización Bidireccional con las 4 Tablas de Supabase.
 * Permite verificar credenciales, sincronizar por lotes de 200 registros el catálogo
 * (1.284 pistas), los 30 escenarios experimentales (CA2), los 20 casos sintéticos (CA4)
 * y los ensayos de usabilidad (CA5) con barra de progreso real y contador de filas en vivo.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CloudUpload,
  Database,
  HardDrive,
  RefreshCw,
  Server,
  ShieldCheck,
  Table2,
} from 'lucide-react';
import type { SupabaseConfig, Track } from '../../types/sirem';
import {
  DEFAULT_SUPABASE_CONFIG,
  SUPABASE_BATCH_SIZE,
  type SupabaseTableCounts,
  buildSyntheticGuidesPayload,
  fetchSupabaseTableCounts,
  loadSavedMusicalGuides,
  loadSupabaseConfig,
  loadUsabilityTrials,
  saveSupabaseConfig,
  syncDataToSupabase,
  testSupabaseConnection,
} from '../../lib/supabaseClient';
import {
  DEFAULT_PARAMS,
  EXPERIMENTAL_SCENARIOS_30,
  SEED_USABILITY_TRIALS,
  SYNTHETIC_CASES_20,
} from '../../data/seedData';
import { runExperimentalBattery } from '../../services/mathEngine';

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
  lambda_param NUMERIC NOT NULL DEFAULT 0.65,
  delta_max_limit NUMERIC NOT NULL DEFAULT 0.65,
  cost_jp NUMERIC NOT NULL,
  d_max_observed NUMERIC NOT NULL,
  e_obj_observed NUMERIC NOT NULL,
  exec_time_ms NUMERIC NOT NULL,
  route_tracks JSONB NOT NULL,
  substitutions_count INTEGER DEFAULT 0,
  professional_notes TEXT,
  reviewer_role TEXT,
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
  dijkstra_dmax NUMERIC,
  dijkstra_eobj NUMERIC,
  dijkstra_time_ms NUMERIC,
  markov_jp NUMERIC,
  markov_dmax NUMERIC,
  markov_eobj NUMERIC,
  markov_time_ms NUMERIC,
  nearest_jp NUMERIC,
  random_jp NUMERIC,
  feasible BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.usability_trials (
  trial_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_code TEXT NOT NULL,
  consent_verified BOOLEAN NOT NULL DEFAULT TRUE,
  profile_type TEXT NOT NULL,
  manual_time_min NUMERIC NOT NULL,
  assisted_time_min NUMERIC NOT NULL,
  time_saved_min NUMERIC GENERATED ALWAYS AS (manual_time_min - assisted_time_min) STORED,
  completed_without_help BOOLEAN NOT NULL DEFAULT TRUE,
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
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [syncStepText, setSyncStepText] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const localFallbackCounts = useMemo(() => {
    const userGuides = loadSavedMusicalGuides().filter(
      (g) => !g.guide_code.startsWith('SIREM-SYN-'),
    );
    const trials = loadUsabilityTrials(SEED_USABILITY_TRIALS);
    return {
      catalog_tracks: catalog.length,
      musical_guides: SYNTHETIC_CASES_20.length + userGuides.length,
      benchmark_scenarios: EXPERIMENTAL_SCENARIOS_30.length,
      usability_trials: trials.length,
    };
  }, [catalog.length]);

  const [tableCounts, setTableCounts] = useState<SupabaseTableCounts>({
    ...localFallbackCounts,
    source: 'local_fallback',
  });

  useEffect(() => {
    let active = true;
    fetchSupabaseTableCounts(config, localFallbackCounts).then((counts) => {
      if (active) setTableCounts(counts);
    });
    return () => {
      active = false;
    };
  }, [config, localFallbackCounts]);

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
    const counts = await fetchSupabaseTableCounts(nextConfig, localFallbackCounts);
    setTableCounts(counts);
    setTesting(false);
  };

  const handleSyncTables = async () => {
    setSyncing(true);
    setSyncProgress(5);
    setSyncStepText('Preparando lotes de sincronización (máx. 200 registros por lote)...');

    const trials = loadUsabilityTrials(SEED_USABILITY_TRIALS);
    const battery = runExperimentalBattery(catalog, EXPERIMENTAL_SCENARIOS_30, DEFAULT_PARAMS);
    const syntheticGuides = buildSyntheticGuidesPayload(
      catalog,
      SYNTHETIC_CASES_20,
      DEFAULT_PARAMS,
    );
    const userGuides = loadSavedMusicalGuides().filter(
      (g) => !g.guide_code.startsWith('SIREM-SYN-'),
    );
    const allGuides = [...syntheticGuides, ...userGuides];

    const res = await syncDataToSupabase(
      config,
      catalog,
      trials,
      battery.rows,
      allGuides,
      (pct, stepLabel) => {
        setSyncProgress(pct);
        setSyncStepText(stepLabel);
      },
    );

    if (res.ok) {
      const updated = {
        ...config,
        connected: Boolean(config.url && config.anonKey),
        lastSyncAt: new Date().toISOString(),
      };
      setConfig(updated);
      saveSupabaseConfig(updated);
      if (res.counts) {
        setTableCounts(res.counts);
      }
    }
    setStatusMessage(res.message);
    setSyncProgress(100);
    setSyncing(false);
  };

  const handleClearCredentials = () => {
    setConfig(DEFAULT_SUPABASE_CONFIG);
    saveSupabaseConfig(DEFAULT_SUPABASE_CONFIG);
    setTableCounts({ ...localFallbackCounts, source: 'local_fallback' });
    setSyncProgress(0);
    setSyncStepText('');
    setStatusMessage(
      'Credenciales removidas. SIREM opera en modo local autónomo (localStorage + semilla determinista v1.0).',
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Conexión Bidireccional con Supabase y Sincronización por Lotes
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Sincronización por lotes (<code className="font-mono">upsert</code> de{' '}
            {SUPABASE_BATCH_SIZE} registros/lote) hacia las 4 tablas PostgreSQL o respaldo autónomo
            en <code className="font-mono">localStorage</code>.
          </p>
        </div>

        <button
          type="button"
          disabled={syncing}
          onClick={handleSyncTables}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143326] disabled:opacity-50 rounded-lg shadow-sm transition-colors cursor-pointer shrink-0"
        >
          <CloudUpload className="w-4 h-4" />
          {syncing
            ? `Sincronizando (${syncProgress}%)...`
            : 'Sincronizar Catálogo (1.284 pistas), 30 Escenarios y 20 Casos hacia Supabase'}
        </button>
      </div>

      {/* Barra de progreso en vivo de sincronización por lotes */}
      {(syncing || syncProgress > 0) && (
        <section
          aria-label="Progreso de sincronización por lotes"
          className="bg-white border border-slate-200 rounded-lg p-4 space-y-2"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800">
              {syncStepText || 'Sincronización completada'}
            </span>
            <span className="font-mono font-bold text-[#1B4332]">{syncProgress}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#67B93E] transition-all duration-300"
              style={{ width: `${syncProgress}%` }}
            />
          </div>
        </section>
      )}

      {/* Contador de filas en vivo para las 4 tablas del esquema */}
      <section aria-label="Contador de filas en vivo de las 4 tablas" className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Table2 className="w-4 h-4 text-[#1B4332]" />
            Contador de Filas en Vivo (Esquema de 4 Tablas de SIREM)
          </h3>
          <span className="text-xs font-medium text-slate-500">
            Origen actual:{' '}
            {tableCounts.source === 'supabase_remote'
              ? 'PostgreSQL / Supabase Remoto'
              : 'Memoria / Respaldo localStorage'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1">
            <div className="text-xs font-mono font-semibold text-[#1B4332]">
              public.catalog_tracks
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {tableCounts.catalog_tracks.toLocaleString('es-CO')}
            </div>
            <p className="text-[11px] text-slate-500">
              Criterio CA1 · 522 DEAM + 762 PMEmo (7 lotes de ≤200)
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1">
            <div className="text-xs font-mono font-semibold text-[#1B4332]">
              public.musical_guides
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {tableCounts.musical_guides.toLocaleString('es-CO')}
            </div>
            <p className="text-[11px] text-slate-500">
              Criterio CA4 · 20 casos sintéticos (SIREM-SYN-01..20) + usuario
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1">
            <div className="text-xs font-mono font-semibold text-[#1B4332]">
              public.benchmark_scenarios
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {tableCounts.benchmark_scenarios.toLocaleString('es-CO')}
            </div>
            <p className="text-[11px] text-slate-500">
              Criterios CA2 y CA3 · 30 escenarios experimentales (m ∈ [4,8])
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1">
            <div className="text-xs font-mono font-semibold text-[#1B4332]">
              public.usability_trials
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {tableCounts.usability_trials.toLocaleString('es-CO')}
            </div>
            <p className="text-[11px] text-slate-500">
              Criterio CA5 · Cronometraje pareado y punto de equilibrio MGA
            </p>
          </div>
        </div>
      </section>

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

          <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-700 space-y-1">
            <p className="font-semibold text-slate-900">
              Arquitectura segura de 3 credenciales (Frontend + Backend Python):
            </p>
            <p>
              • En <code className="font-mono">frontend/.env</code> (o en este formulario) configure{' '}
              <code className="font-mono">VITE_SUPABASE_URL</code> y{' '}
              <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> (clave pública{' '}
              <code className="font-mono">anon</code>).
            </p>
            <p>
              • La clave privada <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> debe
              colocarse <strong>exclusivamente</strong> en el archivo <code className="font-mono">/.env</code>{' '}
              de la raíz para sincronización administrativa desde consola con{' '}
              <code className="font-mono">python src/supabase_sync.py</code>.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="supabase-url" className="block text-xs font-medium text-slate-700">
              VITE_SUPABASE_URL (URL del proyecto)
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
              VITE_SUPABASE_ANON_KEY (Clave pública anon)
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
              <button
                type="button"
                disabled={syncing}
                onClick={handleSyncTables}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#1B4332] bg-[#67B93E]/20 hover:bg-[#67B93E]/30 rounded-lg cursor-pointer"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                {syncing ? `Sincronizando (${syncProgress}%)...` : 'Sincronizar por Lotes'}
              </button>
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
