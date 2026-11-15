/**
 * Motor matemático y algorítmico del proyecto SIREM (UIS).
 * Implementa las ecuaciones del Principio ISO, normalización bipolar [-1, 1],
 * clasificación en el Plano Circumplejo de Russell, función objetivo J(P),
 * algoritmo principal de programación dinámica / Dijkstra por etapas sin repetición,
 * comparador estocástico por Cadenas de Markov (distribución de Boltzmann)
 * y líneas base (Vecino más cercano miope y Selección aleatoria admisible).
 */

import type {
  AlgorithmResult,
  ExperimentalAggregate,
  OptimizationParams,
  Point2D,
  QuadrantId,
  QuadrantMeta,
  ScenarioEvalRow,
  SequenceMetrics,
  StageDetail,
  SubstituteCandidate,
  Track,
} from '../types/sirem';

/** Metadatos descriptivos y cromáticos de los 4 cuadrantes del Modelo de Russell (1980) */
export const QUADRANT_META: Record<QuadrantId, QuadrantMeta> = {
  Q1: {
    id: 'Q1',
    shortLabel: 'C-I · Alegría / Activación',
    label: 'Cuadrante I: Activación Positiva / Alegría',
    description: 'Valencia ≥ 0, Activación ≥ 0',
    bgTint: 'rgba(245, 158, 11, 0.08)',
    badgeBg: '#FEF3C7',
    badgeText: '#92400E',
    borderHex: '#F59E0B',
    dotHex: '#D97706',
  },
  Q2: {
    id: 'Q2',
    shortLabel: 'C-II · Tensión / Alerta',
    label: 'Cuadrante II: Tensión / Alerta',
    description: 'Valencia < 0, Activación ≥ 0',
    bgTint: 'rgba(225, 29, 72, 0.07)',
    badgeBg: '#FFE4E6',
    badgeText: '#9F1239',
    borderHex: '#F43F5E',
    dotHex: '#E11D48',
  },
  Q3: {
    id: 'Q3',
    shortLabel: 'C-III · Baja Energía / Melancolía',
    label: 'Cuadrante III: Baja Energía / Melancolía',
    description: 'Valencia < 0, Activación < 0',
    bgTint: 'rgba(79, 70, 229, 0.07)',
    badgeBg: '#E0E7FF',
    badgeText: '#3730A3',
    borderHex: '#6366F1',
    dotHex: '#4F46E5',
  },
  Q4: {
    id: 'Q4',
    shortLabel: 'C-IV · Calma / Serenidad',
    label: 'Cuadrante IV: Calma / Serenidad',
    description: 'Valencia ≥ 0, Activación < 0',
    bgTint: 'rgba(16, 185, 129, 0.08)',
    badgeBg: '#D1FAE5',
    badgeText: '#065F46',
    borderHex: '#10B981',
    dotHex: '#059669',
  },
};

/**
 * Transforma linealmente un valor escalar desde su intervalo nativo [minVal, maxVal]
 * hacia el espacio bipolar [-1, 1]:
 * v_norm = 2 * ((v - a) / (b - a)) - 1
 */
export function normalizeToBipolar(v: number, minVal: number, maxVal: number): number {
  if (maxVal <= minVal) {
    throw new Error('Límites de normalización inválidos: maxVal debe ser mayor que minVal.');
  }
  const normalized = 2 * ((v - minVal) / (maxVal - minVal)) - 1;
  return Math.max(-1, Math.min(1, Number(normalized.toFixed(6))));
}

/**
 * Calcula la distancia euclidiana en R^2 dentro del plano Valencia-Activación [-1, 1]^2.
 */
export function euclidean2D(p1: Point2D, p2: Point2D): number {
  const dv = p1.v - p2.v;
  const da = p1.a - p2.a;
  return Math.hypot(dv, da);
}

/**
 * Clasifica una coordenada (V, A) en uno de los 4 cuadrantes del Modelo Circumplejo de Russell.
 */
export function getQuadrant(v: number, a: number): QuadrantId {
  if (v >= 0 && a >= 0) return 'Q1';
  if (v < 0 && a >= 0) return 'Q2';
  if (v < 0 && a < 0) return 'Q3';
  return 'Q4';
}

/**
 * Calcula la trayectoria lineal de referencia del Principio ISO z_j para j = 1..m:
 * z_j = x_ini + ((j - 1) / (m - 1)) * (x_obj - x_ini)
 */
export function computeIdealTrajectory(xIni: Point2D, xObj: Point2D, m: number): Point2D[] {
  if (m < 2) {
    throw new Error('El número de etapas m debe ser al menos 2.');
  }
  const points: Point2D[] = [];
  for (let j = 1; j <= m; j++) {
    const t = (j - 1) / (m - 1);
    points.push({
      v: Number((xIni.v + t * (xObj.v - xIni.v)).toFixed(6)),
      a: Number((xIni.a + t * (xObj.a - xIni.a)).toFixed(6)),
    });
  }
  return points;
}

