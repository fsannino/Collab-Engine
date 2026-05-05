import { prisma } from '@/lib/prisma';
import { getSession } from '@/core/auth/session';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ADKARGauge } from '@/shared/components/ADKARGauge';

type Props = { params: Promise<{ id: string; sid: string }> };

const POSITION_LABEL: Record<string, string> = {
  CHAMPION: 'Campeão', SUPPORTER: 'Apoiador', NEUTRAL: 'Neutro',
  RESISTOR: 'Resistente', ANTAGONIST: 'Antagonista',
};
const POSITION_COLOR: Record<string, string> = {
  CHAMPION: '#16a34a', SUPPORTER: '#65a30d', NEUTRAL: '#64748b',
  RESISTOR: '#ea580c', ANTAGONIST: '#dc2626',
};

export default async function StakeholderDetailPage({ params }: Props) {
  const { id: projectId, sid } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const ps = await prisma.projectStakeholder.findFirst({
    where: { id: sid, deletedAt: null, project: { tenantId: session.tenantId } },
    include: { stakeholder: true },
  });
  if (!ps) notFound();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <nav className="text-xs text-gray-400 mb-1">
            <Link href={`/projects/${projectId}/stakeholders`} className="hover:underline">Stakeholders</Link>
            {' / '}<span>{ps.stakeholder.name}</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900">{ps.stakeholder.name}</h1>
          {ps.stakeholder.email && (
            <a href={`mailto:${ps.stakeholder.email}`} className="text-sm text-blue-600 hover:underline">{ps.stakeholder.email}</a>
          )}
        </div>
        <span
          className="shrink-0 rounded-full px-3 py-1 text-sm font-medium text-white"
          style={{ backgroundColor: POSITION_COLOR[ps.position] }}
        >
          {POSITION_LABEL[ps.position]}
        </span>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Influência × Interesse</h2>
        <div className="flex gap-8">
          <Metric label="Influência" value={ps.influence} />
          <Metric label="Interesse"  value={ps.interest}  />
          {ps.lastContactDate && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Último Contato</p>
              <p className="text-lg font-semibold text-gray-900">{new Date(ps.lastContactDate).toLocaleDateString('pt-BR')}</p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">ADKAR</h2>
        <ADKARGauge adkarA={ps.adkarA} adkarD={ps.adkarD} adkarK={ps.adkarK} adkarAb={ps.adkarAb} adkarR={ps.adkarR} />
      </section>

      {ps.notes && (
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Observações</h2>
          <p className="text-sm text-gray-600 whitespace-pre-line">{ps.notes}</p>
        </section>
      )}

      <Link href={`/projects/${projectId}/stakeholders`} className="inline-block px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
        ← Voltar
      </Link>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-1">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        <span className="text-gray-400 text-sm">/5</span>
      </div>
    </div>
  );
}
