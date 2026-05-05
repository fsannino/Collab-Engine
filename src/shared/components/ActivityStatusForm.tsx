'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateActivityStatusAction } from '@/modules/impact/impact.actions';
import type { ActivityStatus } from '@prisma/client';

const OPTIONS: { value: ActivityStatus; label: string }[] = [
  { value: 'PENDING',     label: 'Pendente'     },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'DONE',        label: 'Concluída'    },
  { value: 'CANCELLED',   label: 'Cancelada'    },
];

export function ActivityStatusForm({
  activityId,
  currentStatus,
}: {
  activityId: string;
  currentStatus: ActivityStatus;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value as ActivityStatus;
    start(async () => {
      await updateActivityStatusAction({ activityId, status });
      router.refresh();
    });
  };

  return (
    <select
      value={currentStatus}
      onChange={handleChange}
      disabled={pending}
      className="shrink-0 text-xs border border-gray-200 rounded px-2 py-1 bg-white disabled:opacity-50"
      aria-label="Status da atividade"
    >
      {OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
