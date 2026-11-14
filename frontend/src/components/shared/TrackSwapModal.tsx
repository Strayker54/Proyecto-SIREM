/**
 * Modal interactivo para sustituir una pista de una etapa por una de sus 5 vecinas más cercanas
 * dentro del mismo cuadrante de Russell, con recálculo en vivo de J(P) (Mitigación del Riesgo R3).
 */

import React from 'react';
import { ArrowRight, X } from 'lucide-react';
import type { StageDetail, SubstituteCandidate, Track } from '../../types/sirem';
import { QUADRANT_META } from '../../services/mathEngine';

interface TrackSwapModalProps {
  stageDetail: StageDetail | null;
  substitutes: SubstituteCandidate[];
  onSelectReplacement: (track: Track) => void;
  onClose: () => void;
}

export const TrackSwapModal: React.FC<TrackSwapModalProps> = ({
  stageDetail,
  substitutes,
  onSelectReplacement,
  onClose,
}) => {
  if (!stageDetail) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sub-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="bg-white border border-slate-200 rounded-lg max-w-2xl w-full p-5 space-y-4 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
          <div>
            <h4 id="sub-dialog-title" className="text-base font-bold text-slate-900">
              Sustituir Pista — Etapa {stageDetail.stage}
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Actual: <span className="font-semibold">{stageDetail.track.title}</span> (
              {stageDetail.track.track_id}) · 5 vecinas más cercanas en{' '}
              {QUADRANT_META[stageDetail.track.quadrant].shortLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar selector de sustitución"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-md">
          {substitutes.length === 0 ? (
            <div className="p-4 text-xs text-slate-600 text-center">
              No se encontraron pistas sustitutas adicionales en el mismo cuadrante.
            </div>
          ) : (
            substitutes.map((item) => (
              <div
                key={item.track.track_id}
                className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    {item.track.title}{' '}
                    <span className="font-mono font-normal text-slate-500">
                      ({item.track.track_id} · {item.track.source})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5 font-mono tabular-nums">
                    {item.track.artist} · V={item.track.v_norm.toFixed(3)}, A=
                    {item.track.a_norm.toFixed(3)} · Δpista={item.distanceToCurrent.toFixed(3)} ·
                    Δz_j={item.distanceToRef.toFixed(3)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectReplacement(item.track)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143326] rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Seleccionar
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
