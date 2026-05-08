'use client';

import type { OcaiValores } from './cultura.actions';

const SIZE = 260;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 100;

const TIPOS = ['CLAN', 'ADHOCRACY', 'MARKET', 'HIERARCHY'] as const;
const LABELS = ['Clã', 'Adhocracia', 'Mercado', 'Hierarquia'];
// angles: top, right, bottom, left
const ANGLES = [-90, 0, 90, 180];

function toXY(angle: number, r: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function valToR(val: number) {
  return (val / 100) * R;
}

function polygon(vals: OcaiValores) {
  return TIPOS.map((t, i) => {
    const { x, y } = toXY(ANGLES[i]!, valToR(vals[t]));
    return `${x},${y}`;
  }).join(' ');
}

export default function RadarChart({
  atual,
  desejado,
  titulo,
}: {
  atual: OcaiValores;
  desejado: OcaiValores;
  titulo?: string;
}) {
  const gridLevels = [25, 50, 75, 100];

  return (
    <div style={{ textAlign: 'center' }}>
      {titulo && <p style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{titulo}</p>}
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
        {/* Desejado polygon */}
        <polygon
          points={polygon(desejado)}
          fill="rgba(201,162,39,0.15)"
          stroke="#c9a227"
          strokeWidth="2"
          strokeDasharray="5,3"
        />
        {/* Atual polygon */}
        <polygon
          points={polygon(atual)}
          fill="rgba(15,34,68,0.12)"
          stroke="#0f2244"
          strokeWidth="2"
        />
        {/* Dots atual */}
        {TIPOS.map((t, i) => {
          const { x, y } = toXY(ANGLES[i]!, valToR(atual[t]));
          return <circle key={t} cx={x} cy={y} r={4} fill="#0f2244" />;
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
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px', fontSize: '11px', color: '#64748b' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ display: 'inline-block', width: '16px', height: '2px', background: '#0f2244' }} />
          Atual
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ display: 'inline-block', width: '16px', height: '2px', background: '#c9a227', borderTop: '2px dashed #c9a227' }} />
          Desejado
        </span>
      </div>
    </div>
  );
}
