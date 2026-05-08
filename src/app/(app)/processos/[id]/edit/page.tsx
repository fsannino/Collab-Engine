import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import ProcessoEditForm from './_form';

export const metadata = { title: 'Editar Processo — Collab Engine' };

export default async function EditProcessoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const [processo, macroprocessos] = await Promise.all([
    prisma.processo.findFirst({
      where: { id, tenantId: session.tenantId, deletedAt: null },
      select: { id: true, nome: true, descricao: true, macroprocessoId: true, xprocProcessoId: true },
    }),
    prisma.macroprocesso.findMany({
      where: { tenantId: session.tenantId, deletedAt: null },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
  ]);

  if (!processo) notFound();

  return <ProcessoEditForm processo={processo} macroprocessos={macroprocessos} />;
}
