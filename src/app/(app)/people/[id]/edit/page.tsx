import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import PessoaEditForm from './_form';

export const metadata = { title: 'Editar Pessoa — Collab:Evolve' };

export default async function EditPessoaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const [pessoa, areas, pessoas] = await Promise.all([
    prisma.pessoa.findFirst({
      where: { id, tenantId: session.tenantId, deletedAt: null },
      select: {
        id: true,
        nome: true,
        email: true,
        cpf: true,
        hrisId: true,
        areaId: true,
        superiorId: true,
        localidadeTrabalho: true,
      },
    }),
    prisma.area.findMany({
      where: { tenantId: session.tenantId, deletedAt: null },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.pessoa.findMany({
      where: { tenantId: session.tenantId, deletedAt: null, id: { not: id } },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
  ]);

  if (!pessoa) notFound();

  return <PessoaEditForm pessoa={pessoa} areas={areas} pessoas={pessoas} />;
}
