import { redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import LiderancaNewForm from './_form';

export default async function LiderancaNewPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const [pessoas, projetos, areas] = await Promise.all([
    prisma.pessoa.findMany({
      where: { tenantId: session.tenantId, deletedAt: null },
      select: { id: true, nome: true, email: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.project.findMany({
      where: { tenantId: session.tenantId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.area.findMany({
      where: { tenantId: session.tenantId, deletedAt: null },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
  ]);

  return <LiderancaNewForm pessoas={pessoas} projetos={projetos} areas={areas} />;
}
