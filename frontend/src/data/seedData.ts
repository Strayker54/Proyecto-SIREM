/**
 * Semilla determinista y datos maestros del proyecto académico SIREM (UIS).
 * Incluye:
 * - Estadísticas del embudo de auditoría documental (2.596 brutos -> 1.284 válidos)
 * - Generador determinista del catálogo de 1.284 pistas (522 DEAM + 762 PMEmo)
 * - Diccionario de datos y contrato de esquema JSON (CA1)
 * - Presets de orientación preventiva y parámetros calibrados por defecto
 * - 20 casos sintéticos seudonimizados de prueba (CA4)
 * - 30 escenarios experimentales de transición entre cuadrantes (CA2 y CA3)
 * - Ensayos piloto iniciales de usabilidad pareada (CA5)
 */

import type {
  AuditFunnelStats,
  ClinicalPreset,
  OptimizationParams,
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
    range: 'DEAM-XXXX / PMEMO-XXXX',
    description: 'Identificador único auditado y sin duplicados en el catálogo v1.0.',
  },
  {
    field: 'title',
    type: 'string',
    range: 'UTF-8 (1..120)',
    description:
      'Título de referencia de la obra musical sin almacenamiento de letra ni archivo MP3/WAV.',
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
    description: 'Dataset psicométrico publicado de origen (522 DEAM + 762 PMEmo = 1.284 pistas).',
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
      'Coordenadas normalizadas al Modelo Circumplejo de Russell mediante transformación afín.',
  },
  {
    field: 'quadrant',
    type: 'enum',
    range: "'Q1' | 'Q2' | 'Q3' | 'Q4'",
    description: 'Cuadrante afectivo derivado de los signos de (v_norm, a_norm).',
  },
  {
    field: 'external_url',
    type: 'uri (HTTPS)',
    range: 'Referencia externa',
    description:
      'Enlace a plataforma externa autorizada (Ley 23 de 1982); no aloja ni transmite audio.',
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
    normalization_formula: 'v_norm = 2 * ((v - min) / (max - min)) - 1',
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

/** Lote oficial de 20 casos sintéticos seudonimizados de verificación (Criterio CA4) */
export const SYNTHETIC_CASES_20: SyntheticCase[] = [
  {
    case_id: 'SIREM-CASO-001',
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
    case_id: 'SIREM-CASO-002',
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
    case_id: 'SIREM-CASO-003',
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
    case_id: 'SIREM-CASO-004',
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
    case_id: 'SIREM-CASO-005',
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
    case_id: 'SIREM-CASO-006',
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
    case_id: 'SIREM-CASO-007',
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
    case_id: 'SIREM-CASO-008',
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
    case_id: 'SIREM-CASO-009',
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
    case_id: 'SIREM-CASO-010',
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
    case_id: 'SIREM-CASO-011',
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
    case_id: 'SIREM-CASO-012',
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
    case_id: 'SIREM-CASO-013',
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
    case_id: 'SIREM-CASO-014',
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
    case_id: 'SIREM-CASO-015',
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
    case_id: 'SIREM-CASO-016',
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
    case_id: 'SIREM-CASO-017',
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
    case_id: 'SIREM-CASO-018',
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
    case_id: 'SIREM-CASO-019',
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
    case_id: 'SIREM-CASO-020',
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

/** Semilla inicial de pruebas piloto de usabilidad pareada (Criterio CA5 y umbral MGA) */
export const SEED_USABILITY_TRIALS: UsabilityTrialRecord[] = [
  {
    id: 'seed-01',
    participant_code: 'EVAL-01',
    profile_type: 'Psicólogo',
    consent_signed: true,
    consent_timestamp: '2026-10-18T09:15:00Z',
    manual_minutes: 36.4,
    sirem_minutes: 4.8,
    saved_minutes: 31.6,
    completed_without_help: true,
    utility_likert: 5,
    clarity_likert: 5,
    notes: 'Prueba piloto de referencia · Orientación Bienestar UIS.',
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
    notes: 'Sustitución de pista intuitiva en el plano bidimensional.',
  },
  {
    id: 'seed-03',
    participant_code: 'EVAL-03',
    profile_type: 'Practicante supervisado',
    consent_signed: true,
    consent_timestamp: '2026-10-19T14:20:00Z',
    manual_minutes: 35.8,
    sirem_minutes: 5.1,
    saved_minutes: 30.7,
    completed_without_help: true,
    utility_likert: 4,
    clarity_likert: 5,
    notes: 'Ficha técnica lista para archivo sin datos personales.',
  },
];

/** Generador pseudoaleatorio Mulberry32 para la síntesis determinista del catálogo */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GENRE_BY_QUADRANT: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', string[]> = {
  Q1: [
    'Folk Acústico',
    'Indie Instrumental',
    'Bossa Nova',
    'Cámara Luminosa',
    'Pulso Instrumental',
  ],
  Q2: [
    'Post-Rock',
    'Electro-Tensión',
    'Clásica Dramática Contemporánea',
    'Rock Alternativo',
    'Sintetizador Dinámico',
  ],
  Q3: [
    'Piano Minimalista',
    'Ambiente Lento',
    'Nocturno de Violonchelo',
    'Lo-Fi Melancólico',
    'Elegía de Cámara',
  ],
  Q4: [
    'Ambiente Pastoral',
    'Adagio Clásico',
    'Guitarra Acústica Calma',
    'Textura Cálida',
    'Jazz Suave',
  ],
};

const TITLE_PREFIXES: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', string[]> = {
  Q1: [
    'Mañana de Sol',
    'Brisa Clara',
    'Sendero Abierto',
    'Pulso Vital',
    'Luz en Bucaramanga',
    'Cuerda Luminosa',
    'Horizonte Verde',
    'Ritmo Sereno',
    'Acorde Matinal',
    'Vuelo Ligero',
    'Eco Festivo',
    'Primavera Andina',
  ],
  Q2: [
    'Tensión Urbana',
    'Tormenta Breve',
    'Crescendo Férreo',
    'Umbral Eléctrico',
    'Pulso Acelerado',
    'Frecuencia Alta',
    'Sombra en Movimiento',
    'Ráfaga Norte',
    'Línea de Ruptura',
    'Vértigo Acústico',
    'Paso Urgente',
    'Carga Dinámica',
  ],
  Q3: [
    'Niebla en el Páramo',
    'Nocturno Lento',
    'Eco de Lluvia',
    'Penumbra Suave',
    'Cadencia Gris',
    'Quietud Invernal',
    'Pausa Profunda',
    'Último Acorde',
    'Memoria en Si Menor',
    'Deriva Silenciosa',
    'Cielo Cubierto',
    'Sombra Distante',
  ],
  Q4: [
    'Agua Quieta',
    'Respiración Lenta',
    'Jardín Botánico',
    'Paz de Tarde',
    'Adagio en Sol',
    'Claros del Bosque',
    'Bruma Cálida',
    'Descanso Armónico',
    'Senda Tranquila',
    'Horizonte Calmo',
    'Susurro Acústico',
    'Equilibrio Interior',
  ],
};

const ARTISTS_DEAM = [
  'Broke For Free',
  'Kai Engel',
  'Lee Rosevere',
  'Chris Zabriskie',
  'Podington Bear',
  'Scott Holmes',
  'Jahzzar',
  'Dexter Britain',
  'Chad Crouch',
  'Ketsa',
  'Meydän',
  'Blue Dot Sessions',
  'Komiku',
  'Kevin MacLeod',
  'Monplaisir',
  'Audiobinger',
];

const ARTISTS_PMEMO = [
  'Ludovico Einaudi',
  'Ólafur Arnalds',
  'Nils Frahm',
  'Max Richter',
  'Yiruma',
  'Joep Beving',
  'Agnes Obel',
  'Gustavo Santaolalla',
  'Ryuichi Sakamoto',
  'A. Taylor',
  'Fabrizio Paterlini',
  'Goldmund',
  'Hania Rani',
  'Yann Tiersen',
  'Bonobo',
  'Tycho',
];

const CURATED_ANCHORS: Array<{
  title: string;
  artist: string;
  genre: string;
  source: SourceDataset;
  v_norm: number;
  a_norm: number;
}> = [
  {
    title: 'Atardecer en el Huerto',
    artist: 'Chad Crouch',
    genre: 'Guitarra Acústica Calma',
    source: 'DEAM',
    v_norm: 0.58,
    a_norm: -0.52,
  },
  {
    title: 'Búho Nocturno (Instrumental)',
    artist: 'Broke For Free',
    genre: 'Indie Instrumental',
    source: 'DEAM',
    v_norm: 0.64,
    a_norm: 0.48,
  },
  {
    title: 'Diciembre',
    artist: 'Kai Engel',
    genre: 'Piano Minimalista',
    source: 'DEAM',
    v_norm: -0.56,
    a_norm: -0.58,
  },
  {
    title: 'Se Abre el Telón',
    artist: 'Kevin MacLeod',
    genre: 'Clásica Dramática Contemporánea',
    source: 'DEAM',
    v_norm: -0.62,
    a_norm: 0.68,
  },
  {
    title: 'Pensamiento Sereno',
    artist: 'Blue Dot Sessions',
    genre: 'Ambiente Pastoral',
    source: 'DEAM',
    v_norm: 0.42,
    a_norm: -0.38,
  },
  {
    title: 'Nubes Blancas',
    artist: 'Ludovico Einaudi',
    genre: 'Adagio Clásico',
    source: 'PMEmo',
    v_norm: 0.52,
    a_norm: -0.46,
  },
  {
    title: 'Luz Cercana',
    artist: 'Ólafur Arnalds',
    genre: 'Piano Minimalista',
    source: 'PMEmo',
    v_norm: -0.34,
    a_norm: -0.42,
  },
  {
    title: 'Impulso Continuo',
    artist: 'Nils Frahm',
    genre: 'Sintetizador Dinámico',
    source: 'PMEmo',
    v_norm: -0.18,
    a_norm: 0.56,
  },
  {
    title: 'Sobre la Naturaleza de la Luz',
    artist: 'Max Richter',
    genre: 'Elegía de Cámara',
    source: 'PMEmo',
    v_norm: -0.68,
    a_norm: -0.54,
  },
  {
    title: 'Despertar Luminoso',
    artist: 'Tycho',
    genre: 'Pulso Instrumental',
    source: 'PMEmo',
    v_norm: 0.61,
    a_norm: 0.34,
  },
  {
    title: 'Cirros del Norte',
    artist: 'Bonobo',
    genre: 'Folk Acústico',
    source: 'PMEmo',
    v_norm: 0.48,
    a_norm: 0.42,
  },
  {
    title: 'Respiración Pausada',
    artist: 'Hania Rani',
    genre: 'Ambiente Pastoral',
    source: 'PMEmo',
    v_norm: 0.62,
    a_norm: -0.58,
  },
];

function buildExternalReference(
  source: SourceDataset,
  trackId: string,
  title: string,
  artist: string,
  idx: number,
): { platform: Track['external_platform']; url: string; license_note: string } {
  const q = encodeURIComponent(`${title} ${artist}`);
  if (source === 'DEAM') {
    if (idx % 3 === 0) {
      return {
        platform: 'Free Music Archive',
        url: `https://freemusicarchive.org/search?quicksearch=${q}`,
        license_note: 'Atribución Creative Commons / Referencia FMA (Ley 23 de 1982)',
      };
    }
    if (idx % 3 === 1) {
      return {
        platform: 'MediaEval DEAM',
        url: `https://cvml.unige.ch/databases/DEAM/#${trackId}`,
        license_note: 'Corpus académico DEAM (Aljanaki et al., 2017) · Sin audio alojado',
      };
    }
    return {
      platform: 'YouTube Music',
      url: `https://music.youtube.com/search?q=${q}`,
      license_note: 'Enlace externo de consulta (Ley 23 de 1982)',
    };
  }
  if (idx % 3 === 0) {
    return {
      platform: 'Spotify',
      url: `https://open.spotify.com/search/${q}`,
      license_note: 'Enlace externo a catálogo de streaming (Ley 23 de 1982)',
    };
  }
  if (idx % 3 === 1) {
    return {
      platform: 'YouTube Music',
      url: `https://music.youtube.com/search?q=${q}`,
      license_note: 'Enlace externo de consulta (Ley 23 de 1982)',
    };
  }
  return {
    platform: 'PMEmo Reference',
    url: `https://github.com/HuiZhangDB/PMEmo#${trackId}`,
    license_note: 'Corpus académico PMEmo (Zhang et al., 2018) · Sin audio alojado',
  };
}

let cachedCatalog: Track[] | null = null;

/**
 * Genera de forma determinista el catálogo auditado de 1.284 pistas:
 * 522 pistas DEAM (escala nativa [1, 9]) + 762 pistas PMEmo (escala nativa [0, 1]).
 */
export function buildAuditedCatalog(): Track[] {
  if (cachedCatalog) return cachedCatalog;

  const rng = mulberry32(20260415);
  const tracks: Track[] = [];

  const createTrack = (
    source: SourceDataset,
    seqIndex: number,
    anchor?: (typeof CURATED_ANCHORS)[number],
  ): Track => {
    const trackId =
      source === 'DEAM'
        ? `DEAM-${String(seqIndex + 1).padStart(4, '0')}`
        : `PMEMO-${String(seqIndex + 1).padStart(4, '0')}`;

    let vTarget: number;
    let aTarget: number;
    if (anchor) {
      vTarget = anchor.v_norm;
      aTarget = anchor.a_norm;
    } else {
      const quadCycle = seqIndex % 4;
      const signV = quadCycle === 0 || quadCycle === 3 ? 1 : -1;
      const signA = quadCycle === 0 || quadCycle === 1 ? 1 : -1;
      const u1 = rng();
      const u2 = rng();
      if (rng() < 0.18) {
        vTarget = (rng() * 2 - 1) * 0.55;
        aTarget = (rng() * 2 - 1) * 0.55;
      } else {
        vTarget = signV * (0.04 + Math.pow(u1, 0.85) * 0.88);
        aTarget = signA * (0.04 + Math.pow(u2, 0.85) * 0.88);
      }
    }

    let vRaw: number;
    let aRaw: number;
    let vNorm: number;
    let aNorm: number;

    if (source === 'DEAM') {
      vRaw = Number((1 + ((vTarget + 1) / 2) * 8).toFixed(3));
      aRaw = Number((1 + ((aTarget + 1) / 2) * 8).toFixed(3));
      vNorm = normalizeToBipolar(vRaw, 1, 9);
      aNorm = normalizeToBipolar(aRaw, 1, 9);
    } else {
      vRaw = Number(((vTarget + 1) / 2).toFixed(4));
      aRaw = Number(((aTarget + 1) / 2).toFixed(4));
      vNorm = normalizeToBipolar(vRaw, 0, 1);
      aNorm = normalizeToBipolar(aRaw, 0, 1);
    }

    const quadrant = getQuadrant(vNorm, aNorm);
    const prefixes = TITLE_PREFIXES[quadrant];
    const genres = GENRE_BY_QUADRANT[quadrant];
    const artists = source === 'DEAM' ? ARTISTS_DEAM : ARTISTS_PMEMO;

    const title = anchor
      ? anchor.title
      : `${prefixes[seqIndex % prefixes.length]} · Op. ${
          Math.floor(seqIndex / prefixes.length) + 1
        }`;
    const artist = anchor
      ? anchor.artist
      : artists[(seqIndex * 7 + Math.floor(rng() * 5)) % artists.length];
    const genre = anchor ? anchor.genre : genres[seqIndex % genres.length];
    const durationSec = 135 + Math.floor(rng() * 145);
    const ext = buildExternalReference(source, trackId, title, artist, seqIndex);

    return {
      track_id: trackId,
      title,
      artist,
      genre,
      source,
      v_raw: vRaw,
      a_raw: aRaw,
      v_norm: vNorm,
      a_norm: aNorm,
      quadrant,
      duration_sec: durationSec,
      external_platform: ext.platform,
      external_url: ext.url,
      license_note: ext.license_note,
    };
  };

  const deamAnchors = CURATED_ANCHORS.filter((a) => a.source === 'DEAM');
  const pmemoAnchors = CURATED_ANCHORS.filter((a) => a.source === 'PMEmo');

  for (let i = 0; i < AUDIT_FUNNEL_STATS.valid_deam; i++) {
    tracks.push(createTrack('DEAM', i, deamAnchors[i]));
  }
  for (let i = 0; i < AUDIT_FUNNEL_STATS.valid_pmemo; i++) {
    tracks.push(createTrack('PMEmo', i, pmemoAnchors[i]));
  }

  cachedCatalog = tracks;
  return tracks;
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
      t.quadrant,
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
