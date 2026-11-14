/**
 * Encabezado institucional UIS y aviso obligatorio de uso de apoyo técnico no clínico (Mitigación R1/R4).
 */

import React from 'react';
import { Activity, Menu, ShieldAlert } from 'lucide-react';

interface HeaderBannerProps {
  catalogCount: number;
  onOpenMobileMenu: () => void;
}

export const HeaderBanner: React.FC<HeaderBannerProps> = ({
  catalogCount,
  onOpenMobileMenu,
}) => {
  return (
    <>
      {/* Barra superior institucional */}
      <header className="no-print bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Abrir menú de módulos"
            className="lg:hidden p-2 -ml-2 text-slate-700 hover:bg-slate-100 rounded-md"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-[#1B4332] whitespace-nowrap shrink-0">
            SIREM · UIS
          </span>
          <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
            /
          </span>
          <span className="text-xs text-slate-600 truncate hidden sm:inline">
            Escuela de Ingeniería de Sistemas e Informática · Apoyo Técnico en Regulación Emocional Musical
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-slate-600 font-mono tabular-nums whitespace-nowrap">
            <Activity className="w-3.5 h-3.5 text-[#67B93E]" />
            {catalogCount.toLocaleString('es-CO')} pistas · [-1, 1]²
          </span>
        </div>
      </header>

      {/* Aviso institucional obligatorio de alcance no clínico */}
      <div
        role="region"
        aria-label="Aviso institucional de alcance no clínico"
        className="no-print bg-slate-100 border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-start sm:items-center gap-2.5 text-xs text-slate-800"
      >
        <ShieldAlert className="w-4 h-4 text-[#1B4332] shrink-0 mt-0.5 sm:mt-0" />
        <p className="leading-snug">
          <strong className="font-semibold text-[#1B4332]">Alcance de apoyo:</strong> SIREM documenta parámetros geométricos en el espacio (V, A) sobre anotaciones psicométricas publicadas (DEAM y PMEmo); no emite diagnósticos clínicos, no sustituye el juicio del profesional ni garantiza eficacia terapéutica.
        </p>
      </div>
    </>
  );
};
