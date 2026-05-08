import { redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import AreaForm from './_form';

export const metadata = { title: 'Nova Área — Collab Engine' };

export default async function NewAreaPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const areas = await prisma.area.findMany({
    where: { tenantId: session.tenantId, deletedAt: null },
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  });

  return <AreaForm areas={areas} />;
}
