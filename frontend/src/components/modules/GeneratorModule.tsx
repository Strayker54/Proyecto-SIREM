/**
 * Módulo 1: Generador de Pautas Musicales y Plano Circumplejo de Russell.
 * Permite parametrizar la transición afectiva (V0, A0) -> (Vf, Af), comparar en vivo
 * los 4 algoritmos (Dijkstra, Markov, Vecino más cercano y Aleatoria admisible),
 * visualizar la ruta en [-1, 1]^2 y sustituir pistas de forma controlada (R3).
 */

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  FileText,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import type {
  AlgorithmResult,
  OptimizationParams,
  SourceFilter,
  Track,
} from '../../types/sirem';
import {
  QUADRANT_META,
  computeIdealTrajectory,
  evaluateSequence,
  findNearestSubstitutes,
  runAllAlgorithms,
} from '../../services/mathEngine';
import { CLINICAL_PRESETS } from '../../data/seedData';
import { RussellPlane } from '../shared/RussellPlane';
import { KpiCard } from '../shared/KpiCard';
import { TrackSwapModal } from '../shared/TrackSwapModal';

interface GeneratorModuleProps {
  catalog: Track[];
  params: OptimizationParams;
  onParamsChange: (next: OptimizationParams) => void;
  manualOverrideTracks: Track[] | null;
  onManualOverrideChange: (tracks: Track[] | null) => void;
  onExportToFicha: () => void;
}

