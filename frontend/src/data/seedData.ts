/**
 * Semilla determinista y datos maestros del proyecto académico SIREM (UIS).
 * Incluye:
 * - Catálogo real auditado de 1.284 pistas (522 DEAM + 762 PMEmo) importado de catalog_1284.json (CA1)
 * - Estadísticas del embudo de auditoría documental (2.596 brutos -> 1.284 válidos)
 * - Diccionario de datos y contrato de esquema JSON (schema_contract.json)
 * - Presets clínicos/preventivos y parámetros calibrados por defecto
 * - 20 casos sintéticos seudonimizados verificados (SIREM-SYN-01 a SIREM-SYN-20, CA4)
 * - 30 escenarios experimentales de transición entre cuadrantes (CA2 y CA3)
 * - Ensayos piloto de usabilidad pareada (EVAL-01 a EVAL-06, CA5)
 */

import rawCatalog1284 from './catalog_1284.json';
import type {
  AuditFunnelStats,
  ClinicalPreset,
  OptimizationParams,
  QuadrantId,
  SourceDataset,
  SyntheticCase,
  Track,
  UsabilityTrialRecord,
} from '../types/sirem';
import { getQuadrant, normalizeToBipolar } from '../services/mathEngine';

/** Embudo oficial de depuración del catálogo musical (Criterio CA1) */
export const AUDIT_FUNNEL_STATS: AuditFunnelStats = {
  raw_total: 2596,
  raw_deam: 1802,
  raw_pmemo: 794,
  excluded_missing_metadata: 1240,
  excluded_duplicates: 72,
  valid_total: 1284,
  valid_deam: 522,
  valid_pmemo: 762,
};

/** Diccionario de datos formal del catálogo auditado v1.0 */
export const DATA_DICTIONARY = [
  {
    field: 'track_id',
    type: 'string (PK)',
    range: 'DEAM-0002 .. PMEMO-0762',
    description: 'Identificador único auditado y sin duplicados en el catálogo v1.0.',
  },
  {
    field: 'title',
    type: 'string',
    range: 'UTF-8 (1..120)',
    description:
      'Título oficial de la obra extraído de metadata.zip (DEAM) y PMEmo sin alojar audio.',
  },
  {
    field: 'artist',
    type: 'string',
    range: 'UTF-8 (1..80)',
    description: 'Intérprete, compositor o agrupación registrada en metadatos FMA / PMEmo.',
  },
  {
    field: 'source',
    type: 'enum',
    range: "'DEAM' | 'PMEmo'",
    description: 'Dataset psicométrico publicado de origen (522 pistas DEAM + 762 pistas PMEmo = 1.284 pistas).',
  },
  {
    field: 'v_raw / a_raw',
    type: 'number',
    range: 'DEAM [1, 9] · PMEmo [0, 1]',
    description:
      'Anotación afectiva media original de Valencia y Activación en escala nativa del corpus.',
  },
  {
    field: 'v_norm / a_norm',
    type: 'number',
    range: '[-1.0000, +1.0000]',
    description:
      'Coordenadas normalizadas al Modelo Circumplejo de Russell mediante v_norm = 2*(v-a)/(b-a) - 1.',
  },
  {
    field: 'quadrant',
    type: 'enum',
    range: "'Q1' | 'Q2' | 'Q3' | 'Q4'",
    description: 'Cuadrante afectivo del Modelo de Russell derivado de los signos de (v_norm, a_norm).',
  },
  {
    field: 'external_url',
    type: 'uri (HTTPS)',
    range: 'Referencia externa',
    description:
      'Enlace a plataforma externa autorizada (Ley 23 de 1982); no aloja ni transmite fonogramas.',
  },
];