/**
 * Evalúa una secuencia candidata de pistas frente a la función objetivo J(P)
 * y verifica todas las restricciones explícitas de factibilidad geométrica y unicidad.
 */
export function evaluateSequence(
  tracks: Track[],
  params: OptimizationParams,
  zPoints?: Point2D[],
): { stages: StageDetail[]; metrics: SequenceMetrics } {
  const z = zPoints ?? computeIdealTrajectory(params.x_ini, params.x_obj, params.m);
  const stages: StageDetail[] = [];

  if (tracks.length === 0) {
    return {
      stages: [],
      metrics: {
        cost_J: Number.POSITIVE_INFINITY,
        d_max: Number.POSITIVE_INFINITY,
        e_ini: Number.POSITIVE_INFINITY,
        e_obj: Number.POSITIVE_INFINITY,
        unique_tracks: false,
        feasible: false,
        violations: ['No se encontraron pistas candidatas dentro de los umbrales definidos.'],
      },
    };
  }

  let transitionSum = 0;
  let adherenceSum = 0;
  let dMax = 0;
  const seenIds = new Set<string>();
  let unique = true;

  for (let idx = 0; idx < tracks.length; idx++) {
    const track = tracks[idx];
    if (seenIds.has(track.track_id)) {
      unique = false;
    }
    seenIds.add(track.track_id);

    const pos: Point2D = { v: track.v_norm, a: track.a_norm };
    const refPoint = z[idx] ?? params.x_obj;
    const refDist = euclidean2D(pos, refPoint);
    adherenceSum += refDist;

    let stepDist: number | null = null;
    if (idx > 0) {
      const prev = tracks[idx - 1];
      stepDist = euclidean2D({ v: prev.v_norm, a: prev.a_norm }, pos);
      transitionSum += stepDist;
      if (stepDist > dMax) {
        dMax = stepDist;
      }
    }

    stages.push({
      stage: idx + 1,
      track,
      z_ref: refPoint,
      step_distance: stepDist,
      ref_distance: refDist,
    });
  }

  const firstTrack = tracks[0];
  const lastTrack = tracks[tracks.length - 1];
  const eIni = euclidean2D({ v: firstTrack.v_norm, a: firstTrack.a_norm }, params.x_ini);
  const eObj = euclidean2D({ v: lastTrack.v_norm, a: lastTrack.a_norm }, params.x_obj);
  const costJ = transitionSum + params.lambda * adherenceSum;

  const violations: string[] = [];
  if (tracks.length !== params.m) {
    violations.push(`Longitud incompleta: ${tracks.length}/${params.m} etapas.`);
  }
  if (!unique) {
    violations.push('Violación de unicidad: existe al menos un track_id repetido en la secuencia.');
  }
  if (eIni > params.epsilon_ini + 1e-9) {
    violations.push(
      `Desviación inicial (${eIni.toFixed(3)}) supera ε_ini (${params.epsilon_ini.toFixed(2)}).`,
    );
  }
  if (dMax > params.delta + 1e-9) {
    violations.push(
      `Salto máximo d_max (${dMax.toFixed(3)}) supera δ (${params.delta.toFixed(2)}).`,
    );
  }
  if (eObj > params.epsilon_obj + 1e-9) {
    violations.push(
      `Error al objetivo e_obj (${eObj.toFixed(3)}) supera ε_obj (${params.epsilon_obj.toFixed(2)}).`,
    );
  }

  return {
    stages,
    metrics: {
      cost_J: Number(costJ.toFixed(4)),
      d_max: Number(dMax.toFixed(4)),
      e_ini: Number(eIni.toFixed(4)),
      e_obj: Number(eObj.toFixed(4)),
      unique_tracks: unique,
      feasible: violations.length === 0,
      violations,
    },
  };
}

/**
 * Calcula el percentil p-ésimo (0 a 100) mediante interpolación lineal.
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const frac = idx - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

/** Generador pseudoaleatorio determinista (Mulberry32) para reproducibilidad exacta */
function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Filtra el catálogo según la fuente seleccionada (ALL, DEAM o PMEmo) */
export function filterCatalogBySource(
  catalog: Track[],
  filter: OptimizationParams['sourceFilter'],
): Track[] {
  if (filter === 'ALL') return catalog;
  return catalog.filter((t) => t.source === filter);
}

/** Estructura indexada de coordenadas en arreglos tipados para baja latencia (CA3) */
interface IndexedCatalog {
  tracks: Track[];
  v: Float64Array;
  a: Float64Array;
}

function indexCatalog(tracks: Track[]): IndexedCatalog {
  const n = tracks.length;
  const v = new Float64Array(n);
  const a = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    v[i] = tracks[i].v_norm;
    a[i] = tracks[i].a_norm;
  }
  return { tracks, v, a };
}

/**
 * Método 1 (Principal): Búsqueda de caminos óptimos por etapas (Dijkstra sobre grafo acíclico por capas)
 * con costo de arista c = ||x_k - x_i||_2 + lambda * ||x_k - z_{j+1}||_2 y unicidad estricta de pistas.
 */
