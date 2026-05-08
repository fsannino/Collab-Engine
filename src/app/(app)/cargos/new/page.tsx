import { redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import CargoForm from './_form';

export default async function NewCargoPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const areas = await prisma.area.findMany({
    where: { tenantId: session.tenantId, deletedAt: null },
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  });

  return <CargoForm areas={areas} />;
}
