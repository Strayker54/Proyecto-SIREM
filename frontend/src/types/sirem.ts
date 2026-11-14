/**
 * Definiciones de tipos e interfaces del dominio para el proyecto académico SIREM
 * (Sistema Inteligente de Regulación Emocional Musical - Universidad Industrial de Santander).
 */

/** Origen del corpus psicométrico publicado */
export type SourceDataset = 'DEAM' | 'PMEmo';

/** Filtro de selección de fuente en el catálogo */
export type SourceFilter = 'ALL' | 'DEAM' | 'PMEmo';

/** Identificador de cuadrante en el Modelo Circumplejo de Russell (1980) */
export type QuadrantId = 'Q1' | 'Q2' | 'Q3' | 'Q4';

/** Identificador del método algorítmico de secuenciación */
export type AlgorithmId = 'dijkstra' | 'markov' | 'greedy' | 'random';

/** Identificador de los 6 módulos principales de la aplicación */
export type ModuleId =
  | 'generator'
  | 'ficha'
  | 'catalog'
  | 'benchmarks'
  | 'usability'
  | 'supabase';

/** Coordenada bidimensional en el plano Valencia-Activación [-1, 1]^2 */
export interface Point2D {
  v: number; // Valencia en [-1, 1]
  a: number; // Activación (Arousal) en [-1, 1]
}

/** Metadatos visuales y semánticos de un cuadrante de Russell */
export interface QuadrantMeta {
  id: QuadrantId;
  shortLabel: string;
  label: string;
  description: string;
  bgTint: string;
  badgeBg: string;
  badgeText: string;
  borderHex: string;
  dotHex: string;
}

/** Registro de pista musical auditada conforme a schema_contract.json (CA1) */
export interface Track {
  track_id: string;
  title: string;
  artist: string;
  genre: string;
  source: SourceDataset;
  v_raw: number;
  a_raw: number;
  v_norm: number;
  a_norm: number;
  quadrant: QuadrantId;
  quadrant_label?: string;
  duration_sec: number;
  external_platform:
    | 'Free Music Archive'
    | 'MediaEval DEAM'
    | 'PMEmo Reference'
    | 'YouTube Music'
    | 'Spotify';
  external_url: string;
  license_note: string;
}

/** Parámetros de optimización y restricciones geométricas de la trayectoria ISO */
export interface OptimizationParams {
  x_ini: Point2D; // Coordenada afectiva inicial (V0, A0)
  x_obj: Point2D; // Coordenada afectiva objetivo (Vf, Af)
  m: number; // Número de etapas musicales (4 a 8)
  lambda: number; // Peso de adherencia a la trayectoria lineal de referencia z_j
  beta: number; // Temperatura inversa de Boltzmann para la cadena de Markov
  delta: number; // Umbral máximo de salto entre pistas consecutivas
  epsilon_ini: number; // Tolerancia máxima de desviación inicial
  epsilon_obj: number; // Tolerancia máxima de error al estado objetivo
  sourceFilter: SourceFilter; // Subconjunto del catálogo a emplear
  seed: number; // Semilla pseudoaleatoria determinista
  markovBudget: number; // Número de corridas de muestreo estocástico Markov
}

/** Detalle geométrico de una etapa individual dentro de una secuencia musical */
export interface StageDetail {
  stage: number; // Índice de etapa (1..m)
  track: Track;
  z_ref: Point2D; // Punto ideal interpolado z_j
  step_distance: number | null; // Distancia de transición ||x_j - x_{j-1}||_2 (null en etapa 1)
  ref_distance: number; // Desviación respecto a la referencia ||x_j - z_j||_2
}