/** Contrato formal de datos JSON (schema_contract.json) */
export const SCHEMA_CONTRACT = {
  contract_version: '1.0.0',
  project: 'SIREM — Sistema Inteligente de Regulación Emocional Musical (UIS)',
  audit_date: '2026-11-05',
  legal_compliance: {
    copyright_law: 'Ley 23 de 1982 (sin almacenamiento ni reproducción de audio/letras)',
    data_protection:
      'Ley 1581 de 2012 (solo metadatos musicales públicos y casos seudonimizados)',
    medical_scope: 'Herramienta académica de apoyo técnico; no es dispositivo médico ni clínico',
  },
  catalog_summary: {
    raw_total_records: 2596,
    deam_raw: 1802,
    pmemo_raw: 794,
    excluded_incomplete_metadata: 1240,
    excluded_duplicates: 72,
    total_valid_tracks: 1284,
    sources: {
      DEAM: {
        count: 522,
        raw_scale: [1, 9],
        license_reference: 'MediaEval / Free Music Archive (Aljanaki et al., 2017)',
      },
      PMEmo: {
        count: 762,
        raw_scale: [0, 1],
        license_reference: 'PMEmo Corpus / External Platform Lookup (Zhang et al., 2018)',
      },
    },
    normalization_formula: 'v_norm = 2 * ((v - a) / (b - a)) - 1',
  },
  required_fields: [
    'track_id',
    'title',
    'artist',
    'genre',
    'source',
    'v_raw',
    'a_raw',
    'v_norm',
    'a_norm',
    'quadrant',
    'duration_sec',
    'external_platform',
    'external_url',
    'license_note',
  ],
  constraints: {
    v_norm: { type: 'number', minimum: -1.0, maximum: 1.0 },
    a_norm: { type: 'number', minimum: -1.0, maximum: 1.0 },
    track_id: { type: 'string', unique: true },
  },
};

/** Presets de transición afectiva para orientación y bienestar universitario */
export const CLINICAL_PRESETS: ClinicalPreset[] = [
  {
    id: 'tension-to-calm',
    name: 'Tensión / Estrés → Calma / Serenidad',
    category: 'Regulación Descendente',
    description:
      'Transición gradual desde cuadrante de alerta/tensión (C-II) hacia serenidad parasimpática (C-IV).',
    x_ini: { v: -0.65, a: 0.7 },
    x_obj: { v: 0.6, a: -0.55 },
    recommended_m: 6,
  },
  {
    id: 'fatigue-to-focus',
    name: 'Fatiga / Desánimo → Enfoque Activo',
    category: 'Activación Positiva',
    description:
      'Elevación progresiva desde baja valencia y baja energía (C-III) hacia activación constructiva (C-I).',
    x_ini: { v: -0.7, a: -0.6 },
    x_obj: { v: 0.55, a: 0.45 },
    recommended_m: 6,
  },
  {
    id: 'melancholy-to-calm',
    name: 'Melancolía → Calma Equilibrada',
    category: 'Estabilización de Valencia',
    description:
      'Desplazamiento horizontal en baja activación desde afecto negativo (C-III) hacia bienestar sereno (C-IV).',
    x_ini: { v: -0.65, a: -0.45 },
    x_obj: { v: 0.58, a: -0.48 },
    recommended_m: 5,
  },
  {
    id: 'hyperarousal-to-joy',
    name: 'Sobreactivación Tensa → Alegría Regulada',
    category: 'Reencuadre Afectivo',
    description:
      'Modulación desde estrés agudo (C-II) hacia valencia positiva y activación moderada (C-I).',
    x_ini: { v: -0.58, a: 0.65 },
    x_obj: { v: 0.62, a: 0.35 },
    recommended_m: 5,
  },
  {
    id: 'deep-rest',
    name: 'Activación Moderada → Reposo Profundo',
    category: 'Descompresión Académica',
    description:
      'Descenso gradual tras jornada de evaluación hacia reposo tranquilo (C-IV).',
    x_ini: { v: 0.1, a: 0.5 },
    x_obj: { v: 0.55, a: -0.68 },
    recommended_m: 5,
  },
];

