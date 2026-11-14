/**
 * Pie de página institucional con cumplimiento explícito de la Ley 1581 de 2012 y la Ley 23 de 1982.
 */

import React from 'react';
import { Scale, ShieldCheck } from 'lucide-react';

export const LegalFooter: React.FC = () => {
  return (
    <footer
      aria-label="Cumplimiento normativo y avisos legales"
      className="no-print bg-white border-t border-slate-200 px-4 sm:px-6 py-4 mt-auto"
    >
      <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-start sm:items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#1B4332] shrink-0 mt-0.5 sm:mt-0" />
          <span>
            <strong className="text-slate-800">Ley 1581 de 2012 (Habeas Data):</strong> Uso exclusivo de casos sintéticos o códigos seudonimizados; prohibido ingresar historias clínicas o datos personales identificables.
          </span>
        </div>

        <div className="flex items-start sm:items-center gap-2 shrink-0">
          <Scale className="w-4 h-4 text-[#1B4332] shrink-0 mt-0.5 sm:mt-0" />
          <span>
            <strong className="text-slate-800">Ley 23 de 1982 (Derechos de Autor):</strong> Sin almacenamiento ni reproducción de archivos de audio (MP3/WAV) ni letras; solo vectores (V, A) y enlaces externos.
          </span>
        </div>
      </div>
    </footer>
  );
};
