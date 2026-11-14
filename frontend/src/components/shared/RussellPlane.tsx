/**
 * Visualizador 2D interactivo en SVG del Plano Circumplejo de Russell [-1, 1]^2.
 * Renderiza los 4 cuadrantes afectivos, la nube de puntos del catálogo auditado,
 * los círculos de tolerancia (epsilon_ini, epsilon_obj), la trayectoria lineal ideal ISO (z_j),
 * la ruta comparadora de Markov y la ruta óptima principal de Dijkstra con etiquetas numeradas.
 */

import React, { useMemo, useState } from 'react';
import type { AlgorithmResult, OptimizationParams, Point2D, Track } from '../../types/sirem';
import { QUADRANT_META } from '../../services/mathEngine';

interface RussellPlaneProps {
  catalog: Track[];
  params: OptimizationParams;
  zPoints: Point2D[];
  dijkstra: AlgorithmResult;
  markov?: AlgorithmResult;
  showMarkov?: boolean;
  showCatalogCloud?: boolean;
  showToleranceCircles?: boolean;
  compactPrint?: boolean;
  highlightedStage?: number | null;
  onSelectStage?: (stageNumber: number) => void;
}

const SIZE = 560;
const PAD = 48;
const INNER = SIZE - PAD * 2;

function toSvgX(v: number): number {
  return PAD + ((v + 1) / 2) * INNER;
}

function toSvgY(a: number): number {
  return PAD + ((1 - a) / 2) * INNER;
}

