import { redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import PessoaForm from './_form';

export default async function NewPessoaPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const [areas, pessoas] = await Promise.all([
    prisma.area.findMany({
      where: { tenantId: session.tenantId, deletedAt: null },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.pessoa.findMany({
      where: { tenantId: session.tenantId, deletedAt: null },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
  ]);

  return <PessoaForm areas={areas} pessoas={pessoas} />;
}