export function solveDijkstra(
  catalog: Track[],
  params: OptimizationParams,
  precomputedZ?: Point2D[],
): AlgorithmResult {
  const t0 = performance.now();
  const pool = filterCatalogBySource(catalog, params.sourceFilter);
  const z = precomputedZ ?? computeIdealTrajectory(params.x_ini, params.x_obj, params.m);
  const m = params.m;
  const n = pool.length;

  if (n < m) {
    const t1 = performance.now();
    return {
      algorithm: 'dijkstra',
      label: 'Dijkstra por etapas',
      stages: [],
      metrics: {
        cost_J: Number.POSITIVE_INFINITY,
        d_max: Number.POSITIVE_INFINITY,
        e_ini: Number.POSITIVE_INFINITY,
        e_obj: Number.POSITIVE_INFINITY,
        unique_tracks: false,
        feasible: false,
        violations: [`Catálogo insuficiente (${n} pistas) para ${m} etapas sin repetición.`],
      },
      execution_ms: Number((t1 - t0).toFixed(3)),
    };
  }

  const idxCat = indexCatalog(pool);
  const { v, a } = idxCat;
  const deltaSq = (params.delta + 1e-9) * (params.delta + 1e-9);
  const epsIniSq = (params.epsilon_ini + 1e-9) * (params.epsilon_ini + 1e-9);
  const epsObjSq = (params.epsilon_obj + 1e-9) * (params.epsilon_obj + 1e-9);

  // Etapa inicial (j = 1): nodos admisibles dentro de epsilon_ini
  const stage1Candidates: number[] = [];
  for (let i = 0; i < n; i++) {
    const dv = v[i] - params.x_ini.v;
    const da = a[i] - params.x_ini.a;
    if (dv * dv + da * da <= epsIniSq) {
      stage1Candidates.push(i);
    }
  }

  // Etapa final (j = m): nodos admisibles dentro de epsilon_obj
  const isFinalAdmissible = new Uint8Array(n);
  let finalCount = 0;
  for (let i = 0; i < n; i++) {
    const dv = v[i] - params.x_obj.v;
    const da = a[i] - params.x_obj.a;
    if (dv * dv + da * da <= epsObjSq) {
      isFinalAdmissible[i] = 1;
      finalCount++;
    }
  }

  if (stage1Candidates.length === 0 || finalCount === 0) {
    const reasons: string[] = [];
    if (stage1Candidates.length === 0) {
      reasons.push(
        `Ninguna pista cumple ε_ini ≤ ${params.epsilon_ini.toFixed(2)} alrededor de x_ini.`,
      );
    }
    if (finalCount === 0) {
      reasons.push(
        `Ninguna pista cumple ε_obj ≤ ${params.epsilon_obj.toFixed(2)} alrededor de x_obj.`,
      );
    }
    const t1 = performance.now();
    return {
      algorithm: 'dijkstra',
      label: 'Dijkstra por etapas',
      stages: [],
      metrics: {
        cost_J: Number.POSITIVE_INFINITY,
        d_max: Number.POSITIVE_INFINITY,
        e_ini: Number.POSITIVE_INFINITY,
        e_obj: Number.POSITIVE_INFINITY,
        unique_tracks: false,
        feasible: false,
        violations: reasons,
      },
      execution_ms: Number((t1 - t0).toFixed(3)),
    };
  }

  // Precalcular el costo de adherencia lambda * ||x_i - z_j||_2 para cada etapa j en 0..m-1
  const adherenceCost: Float64Array[] = [];
  for (let s = 0; s < m; s++) {
    const arr = new Float64Array(n);
    const zv = z[s].v;
    const za = z[s].a;
    for (let i = 0; i < n; i++) {
      arr[i] = params.lambda * Math.hypot(v[i] - zv, a[i] - za);
    }
    adherenceCost.push(arr);
  }

  // Relajación rápida sobre DAG por capas (Dijkstra topológico por etapas)
  const dist: Float64Array[] = Array.from({ length: m }, () => new Float64Array(n).fill(Infinity));
  const parent: Int32Array[] = Array.from({ length: m }, () => new Int32Array(n).fill(-1));

  let activeNodes: number[] = [];
  for (const i of stage1Candidates) {
    dist[0][i] = adherenceCost[0][i];
    activeNodes.push(i);
  }

  for (let s = 0; s < m - 1; s++) {
    const nextDist = dist[s + 1];
    const nextParent = parent[s + 1];
    const nextAdh = adherenceCost[s + 1];
    const isLastTransition = s + 1 === m - 1;
    const nextActiveSet = new Uint8Array(n);

    for (let ai = 0; ai < activeNodes.length; ai++) {
      const i = activeNodes[ai];
      const baseCost = dist[s][i];
      if (!Number.isFinite(baseCost)) continue;
      const vi = v[i];
      const aiCoord = a[i];

      for (let k = 0; k < n; k++) {
        if (k === i) continue;
        if (isLastTransition && isFinalAdmissible[k] === 0) continue;
        const dv = v[k] - vi;
        const da = a[k] - aiCoord;
        const dSq = dv * dv + da * da;
        if (dSq > deltaSq) continue;

        const stepCost = Math.sqrt(dSq);
        const total = baseCost + stepCost + nextAdh[k];
        if (total < nextDist[k]) {
          nextDist[k] = total;
          nextParent[k] = i;
          nextActiveSet[k] = 1;
        }
      }
    }

    const nextActive: number[] = [];
    for (let k = 0; k < n; k++) {
      if (nextActiveSet[k] === 1) nextActive.push(k);
    }
    activeNodes = nextActive;
    if (activeNodes.length === 0) break;
  }

  // Seleccionar el mejor nodo final admisible
  let bestFinalIdx = -1;
  let bestFinalCost = Infinity;
  for (let k = 0; k < n; k++) {
    if (isFinalAdmissible[k] === 1 && dist[m - 1][k] < bestFinalCost) {
      bestFinalCost = dist[m - 1][k];
      bestFinalIdx = k;
    }
  }

  if (bestFinalIdx === -1) {
    const t1 = performance.now();
    return {
      algorithm: 'dijkstra',
      label: 'Dijkstra por etapas',
      stages: [],
      metrics: {
        cost_J: Number.POSITIVE_INFINITY,
        d_max: Number.POSITIVE_INFINITY,
        e_ini: Number.POSITIVE_INFINITY,
        e_obj: Number.POSITIVE_INFINITY,
        unique_tracks: false,
        feasible: false,
        violations: [
          `No existe trayectoria continua en ${m} etapas con salto δ ≤ ${params.delta.toFixed(2)} desde x_ini hasta x_obj.`,
        ],
      },
      execution_ms: Number((t1 - t0).toFixed(3)),
    };
  }

  // Reconstruir camino del DAG y verificar unicidad estricta de pistas
  const reconstruct = (endIdx: number): number[] => {
    const path = new Array<number>(m);
    let curr = endIdx;
    for (let s = m - 1; s >= 0; s--) {
      path[s] = curr;
      curr = parent[s][curr];
    }
    return path;
  };

  let bestPath = reconstruct(bestFinalIdx);
  const hasDuplicates = (p: number[]) => new Set(p).size !== p.length;

  // Si el camino libre del DAG repitió algún nodo en etapas no adyacentes,
  // ejecutar búsqueda Dijkstra con estado de visitados para garantizar unicidad estricta.
  if (hasDuplicates(bestPath)) {
    interface PathState {
      cost: number;
      stage: number;
      node: number;
      path: number[];
    }
    let frontier: PathState[] = stage1Candidates
      .map((i) => ({ cost: adherenceCost[0][i], stage: 0, node: i, path: [i] }))
      .sort((x, y) => x.cost - y.cost)
      .slice(0, 60);

    for (let s = 0; s < m - 1; s++) {
      const nextFrontier: PathState[] = [];
      const nextAdh = adherenceCost[s + 1];
      const isLast = s + 1 === m - 1;

      for (const state of frontier) {
        const vi = v[state.node];
        const aiCoord = a[state.node];
        for (let k = 0; k < n; k++) {
          if (state.path.includes(k)) continue;
          if (isLast && isFinalAdmissible[k] === 0) continue;
          const dv = v[k] - vi;
          const da = a[k] - aiCoord;
          const dSq = dv * dv + da * da;
          if (dSq > deltaSq) continue;
          const newCost = state.cost + Math.sqrt(dSq) + nextAdh[k];
          nextFrontier.push({
            cost: newCost,
            stage: s + 1,
            node: k,
            path: [...state.path, k],
          });
        }
      }
      nextFrontier.sort((x, y) => x.cost - y.cost);
      const deduped: PathState[] = [];
      const perNodeCount = new Int32Array(n);
      for (const st of nextFrontier) {
        if (perNodeCount[st.node] < 3) {
          perNodeCount[st.node]++;
          deduped.push(st);
          if (deduped.length >= 160) break;
        }
      }
      frontier = deduped;
      if (frontier.length === 0) break;
    }

    if (frontier.length === 0) {
      const t1 = performance.now();
      return {
        algorithm: 'dijkstra',
        label: 'Dijkstra por etapas',
        stages: [],
        metrics: {
          cost_J: Number.POSITIVE_INFINITY,
          d_max: Number.POSITIVE_INFINITY,
          e_ini: Number.POSITIVE_INFINITY,
          e_obj: Number.POSITIVE_INFINITY,
          unique_tracks: false,
          feasible: false,
          violations: [
            `Imposible hallar ${m} pistas únicas sin repetición bajo δ ≤ ${params.delta.toFixed(2)}.`,
          ],
        },
        execution_ms: Number((t1 - t0).toFixed(3)),
      };
    }
    bestPath = frontier[0].path;
  }

  const chosenTracks = bestPath.map((idx) => pool[idx]);
  const evaluated = evaluateSequence(chosenTracks, params, z);
  const t1 = performance.now();

  return {
    algorithm: 'dijkstra',
    label: 'Dijkstra por etapas',
    stages: evaluated.stages,
    metrics: evaluated.metrics,
    execution_ms: Number((t1 - t0).toFixed(3)),
  };
}