/** Hiperparámetros calibrados por defecto del motor SIREM */
export const DEFAULT_PARAMS: OptimizationParams = {
  x_ini: { v: -0.65, a: 0.7 },
  x_obj: { v: 0.6, a: -0.55 },
  m: 6,
  lambda: 0.65,
  beta: 5.0,
  delta: 0.65,
  epsilon_ini: 0.35,
  epsilon_obj: 0.35,
  sourceFilter: 'ALL',
  seed: 2026,
  markovBudget: 50,
};

/** Lote oficial de 20 casos sintéticos seudonimizados verificados (SIREM-SYN-01 a SIREM-SYN-20, CA4) */
export const SYNTHETIC_CASES_20: SyntheticCase[] = [
  {
    case_id: 'SIREM-SYN-01',
    title: 'Estrés pre-parcial a calma base',
    context: 'Orientación universitaria · C-II → C-IV',
    x_ini: { v: -0.65, a: 0.7 },
    x_obj: { v: 0.6, a: -0.55 },
    m: 6,
    sourceFilter: 'ALL',
    lambda: 0.65,
    delta: 0.65,
    epsilon_ini: 0.35,
    epsilon_obj: 0.35,
  },
  {
    case_id: 'SIREM-SYN-02',
    title: 'Desánimo matinal a enfoque activo',
    context: 'Bienestar estudiantil · C-III → C-I',
    x_ini: { v: -0.7, a: -0.6 },
    x_obj: { v: 0.55, a: 0.45 },
    m: 6,
    sourceFilter: 'ALL',
    lambda: 0.65,
    delta: 0.65,
    epsilon_ini: 0.35,
    epsilon_obj: 0.35,
  },
  {
    case_id: 'SIREM-SYN-03',
    title: 'Agitación vespertina a reposo breve',
    context: 'Pausa activa · C-II → C-IV (4 etapas)',
    x_ini: { v: -0.5, a: 0.55 },
    x_obj: { v: 0.45, a: -0.45 },
    m: 4,
    sourceFilter: 'ALL',
    lambda: 0.7,
    delta: 0.65,
    epsilon_ini: 0.35,
    epsilon_obj: 0.35,
  },
  {
    case_id: 'SIREM-SYN-04',
    title: 'Melancolía persistente a serenidad',
    context: 'Acompañamiento psicosocial · C-III → C-IV',
    x_ini: { v: -0.68, a: -0.45 },
    x_obj: { v: 0.56, a: -0.5 },
    m: 5,
    sourceFilter: 'ALL',
    lambda: 0.6,
    delta: 0.65,
    epsilon_ini: 0.35,
    epsilon_obj: 0.35,
  },
  {
    case_id: 'SIREM-SYN-05',
    title: 'Tensión aguda a alegría moderada',
    context: 'Regulación emocional · C-II → C-I',
    x_ini: { v: -0.6, a: 0.64 },
    x_obj: { v: 0.62, a: 0.35 },
    m: 5,
    sourceFilter: 'ALL',
    lambda: 0.65,
    delta: 0.65,
    epsilon_ini: 0.35,
    epsilon_obj: 0.35,
  },
  {
    case_id: 'SIREM-SYN-06',
    title: 'Descompresión extendida de laboratorio',
    context: 'Transición larga · C-II → C-IV (8 etapas)',
    x_ini: { v: -0.75, a: 0.75 },
    x_obj: { v: 0.68, a: -0.65 },
    m: 8,
    sourceFilter: 'ALL',
    lambda: 0.75,
    delta: 0.6,
    epsilon_ini: 0.35,
    epsilon_obj: 0.35,
  },
  {
    case_id: 'SIREM-SYN-07',
    title: 'Apatía académica a motivación media',
    context: 'Tutoría par · C-III → C-I (7 etapas)',
    x_ini: { v: -0.72, a: -0.68 },
    x_obj: { v: 0.6, a: 0.52 },
    m: 7,
    sourceFilter: 'ALL',
    lambda: 0.65,
    delta: 0.65,
    epsilon_ini: 0.35,
    epsilon_obj: 0.35,
  },
  {
    case_id: 'SIREM-SYN-08',
    title: 'Solo DEAM · Tensión a Serenidad',
    context: 'Subcatálogo DEAM (522 pistas) · C-II → C-IV',
    x_ini: { v: -0.58, a: 0.58 },
    x_obj: { v: 0.52, a: -0.5 },
    m: 6,
    sourceFilter: 'DEAM',
    lambda: 0.65,
    delta: 0.68,
    epsilon_ini: 0.35,
    epsilon_obj: 0.35,
  },
  {
    case_id: 'SIREM-SYN-09',
    title: 'Solo PMEmo · Fatiga a Activación',
    context: 'Subcatálogo PMEmo (762 pistas) · C-III → C-I',
    x_ini: { v: -0.62, a: -0.55 },
    x_obj: { v: 0.55, a: 0.45 },
    m: 6,
    sourceFilter: 'PMEmo',
    lambda: 0.65,
    delta: 0.65,
    epsilon_ini: 0.35,
    epsilon_obj: 0.35,
  },
  {
    case_id: 'SIREM-SYN-10',
    title: 'Neutro tenso a calma sostenida',
    context: 'Taller grupal · C-II/Centro → C-IV',
    x_ini: { v: -0.25, a: 0.55 },
    x_obj: { v: 0.58, a: -0.58 },
    m: 5,
    sourceFilter: 'ALL',
    lambda: 0.7,
    delta: 0.65,
    epsilon_ini: 0.35,
    epsilon_obj: 0.35,
  },
  {
    case_id: 'SIREM-SYN-11',
    title: 'Euforia dispersa a concentración serena',
    context: 'Regulación atencional · C-I → C-IV',
    x_ini: { v: 0.6, a: 0.72 },
    x_obj: { v: 0.55, a: -0.45 },
    m: 5,
    sourceFilter: 'ALL',
    lambda: 0.65,
    delta: 0.65,
    epsilon_ini: 0.35,
    epsilon_obj: 0.35,
  },
  {
    case_id: 'SIREM-SYN-12',
    title: 'Baja valencia extrema a tono neutro-positivo',
    context: 'Apoyo inicial · C-III → C-IV (6 etapas)',
    x_ini: { v: -0.78, a: -0.3 },
    x_obj: { v: 0.42, a: -0.25 },
    m: 6,
    sourceFilter: 'ALL',
    lambda: 0.75,
    delta: 0.6,
    epsilon_ini: 0.35,
    epsilon_obj: 0.35,
  },
  {
    case_id: 'SIREM-SYN-13',
    title: 'Alerta moderada a bienestar estable',
    context: 'Sesión breve · C-II → C-IV (4 etapas)',
    x_ini: { v: -0.45, a: 0.48 },
    x_obj: { v: 0.48, a: -0.4 },
    m: 4,
    sourceFilter: 'ALL',
    lambda: 0.65,
    delta: 0.65,
    epsilon_ini: 0.35,
    epsilon_obj: 0.35,
  },
  {
    case_id: 'SIREM-SYN-14',
    title: 'Sostenimiento en calma profunda',
    context: 'Consolidación · C-IV → C-IV (4 etapas)',
    x_ini: { v: 0.25, a: -0.25 },
    x_obj: { v: 0.68, a: -0.68 },
    m: 4,
    sourceFilter: 'ALL',
    lambda: 0.8,
    delta: 0.55,
    epsilon_ini: 0.35,
    epsilon_obj: 0.35,
  },
  {
    case_id: 'SIREM-SYN-15',
    title: 'Reactivación gradual tras agotamiento',
    context: 'Bienestar laboral UIS · C-III → C-I (8 etapas)',
    x_ini: { v: -0.66, a: -0.66 },
    x_obj: { v: 0.62, a: 0.6 },
    m: 8,
    sourceFilter: 'ALL',
    lambda: 0.7,
    delta: 0.6,
    epsilon_ini: 0.35,
    epsilon_obj: 0.35,
  },
  {
    case_id: 'SIREM-SYN-16',
    title: 'Solo DEAM · Melancolía a Calma',
    context: 'Subcatálogo DEAM · C-III → C-IV (5 etapas)',
    x_ini: { v: -0.6, a: -0.45 },
    x_obj: { v: 0.52, a: -0.48 },
    m: 5,
    sourceFilter: 'DEAM',
    lambda: 0.65,
    delta: 0.65,
    epsilon_ini: 0.35,
    epsilon_obj: 0.35,
  },
  {
    case_id: 'SIREM-SYN-17',
    title: 'Solo PMEmo · Tensión a Calma',
    context: 'Subcatálogo PMEmo · C-II → C-IV (7 etapas)',
    x_ini: { v: -0.65, a: 0.65 },
    x_obj: { v: 0.58, a: -0.58 },
    m: 7,
    sourceFilter: 'PMEmo',
    lambda: 0.65,
    delta: 0.65,
    epsilon_ini: 0.35,
    epsilon_obj: 0.35,
  },
  {
    case_id: 'SIREM-SYN-18',
    title: 'Sobrecarga cognitiva a equilibrio neutral',
    context: 'Cierre de jornada · C-II → C-IV (6 etapas)',
    x_ini: { v: -0.52, a: 0.68 },
    x_obj: { v: 0.35, a: -0.35 },
    m: 6,
    sourceFilter: 'ALL',
    lambda: 0.65,
    delta: 0.65,
    epsilon_ini: 0.35,
    epsilon_obj: 0.35,
  },
  {
    case_id: 'SIREM-SYN-19',
    title: 'Baja energía a optimismo sereno',
    context: 'Orientación vocacional · C-III → C-I (5 etapas)',
    x_ini: { v: -0.48, a: -0.52 },
    x_obj: { v: 0.52, a: 0.25 },
    m: 5,
    sourceFilter: 'ALL',
    lambda: 0.65,
    delta: 0.65,
    epsilon_ini: 0.35,
    epsilon_obj: 0.35,
  },
  {
    case_id: 'SIREM-SYN-20',
    title: 'Alta activación neutra a serenidad profunda',
    context: 'Protocolo final · C-I/II → C-IV (7 etapas)',
    x_ini: { v: -0.1, a: 0.72 },
    x_obj: { v: 0.62, a: -0.62 },
    m: 7,
    sourceFilter: 'ALL',
    lambda: 0.7,
    delta: 0.65,
    epsilon_ini: 0.35,
    epsilon_obj: 0.35,
  },
];

