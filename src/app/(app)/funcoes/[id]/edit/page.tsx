import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import FuncaoEditForm from './_form';

export const metadata = { title: 'Editar Função — Collab Engine' };

export default async function EditFuncaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const funcao = await prisma.funcao.findFirst({
    where: { id, tenantId: session.tenantId, deletedAt: null },
    select: { id: true, nome: true, descricao: true },
  });

  if (!funcao) notFound();

  return <FuncaoEditForm funcao={funcao} />;
}