/** Muestreo proporcional en escala logarítmica (estabilidad numérica para pesos de Boltzmann) */
function sampleLogWeights(items: number[], logWeights: number[], rng: () => number): number {
  let maxLog = -Infinity;
  for (let i = 0; i < logWeights.length; i++) {
    if (logWeights[i] > maxLog) maxLog = logWeights[i];
  }
  const probs = new Float64Array(items.length);
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    const w = Math.exp(Math.max(-50, logWeights[i] - maxLog));
    probs[i] = w;
    sum += w;
  }
  const u = rng() * sum;
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    acc += probs[i];
    if (u <= acc) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Método 2 (Comparador Estocástico): Cadena de Markov sin repetición con estado ampliado s = (j, i, U)
 * y probabilidad de transición de Boltzmann p(k | s) = exp(-beta * c_{s,k}) / sum exp(-beta * c_{s,l}).
 */
export function solveMarkov(
  catalog: Track[],
  params: OptimizationParams,
  precomputedZ?: Point2D[],
): AlgorithmResult {
  const t0 = performance.now();
  const pool = filterCatalogBySource(catalog, params.sourceFilter);
  const z = precomputedZ ?? computeIdealTrajectory(params.x_ini, params.x_obj, params.m);
  const m = params.m;
  const n = pool.length;
  const rng = createRng(params.seed);

  const idxCat = indexCatalog(pool);
  const { v, a } = idxCat;
  const deltaSq = (params.delta + 1e-9) * (params.delta + 1e-9);
  const epsIniSq = (params.epsilon_ini + 1e-9) * (params.epsilon_ini + 1e-9);
  const epsObjSq = (params.epsilon_obj + 1e-9) * (params.epsilon_obj + 1e-9);

  const stage1Candidates: number[] = [];
  for (let i = 0; i < n; i++) {
    const dv = v[i] - params.x_ini.v;
    const da = a[i] - params.x_ini.a;
    if (dv * dv + da * da <= epsIniSq) stage1Candidates.push(i);
  }

  const isFinalAdmissible = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const dv = v[i] - params.x_obj.v;
    const da = a[i] - params.x_obj.a;
    if (dv * dv + da * da <= epsObjSq) isFinalAdmissible[i] = 1;
  }

  const budget = Math.max(10, Math.min(200, params.markovBudget));
  let bestFeasibleTracks: Track[] | null = null;
  let bestFeasibleCost = Infinity;
  let bestFallbackTracks: Track[] | null = null;
  let bestFallbackCost = Infinity;
  let attemptsUsed = 0;

  if (stage1Candidates.length > 0 && n >= m) {
    for (let attempt = 0; attempt < budget; attempt++) {
      attemptsUsed++;
      const used = new Uint8Array(n);
      const pathIdx: number[] = [];

      // Muestrear nodo inicial usando pesos de Boltzmann sobre el costo de adherencia en etapa 1
      const s1Weights = stage1Candidates.map((i) => {
        const c = params.lambda * Math.hypot(v[i] - z[0].v, a[i] - z[0].a);
        return -params.beta * c;
      });
      const firstPick = sampleLogWeights(stage1Candidates, s1Weights, rng);
      pathIdx.push(firstPick);
      used[firstPick] = 1;

      let stuck = false;
      for (let s = 0; s < m - 1; s++) {
        const curr = pathIdx[pathIdx.length - 1];
        const isLast = s + 1 === m - 1;
        const zv = z[s + 1].v;
        const za = z[s + 1].a;

        const candidates: number[] = [];
        const logW: number[] = [];

        for (let k = 0; k < n; k++) {
          if (used[k] === 1) continue;
          if (isLast && isFinalAdmissible[k] === 0) continue;
          const dv = v[k] - v[curr];
          const da = a[k] - a[curr];
          const dSq = dv * dv + da * da;
          if (dSq > deltaSq) continue;
          const c = Math.sqrt(dSq) + params.lambda * Math.hypot(v[k] - zv, a[k] - za);
          candidates.push(k);
          logW.push(-params.beta * c);
        }

        if (candidates.length === 0) {
          stuck = true;
          break;
        }

        const nextPick = sampleLogWeights(candidates, logW, rng);
        pathIdx.push(nextPick);
        used[nextPick] = 1;
      }

      if (!stuck && pathIdx.length === m) {
        const tracks = pathIdx.map((idx) => pool[idx]);
        const ev = evaluateSequence(tracks, params, z);
        if (ev.metrics.feasible && ev.metrics.cost_J < bestFeasibleCost) {
          bestFeasibleCost = ev.metrics.cost_J;
          bestFeasibleTracks = tracks;
        } else if (ev.metrics.cost_J < bestFallbackCost) {
          bestFallbackCost = ev.metrics.cost_J;
          bestFallbackTracks = tracks;
        }
      }
    }
  }

  const chosen = bestFeasibleTracks ?? bestFallbackTracks ?? [];
  const evaluated = evaluateSequence(chosen, params, z);
  const t1 = performance.now();

  return {
    algorithm: 'markov',
    label: 'Cadena de Markov (Boltzmann)',
    stages: evaluated.stages,
    metrics: evaluated.metrics,
    execution_ms: Number((t1 - t0).toFixed(3)),
    attempts_used: attemptsUsed,
  };
}

