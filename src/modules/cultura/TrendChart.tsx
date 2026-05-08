import type { OcaiValores } from './cultura.utils';

type Ciclo = {
  label: string;   // e.g. "Dez/2025" or avaliacao.nome
  geral:  OcaiValores;
};

const SERIES: { id: keyof OcaiValores; label: string; color: string }[] = [
  { id: 'CLAN',      label: 'Clã',        color: '#3b82f6' },
  { id: 'ADHOCRACY', label: 'Adhocracia', color: '#f59e0b' },
  { id: 'MARKET',    label: 'Mercado',    color: '#ef4444' },
  { id: 'HIERARCHY', label: 'Hierarquia', color: '#8b5cf6' },
];

const W = 520;
const H = 180;
const PAD_L = 32;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 36;
const CHART_W = W - PAD_L - PAD_R;
const CHART_H = H - PAD_T - PAD_B;
const MAX_VAL = 50; // OCAI geral rarely exceeds 50

export default function TrendChart({ ciclos }: { ciclos: Ciclo[] }) {
  if (ciclos.length < 2) return null;

  const n = ciclos.length;
  const xStep = CHART_W / (n - 1);

  function x(i: number) { return PAD_L + i * xStep; }
  function y(v: number) { return PAD_T + CHART_H - (v / MAX_VAL) * CHART_H; }

  return (
    <div>
      <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
        {/* Grid lines */}
        {[0, 10, 20, 30, 40, 50].map((v) => (
          <g key={v}>
            <line x1={PAD_L} y1={y(v)} x2={W - PAD_R} y2={y(v)} stroke="#f1f5f9" strokeWidth={1} />
            <text x={PAD_L - 4} y={y(v) + 3} textAnchor="end" fontSize={8} fill="#94a3b8">{v}</text>
          </g>
        ))}

        {/* X-axis labels */}
        {ciclos.map((c, i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 4}
            textAnchor="middle"
            fontSize={9}
            fill="#64748b"
            style={{ maxWidth: `${xStep - 4}px` }}
          >
            {c.label.length > 12 ? c.label.slice(0, 11) + '…' : c.label}
          </text>
        ))}

        {/* Series lines + dots */}
        {SERIES.map((s) => {
          const points = ciclos.map((c, i) => `${x(i)},${y(c.geral[s.id])}`).join(' ');
          return (
            <g key={s.id}>
              <polyline
                points={points}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {ciclos.map((c, i) => (
                <circle key={i} cx={x(i)} cy={y(c.geral[s.id])} r={3.5} fill={s.color} />
              ))}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '6px' }}>
        {SERIES.map((s) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '20px', height: '3px', background: s.color, borderRadius: '2px' }} />
            <span style={{ fontSize: '11px', color: '#64748b' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
