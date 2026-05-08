import { redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import ProcessoForm from './_form';

export default async function NewProcessoPage({ searchParams }: { searchParams: Promise<{ macroprocessoId?: string }> }) {
  const { macroprocessoId } = await searchParams;
  const session = await getSession();
  if (!session) redirect('/login');

  const macroprocessos = await prisma.macroprocesso.findMany({
    where: { tenantId: session.tenantId, deletedAt: null },
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  });

  return <ProcessoForm macroprocessos={macroprocessos} defaultMacroprocessoId={macroprocessoId} />;
}