/**
 * Línea Base 1: Vecino más cercano miope (selección local hacia z_j sin optimización global).
 */
export function solveGreedy(
  catalog: Track[],
  params: OptimizationParams,
  precomputedZ?: Point2D[],
): AlgorithmResult {
  const t0 = performance.now();
  const pool = filterCatalogBySource(catalog, params.sourceFilter);
  const z = precomputedZ ?? computeIdealTrajectory(params.x_ini, params.x_obj, params.m);
  const m = params.m;
  const n = pool.length;

  const used = new Uint8Array(n);
  const chosen: Track[] = [];

  if (n >= m) {
    for (let s = 0; s < m; s++) {
      const target = z[s];
      let bestIdx = -1;
      let bestDist = Infinity;

      const prev = chosen.length > 0 ? chosen[chosen.length - 1] : null;
      for (let i = 0; i < n; i++) {
        if (used[i] === 1) continue;
        if (prev) {
          const step = euclidean2D(
            { v: prev.v_norm, a: prev.a_norm },
            { v: pool[i].v_norm, a: pool[i].a_norm },
          );
          if (step > params.delta + 1e-9) continue;
        }
        const d = euclidean2D({ v: pool[i].v_norm, a: pool[i].a_norm }, target);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }

      if (bestIdx === -1) {
        for (let i = 0; i < n; i++) {
          if (used[i] === 1) continue;
          const d = euclidean2D({ v: pool[i].v_norm, a: pool[i].a_norm }, target);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        }
      }

      if (bestIdx !== -1) {
        used[bestIdx] = 1;
        chosen.push(pool[bestIdx]);
      }
    }
  }

  const evaluated = evaluateSequence(chosen, params, z);
  const t1 = performance.now();

  return {
    algorithm: 'greedy',
    label: 'Vecino más cercano (Miope)',
    stages: evaluated.stages,
    metrics: evaluated.metrics,
    execution_ms: Number((t1 - t0).toFixed(3)),
  };
}

