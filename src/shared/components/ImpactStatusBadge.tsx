import type { ImpactStatus } from '@prisma/client';

const STATUS_LABEL: Record<ImpactStatus, string> = {
  DRAFT:      'Rascunho',
  ACTIVE:     'Ativo',
  MITIGATING: 'Mitigando',
  RESOLVED:   'Resolvido',
  CLOSED:     'Encerrado',
};

const STATUS_STYLE: Record<ImpactStatus, { bg: string; color: string }> = {
  DRAFT:      { bg: '#f1f5f9', color: '#64748b' },
  ACTIVE:     { bg: '#dbeafe', color: '#1d4ed8' },
  MITIGATING: { bg: '#fef3c7', color: '#92400e' },
  RESOLVED:   { bg: '#dcfce7', color: '#166534' },
  CLOSED:     { bg: '#f3f4f6', color: '#374151' },
};

type Props = { status: ImpactStatus; size?: 'sm' | 'md' };

export function ImpactStatusBadge({ status, size = 'md' }: Props) {
  const { bg, color } = STATUS_STYLE[status];
  const cls = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  return (
    <span className={`rounded-full font-medium ${cls}`} style={{ backgroundColor: bg, color }}>
      {STATUS_LABEL[status]}
    </span>
  );
}
