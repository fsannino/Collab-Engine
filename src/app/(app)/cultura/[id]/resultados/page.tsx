import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import ManualResultadoForm from './_form';

export default async function ManualResultadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const av = await prisma.avaliacaoCultura.findFirst({
    where: { id, tenantId: session.tenantId, deletedAt: null },
    select: { id: true, nome: true, status: true },
  });
  if (!av) notFound();

  return <ManualResultadoForm avaliacao={av} />;
}
