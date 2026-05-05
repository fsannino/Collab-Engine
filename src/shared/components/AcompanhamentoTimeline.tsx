'use client';

import type { ImpactStatus } from '@prisma/client';

type Entry = {
  id:             string;
  previousStatus: ImpactStatus | null;
  newStatus:      ImpactStatus;
  previousScore:  number | null;
  newScore:       number;
  note:           string | null;
  changedBy:      string;
  changedAt:      Date | string;
};

const STATUS_LABEL: Record<ImpactStatus, string> = {
  DRAFT: 'Rascunho', ACTIVE: 'Ativo', MITIGATING: 'Mitigando',
  RESOLVED: 'Resolvido', CLOSED: 'Encerrado',
};

export function AcompanhamentoTimeline({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-gray-400 italic">Nenhum registro ainda.</p>;
  }

  return (
    <ol className="relative border-l border-gray-200 ml-3 space-y-6">
      {entries.map((e) => (
        <li key={e.id} className="ml-4">
          <span className="absolute -left-1.5 mt-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-blue-400 ring-2 ring-white" />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
            <time className="text-xs text-gray-400">
              {new Date(e.changedAt).toLocaleString('pt-BR')}
            </time>
            {e.previousStatus && e.previousStatus !== e.newStatus && (
              <span className="text-xs text-gray-500">
                {STATUS_LABEL[e.previousStatus]} → {STATUS_LABEL[e.newStatus]}
              </span>
            )}
            {e.previousScore != null && e.previousScore !== e.newScore && (
              <span className="text-xs text-gray-500">
                Score: {e.previousScore} → {e.newScore}
              </span>
            )}
          </div>
          {e.note && <p className="text-sm text-gray-700">{e.note}</p>}
        </li>
      ))}
    </ol>
  );
}