export const RussellPlane: React.FC<RussellPlaneProps> = ({
  catalog,
  params,
  zPoints,
  dijkstra,
  markov,
  showMarkov = true,
  showCatalogCloud = true,
  showToleranceCircles = true,
  compactPrint = false,
  highlightedStage = null,
  onSelectStage,
}) => {
  const [hoveredInfo, setHoveredInfo] = useState<{
    x: number;
    y: number;
    title: string;
    subtitle: string;
    coords: string;
  } | null>(null);

  const cloudPoints = useMemo(() => {
    if (!showCatalogCloud) return [];
    const pool =
      params.sourceFilter === 'ALL'
        ? catalog
        : catalog.filter((t) => t.source === params.sourceFilter);
    return pool.map((t) => ({
      id: t.track_id,
      cx: toSvgX(t.v_norm),
      cy: toSvgY(t.a_norm),
      color: QUADRANT_META[t.quadrant].dotHex,
      title: t.title,
      artist: t.artist,
      source: t.source,
      v: t.v_norm,
      a: t.a_norm,
    }));
  }, [catalog, params.sourceFilter, showCatalogCloud]);

  const zPolyline = zPoints.map((p) => `${toSvgX(p.v)},${toSvgY(p.a)}`).join(' ');

  const dijkstraPolyline = dijkstra.stages
    .map((s) => `${toSvgX(s.track.v_norm)},${toSvgY(s.track.a_norm)}`)
    .join(' ');

  const markovPolyline =
    markov && markov.stages.length > 0
      ? markov.stages
          .map((s) => `${toSvgX(s.track.v_norm)},${toSvgY(s.track.a_norm)}`)
          .join(' ')
      : '';

  const radiusScale = INNER / 2;

  return (
    <div className="relative w-full select-none" data-testid="russell-plane-container">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label="Plano Circumplejo de Russell [-1, 1]^2 con trayectoria de referencia ISO y rutas optimizadas"
        className={`w-full h-auto bg-white rounded-lg border border-slate-200 ${
          compactPrint ? 'max-w-[440px] mx-auto' : 'max-h-[540px]'
        }`}
      >
        {/* Fondos cromáticos de los 4 cuadrantes */}
        <rect
          x={PAD}
          y={PAD}
          width={INNER / 2}
          height={INNER / 2}
          fill={QUADRANT_META.Q2.bgTint}
        />
        <rect
          x={PAD + INNER / 2}
          y={PAD}
          width={INNER / 2}
          height={INNER / 2}
          fill={QUADRANT_META.Q1.bgTint}
        />
        <rect
          x={PAD}
          y={PAD + INNER / 2}
          width={INNER / 2}
          height={INNER / 2}
          fill={QUADRANT_META.Q3.bgTint}
        />
        <rect
          x={PAD + INNER / 2}
          y={PAD + INNER / 2}
          width={INNER / 2}
          height={INNER / 2}
          fill={QUADRANT_META.Q4.bgTint}
        />

        {/* Cuadrícula y marcas de ejes */}
        {[-1, -0.5, 0, 0.5, 1].map((tick) => {
          const x = toSvgX(tick);
          const y = toSvgY(tick);
          const isAxis = tick === 0;
          return (
            <g key={tick}>
              <line
                x1={x}
                y1={PAD}
                x2={x}
                y2={PAD + INNER}
                stroke={isAxis ? '#475569' : '#CBD5E1'}
                strokeWidth={isAxis ? 1.4 : 0.75}
                strokeDasharray={isAxis ? undefined : '3,3'}
              />
              <line
                x1={PAD}
                y1={y}
                x2={PAD + INNER}
                y2={y}
                stroke={isAxis ? '#475569' : '#CBD5E1'}
                strokeWidth={isAxis ? 1.4 : 0.75}
                strokeDasharray={isAxis ? undefined : '3,3'}
              />
              <text
                x={x}
                y={PAD + INNER + 16}
                textAnchor="middle"
                className="fill-slate-500 text-[10px] font-mono tabular-nums"
              >
                {tick > 0 ? `+${tick.toFixed(1)}` : tick.toFixed(1)}
              </text>
              <text
                x={PAD - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-slate-500 text-[10px] font-mono tabular-nums"
              >
                {tick > 0 ? `+${tick.toFixed(1)}` : tick.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Marco exterior */}
        <rect
          x={PAD}
          y={PAD}
          width={INNER}
          height={INNER}
          fill="none"
          stroke="#94A3B8"
          strokeWidth={1}
        />

        {/* Etiquetas en las esquinas de los cuadrantes */}
        <text x={PAD + 10} y={PAD + 18} className="fill-rose-800/80 text-[11px] font-semibold">
          C-II · Tensión / Alerta
        </text>
        <text
          x={PAD + INNER - 10}
          y={PAD + 18}
          textAnchor="end"
          className="fill-amber-800/85 text-[11px] font-semibold"
        >
          C-I · Alegría / Activación
        </text>
        <text
          x={PAD + 10}
          y={PAD + INNER - 10}
          className="fill-indigo-900/80 text-[11px] font-semibold"
        >
          C-III · Melancolía / Baja Energía
        </text>
        <text
          x={PAD + INNER - 10}
          y={PAD + INNER - 10}
          textAnchor="end"
          className="fill-emerald-900/85 text-[11px] font-semibold"
        >
          C-IV · Calma / Serenidad
        </text>

        {/* Títulos de ejes */}
        <text
          x={SIZE / 2}
          y={SIZE - 8}
          textAnchor="middle"
          className="fill-slate-700 text-[11px] font-semibold tracking-wide"
        >
          Valencia (V) [-1, +1]
        </text>
        <text
          x={14}
          y={SIZE / 2}
          textAnchor="middle"
          transform={`rotate(-90 14 ${SIZE / 2})`}
          className="fill-slate-700 text-[11px] font-semibold tracking-wide"
        >
          Activación / Arousal (A) [-1, +1]
        </text>

        {/* Nube de fondo del catálogo musical */}
        {showCatalogCloud && (
          <g opacity={compactPrint ? 0.2 : 0.28}>
            {cloudPoints.map((pt) => (
              <circle
                key={pt.id}
                cx={pt.cx}
                cy={pt.cy}
                r={compactPrint ? 1.8 : 2.2}
                fill={pt.color}
              />
            ))}
          </g>
        )}

        {/* Círculos de tolerancia inicial y final */}
        {showToleranceCircles && (
          <g>
            <circle
              cx={toSvgX(params.x_ini.v)}
              cy={toSvgY(params.x_ini.a)}
              r={params.epsilon_ini * radiusScale}
              fill="rgba(27, 67, 50, 0.05)"
              stroke="#1B4332"
              strokeWidth={1}
              strokeDasharray="4,4"
              opacity={0.55}
            />
            <circle
              cx={toSvgX(params.x_obj.v)}
              cy={toSvgY(params.x_obj.a)}
              r={params.epsilon_obj * radiusScale}
              fill="rgba(103, 185, 62, 0.07)"
              stroke="#67B93E"
              strokeWidth={1}
              strokeDasharray="4,4"
              opacity={0.7}
            />
          </g>
        )}

        {/* Trayectoria lineal ideal del Principio ISO z_j */}
        <polyline
          points={zPolyline}
          fill="none"
          stroke="#64748B"
          strokeWidth={1.75}
          strokeDasharray="6,5"
        />
        {zPoints.map((zp, idx) => (
          <circle
            key={`z-${idx}`}
            cx={toSvgX(zp.v)}
            cy={toSvgY(zp.a)}
            r={3.5}
            fill="#FFFFFF"
            stroke="#64748B"
            strokeWidth={1.5}
          />
        ))}

        {/* Ruta del comparador estocástico Markov (azul punteado) */}
        {showMarkov && markovPolyline && (
          <g>
            <polyline
              points={markovPolyline}
              fill="none"
              stroke="#2563EB"
              strokeWidth={2}
              strokeDasharray="5,4"
              opacity={0.85}
            />
            {markov?.stages.map((st) => (
              <circle
                key={`mk-${st.stage}`}
                cx={toSvgX(st.track.v_norm)}
                cy={toSvgY(st.track.a_norm)}
                r={4.2}
                fill="#EFF6FF"
                stroke="#2563EB"
                strokeWidth={1.6}
                className="cursor-pointer"
                onMouseEnter={() =>
                  setHoveredInfo({
                    x: toSvgX(st.track.v_norm),
                    y: toSvgY(st.track.a_norm),
                    title: `Markov · Etapa ${st.stage}: ${st.track.title}`,
                    subtitle: `${st.track.artist} (${st.track.source})`,
                    coords: `V=${st.track.v_norm.toFixed(3)}, A=${st.track.a_norm.toFixed(3)}`,
                  })
                }
                onMouseLeave={() => setHoveredInfo(null)}
              />
            ))}
          </g>
        )}

        {/* Ruta óptima principal Dijkstra (verde institucional UIS) */}
        {dijkstra.stages.length > 0 &&
          (() => {
            const placed: Array<{ x: number; y: number }> = [];
            const nodePositions = dijkstra.stages.map((st) => {
              const rawX = toSvgX(st.track.v_norm);
              const rawY = toSvgY(st.track.a_norm);
              let dispX = rawX;
              let dispY = rawY;
              for (const prev of placed) {
                const distPx = Math.hypot(dispX - prev.x, dispY - prev.y);
                if (distPx < 22) {
                  dispX += 11;
                  dispY -= 11;
                }
              }
              placed.push({ x: dispX, y: dispY });
              return { st, rawX, rawY, dispX, dispY };
            });

            return (
              <g>
                <polyline
                  points={dijkstraPolyline}
                  fill="none"
                  stroke="#1B4332"
                  strokeWidth={2.75}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {nodePositions.map(({ st, rawX, rawY, dispX, dispY }) => {
                  const isHighlighted = highlightedStage === st.stage;
                  const isOffset = dispX !== rawX || dispY !== rawY;
                  return (
                    <g
                      key={`dj-${st.stage}`}
                      className={onSelectStage ? 'cursor-pointer' : undefined}
                      onClick={() => onSelectStage?.(st.stage)}
                      onMouseEnter={() =>
                        setHoveredInfo({
                          x: rawX,
                          y: rawY,
                          title: `Etapa ${st.stage}: ${st.track.title}`,
                          subtitle: `${st.track.artist} · ${st.track.source}`,
                          coords: `V=${st.track.v_norm.toFixed(3)}, A=${st.track.a_norm.toFixed(3)} · d(z)=${st.ref_distance.toFixed(3)}`,
                        })
                      }
                      onMouseLeave={() => setHoveredInfo(null)}
                    >
                      {isOffset && (
                        <>
                          <line
                            x1={rawX}
                            y1={rawY}
                            x2={dispX}
                            y2={dispY}
                            stroke="#1B4332"
                            strokeWidth={1.25}
                          />
                          <circle cx={rawX} cy={rawY} r={3.5} fill="#1B4332" />
                        </>
                      )}
                      {isHighlighted && (
                        <circle cx={dispX} cy={dispY} r={13} fill="rgba(103, 185, 62, 0.25)" />
                      )}
                      <circle
                        cx={dispX}
                        cy={dispY}
                        r={9.5}
                        fill={isHighlighted ? '#1B4332' : '#67B93E'}
                        stroke="#FFFFFF"
                        strokeWidth={2}
                      />
                      <text
                        x={dispX}
                        y={dispY + 3.5}
                        textAnchor="middle"
                        className="fill-white text-[9.5px] font-bold font-mono tabular-nums pointer-events-none"
                      >
                        {st.stage}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })()}

        {/* Marcadores de anclaje x_ini y x_obj */}
        <g>
          <rect
            x={toSvgX(params.x_ini.v) - 5}
            y={toSvgY(params.x_ini.a) - 5}
            width={10}
            height={10}
            transform={`rotate(45 ${toSvgX(params.x_ini.v)} ${toSvgY(params.x_ini.a)})`}
            fill="#1B4332"
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />
          <text
            x={toSvgX(params.x_ini.v)}
            y={toSvgY(params.x_ini.a) - 10}
            textAnchor="middle"
            className="fill-[#1B4332] text-[10px] font-mono font-bold"
          >
            x_ini
          </text>

          <circle
            cx={toSvgX(params.x_obj.v)}
            cy={toSvgY(params.x_obj.a)}
            r={6}
            fill="none"
            stroke="#1B4332"
            strokeWidth={2}
          />
          <circle
            cx={toSvgX(params.x_obj.v)}
            cy={toSvgY(params.x_obj.a)}
            r={2.5}
            fill="#67B93E"
          />
          <text
            x={toSvgX(params.x_obj.v)}
            y={toSvgY(params.x_obj.a) + 16}
            textAnchor="middle"
            className="fill-[#1B4332] text-[10px] font-mono font-bold"
          >
            x_obj
          </text>
        </g>

        {/* Tooltip interactivo sobre nodos de la ruta */}
        {hoveredInfo && !compactPrint && (
          <g
            transform={`translate(${Math.min(
              Math.max(hoveredInfo.x - 115, 10),
              SIZE - 245,
            )}, ${hoveredInfo.y < 110 ? hoveredInfo.y + 18 : hoveredInfo.y - 68})`}
          >
            <rect
              width={235}
              height={54}
              rx={6}
              fill="#0F172A"
              fillOpacity={0.94}
              stroke="#334155"
              strokeWidth={1}
            />
            <text x={10} y={17} className="fill-white text-[10.5px] font-semibold">
              {hoveredInfo.title.slice(0, 34)}
            </text>
            <text x={10} y={32} className="fill-slate-300 text-[9.5px]">
              {hoveredInfo.subtitle.slice(0, 36)}
            </text>
            <text x={10} y={46} className="fill-[#86EFAC] text-[9.5px] font-mono tabular-nums">
              {hoveredInfo.coords}
            </text>
          </g>
        )}
      </svg>

      {/* Leyenda del plano */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600 px-1">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 bg-[#1B4332]" />
          Ruta Principal Dijkstra (1..{params.m})
        </span>
        {showMarkov && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-blue-600" />
            Comparador Markov (Boltzmann)
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-slate-500" />
          Trayectoria Ideal ISO (z_j)
        </span>
        {showToleranceCircles && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full border border-dashed border-[#1B4332]" />
            Radios ε_ini / ε_obj
          </span>
        )}
      </div>
    </div>
  );
};
