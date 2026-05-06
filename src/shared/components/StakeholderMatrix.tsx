'use client';

import { useRouter } from 'next/navigation';
import { HeatmapMatrix, type HeatmapCellData } from './HeatmapMatrix';

export type StakeholderPoint = { id: string; name: string; influence: number; interest: number };

type StakeholderMatrixProps = {
  projectId: string;
  stakeholders: StakeholderPoint[];
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
};

export function StakeholderMatrix({ projectId, stakeholders, size, loading }: StakeholderMatrixProps) {
  const router = useRouter();

  // X axis = Interesse (severity), Y axis = Influência (probability)
  const countMap = new Map<string, HeatmapCellData>();
  for (const s of stakeholders) {
    const key      = `${s.interest}-${s.influence}`;
    const existing = countMap.get(key);
    if (existing) {
      existing.count++;
      existing.items?.push({ id: s.id, title: s.name });
    } else {
      countMap.set(key, { severity: s.interest, probability: s.influence, count: 1, items: [{ id: s.id, title: s.name }] });
    }
  }

  return (
    <HeatmapMatrix
      entityType="stakeholder"
      data={Array.from(countMap.values())}
      size={size}
      loading={loading}
      onClickCell={(interest, influence) =>
        router.push(`/projects/${projectId}/stakeholders?influence=${influence}&interest=${interest}`)
      }
    />
  );
}
