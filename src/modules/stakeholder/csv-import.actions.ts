'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/core/auth/session';
import type { ActionResult } from '@/shared/types/action-result';
import type { StakeholderLevel, StakeholderPosition } from '@prisma/client';
import { csvRowSchema, type CsvRow } from './csv-import.schema';

type ImportResult = { imported: number; skipped: number };

export async function importStakeholdersFromCsvAction(
  projectId: string,
  rows: unknown[],
): Promise<ActionResult<ImportResult>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: session.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!project) return { ok: false, error: 'Projeto não encontrado' };

  // Re-validate all rows server-side (defence-in-depth)
  const validRows: CsvRow[] = [];
  for (const row of rows) {
    const parsed = csvRowSchema.safeParse(row);
    if (parsed.success) validRows.push(parsed.data);
  }
  if (validRows.length === 0) return { ok: false, error: 'Nenhuma linha válida para importar' };

  let imported = 0;
  let skipped = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of validRows) {
      // Find existing stakeholder by e-mail in this tenant
      let stakeholder = row.email
        ? await tx.stakeholder.findFirst({
            where: { tenantId: session.tenantId, email: row.email, deletedAt: null },
          })
        : null;

      if (!stakeholder) {
        stakeholder = await tx.stakeholder.create({
          data: {
            tenantId: session.tenantId,
            name: row.name,
            email: row.email,
            organizationLevel: row.organizationLevel as StakeholderLevel | undefined,
          },
        });
      }

      // Upsert ProjectStakeholder
      const existing = await tx.projectStakeholder.findUnique({
        where: { projectId_stakeholderId: { projectId, stakeholderId: stakeholder.id } },
        select: { id: true, deletedAt: true },
      });

      if (existing && !existing.deletedAt) {
        skipped++;
      } else if (existing && existing.deletedAt) {
        await tx.projectStakeholder.update({
          where: { projectId_stakeholderId: { projectId, stakeholderId: stakeholder.id } },
          data: {
            position: row.position as StakeholderPosition,
            influence: row.influence,
            interest: row.interest,
            notes: row.notes,
            deletedAt: null,
          },
        });
        imported++;
      } else {
        await tx.projectStakeholder.create({
          data: {
            projectId,
            stakeholderId: stakeholder.id,
            position: row.position as StakeholderPosition,
            influence: row.influence,
            interest: row.interest,
            notes: row.notes,
          },
        });
        imported++;
      }
    }
  });

  return { ok: true, data: { imported, skipped } };
}