/**
 * Línea Base 2: Selección aleatoria admisible con semilla fija reproducible.
 */
export function solveRandom(
  catalog: Track[],
  params: OptimizationParams,
  precomputedZ?: Point2D[],
): AlgorithmResult {
  const t0 = performance.now();
  const pool = filterCatalogBySource(catalog, params.sourceFilter);
  const z = precomputedZ ?? computeIdealTrajectory(params.x_ini, params.x_obj, params.m);
  const m = params.m;
  const n = pool.length;

  let bestTracks: Track[] = [];
  let bestFeasible = false;
  let bestCost = Infinity;

  if (n >= m) {
    const maxRestarts = 30;
    for (let r = 0; r < maxRestarts; r++) {
      const rng = createRng(params.seed + r * 7919);
      const used = new Uint8Array(n);
      const candidateSeq: Track[] = [];

      const s1: number[] = [];
      for (let i = 0; i < n; i++) {
        if (
          euclidean2D({ v: pool[i].v_norm, a: pool[i].a_norm }, params.x_ini) <=
          params.epsilon_ini + 1e-9
        ) {
          s1.push(i);
        }
      }
      if (s1.length === 0) break;

      const pick1 = s1[Math.floor(rng() * s1.length)];
      used[pick1] = 1;
      candidateSeq.push(pool[pick1]);

      let failed = false;
      for (let s = 1; s < m; s++) {
        const prev = candidateSeq[candidateSeq.length - 1];
        const isLast = s === m - 1;
        const adm: number[] = [];
        for (let i = 0; i < n; i++) {
          if (used[i] === 1) continue;
          const step = euclidean2D(
            { v: prev.v_norm, a: prev.a_norm },
            { v: pool[i].v_norm, a: pool[i].a_norm },
          );
          if (step > params.delta + 1e-9) continue;
          if (
            isLast &&
            euclidean2D({ v: pool[i].v_norm, a: pool[i].a_norm }, params.x_obj) >
              params.epsilon_obj + 1e-9
          ) {
            continue;
          }
          adm.push(i);
        }
        if (adm.length === 0) {
          failed = true;
          break;
        }
        const pick = adm[Math.floor(rng() * adm.length)];
        used[pick] = 1;
        candidateSeq.push(pool[pick]);
      }

      if (!failed && candidateSeq.length === m) {
        const ev = evaluateSequence(candidateSeq, params, z);
        if (ev.metrics.feasible && (!bestFeasible || ev.metrics.cost_J < bestCost)) {
          bestFeasible = true;
          bestCost = ev.metrics.cost_J;
          bestTracks = candidateSeq;
          break;
        }
      }
    }
  }

  const evaluated = evaluateSequence(bestTracks, params, z);
  const t1 = performance.now();

  return {
    algorithm: 'random',
    label: 'Aleatoria admisible (Semilla fija)',
    stages: evaluated.stages,
    metrics: evaluated.metrics,
    execution_ms: Number((t1 - t0).toFixed(3)),
  };
}

