'use client';

import { calculateZone, zoneBgColor } from '../governance/scoring';

export type HeatmapCellData = {
  severity: number;
  probability: number;
  count: number;
  items?: Array<{ id: string; title: string }>;
};

export type HeatmapMatrixProps = {
  entityType: 'risk' | 'problem' | 'impact';
  data: HeatmapCellData[];
  onClickCell?: (severity: number, probability: number) => void;
  showNumbers?: boolean;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
};

const CELL_SIZE: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-base',
};

const Y_LABEL: Record<HeatmapMatrixProps['entityType'], string> = {
  risk:    'Probabilidade',
  problem: 'Probabilidade',
  impact:  'Extensão',
};

const ENTITY_LABEL: Record<HeatmapMatrixProps['entityType'], string> = {
  risk:    'riscos',
  problem: 'problemas',
  impact:  'impactos',
};

export function HeatmapMatrix({
  entityType,
  data,
  onClickCell,
  showNumbers = true,
  size = 'md',
  loading = false,
}: HeatmapMatrixProps) {
  const cellLookup = new Map(data.map((d) => [`${d.severity}-${d.probability}`, d]));
  const cellClass = CELL_SIZE[size];
  const yLabel = Y_LABEL[entityType];
  const entityLabel = ENTITY_LABEL[entityType];
  const totalCount = data.reduce((sum, d) => sum + d.count, 0);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center p-8 text-sm text-gray-400"
        aria-busy="true"
        aria-label="Carregando matriz"
      >
        Carregando matriz...
      </div>
    );
  }

  if (totalCount === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-gray-400">
        Nenhum {entityLabel.slice(0, -1)} encontrado.
      </div>
    );
  }

  const cellWidth = cellClass.split(' ')[0]; // e.g. "w-12"

  return (
    <div>
      {/* ── Desktop 5×5 grid ──────────────────────────── */}
      <div
        className="hidden sm:block"
        role="grid"
        aria-label={`Heatmap de ${entityLabel}`}
      >
        <div className="flex gap-2">
          {/* Rotated Y-axis label */}
          <div className="flex items-center justify-center" style={{ width: 16 }}>
            <span
              className="text-xs text-gray-500 select-none whitespace-nowrap"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              {yLabel} ↑
            </span>
          </div>

          <div className="flex flex-col gap-1">
            {/* Rows: probability descending (5 at top) */}
            {[5, 4, 3, 2, 1].map((prob) => (
              <div key={prob} className="flex items-center gap-1">
                <span className="w-4 shrink-0 text-xs text-gray-500 text-right leading-none">
                  {prob}
                </span>

                {[1, 2, 3, 4, 5].map((sev) => {
                  const score = sev * prob;
                  const zone = calculateZone(score);
                  const cell = cellLookup.get(`${sev}-${prob}`);
                  const count = cell?.count ?? 0;
                  const tooltip = cell?.items?.map((i) => i.title).join('\n') ?? '';
                  const clickable = !!onClickCell && count > 0;

                  return (
                    <button
                      key={sev}
                      role="gridcell"
                      className={[
                        cellClass,
                        'flex items-center justify-center rounded font-semibold transition-opacity',
                        clickable
                          ? 'cursor-pointer hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500'
                          : 'cursor-default',
                      ].join(' ')}
                      style={{
                        backgroundColor: zoneBgColor(zone),
                        opacity: count === 0 ? 0.3 : 1,
                      }}
                      onClick={clickable ? () => onClickCell(sev, prob) : undefined}
                      disabled={!clickable}
                      aria-label={`${count} ${entityLabel} com severidade ${sev} e ${yLabel.toLowerCase()} ${prob}`}
                      title={tooltip || undefined}
                    >
                      {showNumbers && count > 0 && (
                        <span className="text-white drop-shadow-sm">{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

            {/* X-axis ticks */}
            <div className="flex items-center gap-1 mt-0.5 ml-5">
              {[1, 2, 3, 4, 5].map((sev) => (
                <div
                  key={sev}
                  className={`${cellWidth} flex items-center justify-center`}
                >
                  <span className="text-xs text-gray-500">{sev}</span>
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-gray-500 mt-0.5 ml-5">
              Severidade →
            </p>
          </div>
        </div>
      </div>

      {/* ── Mobile: vertical list ─────────────────────── */}
      <ul
        className="sm:hidden space-y-2"
        aria-label={`Lista de ${entityLabel} por severidade`}
      >
        {data
          .filter((d) => d.count > 0)
          .sort((a, b) => b.severity * b.probability - a.severity * a.probability)
          .map((d) => {
            const zone = calculateZone(d.severity * d.probability);
            const yAbbr = yLabel.substring(0, 3);
            return (
              <li key={`${d.severity}-${d.probability}`}>
                <button
                  className="w-full flex items-center justify-between p-3 rounded border border-gray-200 bg-white text-sm"
                  style={{ borderLeftColor: zoneBgColor(zone), borderLeftWidth: 4 }}
                  onClick={() => onClickCell?.(d.severity, d.probability)}
                  aria-label={`${d.count} ${entityLabel} — severidade ${d.severity}, ${yLabel.toLowerCase()} ${d.probability}`}
                >
                  <span className="text-gray-700">
                    Sev {d.severity} × {yAbbr}. {d.probability}
                  </span>
                  <span className="font-bold text-gray-900">{d.count}</span>
                </button>
              </li>
            );
          })}
      </ul>
    </div>
  );
}
