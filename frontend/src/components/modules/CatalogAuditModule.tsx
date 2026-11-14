/**
 * Módulo 3: Embudo de Auditoría del Catálogo (2.596 brutos -> 1.284 válidos),
 * Explorador Interactivo, Diccionario de Datos y Contrato de Esquema JSON (CA1).
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  Database,
  Download,
  ExternalLink,
  RotateCcw,
  Search,
  Upload,
} from 'lucide-react';
import type { QuadrantId, SourceFilter, Track } from '../../types/sirem';
import {
  AUDIT_FUNNEL_STATS,
  DATA_DICTIONARY,
  SCHEMA_CONTRACT,
  catalogToCsv,
  parseCatalogCsv,
} from '../../data/seedData';
import { QUADRANT_META } from '../../services/mathEngine';

interface CatalogAuditModuleProps {
  catalog: Track[];
  isCustomCatalog: boolean;
  onReplaceCatalog: (tracks: Track[] | null) => void;
}

const PAGE_SIZE = 20;

export const CatalogAuditModule: React.FC<CatalogAuditModuleProps> = ({
  catalog,
  isCustomCatalog,
  onReplaceCatalog,
}) => {
  const [subTab, setSubTab] = useState<'explorer' | 'dictionary' | 'contract'>('explorer');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');
  const [quadFilter, setQuadFilter] = useState<'ALL' | QuadrantId>('ALL');
  const [page, setPage] = useState(1);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const counts = { Q1: 0, Q2: 0, Q3: 0, Q4: 0, DEAM: 0, PMEmo: 0 };
    for (const t of catalog) {
      counts[t.quadrant]++;
      counts[t.source]++;
    }
    return counts;
  }, [catalog]);

  const filteredTracks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((t) => {
      if (sourceFilter !== 'ALL' && t.source !== sourceFilter) return false;
      if (quadFilter !== 'ALL' && t.quadrant !== quadFilter) return false;
      if (!q) return true;
      return (
        t.track_id.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.genre.toLowerCase().includes(q)
      );
    });
  }, [catalog, search, sourceFilter, quadFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTracks.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageTracks = filteredTracks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleExportCsv = () => {
    const csv = catalogToCsv(catalog);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sirem_catalogo_auditado_${catalog.length}_pistas.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportContract = () => {
    const blob = new Blob([JSON.stringify(SCHEMA_CONTRACT, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema_contract.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const parsed = parseCatalogCsv(text);
      if (parsed.length === 0) {
        setImportFeedback(
          'Archivo CSV inválido o sin registros válidos con track_id, v_raw, a_raw.',
        );
        return;
      }
      onReplaceCatalog(parsed);
      setPage(1);
      setImportFeedback(
        `Catálogo importado correctamente: ${parsed.length} pistas válidas cargadas.`,
      );
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Catálogo Auditado y Contrato de Datos (Criterio CA1)
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Paquete 1.2 · Normalización verificada de DEAM [1, 9] y PMEmo [0, 1] al espacio [-1, 1]²
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleImportCsv}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Importar CSV
          </button>
          {isCustomCatalog && (
            <button
              type="button"
              onClick={() => {
                onReplaceCatalog(null);
                setImportFeedback('Restaurado catálogo oficial auditado de 1.284 pistas.');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar 1.284 pistas
            </button>
          )}
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143326] rounded-lg cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV ({catalog.length})
          </button>
        </div>
      </div>

      {importFeedback && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 text-xs text-emerald-900 font-medium">
          {importFeedback}
        </div>
      )}

      {/* Embudo de auditoría documental (2.596 -> 1.284) */}
      <section
        aria-label="Embudo de depuración del catálogo"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">1. Registros Brutos de Origen</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {AUDIT_FUNNEL_STATS.raw_total.toLocaleString('es-CO')}
          </div>
          <div className="text-xs text-slate-600 mt-1 font-mono tabular-nums">
            {AUDIT_FUNNEL_STATS.raw_deam.toLocaleString('es-CO')} DEAM +{' '}
            {AUDIT_FUNNEL_STATS.raw_pmemo} PMEmo
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">
            2. Exclusión Metadatos Incompletos
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-rose-700 mt-1">
            -{AUDIT_FUNNEL_STATS.excluded_missing_metadata.toLocaleString('es-CO')}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            Sin título, intérprete o anotación (V, A) completa
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">3. Exclusión de Duplicados</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-1">
            -{AUDIT_FUNNEL_STATS.excluded_duplicates}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            Deduplicación estricta por obra e identificador
          </div>
        </div>

        <div className="bg-white border border-[#1B4332]/40 rounded-lg p-4">
          <div className="text-xs font-semibold text-[#1B4332]">4. Catálogo Válido Normalizado</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#1B4332] mt-1">
            {catalog.length.toLocaleString('es-CO')}
          </div>
          <div className="text-xs text-slate-700 mt-1 font-mono tabular-nums">
            {stats.DEAM} DEAM + {stats.PMEmo} PMEmo en [-1, 1]²
          </div>
        </div>
      </section>

      {/* Distribución por cuadrantes de Russell */}
      <section
        aria-label="Distribución por cuadrantes de Russell"
        className="bg-white border border-slate-200 rounded-lg p-4"
      >
        <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-3">
          Distribución del Catálogo por Cuadrantes de Russell
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(['Q1', 'Q2', 'Q3', 'Q4'] as QuadrantId[]).map((qId) => {
            const meta = QUADRANT_META[qId];
            const count = stats[qId];
            const pct = catalog.length > 0 ? ((count / catalog.length) * 100).toFixed(1) : '0.0';
            return (
              <div key={qId} className="p-3 rounded-md border border-slate-200 bg-slate-50/70">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900">{meta.shortLabel}</span>
                  <span className="font-mono font-bold tabular-nums text-slate-900">{count}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: meta.dotHex }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                  <span>{meta.description}</span>
                  <span className="font-mono tabular-nums">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sub-pestañas de navegación */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setSubTab('explorer')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            subTab === 'explorer'
              ? 'bg-white text-slate-900 shadow-sm font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Explorador ({filteredTracks.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('dictionary')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            subTab === 'dictionary'
              ? 'bg-white text-slate-900 shadow-sm font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Diccionario de Datos
        </button>
        <button
          type="button"
          onClick={() => setSubTab('contract')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            subTab === 'contract'
              ? 'bg-white text-slate-900 shadow-sm font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          schema_contract.json
        </button>
      </div>

      {/* Contenido de cada pestaña */}
      {subTab === 'explorer' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center gap-3 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por track_id, obra, intérprete o género..."
                aria-label="Buscar en catálogo auditado"
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#67B93E]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filtrar por fuente"
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value as SourceFilter);
                  setPage(1);
                }}
                className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 bg-white"
              >
                <option value="ALL">Todas las fuentes ({catalog.length})</option>
                <option value="DEAM">DEAM ({stats.DEAM})</option>
                <option value="PMEmo">PMEmo ({stats.PMEmo})</option>
              </select>

              <select
                aria-label="Filtrar por cuadrante"
                value={quadFilter}
                onChange={(e) => {
                  setQuadFilter(e.target.value as 'ALL' | QuadrantId);
                  setPage(1);
                }}
                className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 bg-white"
              >
                <option value="ALL">Todos los cuadrantes</option>
                <option value="Q1">C-I · Alegría ({stats.Q1})</option>
                <option value="Q2">C-II · Tensión ({stats.Q2})</option>
                <option value="Q3">C-III · Melancolía ({stats.Q3})</option>
                <option value="Q4">C-IV · Calma ({stats.Q4})</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                  <th className="py-2.5 px-4">ID</th>
                  <th className="py-2.5 px-3">Título / Intérprete</th>
                  <th className="py-2.5 px-3">Fuente</th>
                  <th className="py-2.5 px-3">Cuadrante</th>
                  <th className="py-2.5 px-3 text-right">Escala Nativa (V, A)</th>
                  <th className="py-2.5 px-3 text-right">Norm [-1, 1]²</th>
                  <th className="py-2.5 px-4 text-right">Enlace Externo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageTracks.map((t) => (
                  <tr key={t.track_id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                      {t.track_id}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{t.title}</div>
                      <div className="text-[11px] text-slate-500">
                        {t.artist} · {t.genre}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">{t.source}</td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {QUADRANT_META[t.quadrant].shortLabel}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      ({t.v_raw.toFixed(2)}, {t.a_raw.toFixed(2)})
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      ({t.v_norm.toFixed(3)}, {t.a_norm.toFixed(3)})
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <a
                        href={t.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#1B4332] hover:underline font-medium"
                      >
                        {t.external_platform}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span className="font-mono tabular-nums">
              Página {safePage} de {totalPages} · {filteredTracks.length} pistas coincidentes
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}

      {subTab === 'dictionary' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2">
            <Database className="w-4 h-4 text-[#1B4332]" />
            <h3 className="text-sm font-semibold text-slate-900">
              Diccionario de Datos del Catálogo Auditado v1.0
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                  <th className="py-2.5 px-4">Campo</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Dominio / Rango</th>
                  <th className="py-2.5 px-4">Definición Técnica y Normativa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {DATA_DICTIONARY.map((d) => (
                  <tr key={d.field}>
                    <td className="py-3 px-4 font-mono font-semibold text-[#1B4332]">{d.field}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{d.type}</td>
                    <td className="py-3 px-3 font-mono text-slate-700">{d.range}</td>
                    <td className="py-3 px-4 text-slate-700">{d.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'contract' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Contrato Formal de Esquema (`schema_contract.json`)
            </h3>
            <button
              type="button"
              onClick={handleExportContract}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1B4332] rounded-md hover:bg-[#143326] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar schema_contract.json
            </button>
          </div>
          <pre className="bg-slate-900 text-emerald-200 p-4 rounded-md text-xs overflow-x-auto leading-relaxed">
            {JSON.stringify(SCHEMA_CONTRACT, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
