/**
 * Módulo 2: Ficha Técnica Profesional Imprimible/Exportable y Selector de 20 Casos Sintéticos (CA4).
 * Permite cargar y auditar los 20 casos sintéticos seudonimizados (Ley 1581 de 2012)
 * y exportar la Ficha Técnica institucional en formatos JSON, CSV, HTML e impresión/PDF.
 */

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck2,
  Printer,
  ShieldAlert,
} from 'lucide-react';
import type {
  OptimizationParams,
  SyntheticCase,
  Track,
} from '../../types/sirem';
import {
  QUADRANT_META,
  computeIdealTrajectory,
  evaluateSequence,
  solveDijkstra,
} from '../../services/mathEngine';
import { SYNTHETIC_CASES_20 } from '../../data/seedData';
import { loadFichaObservations, saveFichaObservation } from '../../lib/supabaseClient';
import { RussellPlane } from '../shared/RussellPlane';

interface TechnicalSheetModuleProps {
  catalog: Track[];
  params: OptimizationParams;
  manualOverrideTracks: Track[] | null;
  onLoadSyntheticCase: (sc: SyntheticCase) => void;
}

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const TechnicalSheetModule: React.FC<TechnicalSheetModuleProps> = ({
  catalog,
  params,
  manualOverrideTracks,
  onLoadSyntheticCase,
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>('SIREM-CASO-001');
  const [customCaseCode, setCustomCaseCode] = useState<string>('SIREM-2026-001');
  const [observationsMap, setObservationsMap] = useState<Record<string, string>>(() =>
    loadFichaObservations(),
  );
  const [showAudit20, setShowAudit20] = useState<boolean>(false);

  const zPoints = useMemo(
    () => computeIdealTrajectory(params.x_ini, params.x_obj, params.m),
    [params.x_ini, params.x_obj, params.m],
  );

  const activeResult = useMemo(() => {
    if (manualOverrideTracks) {
      const ev = evaluateSequence(manualOverrideTracks, params, zPoints);
      return {
        stages: ev.stages,
        metrics: ev.metrics,
        execution_ms: 0,
      };
    }
    return solveDijkstra(catalog, params, zPoints);
  }, [catalog, manualOverrideTracks, params, zPoints]);

  // Evaluación automática de los 20 casos sintéticos para la matriz de verificación CA4
  const audit20Results = useMemo(() => {
    return SYNTHETIC_CASES_20.map((sc) => {
      const scParams: OptimizationParams = {
        ...params,
        x_ini: sc.x_ini,
        x_obj: sc.x_obj,
        m: sc.m,
        sourceFilter: sc.sourceFilter,
        lambda: sc.lambda,
        delta: sc.delta,
        epsilon_ini: sc.epsilon_ini,
        epsilon_obj: sc.epsilon_obj,
      };
      const res = solveDijkstra(catalog, scParams);
      const refsValid =
        res.stages.length === sc.m &&
        res.stages.every((st) => st.track.external_url.startsWith('https://'));
      const fieldsComplete = res.stages.every((st) =>
        Boolean(st.track.track_id && st.track.title && st.track.artist),
      );
      const passed = res.metrics.feasible && refsValid && fieldsComplete;
      return {
        ...sc,
        passed,
        cost_J: res.metrics.cost_J,
        d_max: res.metrics.d_max,
        e_obj: res.metrics.e_obj,
        unique: res.metrics.unique_tracks,
        refsValid,
        fieldsComplete,
        ms: res.execution_ms,
      };
    });
  }, [catalog, params]);

  const passedCount = audit20Results.filter((r) => r.passed).length;

  const currentObs = observationsMap[customCaseCode] ?? '';
  const handleObsChange = (val: string) => {
    setObservationsMap((prev) => ({ ...prev, [customCaseCode]: val }));
    saveFichaObservation(customCaseCode, val);
  };

  const generatedTimestamp = useMemo(() => new Date().toLocaleString('es-CO'), []);

  const handleSelectCase = (sc: SyntheticCase) => {
    setSelectedCaseId(sc.case_id);
    setCustomCaseCode(sc.case_id);
    onLoadSyntheticCase(sc);
  };

  const handleExportJson = () => {
    const payload = {
      document_type: 'SIREM_FICHA_TECNICA_OFICIAL',
      institution:
        'Universidad Industrial de Santander (UIS) — Escuela de Ingeniería de Sistemas e Informática',
      case_id_pseudonymized: customCaseCode,
      catalog_version: 'v1.0 - 1.284 registros auditados (522 DEAM + 762 PMEmo)',
      generated_at: new Date().toISOString(),
      legal_notice:
        'Alcance de apoyo: SIREM documenta parámetros geométricos en el espacio (V, A) sobre anotaciones psicométricas publicadas (DEAM y PMEmo); no emite diagnósticos clínicos, no sustituye el juicio del profesional ni garantiza eficacia terapéutica.',
      parameters: params,
      metrics: activeResult.metrics,
      technical_observations: currentObs,
      sequence: activeResult.stages.map((s) => ({
        stage: s.stage,
        track_id: s.track.track_id,
        title: s.track.title,
        artist: s.track.artist,
        source: s.track.source,
        v_raw: s.track.v_raw,
        a_raw: s.track.a_raw,
        v_norm: s.track.v_norm,
        a_norm: s.track.a_norm,
        step_distance: s.step_distance,
        ref_distance: s.ref_distance,
        external_platform: s.track.external_platform,
        external_url: s.track.external_url,
      })),
    };
    downloadBlob(
      `${customCaseCode}_ficha_sirem.json`,
      JSON.stringify(payload, null, 2),
      'application/json',
    );
  };

  const handleExportCsv = () => {
    const header =
      'case_id,stage,track_id,title,artist,source,v_norm,a_norm,step_distance,ref_distance,external_url';
    const rows = activeResult.stages.map((s) =>
      [
        customCaseCode,
        s.stage,
        s.track.track_id,
        `"${s.track.title.replace(/"/g, '""')}"`,
        `"${s.track.artist.replace(/"/g, '""')}"`,
        s.track.source,
        s.track.v_norm,
        s.track.a_norm,
        s.step_distance ?? '',
        s.ref_distance.toFixed(4),
        s.track.external_url,
      ].join(','),
    );
    downloadBlob(
      `${customCaseCode}_secuencia.csv`,
      [header, ...rows].join('\n'),
      'text/csv;charset=utf-8',
    );
  };

  const handleExportHtml = () => {
    const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Ficha Técnica ${customCaseCode} - SIREM UIS</title>
<style>body{font-family:system-ui,sans-serif;max-width:900px;margin:24px auto;color:#0f172a;line-height:1.5}
h1{color:#1B4332;font-size:20px}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#f1f5f9}
.notice{background:#f8fafc;border:1px solid #94a3b8;padding:12px;margin-top:18px;font-size:12px}</style></head>
<body><h1>SIREM (UIS) — Ficha Técnica de Pauta Musical</h1>
<p><strong>ID Seudonimizado:</strong> ${customCaseCode} · <strong>Catálogo:</strong> v1.0 (1.284 pistas) · <strong>Fecha:</strong> ${generatedTimestamp}</p>
<p><strong>Coordenadas:</strong> x_ini=(${params.x_ini.v.toFixed(2)}, ${params.x_ini.a.toFixed(2)}) → x_obj=(${params.x_obj.v.toFixed(2)}, ${params.x_obj.a.toFixed(2)}) · <strong>J(P):</strong> ${activeResult.metrics.cost_J.toFixed(4)} · <strong>d_max:</strong> ${activeResult.metrics.d_max.toFixed(4)} · <strong>e_obj:</strong> ${activeResult.metrics.e_obj.toFixed(4)}</p>
<table><thead><tr><th>Etapa</th><th>ID</th><th>Título</th><th>Intérprete</th><th>Fuente</th><th>(V, A)</th><th>Paso</th><th>Referencia</th></tr></thead>
<tbody>${activeResult.stages
      .map(
        (s) =>
          `<tr><td>${s.stage}</td><td>${s.track.track_id}</td><td>${s.track.title}</td><td>${s.track.artist}</td><td>${s.track.source}</td><td>(${s.track.v_norm.toFixed(3)}, ${s.track.a_norm.toFixed(3)})</td><td>${s.step_distance === null ? '—' : s.step_distance.toFixed(3)}</td><td><a href="${s.track.external_url}">${s.track.external_platform}</a></td></tr>`,
      )
      .join('')}</tbody></table>
<p><strong>Observaciones técnicas:</strong> ${currentObs || 'Sin observaciones adicionales.'}</p>
<div class="notice"><strong>Alcance de apoyo:</strong> SIREM documenta parámetros geométricos en el espacio (V, A) sobre anotaciones psicométricas publicadas (DEAM y PMEmo); no emite diagnósticos clínicos, no sustituye el juicio del profesional ni garantiza eficacia terapéutica.</div>
</body></html>`;
    downloadBlob(`${customCaseCode}_ficha_sirem.html`, html, 'text/html;charset=utf-8');
  };

  const handleExportAudit20Report = () => {
    const report = {
      criterion: 'CA4 - Lote de 20 Casos Sintéticos de Prueba',
      passed: `${passedCount}/${audit20Results.length}`,
      evaluated_at: new Date().toISOString(),
      cases: audit20Results,
    };
    downloadBlob(
      'SIREM_CA4_Reporte_20_Casos_Sinteticos.json',
      JSON.stringify(report, null, 2),
      'application/json',
    );
  };

  return (
    <div className="space-y-6">
      {/* Barra de herramientas de exportación (oculta al imprimir) */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Ficha Técnica Profesional Exportable y Lote CA4 (20 Casos)
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Documento institucional trazable (Ley 23 de 1982 · Ley 1581 de 2012) · Auditoría
            automática {passedCount}/20 casos válidos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowAudit20((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#1B4332] bg-[#67B93E]/15 hover:bg-[#67B93E]/25 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileCheck2 className="w-4 h-4" />
            {showAudit20 ? 'Ocultar Auditoría' : `Auditoría CA4 (${passedCount}/20)`}
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            JSON
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
          <button
            type="button"
            onClick={handleExportHtml}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            HTML
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143326] rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Selector de los 20 casos sintéticos de prueba (oculto al imprimir) */}
      <section
        aria-label="Selector de los 20 casos sintéticos de prueba"
        className="no-print bg-white border border-slate-200 rounded-lg p-4 space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Lote Oficial de 20 Casos Sintéticos de Prueba (Criterio CA4)
            </h3>
            <p className="text-xs text-slate-500">
              Identificadores seudonimizados libres de datos personales (Ley 1581 de 2012).
              Seleccione un caso para cargarlo en la Ficha Técnica.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="custom-case-id"
              className="text-xs font-medium text-slate-700 whitespace-nowrap"
            >
              ID Ficha:
            </label>
            <input
              id="custom-case-id"
              type="text"
              value={customCaseCode}
              onChange={(e) => setCustomCaseCode(e.target.value)}
              placeholder="SIREM-CASO-001"
              className="w-40 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#67B93E]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-1.5">
          {SYNTHETIC_CASES_20.map((sc) => {
            const isActive = selectedCaseId === sc.case_id;
            return (
              <button
                key={sc.case_id}
                type="button"
                onClick={() => handleSelectCase(sc)}
                title={`${sc.case_id}: ${sc.title}`}
                className={`px-2 py-1.5 text-[11px] font-mono rounded border text-center transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#1B4332] text-white border-[#1B4332] font-semibold'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {sc.case_id.replace('SIREM-', '')}
              </button>
            );
          })}
        </div>
      </section>

      {/* Matriz desplegable de auditoría 20/20 */}
      {showAudit20 && (
        <section
          aria-label="Lista de chequeo de los 20 casos sintéticos"
          className="no-print bg-white border border-slate-200 rounded-lg overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Reporte de Cumplimiento CA4: {passedCount}/20 Casos Sintéticos Verificados
              </h3>
              <p className="text-xs text-slate-500">
                Valida completitud de campos, restricciones geométricas (δ, ε_ini, ε_obj), unicidad
                de pista y enlaces externos válidos.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportAudit20Report}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1B4332] border border-[#1B4332]/30 rounded-md hover:bg-emerald-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar Reporte 20/20
            </button>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[11px] text-slate-600 uppercase">
                <tr>
                  <th className="py-2 px-4">Caso</th>
                  <th className="py-2 px-3">Descripción</th>
                  <th className="py-2 px-3 text-center">Etapas</th>
                  <th className="py-2 px-3 text-right">J(P)</th>
                  <th className="py-2 px-3 text-right">d_max</th>
                  <th className="py-2 px-3 text-right">e_obj</th>
                  <th className="py-2 px-3 text-center">Referencias</th>
                  <th className="py-2 px-4 text-right">Estado CA4</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {audit20Results.map((row) => (
                  <tr key={row.case_id} className="hover:bg-slate-50">
                    <td className="py-2 px-4 font-mono font-semibold text-slate-900">
                      {row.case_id}
                    </td>
                    <td className="py-2 px-3 text-slate-700">{row.title}</td>
                    <td className="py-2 px-3 text-center font-mono tabular-nums">{row.m}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      {row.cost_J.toFixed(3)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      {row.d_max.toFixed(3)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      {row.e_obj.toFixed(3)}
                    </td>
                    <td className="py-2 px-3 text-center text-emerald-700 font-medium">
                      {row.refsValid ? 'Válidas' : 'Revisar'}
                    </td>
                    <td className="py-2 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {row.passed ? 'Cumple' : 'Falla'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Documento oficial imprimible de la Ficha Técnica UIS-SIREM */}
      <article
        data-testid="ficha-tecnica-document"
        className="print-only-full bg-white border border-slate-300 rounded-lg p-6 md:p-8 space-y-6 max-w-5xl mx-auto"
      >
        {/* Encabezado institucional del documento */}
        <header className="border-b-2 border-[#1B4332] pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-[#1B4332] uppercase tracking-wider">
              Universidad Industrial de Santander (UIS) · Escuela de Ingeniería de Sistemas e
              Informática
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              Ficha Técnica de Pauta Musical — Proyecto SIREM
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Sistema Inteligente de Regulación Emocional Musical · Principio ISO & Modelo
              Circumplejo de Russell [-1, 1]²
            </p>
          </div>
          <div className="text-left sm:text-right font-mono text-xs space-y-0.5 shrink-0">
            <div className="font-bold text-slate-900">ID Caso: {customCaseCode}</div>
            <div className="text-slate-600">Catálogo: v1.0 (1.284 pistas)</div>
            <div className="text-slate-500">Emisión: {generatedTimestamp}</div>
          </div>
        </header>

        {/* Resumen de parámetros de trayectoria y plano compacto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="space-y-3 text-xs">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1.5">
              Parámetros de Trayectoria y Métricas de Continuidad
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <dt className="text-slate-500">Estado Inicial (x_ini)</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                  V₀={params.x_ini.v.toFixed(2)}, A₀={params.x_ini.a.toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Estado Objetivo (x_obj)</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                  V_f={params.x_obj.v.toFixed(2)}, A_f={params.x_obj.a.toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Etapas (m) / Fuente</dt>
                <dd className="font-mono font-semibold text-slate-900">
                  {params.m} pistas · {params.sourceFilter}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Umbrales (δ / ε_ini / ε_obj)</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                  {params.delta.toFixed(2)} / {params.epsilon_ini.toFixed(2)} /{' '}
                  {params.epsilon_obj.toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Costo Geométrico J(P)</dt>
                <dd className="font-mono font-bold text-[#1B4332] text-sm tabular-nums">
                  {Number.isFinite(activeResult.metrics.cost_J)
                    ? activeResult.metrics.cost_J.toFixed(4)
                    : 'Infactible'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Salto Máx. d_max / e_obj</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                  {Number.isFinite(activeResult.metrics.d_max)
                    ? `${activeResult.metrics.d_max.toFixed(3)} / ${activeResult.metrics.e_obj.toFixed(3)}`
                    : '—'}
                </dd>
              </div>
            </dl>
            <div className="pt-1 text-[11px] text-slate-600">
              Validación de unicidad y restricciones:{' '}
              <span className="font-semibold text-slate-900">
                {activeResult.metrics.feasible
                  ? 'Aprobada (sin repetición de pistas, dentro de umbrales)'
                  : `Observación: ${activeResult.metrics.violations.join(' ')}`}
              </span>
            </div>
          </div>

          <div>
            <RussellPlane
              catalog={catalog}
              params={params}
              zPoints={zPoints}
              dijkstra={{
                algorithm: 'dijkstra',
                label: 'Dijkstra',
                stages: activeResult.stages,
                metrics: activeResult.metrics,
                execution_ms: activeResult.execution_ms,
              }}
              showMarkov={false}
              showCatalogCloud={true}
              showToleranceCircles={true}
              compactPrint={true}
            />
          </div>
        </div>

        {/* Tabla detallada de secuencia musical */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-900">
            Secuencia Musical Documentada y Referencias Externas Verificadas
          </h3>
          <div className="overflow-x-auto border border-slate-200 rounded-md">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 uppercase">
                  <th className="py-2 px-3">Etapa</th>
                  <th className="py-2 px-3">ID Pista</th>
                  <th className="py-2 px-3">Obra e Intérprete</th>
                  <th className="py-2 px-3">Fuente</th>
                  <th className="py-2 px-3 text-right">(V, A) Norm.</th>
                  <th className="py-2 px-3 text-right">Paso ||Δx||</th>
                  <th className="py-2 px-3 text-right">Desv. z_j</th>
                  <th className="py-2 px-3">Referencia Externa (Ley 23/1982)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeResult.stages.map((st) => (
                  <tr key={st.stage}>
                    <td className="py-2 px-3 font-mono font-bold text-[#1B4332]">{st.stage}</td>
                    <td className="py-2 px-3 font-mono text-slate-700">{st.track.track_id}</td>
                    <td className="py-2 px-3">
                      <span className="font-semibold text-slate-900">{st.track.title}</span>
                      <span className="text-slate-500"> · {st.track.artist}</span>
                      <span className="text-slate-400">
                        {' '}
                        ({QUADRANT_META[st.track.quadrant].id})
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-700">{st.track.source}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      ({st.track.v_norm.toFixed(3)}, {st.track.a_norm.toFixed(3)})
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      {st.step_distance === null ? '—' : st.step_distance.toFixed(3)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      {st.ref_distance.toFixed(3)}
                    </td>
                    <td className="py-2 px-3">
                      <a
                        href={st.track.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#1B4332] underline hover:text-[#67B93E]"
                      >
                        {st.track.external_platform}
                        <ExternalLink className="w-3 h-3 no-print" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Observaciones técnicas del profesional (Ley 1581 de 2012) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="tech-observations" className="text-xs font-bold text-slate-900">
              Observaciones Técnicas del Profesional
            </label>
            <span className="text-[11px] text-amber-800 font-medium">
              Ley 1581 de 2012: NO ingresar nombres reales, cédulas ni historias clínicas
              identificables.
            </span>
          </div>
          <textarea
            id="tech-observations"
            rows={3}
            value={currentObs}
            onChange={(e) => handleObsChange(e.target.value)}
            placeholder="Registre únicamente criterios técnicos de ajuste geométrico, contexto general de orientación o motivo de sustitución de pista..."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#67B93E]"
          />
        </div>

        {/* Recuadro fijo de aviso no clínico y normativo */}
        <footer className="bg-slate-50 border border-slate-300 rounded-md p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-[#1B4332] shrink-0 mt-0.5" />
          <div className="text-xs text-slate-800 space-y-1">
            <p className="font-semibold">
              Alcance de apoyo: SIREM documenta parámetros geométricos en el espacio (V, A) sobre
              anotaciones psicométricas publicadas (DEAM y PMEmo); no emite diagnósticos clínicos,
              no sustituye el juicio del profesional ni garantiza eficacia terapéutica.
            </p>
            <p className="text-[11px] text-slate-600">
              Cumplimiento normativo: Ley 23 de 1982 (derechos de autor: sin almacenamiento ni
              transmisión de archivos MP3/WAV o letras) y Ley 1581 de 2012 (protección de datos
              personales mediante identificadores seudonimizados).
            </p>
          </div>
        </footer>
      </article>
    </div>
  );
};