export const GeneratorModule: React.FC<GeneratorModuleProps> = ({
  catalog,
  params,
  onParamsChange,
  manualOverrideTracks,
  onManualOverrideChange,
  onExportToFicha,
}) => {
  const [showMarkov, setShowMarkov] = useState(true);
  const [showCloud, setShowCloud] = useState(true);
  const [showTolerances, setShowTolerances] = useState(true);
  const [highlightedStage, setHighlightedStage] = useState<number | null>(null);
  const [subStageIndex, setSubStageIndex] = useState<number | null>(null);

  const zPoints = useMemo(
    () => computeIdealTrajectory(params.x_ini, params.x_obj, params.m),
    [params.x_ini, params.x_obj, params.m],
  );

  const algoResults = useMemo(
    () => runAllAlgorithms(catalog, params),
    [catalog, params],
  );

  // Ruta activa mostrada en la tabla y polilínea principal (Dijkstra óptimo o secuencia editada manualmente)
  const activeDijkstraView: AlgorithmResult = useMemo(() => {
    if (!manualOverrideTracks) return algoResults.dijkstra;
    const evaluated = evaluateSequence(manualOverrideTracks, params, zPoints);
    return {
      ...algoResults.dijkstra,
      label: 'Dijkstra (Editada por profesional)',
      stages: evaluated.stages,
      metrics: evaluated.metrics,
    };
  }, [algoResults.dijkstra, manualOverrideTracks, params, zPoints]);

  const substitutes = useMemo(() => {
    if (subStageIndex === null || activeDijkstraView.stages.length === 0) return [];
    const currentTracks = activeDijkstraView.stages.map((s) => s.track);
    return findNearestSubstitutes(catalog, params, currentTracks, subStageIndex, 5);
  }, [catalog, params, activeDijkstraView.stages, subStageIndex]);

  const handleParamUpdate = (patch: Partial<OptimizationParams>) => {
    onManualOverrideChange(null);
    setSubStageIndex(null);
    onParamsChange({ ...params, ...patch });
  };

  const applyPreset = (presetId: string) => {
    const preset = CLINICAL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    handleParamUpdate({
      x_ini: { ...preset.x_ini },
      x_obj: { ...preset.x_obj },
      m: preset.recommended_m,
    });
  };

  const handleSubstituteTrack = (replacement: Track) => {
    if (subStageIndex === null) return;
    const baseTracks = activeDijkstraView.stages.map((s) => s.track);
    const updated = [...baseTracks];
    updated[subStageIndex] = replacement;
    onManualOverrideChange(updated);
    setSubStageIndex(null);
  };

  const sourceCounts = useMemo(() => {
    const deam = catalog.filter((t) => t.source === 'DEAM').length;
    const pmemo = catalog.filter((t) => t.source === 'PMEmo').length;
    return { total: catalog.length, deam, pmemo };
  }, [catalog]);

  const allAlgosList: AlgorithmResult[] = [
    activeDijkstraView,
    algoResults.markov,
    algoResults.greedy,
    algoResults.random,
  ];

  return (
    <div className="space-y-6">
      {/* Encabezado del módulo */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Generador de Pautas Musicales y Plano Circumplejo de Russell
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Optimización geométrica en [-1, 1]² bajo Principio ISO ·{' '}
            {sourceCounts.total.toLocaleString('es-CO')} pistas auditadas disponibles
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {manualOverrideTracks && (
            <button
              type="button"
              onClick={() => onManualOverrideChange(null)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar óptimo Dijkstra
            </button>
          )}
          <button
            type="button"
            onClick={() => handleParamUpdate({ seed: params.seed + 1 })}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Nueva semilla Markov ({params.seed})
          </button>
          <button
            type="button"
            onClick={onExportToFicha}
            disabled={activeDijkstraView.stages.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] rounded-lg hover:bg-[#143326] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            Llevar a Ficha Técnica
          </button>
        </div>
      </div>

      {/* Alerta controlada de infactibilidad geométrica */}
      {!activeDijkstraView.metrics.feasible && (
        <div
          role="alert"
          data-testid="infeasibility-alert"
          className="bg-rose-50 border border-rose-300 rounded-lg p-4 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-900 space-y-1">
            <p className="font-semibold">
              Alerta controlada de infactibilidad geométrica (umbrales conservados estrictamente)
            </p>
            <p className="text-xs text-rose-800">
              No se relajan automáticamente las restricciones de continuidad ni unicidad. Ajuste δ,
              ε_ini, ε_obj o el número de etapas m para obtener una trayectoria válida:
            </p>
            <ul className="list-disc pl-5 text-xs font-mono text-rose-900 space-y-0.5">
              {activeDijkstraView.metrics.violations.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Área principal dividida: Columna de parametrización + Plano interactivo de Russell */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Columna izquierda de controles (5 columnas) */}
        <section
          aria-label="Panel de parametrización de trayectoria"
          className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-5"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#1B4332] shrink-0" />
              Parametrización de Trayectoria ISO
            </h3>
            <span className="text-xs font-mono tabular-nums text-slate-500 whitespace-nowrap shrink-0">
              m = {params.m} etapas
            </span>
          </div>

          {/* Selector de presets de transición */}
          <div className="space-y-1.5">
            <label htmlFor="preset-select" className="block text-xs font-medium text-slate-700">
              Presets de transición preventiva / orientadora
            </label>
            <select
              id="preset-select"
              onChange={(e) => applyPreset(e.target.value)}
              value={
                CLINICAL_PRESETS.find(
                  (p) =>
                    Math.abs(p.x_ini.v - params.x_ini.v) < 0.01 &&
                    Math.abs(p.x_ini.a - params.x_ini.a) < 0.01 &&
                    Math.abs(p.x_obj.v - params.x_obj.v) < 0.01 &&
                    Math.abs(p.x_obj.a - params.x_obj.a) < 0.01,
                )?.id ?? ''
              }
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#67B93E]"
            >
              <option value="" disabled>
                Personalizado (ajuste manual de coordenadas)
              </option>
              {CLINICAL_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Coordenadas x_ini y x_obj */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-2.5 p-3 bg-slate-50/90 rounded-md">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-slate-800 whitespace-nowrap">
                  Inicial (x_ini)
                </span>
                <span className="text-[11px] font-mono tabular-nums text-slate-600 whitespace-nowrap">
                  ({params.x_ini.v.toFixed(2)}, {params.x_ini.a.toFixed(2)})
                </span>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                  <label htmlFor="slider-v0">Valencia V₀</label>
                  <span className="font-mono tabular-nums">{params.x_ini.v.toFixed(2)}</span>
                </div>
                <input
                  id="slider-v0"
                  type="range"
                  min={-0.95}
                  max={0.95}
                  step={0.05}
                  value={params.x_ini.v}
                  onChange={(e) =>
                    handleParamUpdate({
                      x_ini: { ...params.x_ini, v: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-[#1B4332]"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                  <label htmlFor="slider-a0">Activación A₀</label>
                  <span className="font-mono tabular-nums">{params.x_ini.a.toFixed(2)}</span>
                </div>
                <input
                  id="slider-a0"
                  type="range"
                  min={-0.95}
                  max={0.95}
                  step={0.05}
                  value={params.x_ini.a}
                  onChange={(e) =>
                    handleParamUpdate({
                      x_ini: { ...params.x_ini, a: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-[#1B4332]"
                />
              </div>
            </div>

            <div className="space-y-2.5 p-3 bg-slate-50/90 rounded-md">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-slate-800 whitespace-nowrap">
                  Objetivo (x_obj)
                </span>
                <span className="text-[11px] font-mono tabular-nums text-slate-600 whitespace-nowrap">
                  ({params.x_obj.v.toFixed(2)}, {params.x_obj.a.toFixed(2)})
                </span>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                  <label htmlFor="slider-vf">Valencia V_f</label>
                  <span className="font-mono tabular-nums">{params.x_obj.v.toFixed(2)}</span>
                </div>
                <input
                  id="slider-vf"
                  type="range"
                  min={-0.95}
                  max={0.95}
                  step={0.05}
                  value={params.x_obj.v}
                  onChange={(e) =>
                    handleParamUpdate({
                      x_obj: { ...params.x_obj, v: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-[#67B93E]"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                  <label htmlFor="slider-af">Activación A_f</label>
                  <span className="font-mono tabular-nums">{params.x_obj.a.toFixed(2)}</span>
                </div>
                <input
                  id="slider-af"
                  type="range"
                  min={-0.95}
                  max={0.95}
                  step={0.05}
                  value={params.x_obj.a}
                  onChange={(e) =>
                    handleParamUpdate({
                      x_obj: { ...params.x_obj, a: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-[#67B93E]"
                />
              </div>
            </div>
          </div>

          {/* Número de etapas musicales m (4 a 8) */}
          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-slate-700">
              Número de etapas musicales (m)
            </span>
            <div className="grid grid-cols-5 gap-1.5 p-1 bg-slate-100 rounded-lg">
              {[4, 5, 6, 7, 8].map((stageCount) => (
                <button
                  key={stageCount}
                  type="button"
                  onClick={() => handleParamUpdate({ m: stageCount })}
                  className={`py-1.5 text-xs font-mono font-semibold rounded-md transition-colors cursor-pointer ${
                    params.m === stageCount
                      ? 'bg-[#1B4332] text-white shadow-sm'
                      : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  {stageCount}
                </button>
              ))}
            </div>
          </div>

          {/* Filtro de fuente del catálogo */}
          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-slate-700">
              Fuente del catálogo auditado
            </span>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'ALL', label: `Ambos (${sourceCounts.total})` },
                  { id: 'DEAM', label: `DEAM (${sourceCounts.deam})` },
                  { id: 'PMEmo', label: `PMEmo (${sourceCounts.pmemo})` },
                ] as Array<{ id: SourceFilter; label: string }>
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleParamUpdate({ sourceFilter: opt.id })}
                  className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate cursor-pointer ${
                    params.sourceFilter === opt.id
                      ? 'bg-white text-[#1B4332] font-semibold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hiperparámetros */}
          <div className="space-y-3 pt-1 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-800">
              Hiperparámetros de Costo J(P) y Restricciones
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                  <label htmlFor="param-lambda">Peso adherencia λ</label>
                  <span className="font-mono tabular-nums">{params.lambda.toFixed(2)}</span>
                </div>
                <input
                  id="param-lambda"
                  type="range"
                  min={0.1}
                  max={2.0}
                  step={0.05}
                  value={params.lambda}
                  onChange={(e) => handleParamUpdate({ lambda: Number(e.target.value) })}
                  className="w-full accent-[#1B4332]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                  <label htmlFor="param-beta">Boltzmann β (Markov)</label>
                  <span className="font-mono tabular-nums">{params.beta.toFixed(1)}</span>
                </div>
                <input
                  id="param-beta"
                  type="range"
                  min={0.5}
                  max={15.0}
                  step={0.5}
                  value={params.beta}
                  onChange={(e) => handleParamUpdate({ beta: Number(e.target.value) })}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                  <label htmlFor="param-delta">Salto máximo δ</label>
                  <span className="font-mono tabular-nums">{params.delta.toFixed(2)}</span>
                </div>
                <input
                  id="param-delta"
                  type="range"
                  min={0.05}
                  max={1.5}
                  step={0.05}
                  value={params.delta}
                  onChange={(e) => handleParamUpdate({ delta: Number(e.target.value) })}
                  className="w-full accent-[#1B4332]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                  <label htmlFor="param-eps-ini">Tolerancia ε_ini</label>
                  <span className="font-mono tabular-nums">{params.epsilon_ini.toFixed(2)}</span>
                </div>
                <input
                  id="param-eps-ini"
                  type="range"
                  min={0.02}
                  max={0.8}
                  step={0.02}
                  value={params.epsilon_ini}
                  onChange={(e) => handleParamUpdate({ epsilon_ini: Number(e.target.value) })}
                  className="w-full accent-[#1B4332]"
                />
              </div>

              <div className="col-span-2">
                <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                  <label htmlFor="param-eps-obj">Tolerancia objetivo ε_obj</label>
                  <span className="font-mono tabular-nums">{params.epsilon_obj.toFixed(2)}</span>
                </div>
                <input
                  id="param-eps-obj"
                  type="range"
                  min={0.02}
                  max={0.8}
                  step={0.02}
                  value={params.epsilon_obj}
                  onChange={(e) => handleParamUpdate({ epsilon_obj: Number(e.target.value) })}
                  className="w-full accent-[#1B4332]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Columna derecha de visualización en el plano de Russell (7 columnas) */}
        <section
          aria-label="Visualización del Plano Circumplejo de Russell"
          className="xl:col-span-7 bg-white border border-slate-200 rounded-lg p-5 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Plano Circumplejo de Afecto (Russell, 1980)
              </h3>
              <p className="text-xs text-slate-500">
                Pase el cursor sobre los nodos para inspeccionar coordenadas exactas (V, A) y
                adherencia a z_j
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMarkov}
                  onChange={(e) => setShowMarkov(e.target.checked)}
                  className="accent-blue-600 rounded"
                />
                Ruta Markov
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCloud}
                  onChange={(e) => setShowCloud(e.target.checked)}
                  className="accent-[#1B4332] rounded"
                />
                Nube catálogo
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTolerances}
                  onChange={(e) => setShowTolerances(e.target.checked)}
                  className="accent-[#1B4332] rounded"
                />
                Radios ε
              </label>
            </div>
          </div>

          <RussellPlane
            catalog={catalog}
            params={params}
            zPoints={zPoints}
            dijkstra={activeDijkstraView}
            markov={algoResults.markov}
            showMarkov={showMarkov}
            showCatalogCloud={showCloud}
            showToleranceCircles={showTolerances}
            highlightedStage={highlightedStage}
            onSelectStage={(st) => setHighlightedStage(st === highlightedStage ? null : st)}
          />
        </section>
      </div>

      {/* Franja de tarjetas KPI comparativas de los 4 algoritmos */}
      <section aria-label="Comparativa de algoritmos en tiempo real" className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Comparativa de Algoritmos en Tiempo Real (Criterio CA3 · Medición performance.now)
          </h3>
          <span className="text-xs text-slate-500">
            Restricciones activas: d_max ≤ {params.delta.toFixed(2)} · e_ini ≤{' '}
            {params.epsilon_ini.toFixed(2)} · e_obj ≤ {params.epsilon_obj.toFixed(2)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {allAlgosList.map((res) => (
            <KpiCard key={res.algorithm} result={res} params={params} />
          ))}
        </div>
      </section>

      {/* Tabla de revisión profesional y sustitución controlada de pistas */}
      <section
        aria-label="Tabla de revisión profesional y sustitución de pistas"
        className="bg-white border border-slate-200 rounded-lg overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Revisión Profesional y Sustitución Controlada de Pistas (Mitigación Riesgo R3)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ley 23 de 1982: enlaces externos de referencia únicamente · Sin almacenamiento ni
              reproducción de audio MP3/WAV
            </p>
          </div>
          {manualOverrideTracks && (
            <span className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded">
              Secuencia ajustada manualmente · J(P) recalculado
            </span>
          )}
        </div>

        {activeDijkstraView.stages.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-600">
            No hay secuencia factible para mostrar con los umbrales actuales. Ajuste los parámetros
            de tolerancia en el panel izquierdo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Etapa</th>
                  <th className="py-2.5 px-3">ID Pista</th>
                  <th className="py-2.5 px-3">Obra / Intérprete</th>
                  <th className="py-2.5 px-3">Fuente</th>
                  <th className="py-2.5 px-3 text-right">Escala Orig. (V, A)</th>
                  <th className="py-2.5 px-3 text-right">Norm. [-1,1]²</th>
                  <th className="py-2.5 px-3 text-right">Paso ||Δx||</th>
                  <th className="py-2.5 px-3 text-right">Desv. z_j</th>
                  <th className="py-2.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {activeDijkstraView.stages.map((st, idx) => {
                  const qMeta = QUADRANT_META[st.track.quadrant];
                  const stepViolated =
                    st.step_distance !== null && st.step_distance > params.delta + 1e-9;
                  return (
                    <tr
                      key={`${st.stage}-${st.track.track_id}`}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        highlightedStage === st.stage ? 'bg-emerald-50/60' : ''
                      }`}
                      onMouseEnter={() => setHighlightedStage(st.stage)}
                      onMouseLeave={() => setHighlightedStage(null)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#1B4332] tabular-nums">
                        {st.stage}/{params.m}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {st.track.track_id}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{st.track.title}</div>
                        <div className="text-[11px] text-slate-500">
                          {st.track.artist} · {qMeta.shortLabel}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap">
                        {st.track.source}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        ({st.track.v_raw.toFixed(2)}, {st.track.a_raw.toFixed(2)})
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-900 font-medium whitespace-nowrap">
                        ({st.track.v_norm.toFixed(3)}, {st.track.a_norm.toFixed(3)})
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap ${
                          stepViolated ? 'text-rose-700 font-bold' : 'text-slate-700'
                        }`}
                      >
                        {st.step_distance === null ? '—' : st.step_distance.toFixed(3)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {st.ref_distance.toFixed(3)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <a
                            href={st.track.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Abrir referencia externa para ${st.track.title}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Escuchar ({st.track.external_platform})
                          </a>
                          <button
                            type="button"
                            onClick={() => setSubStageIndex(idx)}
                            aria-label={`Sustituir pista etapa ${st.stage}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#1B4332] bg-[#67B93E]/15 hover:bg-[#67B93E]/25 rounded transition-colors cursor-pointer"
                          >
                            Sustituir pista
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal reutilizable de sustitución de pista por vecinas del mismo cuadrante */}
      <TrackSwapModal
        stageDetail={subStageIndex !== null ? activeDijkstraView.stages[subStageIndex] ?? null : null}
        substitutes={substitutes}
        onSelectReplacement={handleSubstituteTrack}
        onClose={() => setSubStageIndex(null)}
      />
    </div>
  );
};
