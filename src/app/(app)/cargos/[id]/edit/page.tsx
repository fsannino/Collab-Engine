import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import CargoEditForm from './_form';

export const metadata = { title: 'Editar Cargo — Collab:Evolve' };

export default async function EditCargoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const [cargo, areas] = await Promise.all([
    prisma.cargo.findFirst({
      where: { id, tenantId: session.tenantId, deletedAt: null },
      select: { id: true, nome: true, nivel: true, descricao: true, areaId: true },
    }),
    prisma.area.findMany({
      where: { tenantId: session.tenantId, deletedAt: null },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
  ]);

  if (!cargo) notFound();

  return <CargoEditForm cargo={cargo} areas={areas} />;
}
