/**
 * Módulo 4: Evaluación Experimental de 30 Escenarios (CA2) y Benchmark de Latencia P95 <= 2.0 s (CA3).
 * Ejecuta en vivo los 4 algoritmos (Dijkstra, Markov, Vecino más cercano y Aleatoria admisible)
 * sobre los 30 escenarios parametrizados y cronometra 100 corridas con performance.now().
 */

import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Download,
  Play,
  Timer,
} from 'lucide-react';
import type { ExperimentalAggregate, Track } from '../../types/sirem';
import { runExperimentalBattery } from '../../services/mathEngine';
import { DEFAULT_PARAMS, EXPERIMENTAL_SCENARIOS_30 } from '../../data/seedData';

interface BenchmarkModuleProps {
  catalog: Track[];
}

export const BenchmarkModule: React.FC<BenchmarkModuleProps> = ({ catalog }) => {
  const [report, setReport] = useState<ExperimentalAggregate | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleRunBattery = () => {
    setIsRunning(true);
    setTimeout(() => {
      const result = runExperimentalBattery(catalog, EXPERIMENTAL_SCENARIOS_30, DEFAULT_PARAMS);
      setReport(result);
      setIsRunning(false);
    }, 20);
  };

  const handleExportCsv = () => {
    if (!report) return;
    const header = [
      'scenario_id',
      'label',
      'transition',
      'm',
      'dijkstra_feasible',
      'dijkstra_J',
      'dijkstra_dmax',
      'dijkstra_eobj',
      'dijkstra_ms',
      'markov_feasible',
      'markov_J',
      'markov_ms',
      'greedy_feasible',
      'greedy_J',
      'greedy_ms',
      'random_feasible',
      'random_J',
      'random_ms',
    ].join(',');
    const rows = report.rows.map((r) =>
      [
        r.scenario_id,
        `"${r.label}"`,
        r.transition,
        r.m,
        r.dijkstra_feasible,
        r.dijkstra_J ?? '',
        r.dijkstra_dmax ?? '',
        r.dijkstra_eobj ?? '',
        r.dijkstra_ms,
        r.markov_feasible,
        r.markov_J ?? '',
        r.markov_ms,
        r.greedy_feasible,
        r.greedy_J ?? '',
        r.greedy_ms,
        r.random_feasible,
        r.random_J ?? '',
        r.random_ms,
      ].join(','),
    );
    const blob = new Blob([[header, ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SIREM_Evaluacion_30_Escenarios_CA2_CA3.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Evaluación Experimental: 30 Escenarios (CA2) y Rendimiento P95 (CA3)
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Batería comparativa en vivo sobre el catálogo de{' '}
            {catalog.length.toLocaleString('es-CO')} pistas + 100 corridas de latencia P95
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {report && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV (30 esc.)
            </button>
          )}
          <button
            type="button"
            onClick={handleRunBattery}
            disabled={isRunning}
            data-testid="run-experimental-btn"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143326] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            {isRunning
              ? 'Ejecutando evaluación...'
              : report
                ? 'Re-ejecutar Batería'
                : 'Ejecutar 30 Escenarios + 100 Corridas'}
          </button>
        </div>
      </div>

      {!report && !isRunning && (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-3">
          <Activity className="w-8 h-8 text-[#1B4332] mx-auto" />
          <h3 className="text-base font-semibold text-slate-900">
            Lista la batería experimental CA2 y CA3
          </h3>
          <p className="text-xs text-slate-600 max-w-xl mx-auto">
            Al iniciar la evaluación, el motor ejecutará en su navegador los 4 algoritmos (Dijkstra,
            Markov, Vecino más cercano y Aleatoria admisible) sobre los 30 escenarios de transición
            entre cuadrantes (m = 4..8), seguido de 100 corridas cronometradas con{' '}
            <code className="font-mono">performance.now()</code> para acreditar el criterio CA3 (P95
            ≤ 2,0 s).
          </p>
          <button
            type="button"
            onClick={handleRunBattery}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143326] rounded-lg cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            Iniciar Evaluación Experimental
          </button>
        </div>
      )}

      {report && (
        <div className="space-y-6" data-testid="experimental-results">
          {/* Franja de indicadores CA3 y CA2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-[#1B4332]/40 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1B4332]">
                  Criterio CA3 · Latencia P95 (100 corridas)
                </span>
                <Timer className="w-4 h-4 text-[#1B4332]" />
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
                {(report.benchmark100.p95Ms / 1000).toFixed(3)} s{' '}
                <span className="text-xs font-normal text-slate-500">
                  ({report.benchmark100.p95Ms.toFixed(1)} ms)
                </span>
              </div>
              <div className="text-xs text-emerald-700 font-medium mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {report.benchmark100.meetsCA3
                  ? 'Acreditado: P95 ≤ 2,00 s (ref. proyecto ~0,48 s)'
                  : 'Supera umbral 2,00 s'}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs font-medium text-slate-500">
                Mediana P50 / Máximo (100 corridas Dijkstra)
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
                {report.benchmark100.p50Ms.toFixed(1)} ms{' '}
                <span className="text-sm font-normal text-slate-500">
                  / máx {report.benchmark100.maxMs.toFixed(1)} ms
                </span>
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Medición real en frontend con performance.now()
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs font-medium text-slate-500">
                Criterio CA2 · Factibilidad Dijkstra (30 escenarios)
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-[#1B4332] mt-1.5">
                {report.summary[0].feasibilityPct.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Costo medio J(P): {report.summary[0].meanJ?.toFixed(3) ?? '—'}
              </div>
            </div>
          </div>

          {/* Tabla de resumen agregado */}
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Resumen Agregado sobre los 30 Escenarios Experimentales
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                    <th className="py-2.5 px-4">Algoritmo</th>
                    <th className="py-2.5 px-3 text-right">Factibilidad (%)</th>
                    <th className="py-2.5 px-3 text-right">Costo Medio J(P)</th>
                    <th className="py-2.5 px-3 text-right">d_max Medio</th>
                    <th className="py-2.5 px-3 text-right">e_obj Medio</th>
                    <th className="py-2.5 px-4 text-right">Latencia P95 (ms)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.summary.map((row, idx) => (
                    <tr
                      key={row.algorithm}
                      className={idx === 0 ? 'bg-emerald-50/40 font-medium' : ''}
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900">{row.algorithm}</td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {row.feasibilityPct.toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {row.meanJ !== null ? row.meanJ.toFixed(4) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {row.meanDmax !== null ? row.meanDmax.toFixed(4) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {row.meanEobj !== null ? row.meanEobj.toFixed(4) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#1B4332]">
                        {row.p95Ms.toFixed(2)} ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Tabla detallada por escenario */}
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Detalle por Escenario (ESC-01 a ESC-30)
              </h3>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="py-2 px-4">ID</th>
                    <th className="py-2 px-3">Escenario / Transición</th>
                    <th className="py-2 px-2 text-center">m</th>
                    <th className="py-2 px-3 text-right">Dijkstra J(P)</th>
                    <th className="py-2 px-3 text-right">Markov J(P)</th>
                    <th className="py-2 px-3 text-right">Vecino J(P)</th>
                    <th className="py-2 px-3 text-right">Aleatorio J(P)</th>
                    <th className="py-2 px-4 text-right">Dijkstra (ms)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.rows.map((r) => (
                    <tr key={r.scenario_id} className="hover:bg-slate-50">
                      <td className="py-2 px-4 font-mono font-semibold text-slate-900">
                        {r.scenario_id}
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-slate-900 font-medium">{r.label}</span>
                        <span className="text-slate-500"> · {r.transition}</span>
                      </td>
                      <td className="py-2 px-2 text-center font-mono tabular-nums">{r.m}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-[#1B4332]">
                        {r.dijkstra_J !== null ? r.dijkstra_J.toFixed(3) : 'Infactible'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-blue-700">
                        {r.markov_J !== null ? r.markov_J.toFixed(3) : 'Infactible'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                        {r.greedy_J !== null ? r.greedy_J.toFixed(3) : 'Infactible'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                        {r.random_J !== null ? r.random_J.toFixed(3) : 'Infactible'}
                      </td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-700">
                        {r.dijkstra_ms.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
