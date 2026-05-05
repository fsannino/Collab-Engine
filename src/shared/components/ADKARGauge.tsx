type ADKARData = {
  adkarA?: number | null;
  adkarD?: number | null;
  adkarK?: number | null;
  adkarAb?: number | null;
  adkarR?: number | null;
};

const DIMENSIONS = [
  { key: 'adkarA'  as const, abbr: 'A',  label: 'Awareness — Consciência' },
  { key: 'adkarD'  as const, abbr: 'D',  label: 'Desire — Desejo' },
  { key: 'adkarK'  as const, abbr: 'K',  label: 'Knowledge — Conhecimento' },
  { key: 'adkarAb' as const, abbr: 'Ab', label: 'Ability — Habilidade' },
  { key: 'adkarR'  as const, abbr: 'R',  label: 'Reinforcement — Reforço' },
] as const;

function scoreColor(score: number): string {
  if (score >= 4) return '#16a34a';
  if (score >= 3) return '#ca8a04';
  if (score >= 2) return '#ea580c';
  return '#dc2626';
}

type ADKARGaugeProps = ADKARData & { size?: 'sm' | 'md' };

export function ADKARGauge({ adkarA, adkarD, adkarK, adkarAb, adkarR, size = 'md' }: ADKARGaugeProps) {
  const scores   = { adkarA, adkarD, adkarK, adkarAb, adkarR };
  const barH     = size === 'sm' ? 'h-1.5' : 'h-2.5';
  const textSz   = size === 'sm' ? 'text-xs' : 'text-sm';
  const allNull  = DIMENSIONS.every(({ key }) => scores[key] == null);

  if (allNull) return <p className="text-xs text-gray-400 italic">Scores ADKAR não preenchidos.</p>;

  return (
    <div className="space-y-2">
      {DIMENSIONS.map(({ key, abbr, label }) => {
        const score  = scores[key];
        const filled = score != null;
        const pct    = filled ? (score / 5) * 100 : 0;
        const color  = filled ? scoreColor(score) : '#e5e7eb';
        return (
          <div key={key} className="flex items-center gap-2">
            <span className={`${textSz} font-mono font-bold text-gray-700 w-6 shrink-0`} title={label}>{abbr}</span>
            <div className={`flex-1 bg-gray-100 rounded-full ${barH} overflow-hidden`}>
              <div className={`${barH} rounded-full transition-all duration-300`} style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className={`${textSz} text-gray-500 w-4 text-right shrink-0 tabular-nums`}>{filled ? score : '—'}</span>
          </div>
        );
      })}
    </div>
  );
}
