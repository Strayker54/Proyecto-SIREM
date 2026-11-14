-- ============================================================================
-- PROYECTO SIREM - UNIVERSIDAD INDUSTRIAL DE SANTANDER (UIS)
-- Esquema de Base de Datos en Supabase (PostgreSQL)
-- Cumplimiento Ley 1581 de 2012 (datos sintéticos/seudonimizados) y Ley 23 de 1982
-- ============================================================================

-- 1. Tabla del Catálogo Musical Auditado (Criterio CA1: 1.284 pistas válidas en [-1, 1]^2)
create table if not exists public.catalog_tracks (
  track_id text primary key,
  title text not null,
  artist text not null,
  source text not null check (source in ('DEAM', 'PMEmo')),
  v_raw numeric not null,
  a_raw numeric not null,
  v_norm numeric not null check (v_norm >= -1 and v_norm <= 1),
  a_norm numeric not null check (a_norm >= -1 and a_norm <= 1),
  quadrant text not null,
  duration_sec integer default 180,
  external_url text not null,
  license_note text not null,
  created_at timestamptz default now()
);

-- 2. Tabla de Fichas Técnicas Generadas y 20 Casos Sintéticos (Criterio CA4)
create table if not exists public.musical_guides (
  guide_code text primary key,
  catalog_version text not null default 'v1.0-1284tracks',
  is_synthetic boolean default true,
  v_ini numeric not null,
  a_ini numeric not null,
  v_obj numeric not null,
  a_obj numeric not null,
  num_stages integer not null check (num_stages between 4 and 8),
  method_used text not null,
  lambda_param numeric not null default 0.5,
  delta_max_limit numeric not null default 0.65,
  cost_jp numeric not null,
  d_max_observed numeric not null,
  e_obj_observed numeric not null,
  exec_time_ms numeric not null,
  route_tracks jsonb not null,
  substitutions_count integer default 0,
  professional_notes text,
  reviewer_role text,
  created_at timestamptz default now()
);

-- 3. Tabla de los 30 Escenarios de Comparación Algorítmica (Criterios CA2 y CA3)
create table if not exists public.benchmark_scenarios (
  scenario_id integer primary key,
  scenario_name text not null,
  v_ini numeric not null,
  a_ini numeric not null,
  v_obj numeric not null,
  a_obj numeric not null,
  m_length integer not null,
  dijkstra_jp numeric,
  dijkstra_dmax numeric,
  dijkstra_eobj numeric,
  dijkstra_time_ms numeric,
  markov_jp numeric,
  markov_dmax numeric,
  markov_eobj numeric,
  markov_time_ms numeric,
  nearest_jp numeric,
  random_jp numeric,
  feasible boolean default true
);

-- 4. Tabla de Evaluación de Usabilidad y Cronometraje Pareado (Criterio CA5)
create table if not exists public.usability_trials (
  trial_id uuid primary key default gen_random_uuid(),
  participant_code text not null,
  consent_verified boolean not null default true,
  profile_type text not null,
  manual_time_min numeric not null,
  assisted_time_min numeric not null,
  time_saved_min numeric generated always as (manual_time_min - assisted_time_min) stored,
  completed_without_help boolean not null default true,
  utility_score integer check (utility_score between 1 and 5),
  observations text,
  created_at timestamptz default now()
);

-- Políticas de seguridad a nivel de fila (RLS) para lectura y escritura en el prototipo
alter table public.catalog_tracks enable row level security;
alter table public.musical_guides enable row level security;
alter table public.benchmark_scenarios enable row level security;
alter table public.usability_trials enable row level security;

create policy "Lectura y escritura publica catalogo SIREM" on public.catalog_tracks for all using (true) with check (true);
create policy "Lectura y escritura publica fichas SIREM" on public.musical_guides for all using (true) with check (true);
create policy "Lectura y escritura publica escenarios SIREM" on public.benchmark_scenarios for all using (true) with check (true);
create policy "Lectura y escritura publica usabilidad SIREM" on public.usability_trials for all using (true) with check (true);