import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import MacroprocessoEditForm from './_form';

export const metadata = { title: 'Editar Macroprocesso — Collab Engine' };

export default async function EditMacroprocessoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const mp = await prisma.macroprocesso.findFirst({
    where: { id, tenantId: session.tenantId, deletedAt: null },
    select: { id: true, nome: true, descricao: true, xprocMacroprocessoId: true },
  });
  if (!mp) notFound();

  return <MacroprocessoEditForm mp={mp} />;
}