/** Batería de 30 escenarios experimentales parametrizados (Criterios CA2 y CA3) */
export const EXPERIMENTAL_SCENARIOS_30: Array<{
  id: string;
  label: string;
  transition: string;
  x_ini: { v: number; a: number };
  x_obj: { v: number; a: number };
  m: number;
}> = Array.from({ length: 30 }, (_, idx) => {
  const mValues = [4, 5, 6, 7, 8];
  const m = mValues[idx % mValues.length];
  const templates = [
    {
      transition: 'C-II → C-IV',
      x_ini: { v: -0.65, a: 0.68 },
      x_obj: { v: 0.6, a: -0.55 },
      name: 'Tensión a Calma',
    },
    {
      transition: 'C-III → C-I',
      x_ini: { v: -0.68, a: -0.6 },
      x_obj: { v: 0.58, a: 0.48 },
      name: 'Melancolía a Alegría',
    },
    {
      transition: 'C-III → C-IV',
      x_ini: { v: -0.65, a: -0.45 },
      x_obj: { v: 0.58, a: -0.48 },
      name: 'Melancolía a Serenidad',
    },
    {
      transition: 'C-II → C-I',
      x_ini: { v: -0.6, a: 0.62 },
      x_obj: { v: 0.6, a: 0.38 },
      name: 'Tensión a Enfoque',
    },
    {
      transition: 'C-I → C-IV',
      x_ini: { v: 0.58, a: 0.68 },
      x_obj: { v: 0.58, a: -0.58 },
      name: 'Euforia a Serenidad',
    },
    {
      transition: 'Centro → C-IV',
      x_ini: { v: -0.15, a: 0.45 },
      x_obj: { v: 0.64, a: -0.62 },
      name: 'Alerta leve a Reposo',
    },
  ];
  const tpl = templates[Math.floor(idx / 5) % templates.length];
  const jitter = ((idx % 5) - 2) * 0.03;
  return {
    id: `ESC-${String(idx + 1).padStart(2, '0')}`,
    label: `${tpl.name} (m=${m})`,
    transition: tpl.transition,
    x_ini: {
      v: Number(Math.max(-0.85, Math.min(0.85, tpl.x_ini.v + jitter)).toFixed(2)),
      a: Number(Math.max(-0.85, Math.min(0.85, tpl.x_ini.a - jitter)).toFixed(2)),
    },
    x_obj: {
      v: Number(Math.max(-0.85, Math.min(0.85, tpl.x_obj.v - jitter)).toFixed(2)),
      a: Number(Math.max(-0.85, Math.min(0.85, tpl.x_obj.a + jitter)).toFixed(2)),
    },
    m,
  };
});