/**
 * Ejecuta en paralelo los 4 métodos sobre el catálogo y parámetros dados.
 */
export function runAllAlgorithms(
  catalog: Track[],
  params: OptimizationParams,
): Record<'dijkstra' | 'markov' | 'greedy' | 'random', AlgorithmResult> {
  const z = computeIdealTrajectory(params.x_ini, params.x_obj, params.m);
  return {
    dijkstra: solveDijkstra(catalog, params, z),
    markov: solveMarkov(catalog, params, z),
    greedy: solveGreedy(catalog, params, z),
    random: solveRandom(catalog, params, z),
  };
}

/**
 * Busca las 5 pistas vecinas más cercanas dentro del mismo cuadrante afectivo de Russell
 * para permitir la sustitución controlada por el profesional sin repetir pistas (R3).
 */
export function findNearestSubstitutes(
  catalog: Track[],
  params: OptimizationParams,
  currentTracks: Track[],
  stageIndexZeroBased: number,
  limit = 5,
): SubstituteCandidate[] {
  const pool = filterCatalogBySource(catalog, params.sourceFilter);
  const current = currentTracks[stageIndexZeroBased];
  if (!current) return [];

  const z = computeIdealTrajectory(params.x_ini, params.x_obj, params.m);
  const zRef = z[stageIndexZeroBased];
  const forbiddenIds = new Set(currentTracks.map((t) => t.track_id));

  const sameQuadrant = pool
    .filter((t) => !forbiddenIds.has(t.track_id) && t.quadrant === current.quadrant)
    .map((t) => ({
      track: t,
      distanceToCurrent: euclidean2D(
        { v: t.v_norm, a: t.a_norm },
        { v: current.v_norm, a: current.a_norm },
      ),
      distanceToRef: euclidean2D({ v: t.v_norm, a: t.a_norm }, zRef),
    }))
    .sort((a, b) => a.distanceToCurrent - b.distanceToCurrent);

  return sameQuadrant.slice(0, limit);
}

/**
 * Reemplaza manualmente una pista en la etapa indicada (0-based) y recalcula de inmediato
 * J(P), d_max(P), e_ini(P), e_obj(P) y el estado de factibilidad (mitigación del riesgo R3).
 */
export function substituteTrackInSequence(
  currentTracks: Track[],
  stageIndexZeroBased: number,
  replacementTrack: Track,
  params: OptimizationParams,
): { stages: StageDetail[]; metrics: SequenceMetrics } {
  const updatedTracks = currentTracks.map((t, idx) =>
    idx === stageIndexZeroBased ? replacementTrack : t,
  );
  return evaluateSequence(updatedTracks, params);
}

/**
 * Ejecuta la batería experimental completa de 30 escenarios (Criterio CA2)
 * más 100 corridas de rendimiento cronometradas para verificar P95 <= 2.0 s (Criterio CA3).
 */
