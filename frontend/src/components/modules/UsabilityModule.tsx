/**
 * Módulo 5: Consentimiento Informado Obligatorio, Cronómetro Pareado y Umbral Económico MGA (CA5).
 * Implementa el bloqueo de consentimiento informado (Mitigación R5, Ley 1581 de 2012),
 * cronómetro pareado (preparación manual frente a asistida con SIREM) y verificación
 * del punto de equilibrio MGA (19,20 minutos ahorrados por guía al 9,0% E.A.).
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Download,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import type { UsabilityTrialRecord } from '../../types/sirem';
import { percentile } from '../../services/mathEngine';
import { SEED_USABILITY_TRIALS } from '../../data/seedData';
import {
  loadUsabilityTrials,
  saveUsabilityTrials,
  insertUsabilityTrialRemote,
} from '../../lib/supabaseClient';

const MGA_BASELINES = {
  original: {
    id: 'original' as const,
    label: 'Línea Base Original ($7.375.000 COP)',
    capex_cop: 7375000,
    breakeven_min: 19.2,
    target_saved_min: 30.0,
  },
  sc01: {
    id: 'sc01' as const,
    label: 'Línea Base Actualizada SC-01 ($7.465.000 COP)',
    capex_cop: 7465000,
    breakeven_min: 19.29,
    target_saved_min: 30.0,
  },
};

const TARGET_ASSISTED_MAX_MIN = 5.0;

function formatTimer(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const UsabilityModule: React.FC = () => {
  const [trials, setTrials] = useState<UsabilityTrialRecord[]>(() =>
    loadUsabilityTrials(SEED_USABILITY_TRIALS),
  );
  const [mgaMode, setMgaMode] = useState<'original' | 'sc01'>('sc01');

  // Paso 1: Compuerta de Consentimiento Informado (Riesgo R5)
  const [participantCode, setParticipantCode] = useState('EVAL-07');
  const [profileType, setProfileType] =
    useState<UsabilityTrialRecord['profile_type']>('Orientador');
  const [consentChecked, setConsentChecked] = useState(false);

  // Paso 2: Cronómetro Pareado (Manual vs. SIREM)
  const [manualRunning, setManualRunning] = useState(false);
  const [manualSec, setManualSec] = useState(0);
  const [manualInputMin, setManualInputMin] = useState<string>('35.0');

  const [siremRunning, setSiremRunning] = useState(false);
  const [siremSec, setSiremSec] = useState(0);
  const [siremInputMin, setSiremInputMin] = useState<string>('4.5');

  const [utilityLikert, setUtilityLikert] = useState<number>(5);
  const [clarityLikert, setClarityLikert] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!manualRunning) return;
    const id = setInterval(() => {
      setManualSec((s) => {
        const next = s + 1;
        setManualInputMin((next / 60).toFixed(2));
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [manualRunning]);

  useEffect(() => {
    if (!siremRunning) return;
    const id = setInterval(() => {
      setSiremSec((s) => {
        const next = s + 1;
        setSiremInputMin((next / 60).toFixed(2));
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [siremRunning]);

  const consentValid = consentChecked && participantCode.trim().length >= 3;
  const activeMga = MGA_BASELINES[mgaMode];

  const analysis = useMemo(() => {
    const manualList = trials.map((t) => t.manual_minutes);
    const siremList = trials.map((t) => t.sirem_minutes);
    const savedList = trials.map((t) => t.saved_minutes);
    const utilityList = trials.map((t) => t.utility_likert);

    const medianManual = percentile(manualList, 50);
    const medianSirem = percentile(siremList, 50);
    const medianSaved = percentile(savedList, 50);
    const avgUtility =
      utilityList.length > 0
        ? utilityList.reduce((a, b) => a + b, 0) / utilityList.length
        : 0;

    return {
      count: trials.length,
      medianManual,
      medianSirem,
      medianSaved,
      avgUtility,
      meetsCA5Time: trials.length > 0 && medianSirem <= TARGET_ASSISTED_MAX_MIN,
      meetsMGABreakeven: trials.length > 0 && medianSaved >= activeMga.breakeven_min,
      meetsProjectGoal30: trials.length > 0 && medianSaved >= activeMga.target_saved_min,
    };
  }, [trials, activeMga]);

  const handleSaveTrial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentValid) return;

    const mMin = Number(manualInputMin);
    const sMin = Number(siremInputMin);
    if (!Number.isFinite(mMin) || mMin <= 0 || !Number.isFinite(sMin) || sMin <= 0) {
      setSaveFeedback('Ingrese tiempos válidos mayores a 0 minutos para ambas tareas.');
      return;
    }

    const newRecord: UsabilityTrialRecord = {
      id: `trial-${Date.now()}`,
      participant_code: participantCode.trim().toUpperCase(),
      profile_type: profileType,
      consent_signed: true,
      consent_timestamp: new Date().toISOString(),
      manual_minutes: Number(mMin.toFixed(2)),
      sirem_minutes: Number(sMin.toFixed(2)),
      saved_minutes: Number((mMin - sMin).toFixed(2)),
      completed_without_help: true,
      utility_likert: utilityLikert,
      clarity_likert: clarityLikert,
      notes: notes.trim() || 'Evaluación pareada sin observaciones adicionales.',
    };

    const updated = [...trials, newRecord];
    setTrials(updated);
    saveUsabilityTrials(updated);
    void insertUsabilityTrialRemote(newRecord);
    setManualRunning(false);
    setSiremRunning(false);
    setNotes('');
    setConsentChecked(false);
    setParticipantCode(`EVAL-${String(updated.length + 1).padStart(2, '0')}`);
    setSaveFeedback(
      `Registro ${newRecord.participant_code} guardado en localStorage y enviado a usability_trials en Supabase (ahorro observado: ${newRecord.saved_minutes.toFixed(2)} min).`,
    );
  };

  const handleDeleteTrial = (id: string) => {
    const updated = trials.filter((t) => t.id !== id);
    setTrials(updated);
    saveUsabilityTrials(updated);
  };

  const handleResetSeed = () => {
    setTrials(SEED_USABILITY_TRIALS);
    saveUsabilityTrials(SEED_USABILITY_TRIALS);
    setSaveFeedback('Registros piloto iniciales restaurados.');
  };

  const handleExportCsv = () => {
    const header =
      'participant_code,profile_type,consent_signed,consent_timestamp,manual_minutes,sirem_minutes,saved_minutes,utility_likert,clarity_likert,notes';
    const rows = trials.map((t) =>
      [
        t.participant_code,
        t.profile_type,
        t.consent_signed,
        t.consent_timestamp,
        t.manual_minutes,
        t.sirem_minutes,
        t.saved_minutes,
        t.utility_likert,
        t.clarity_likert,
        `"${t.notes.replace(/"/g, '""')}"`,
      ].join(','),
    );
    const blob = new Blob([[header, ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SIREM_CA5_Cronometraje_Pareado_MGA.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Usabilidad, Consentimiento y Cronometraje Pareado (CA5 y Umbral MGA)
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Paquete 1.6 · Contraste empírico frente a meta ≤ 5,0 min asistido, meta de ahorro 30,0
            min y punto de equilibrio económico MGA ({activeMga.breakeven_min.toFixed(2)} min/guía
            al 9,0% E.A.)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMgaMode('original')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                mgaMode === 'original'
                  ? 'bg-[#1B4332] text-white font-semibold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Original ($7,375M · 19,20 min)
            </button>
            <button
              type="button"
              onClick={() => setMgaMode('sc01')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                mgaMode === 'sc01'
                  ? 'bg-[#1B4332] text-white font-semibold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Actualizada SC-01 ($7,465M · 19,29 min)
            </button>
          </div>
          <button
            type="button"
            onClick={handleResetSeed}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar piloto
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143326] rounded-lg cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Indicadores automáticos de desempeño MGA y CA5 */}
      <section
        aria-label="Análisis automático MGA y CA5"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">Mediana Tiempo Asistido (CA5)</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {analysis.medianSirem.toFixed(2)} min
          </div>
          <div
            className={`text-xs font-medium mt-1 flex items-center gap-1 ${
              analysis.meetsCA5Time ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {analysis.meetsCA5Time ? 'Cumple meta ≤ 5,00 min' : 'Supera meta de 5,00 min'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">Mediana Preparación Manual</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {analysis.medianManual.toFixed(2)} min
          </div>
          <div className="text-xs text-slate-600 mt-1">
            Meta de ahorro del proyecto: {activeMga.target_saved_min.toFixed(1)} min/guía
          </div>
        </div>

        <div className="bg-white border border-[#1B4332]/40 rounded-lg p-4">
          <div className="text-xs font-semibold text-[#1B4332]">
            Ahorro vs. {activeMga.label}
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#1B4332] mt-1">
            +{analysis.medianSaved.toFixed(2)} min
          </div>
          <div
            className={`text-xs font-medium mt-1 ${
              analysis.meetsMGABreakeven ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {analysis.meetsMGABreakeven
              ? `Supera equilibrio MGA (${activeMga.breakeven_min.toFixed(2)} min) y meta 30 min`
              : `Por debajo de ${activeMga.breakeven_min.toFixed(2)} min`}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">Utilidad Percibida Media</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {analysis.avgUtility.toFixed(2)} / 5.0
          </div>
          <div className="text-xs text-slate-600 mt-1">
            Basado en {analysis.count} sesiones pareadas
          </div>
        </div>
      </section>

      {saveFeedback && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 text-xs text-emerald-900 font-medium">
          {saveFeedback}
        </div>
      )}

      {/* Formulario Paso 1 + Paso 2 */}
      <form
        onSubmit={handleSaveTrial}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        {/* Paso 1: Compuerta obligatoria de consentimiento */}
        <section
          aria-label="Paso 1: Consentimiento informado obligatorio"
          className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ClipboardCheck className="w-4 h-4 text-[#1B4332]" />
            <h3 className="text-sm font-semibold text-slate-900">
              Paso 1 · Consentimiento Informado (Ley 1581 de 2012)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="eval-code" className="block text-xs font-medium text-slate-700">
                Código seudonimizado
              </label>
              <input
                id="eval-code"
                type="text"
                required
                value={participantCode}
                onChange={(e) => setParticipantCode(e.target.value)}
                placeholder="Ej. EVAL-04"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#67B93E]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="profile-type" className="block text-xs font-medium text-slate-700">
                Perfil del evaluador
              </label>
              <select
                id="profile-type"
                value={profileType}
                onChange={(e) =>
                  setProfileType(e.target.value as UsabilityTrialRecord['profile_type'])
                }
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#67B93E]"
              >
                <option value="Psicólogo">Psicólogo</option>
                <option value="Orientador">Orientador</option>
                <option value="Practicante supervisado">Practicante supervisado</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 space-y-2">
            <p>
              Declaro participar voluntariamente como profesional o practicante supervisado en la
              prueba de usabilidad académica de SIREM (UIS). Entiendo que no se recolectan datos
              sensibles ni historias clínicas, y que la medición cronometrada es estrictamente
              seudonimizada.
            </p>
            <label className="flex items-start gap-2.5 cursor-pointer font-semibold text-slate-900 pt-1">
              <input
                id="consent-checkbox"
                data-testid="consent-checkbox"
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 accent-[#1B4332]"
              />
              <span>Acepto el consentimiento informado y autorizo el registro seudonimizado</span>
            </label>
          </div>

          {!consentValid && (
            <div
              data-testid="consent-lock-banner"
              className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2.5"
            >
              <Lock className="w-4 h-4 shrink-0" />
              <span>
                Mitigación R5: El cronómetro y el registro de la prueba permanecen bloqueados hasta
                marcar el consentimiento informado.
              </span>
            </div>
          )}
        </section>

        {/* Paso 2: Cronómetro pareado + Encuesta Likert */}
        <section
          aria-label="Paso 2: Cronómetro pareado y encuesta de utilidad"
          className={`lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 space-y-5 transition-opacity ${
            !consentValid ? 'opacity-60' : ''
          }`}
        >
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Paso 2 · Cronometraje Pareado (Tarea Equivalente) y Encuesta Likert
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Use el cronómetro en vivo o digite los minutos observados tras completar la tarea
              manual y asistida.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cronómetro de tarea manual */}
            <div className="p-3.5 rounded-md border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">A. Preparación Manual</span>
                <span className="font-mono text-base font-bold tabular-nums text-slate-900">
                  {formatTimer(manualSec)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!consentValid}
                  onClick={() => setManualRunning((r) => !r)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                >
                  {manualRunning ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  {manualRunning ? 'Pausar' : 'Iniciar'}
                </button>
                <button
                  type="button"
                  disabled={!consentValid}
                  onClick={() => {
                    setManualRunning(false);
                    setManualSec(0);
                  }}
                  className="px-2.5 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                >
                  Reiniciar
                </button>
              </div>
              <div>
                <label htmlFor="manual-min-input" className="block text-[11px] text-slate-600 mb-1">
                  Tiempo manual registrado (min)
                </label>
                <input
                  id="manual-min-input"
                  type="number"
                  step="0.1"
                  min="0.1"
                  disabled={!consentValid}
                  value={manualInputMin}
                  onChange={(e) => setManualInputMin(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono tabular-nums disabled:bg-slate-100"
                />
              </div>
            </div>

            {/* Cronómetro asistido con SIREM */}
            <div className="p-3.5 rounded-md border border-[#1B4332]/30 bg-emerald-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1B4332]">B. Asistida con SIREM</span>
                <span className="font-mono text-base font-bold tabular-nums text-[#1B4332]">
                  {formatTimer(siremSec)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!consentValid}
                  onClick={() => setSiremRunning((r) => !r)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-[#1B4332] rounded hover:bg-[#143326] disabled:opacity-40 cursor-pointer"
                >
                  {siremRunning ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  {siremRunning ? 'Pausar' : 'Iniciar'}
                </button>
                <button
                  type="button"
                  disabled={!consentValid}
                  onClick={() => {
                    setSiremRunning(false);
                    setSiremSec(0);
                  }}
                  className="px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                >
                  Reiniciar
                </button>
              </div>
              <div>
                <label htmlFor="sirem-min-input" className="block text-[11px] text-slate-700 mb-1">
                  Tiempo SIREM registrado (min)
                </label>
                <input
                  id="sirem-min-input"
                  type="number"
                  step="0.1"
                  min="0.1"
                  disabled={!consentValid}
                  value={siremInputMin}
                  onChange={(e) => setSiremInputMin(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono tabular-nums disabled:bg-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Encuesta Likert */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-medium text-slate-700 mb-1.5">
                Utilidad percibida para orientación (1 a 5)
              </span>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    disabled={!consentValid}
                    onClick={() => setUtilityLikert(score)}
                    className={`flex-1 py-1.5 text-xs font-mono font-semibold rounded border cursor-pointer disabled:opacity-40 ${
                      utilityLikert === score
                        ? 'bg-[#1B4332] text-white border-[#1B4332]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-slate-700 mb-1.5">
                Claridad de la Ficha Técnica exportable (1 a 5)
              </span>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    disabled={!consentValid}
                    onClick={() => setClarityLikert(score)}
                    className={`flex-1 py-1.5 text-xs font-mono font-semibold rounded border cursor-pointer disabled:opacity-40 ${
                      clarityLikert === score
                        ? 'bg-[#1B4332] text-white border-[#1B4332]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="trial-notes" className="block text-xs font-medium text-slate-700 mb-1">
              Observación técnica de usabilidad (sin datos personales)
            </label>
            <input
              id="trial-notes"
              type="text"
              disabled={!consentValid}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Flujo de sustitución de pista comprensible..."
              className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs disabled:bg-slate-100"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!consentValid}
              data-testid="save-usability-btn"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143326] disabled:opacity-40 rounded-lg cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Registrar Prueba Pareada
            </button>
          </div>
        </section>
      </form>

      {/* Tabla de ensayos registrados */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">
            Registro Seudonimizado de Pruebas Pareadas ({trials.length} participantes)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                <th className="py-2.5 px-4">Código</th>
                <th className="py-2.5 px-3">Perfil</th>
                <th className="py-2.5 px-3">Consentimiento</th>
                <th className="py-2.5 px-3 text-right">Manual (min)</th>
                <th className="py-2.5 px-3 text-right">SIREM (min)</th>
                <th className="py-2.5 px-3 text-right">Ahorro (min)</th>
                <th className="py-2.5 px-3 text-center">Utilidad</th>
                <th className="py-2.5 px-3">Observaciones</th>
                <th className="py-2.5 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trials.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">
                    {t.participant_code}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">{t.profile_type}</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-medium">
                    Verificado ({t.consent_timestamp.slice(0, 10)})
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {t.manual_minutes.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-[#1B4332]">
                    {t.sirem_minutes.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-emerald-700">
                    +{t.saved_minutes.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                    {t.utility_likert}/5
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{t.notes}</td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteTrial(t.id)}
                      aria-label={`Eliminar registro ${t.participant_code}`}
                      className="p-1 text-slate-400 hover:text-rose-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