/** Semilla oficial de pruebas de usabilidad pareada (Criterio CA5 y umbral MGA · n=10 participantes) */
export const SEED_USABILITY_TRIALS: UsabilityTrialRecord[] = [
  {
    id: 'seed-01',
    participant_code: 'EVAL-01',
    profile_type: 'Psicólogo',
    consent_signed: true,
    consent_timestamp: '2026-10-18T09:15:00Z',
    manual_minutes: 35.4,
    sirem_minutes: 4.8,
    saved_minutes: 30.6,
    completed_without_help: true,
    utility_likert: 5,
    clarity_likert: 5,
    notes: 'Prueba piloto Bienestar Universitario UIS; ficha técnica exportada sin datos sensibles.',
  },
  {
    id: 'seed-02',
    participant_code: 'EVAL-02',
    profile_type: 'Orientador',
    consent_signed: true,
    consent_timestamp: '2026-10-18T10:02:00Z',
    manual_minutes: 34.2,
    sirem_minutes: 4.5,
    saved_minutes: 29.7,
    completed_without_help: true,
    utility_likert: 5,
    clarity_likert: 4,
    notes: 'Sustitución de pista intuitiva en el mismo cuadrante del plano de Russell.',
  },
  {
    id: 'seed-03',
    participant_code: 'EVAL-03',
    profile_type: 'Practicante supervisado',
    consent_signed: true,
    consent_timestamp: '2026-10-19T14:20:00Z',
    manual_minutes: 35.8,
    sirem_minutes: 4.9,
    saved_minutes: 30.9,
    completed_without_help: true,
    utility_likert: 4,
    clarity_likert: 5,
    notes: 'Flujo de 4 pasos completado de forma autónoma por debajo de 5 minutos.',
  },
  {
    id: 'seed-04',
    participant_code: 'EVAL-04',
    profile_type: 'Psicólogo',
    consent_signed: true,
    consent_timestamp: '2026-10-20T09:05:00Z',
    manual_minutes: 34.9,
    sirem_minutes: 4.4,
    saved_minutes: 30.5,
    completed_without_help: true,
    utility_likert: 5,
    clarity_likert: 5,
    notes: 'Alta adherencia a la trayectoria ISO; ahorro muy superior al umbral MGA de 19,20 min.',
  },
  {
    id: 'seed-05',
    participant_code: 'EVAL-05',
    profile_type: 'Orientador',
    consent_signed: true,
    consent_timestamp: '2026-10-20T11:30:00Z',
    manual_minutes: 34.9,
    sirem_minutes: 4.6,
    saved_minutes: 30.3,
    completed_without_help: true,
    utility_likert: 5,
    clarity_likert: 5,
    notes: 'Verificación de enlaces externos y advertencia no clínica clara en la ficha.',
  },
  {
    id: 'seed-06',
    participant_code: 'EVAL-06',
    profile_type: 'Practicante supervisado',
    consent_signed: true,
    consent_timestamp: '2026-10-21T15:10:00Z',
    manual_minutes: 36.0,
    sirem_minutes: 4.6,
    saved_minutes: 31.4,
    completed_without_help: true,
    utility_likert: 4,
    clarity_likert: 5,
    notes: 'Tiempo asistido menor a 5,0 min y 100% de tareas completadas sin asistencia externa.',
  },
  {
    id: 'seed-07',
    participant_code: 'EVAL-07',
    profile_type: 'Psicólogo',
    consent_signed: true,
    consent_timestamp: '2026-10-28T09:40:00Z',
    manual_minutes: 35.1,
    sirem_minutes: 4.6,
    saved_minutes: 30.5,
    completed_without_help: true,
    utility_likert: 5,
    clarity_likert: 5,
    notes: 'Validación del paquete 1.6 con exportación JSON/HTML y trazabilidad completa del catálogo v1.0.',
  },
  {
    id: 'seed-08',
    participant_code: 'EVAL-08',
    profile_type: 'Orientador',
    consent_signed: true,
    consent_timestamp: '2026-10-29T10:15:00Z',
    manual_minutes: 35.3,
    sirem_minutes: 4.7,
    saved_minutes: 30.6,
    completed_without_help: true,
    utility_likert: 5,
    clarity_likert: 4,
    notes: 'Revisión ágil de la transición entre cuadrantes y confirmación de unicidad de pistas.',
  },
  {
    id: 'seed-09',
    participant_code: 'EVAL-09',
    profile_type: 'Practicante supervisado',
    consent_signed: true,
    consent_timestamp: '2026-11-02T14:30:00Z',
    manual_minutes: 34.8,
    sirem_minutes: 4.8,
    saved_minutes: 30.0,
    completed_without_help: true,
    utility_likert: 4,
    clarity_likert: 5,
    notes: 'Bloqueo previo de consentimiento informado claro y flujo guiado comprensible sin ayuda.',
  },
  {
    id: 'seed-10',
    participant_code: 'EVAL-10',
    profile_type: 'Psicólogo',
    consent_signed: true,
    consent_timestamp: '2026-11-03T11:05:00Z',
    manual_minutes: 35.5,
    sirem_minutes: 4.5,
    saved_minutes: 31.0,
    completed_without_help: true,
    utility_likert: 5,
    clarity_likert: 5,
    notes: 'Cierre de muestra objetivo (n=10); ahorro mediano y promedio de 30,55 min/guía acreditado.',
  },
];

