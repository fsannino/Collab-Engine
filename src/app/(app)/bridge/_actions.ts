'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import type { ActionResult } from '@/shared/types/action-result';

const ADMIN_ROLES = ['ADMIN', 'CHANGE_MANAGER'] as const;

export async function reprocessarEventoAction(eventoId: string): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };
  if (!ADMIN_ROLES.includes(session.role as typeof ADMIN_ROLES[number])) {
    return { ok: false, error: 'Sem permissão' };
  }

  await prisma.eventoIntegracao.update({
    where: { id: eventoId },
    data:  { status: 'PENDENTE', tentativas: 0, ultimoErro: null },
  });

  revalidatePath('/bridge');
  return { ok: true, data: undefined };
}

export async function descartarEventoAction(eventoId: string): Promise<ActionResult<void>> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado' };
  if (!ADMIN_ROLES.includes(session.role as typeof ADMIN_ROLES[number])) {
    return { ok: false, error: 'Sem permissão' };
  }

  await prisma.eventoIntegracao.update({
    where: { id: eventoId },
    data:  { status: 'DESCARTADO', ultimoErro: 'Descartado manualmente' },
  });

  revalidatePath('/bridge');
  return { ok: true, data: undefined };
}
