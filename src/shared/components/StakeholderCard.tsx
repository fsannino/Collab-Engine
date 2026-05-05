import type { StakeholderPosition, StakeholderLevel } from '@prisma/client';

type StakeholderCardProps = {
  id: string;
  name: string;
  email?: string | null;
  organizationLevel?: StakeholderLevel | null;
  position: StakeholderPosition;
  influence: number;
  interest: number;
  lastContactDate?: Date | string | null;
  href?: string;
};

const POSITION_LABEL: Record<StakeholderPosition, string> = {
  CHAMPION:   'Campeão',
  SUPPORTER:  'Apoiador',
  NEUTRAL:    'Neutro',
  RESISTOR:   'Resistente',
  ANTAGONIST: 'Antagonista',
};

const POSITION_COLOR: Record<StakeholderPosition, string> = {
  CHAMPION:   '#16a34a',
  SUPPORTER:  '#65a30d',
  NEUTRAL:    '#64748b',
  RESISTOR:   '#ea580c',
  ANTAGONIST: '#dc2626',
};

const LEVEL_LABEL: Record<StakeholderLevel, string> = {
  C_LEVEL:           'C-Level',
  EXECUTIVE:         'Executivo',
  MIDDLE_MANAGEMENT: 'Gerência Média',
  OPERATIONAL:       'Operacional',
  EXTERNAL:          'Externo',
};

function ScoreDots({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${value} de ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: i < value ? '#3b82f6' : '#e5e7eb' }}
        />
      ))}
    </span>
  );
}

function CardContent({ name, email, organizationLevel, position, influence, interest, lastContactDate }: Omit<StakeholderCardProps, 'id' | 'href'>) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{name}</p>
          {email && <p className="text-xs text-gray-500 truncate">{email}</p>}
          {organizationLevel && <p className="text-xs text-gray-400 mt-0.5">{LEVEL_LABEL[organizationLevel]}</p>}
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: POSITION_COLOR[position] }}
        >
          {POSITION_LABEL[position]}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-600">
        <div className="flex items-center gap-1.5"><span className="text-gray-400">Influência</span><ScoreDots value={influence} /></div>
        <div className="flex items-center gap-1.5"><span className="text-gray-400">Interesse</span><ScoreDots value={interest} /></div>
      </div>
      {lastContactDate && (
        <p className="text-xs text-gray-400">Último contato: {new Date(lastContactDate).toLocaleDateString('pt-BR')}</p>
      )}
    </div>
  );
}

export function StakeholderCard({ href, id: _, ...rest }: StakeholderCardProps) {
  if (href) return <a href={href} className="block"><CardContent {...rest} /></a>;
  return <CardContent {...rest} />;
}