let cachedCatalog: Track[] | null = null;

/**
 * Carga y retorna el catálogo real auditado de 1.284 pistas (522 DEAM + 762 PMEmo)
 * procesado desde DEAM_Annotations.zip, metadata.zip y PMEmo en catalog_1284.json.
 */
export function buildAuditedCatalog(): Track[] {
  if (cachedCatalog) return cachedCatalog;

  cachedCatalog = (rawCatalog1284 as Array<Record<string, unknown>>).map((row) => {
    const qRaw = String(row.quadrant || 'Q1');
    const qCode = (qRaw.slice(0, 2) as QuadrantId) || getQuadrant(Number(row.v_norm), Number(row.a_norm));
    return {
      track_id: String(row.track_id),
      title: String(row.title),
      artist: String(row.artist),
      genre: String(row.genre || 'Instrumental'),
      source: (row.source === 'PMEmo' ? 'PMEmo' : 'DEAM') as SourceDataset,
      v_raw: Number(row.v_raw),
      a_raw: Number(row.a_raw),
      v_norm: Number(row.v_norm),
      a_norm: Number(row.a_norm),
      quadrant: qCode,
      quadrant_label: String(row.quadrant_label || row.quadrant),
      duration_sec: Number(row.duration_sec || 180),
      external_platform: (row.external_platform || 'YouTube Music') as Track['external_platform'],
      external_url: String(row.external_url),
      license_note: String(row.license_note),
    };
  });

  return cachedCatalog;
}

