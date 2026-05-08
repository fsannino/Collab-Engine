import { redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import CulturaNewForm from './_form';

export default async function NewAvaliacaoPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const [projects, areas] = await Promise.all([
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

  return <CulturaNewForm projects={projects} areas={areas} />;
}
