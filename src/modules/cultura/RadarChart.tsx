'use client';

import type { OcaiValores } from './cultura.utils';

const SIZE = 280;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 100;

const TIPOS = ['CLAN', 'ADHOCRACY', 'MARKET', 'HIERARCHY'] as const;
const LABELS = ['Clã', 'Adhocracia', 'Mercado', 'Hierarquia'];
const ANGLES = [-90, 0, 90, 180];

export type RadarSeries = {
  label: string;
  values: OcaiValores;
  color: string;
  dashed?: boolean;
  strokeWidth?: number;
};

function toXY(angle: number, r: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function valToR(val: number) {
  return (val / 100) * R;
}

function polygonPoints(vals: OcaiValores) {
  return TIPOS.map((t, i) => {
    const { x, y } = toXY(ANGLES[i]!, valToR(vals[t]));
    return `${x},${y}`;
  }).join(' ');
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function RadarChart({
  series,
  titulo,
}: {
  series: RadarSeries[];
  titulo?: string;
}) {
  const gridLevels = [25, 50, 75, 100];

  return (
    <div style={{ textAlign: 'center' }}>
      {titulo && (
        <p style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {titulo}
        </p>
      )}
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ overflow: 'visible' }}>
        {/* Grid circles */}
        {gridLevels.map((lvl) => (
          <circle key={lvl} cx={CX} cy={CY} r={valToR(lvl)} fill="none" stroke="#e2e8f0" strokeWidth="1" />
        ))}
        {/* Axes */}
        {TIPOS.map((_, i) => {
          const { x, y } = toXY(ANGLES[i]!, R);
          return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
        })}
        {/* Series polygons (back to front) */}
        {series.map((s, si) => (
          <polygon
            key={si}
            points={polygonPoints(s.values)}
            fill={hexToRgba(s.color, 0.08)}
            stroke={s.color}
            strokeWidth={s.strokeWidth ?? 2}
            strokeDasharray={s.dashed ? '5,3' : undefined}
          />
        ))}
        {/* Dots on first (primary) series */}
        {series[0] && TIPOS.map((t, i) => {
          const { x, y } = toXY(ANGLES[i]!, valToR(series[0]!.values[t]));
          return <circle key={t} cx={x} cy={y} r={3.5} fill={series[0]!.color} />;
        })}
        {/* Labels */}
        {TIPOS.map((_, i) => {
          const { x, y } = toXY(ANGLES[i]!, R + 18);
          return (
            <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="#374151" fontFamily="system-ui">
              {LABELS[i]}
            </text>
          );
        })}
      </svg>
      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '8px', flexWrap: 'wrap' }}>
        {series.map((s, si) => (
          <span key={si} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#64748b' }}>
            <span style={{ display: 'inline-block', width: '16px', height: '2px', background: s.color, borderTop: s.dashed ? `2px dashed ${s.color}` : 'none' }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