/** Convierte un arreglo de pistas del catálogo al formato CSV estándar */
export function catalogToCsv(tracks: Track[]): string {
  const header = [
    'track_id',
    'title',
    'artist',
    'genre',
    'source',
    'v_raw',
    'a_raw',
    'v_norm',
    'a_norm',
    'quadrant',
    'duration_sec',
    'external_platform',
    'external_url',
    'license_note',
  ].join(',');

  const escapeCsv = (val: string | number) => {
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = tracks.map((t) =>
    [
      t.track_id,
      t.title,
      t.artist,
      t.genre,
      t.source,
      t.v_raw,
      t.a_raw,
      t.v_norm,
      t.a_norm,
      t.quadrant_label || t.quadrant,
      t.duration_sec,
      t.external_platform,
      t.external_url,
      t.license_note,
    ]
      .map(escapeCsv)
      .join(','),
  );

  return [header, ...rows].join('\n');
}

/** Parsea y valida un archivo CSV importado por el usuario hacia la estructura Track[] */
export function parseCatalogCsv(csvText: string): Track[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  };

  const headers = parseLine(lines[0]).map((h) => h.trim());
  const idx = (name: string) => headers.indexOf(name);
  const parsed: Track[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const id = cols[idx('track_id')]?.trim();
    if (!id || seen.has(id)) continue;
    const sourceRaw = cols[idx('source')]?.trim();
    const source: SourceDataset = sourceRaw === 'PMEmo' ? 'PMEmo' : 'DEAM';
    const vRaw = Number(cols[idx('v_raw')]);
    const aRaw = Number(cols[idx('a_raw')]);
    if (!Number.isFinite(vRaw) || !Number.isFinite(aRaw)) continue;

    const vNorm = Number.isFinite(Number(cols[idx('v_norm')]))
      ? Math.max(-1, Math.min(1, Number(cols[idx('v_norm')])))
      : source === 'DEAM'
        ? normalizeToBipolar(vRaw, 1, 9)
        : normalizeToBipolar(vRaw, 0, 1);
    const aNorm = Number.isFinite(Number(cols[idx('a_norm')]))
      ? Math.max(-1, Math.min(1, Number(cols[idx('a_norm')])))
      : source === 'DEAM'
        ? normalizeToBipolar(aRaw, 1, 9)
        : normalizeToBipolar(aRaw, 0, 1);

    seen.add(id);
    parsed.push({
      track_id: id,
      title: cols[idx('title')]?.trim() || id,
      artist: cols[idx('artist')]?.trim() || 'Desconocido',
      genre: cols[idx('genre')]?.trim() || 'Instrumental',
      source,
      v_raw: vRaw,
      a_raw: aRaw,
      v_norm: vNorm,
      a_norm: aNorm,
      quadrant: getQuadrant(vNorm, aNorm),
      quadrant_label: cols[idx('quadrant')]?.trim() || getQuadrant(vNorm, aNorm),
      duration_sec: Number(cols[idx('duration_sec')]) || 180,
      external_platform:
        (cols[idx('external_platform')]?.trim() as Track['external_platform']) || 'YouTube Music',
      external_url:
        cols[idx('external_url')]?.trim() ||
        `https://music.youtube.com/search?q=${encodeURIComponent(id)}`,
      license_note:
        cols[idx('license_note')]?.trim() ||
        'Referencia externa verificada conforme a la Ley 23 de 1982',
    });
  }
  return parsed;
}
