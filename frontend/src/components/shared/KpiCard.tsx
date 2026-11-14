/**
 * Tarjeta reutilizable de indicadores clave de rendimiento (KPI) para métricas geométricas y de latencia
 * (J(P), d_max, e_obj, latencia P95 y factibilidad algorítmica).
 */

import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { AlgorithmResult, OptimizationParams } from '../../types/sirem';

interface AlgorithmKpiCardProps {
  result: AlgorithmResult;
  params: OptimizationParams;
}

export const KpiCard: React.FC<AlgorithmKpiCardProps> = ({ result, params }) => {
  const isPrimary = result.algorithm === 'dijkstra';
  const roleLabel = isPrimary
    ? 'Método Principal'
    : result.algorithm === 'markov'
      ? 'Comparador Estocástico'
      : 'Línea Base';

  return (
    <div
      data-testid={`kpi-card-${result.algorithm}`}
      className={`bg-white rounded-lg p-4 border ${
        isPrimary ? 'border-[#1B4332]/50' : 'border-slate-200'
      } space-y-3`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-slate-900">{result.label}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{roleLabel}</div>
        </div>
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded ${
            result.metrics.feasible
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {result.metrics.feasible ? (
            <>
              <CheckCircle2 className="w-3 h-3" /> Factible
            </>
          ) : (
            <>
              <AlertTriangle className="w-3 h-3" /> Infactible
            </>
          )}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
        <div>
          <div className="text-[11px] text-slate-500">Costo J(P)</div>
          <div className="text-base font-bold font-mono tabular-nums text-slate-900">
            {Number.isFinite(result.metrics.cost_J) ? result.metrics.cost_J.toFixed(3) : '—'}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-slate-500">Salto d_max</div>
          <div
            className={`text-base font-bold font-mono tabular-nums ${
              result.metrics.d_max > params.delta ? 'text-rose-700' : 'text-slate-900'
            }`}
          >
            {Number.isFinite(result.metrics.d_max) ? result.metrics.d_max.toFixed(3) : '—'}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-slate-500">Error e_obj</div>
          <div
            className={`text-sm font-semibold font-mono tabular-nums ${
              result.metrics.e_obj > params.epsilon_obj ? 'text-rose-700' : 'text-slate-800'
            }`}
          >
            {Number.isFinite(result.metrics.e_obj) ? result.metrics.e_obj.toFixed(3) : '—'}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-slate-500">Tiempo (ms)</div>
          <div className="text-sm font-semibold font-mono tabular-nums text-[#1B4332]">
            {result.execution_ms.toFixed(2)} ms
          </div>
        </div>
      </div>
    </div>
  );
};