export function runExperimentalBattery(
  catalog: Track[],
  scenarios: Array<{
    id: string;
    label: string;
    transition: string;
    x_ini: Point2D;
    x_obj: Point2D;
    m: number;
  }>,
  baseParams: OptimizationParams,
): ExperimentalAggregate {
  const rows: ScenarioEvalRow[] = [];
  const dTimes: number[] = [];
  const mTimes: number[] = [];
  const gTimes: number[] = [];
  const rTimes: number[] = [];

  const dCosts: number[] = [];
  const mCosts: number[] = [];
  const gCosts: number[] = [];
  const rCosts: number[] = [];

  const dDmax: number[] = [];
  const mDmax: number[] = [];
  const gDmax: number[] = [];
  const rDmax: number[] = [];

  const dEobj: number[] = [];
  const mEobj: number[] = [];
  const gEobj: number[] = [];
  const rEobj: number[] = [];

  let dFeas = 0;
  let mFeas = 0;
  let gFeas = 0;
  let rFeas = 0;

  for (let i = 0; i < scenarios.length; i++) {
    const sc = scenarios[i];
    const params: OptimizationParams = {
      ...baseParams,
      x_ini: sc.x_ini,
      x_obj: sc.x_obj,
      m: sc.m,
      seed: 2026 + (i + 1),
      markovBudget: 50,
    };
    const z = computeIdealTrajectory(params.x_ini, params.x_obj, params.m);
    const dRes = solveDijkstra(catalog, params, z);
    const mRes = solveMarkov(catalog, params, z);
    const gRes = solveGreedy(catalog, params, z);
    const rRes = solveRandom(catalog, params, z);

    dTimes.push(dRes.execution_ms);
    mTimes.push(mRes.execution_ms);
    gTimes.push(gRes.execution_ms);
    rTimes.push(rRes.execution_ms);

    if (dRes.metrics.feasible) {
      dFeas++;
      dCosts.push(dRes.metrics.cost_J);
      dDmax.push(dRes.metrics.d_max);
      dEobj.push(dRes.metrics.e_obj);
    }
    if (mRes.metrics.feasible) {
      mFeas++;
      mCosts.push(mRes.metrics.cost_J);
      mDmax.push(mRes.metrics.d_max);
      mEobj.push(mRes.metrics.e_obj);
    }
    if (gRes.metrics.feasible) {
      gFeas++;
      gCosts.push(gRes.metrics.cost_J);
      gDmax.push(gRes.metrics.d_max);
      gEobj.push(gRes.metrics.e_obj);
    }
    if (rRes.metrics.feasible) {
      rFeas++;
      rCosts.push(rRes.metrics.cost_J);
      rDmax.push(rRes.metrics.d_max);
      rEobj.push(rRes.metrics.e_obj);
    }

    rows.push({
      scenario_id: sc.id,
      label: sc.label,
      transition: sc.transition,
      m: sc.m,
      v_ini: sc.x_ini.v,
      a_ini: sc.x_ini.a,
      v_obj: sc.x_obj.v,
      a_obj: sc.x_obj.a,
      dijkstra_feasible: dRes.metrics.feasible,
      dijkstra_J: dRes.metrics.feasible ? dRes.metrics.cost_J : null,
      dijkstra_dmax: dRes.metrics.feasible ? dRes.metrics.d_max : null,
      dijkstra_eobj: dRes.metrics.feasible ? dRes.metrics.e_obj : null,
      dijkstra_ms: dRes.execution_ms,
      markov_feasible: mRes.metrics.feasible,
      markov_J: mRes.metrics.feasible ? mRes.metrics.cost_J : null,
      markov_dmax: mRes.metrics.feasible ? mRes.metrics.d_max : null,
      markov_eobj: mRes.metrics.feasible ? mRes.metrics.e_obj : null,
      markov_ms: mRes.execution_ms,
      greedy_feasible: gRes.metrics.feasible,
      greedy_J: gRes.metrics.feasible ? gRes.metrics.cost_J : null,
      greedy_ms: gRes.execution_ms,
      random_feasible: rRes.metrics.feasible,
      random_J: rRes.metrics.feasible ? rRes.metrics.cost_J : null,
      random_ms: rRes.execution_ms,
    });
  }

  // 100 corridas de rendimiento sobre el solucionador principal Dijkstra
  const perfTimes: number[] = [];
  for (let run = 0; run < 100; run++) {
    const sc = scenarios[run % scenarios.length];
    const params: OptimizationParams = {
      ...baseParams,
      x_ini: sc.x_ini,
      x_obj: sc.x_obj,
      m: sc.m,
    };
    const res = solveDijkstra(catalog, params);
    perfTimes.push(res.execution_ms);
  }

  const avg = (arr: number[]) =>
    arr.length > 0 ? Number((arr.reduce((s, x) => s + x, 0) / arr.length).toFixed(4)) : null;

  const totalScenarios = scenarios.length || 30;
  const p95Dijkstra100 = Number(percentile(perfTimes, 95).toFixed(3));
  const p50Dijkstra100 = Number(percentile(perfTimes, 50).toFixed(3));
  const maxDijkstra100 = Number(Math.max(...perfTimes).toFixed(3));

  return {
    rows,
    summary: [
      {
        algorithm: 'Dijkstra por etapas (Principal)',
        feasibilityPct: Number(((dFeas / totalScenarios) * 100).toFixed(1)),
        meanJ: avg(dCosts),
        meanDmax: avg(dDmax),
        meanEobj: avg(dEobj),
        p95Ms: Number(percentile(dTimes, 95).toFixed(3)),
      },
      {
        algorithm: 'Cadena de Markov (Boltzmann)',
        feasibilityPct: Number(((mFeas / totalScenarios) * 100).toFixed(1)),
        meanJ: avg(mCosts),
        meanDmax: avg(mDmax),
        meanEobj: avg(mEobj),
        p95Ms: Number(percentile(mTimes, 95).toFixed(3)),
      },
      {
        algorithm: 'Vecino más cercano (Miope)',
        feasibilityPct: Number(((gFeas / totalScenarios) * 100).toFixed(1)),
        meanJ: avg(gCosts),
        meanDmax: avg(gDmax),
        meanEobj: avg(gEobj),
        p95Ms: Number(percentile(gTimes, 95).toFixed(3)),
      },
      {
        algorithm: 'Selección aleatoria admisible',
        feasibilityPct: Number(((rFeas / totalScenarios) * 100).toFixed(1)),
        meanJ: avg(rCosts),
        meanDmax: avg(rDmax),
        meanEobj: avg(rEobj),
        p95Ms: Number(percentile(rTimes, 95).toFixed(3)),
      },
    ],
    benchmark100: {
      runs: 100,
      p50Ms: p50Dijkstra100,
      p95Ms: p95Dijkstra100,
      maxMs: maxDijkstra100,
      meetsCA3: p95Dijkstra100 <= 2000,
    },
  };
}