import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import ConvidarForm from './_form';

export default async function ConvidarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const av = await prisma.avaliacaoCultura.findFirst({
    where: { id, tenantId: session.tenantId, deletedAt: null },
    select: { id: true, nome: true, status: true },
  });
  if (!av) notFound();

  const pessoas = await prisma.pessoa.findMany({
    where: { tenantId: session.tenantId, deletedAt: null, email: { not: null } },
    select: { id: true, nome: true, email: true },
    orderBy: { nome: 'asc' },
  });

  return <ConvidarForm avaliacao={av} pessoas={pessoas} />;
}