/** Métricas globales de calidad geométrica y factibilidad de una secuencia */
export interface SequenceMetrics {
  cost_J: number; // Valor de la función objetivo J(P)
  d_max: number; // Salto máximo observado entre etapas consecutivas
  e_ini: number; // Error inicial ||x_1 - x_ini||_2
  e_obj: number; // Error final al objetivo ||x_m - x_obj||_2
  unique_tracks: boolean; // Garantía de no repetición de pistas
  feasible: boolean; // Cumplimiento simultáneo de todas las restricciones
  violations: string[]; // Lista descriptiva de restricciones activas violadas
}

/** Resultado completo devuelto por un algoritmo de secuenciación */
export interface AlgorithmResult {
  algorithm: AlgorithmId;
  label: string;
  stages: StageDetail[];
  metrics: SequenceMetrics;
  execution_ms: number;
  attempts_used?: number;
}

/** Pista candidata sugerida para sustitución controlada en el mismo cuadrante (R3) */
export interface SubstituteCandidate {
  track: Track;
  distanceToCurrent: number;
  distanceToRef: number;
}

/** Preset de transición afectiva de orientación preventiva */
export interface ClinicalPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  x_ini: Point2D;
  x_obj: Point2D;
  recommended_m: number;
}

/** Caso sintético seudonimizado del lote de verificación CA4 (20 casos) */
export interface SyntheticCase {
  case_id: string;
  title: string;
  context: string;
  x_ini: Point2D;
  x_obj: Point2D;
  m: number;
  sourceFilter: SourceFilter;
  lambda: number;
  delta: number;
  epsilon_ini: number;
  epsilon_obj: number;
}

/** Fila de evaluación comparativa en la batería de 30 escenarios experimentales (CA2 y CA3) */
export interface ScenarioEvalRow {
  scenario_id: string;
  label: string;
  transition: string;
  m: number;
  v_ini: number;
  a_ini: number;
  v_obj: number;
  a_obj: number;
  dijkstra_feasible: boolean;
  dijkstra_J: number | null;
  dijkstra_dmax: number | null;
  dijkstra_eobj: number | null;
  dijkstra_ms: number;
  markov_feasible: boolean;
  markov_J: number | null;
  markov_dmax: number | null;
  markov_eobj: number | null;
  markov_ms: number;
  greedy_feasible: boolean;
  greedy_J: number | null;
  greedy_ms: number;
  random_feasible: boolean;
  random_J: number | null;
  random_ms: number;
}

/** Resumen estadístico agregado de la batería experimental de 30 escenarios y 100 corridas P95 */
export interface ExperimentalAggregate {
  rows: ScenarioEvalRow[];
  summary: Array<{
    algorithm: string;
    feasibilityPct: number;
    meanJ: number | null;
    meanDmax: number | null;
    meanEobj: number | null;
    p95Ms: number;
  }>;
  benchmark100: {
    runs: number;
    p50Ms: number;
    p95Ms: number;
    maxMs: number;
    meetsCA3: boolean;
  };
}

/** Registro de prueba de usabilidad y cronometraje pareado (Criterio CA5 y MGA) */
export interface UsabilityTrialRecord {
  id: string;
  participant_code: string; // Código seudonimizado (ej. EVAL-01)
  profile_type: 'Psicólogo' | 'Orientador' | 'Practicante supervisado';
  consent_signed: boolean;
  consent_timestamp: string;
  manual_minutes: number;
  sirem_minutes: number;
  saved_minutes: number;
  completed_without_help: boolean;
  utility_likert: number; // Escala 1 a 5
  clarity_likert: number; // Escala 1 a 5
  notes: string;
}

/** Configuración de conexión y estado de sincronización con Supabase */
export interface SupabaseConfig {
  url: string;
  anonKey: string;
  tablePrefix: string;
  connected: boolean;
  lastSyncAt: string | null;
}

/** Estadísticas del embudo de auditoría documental del catálogo (2.596 -> 1.284) */
export interface AuditFunnelStats {
  raw_total: number;
  raw_deam: number;
  raw_pmemo: number;
  excluded_missing_metadata: number;
  excluded_duplicates: number;
  valid_total: number;
  valid_deam: number;
  valid_pmemo: number;
}