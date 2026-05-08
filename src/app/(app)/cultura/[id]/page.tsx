import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import { calcularResultado, calcularMediaGeral, DIMENSOES, TIPOS_CULTURA } from '@/modules/cultura/cultura.utils';
import RadarChart from '@/modules/cultura/RadarChart';
import AvaliacaoControles from './_controles';

const STATUS_LABEL: Record<string, string> = { RASCUNHO: 'Rascunho', ATIVA: 'Ativa', ENCERRADA: 'Encerrada' };
const STATUS_COLOR: Record<string, React.CSSProperties> = {
  RASCUNHO:  { background: '#f1f5f9', color: '#64748b' },
  ATIVA:     { background: '#dcfce7', color: '#15803d' },
  ENCERRADA: { background: '#f0fdf4', color: '#166534' },
};

export default async function AvaliacaoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const av = await prisma.avaliacaoCultura.findFirst({
    where: { id, tenantId: session.tenantId, deletedAt: null },
    include: {
      project:  { select: { name: true } },
      area:     { select: { nome: true } },
      convites: { orderBy: { createdAt: 'asc' } },
      respostas: true,
    },
  });
  if (!av) notFound();

  // Fetch area and company averages in parallel for radar comparison
  const [areaRespostas, empresaRespostas] = await Promise.all([
    av.areaId
      ? prisma.respostaOcai.findMany({
          where: { avaliacao: { tenantId: session.tenantId, areaId: av.areaId, deletedAt: null } },
        })
      : Promise.resolve([]),
    prisma.respostaOcai.findMany({
      where: { avaliacao: { tenantId: session.tenantId, deletedAt: null } },
    }),
  ]);

  const resultado      = calcularResultado(av.respostas);
  const mediaArea      = areaRespostas.length > 0 ? calcularMediaGeral(areaRespostas) : null;
  const mediaEmpresa   = empresaRespostas.length > 0 ? calcularMediaGeral(empresaRespostas) : null;
  const appUrl         = process.env.NEXT_PUBLIC_APP_URL ?? '';

  // Build radar series for main chart
  const mainSeries = resultado.totalRespostas > 0
    ? [
        { label: 'Esta pesquisa', values: resultado.geral.atual,    color: '#0f2244' },
        { label: 'Desejado',      values: resultado.geral.desejado, color: '#c9a227', dashed: true },
        ...(mediaArea    ? [{ label: `Média da área`,    values: mediaArea,    color: '#3b82f6' }] : []),
        ...(mediaEmpresa ? [{ label: 'Média da empresa', values: mediaEmpresa, color: '#8b5cf6', dashed: true }] : []),
      ]
    : [];

  return (
    <div style={{ padding: '40px 48px', fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ marginBottom: '4px' }}>
            <Link href="/cultura" style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none' }}>← Cultura Organizacional</Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '4px', height: '24px', background: '#c9a227', borderRadius: '2px' }} />
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f2244', margin: 0 }}>{av.nome}</h1>
          </div>
          {av.descricao && <p style={{ color: '#64748b', fontSize: '14px', margin: '6px 0 0 14px' }}>{av.descricao}</p>}
          {av.project && <p style={{ color: '#94a3b8', fontSize: '12px', margin: '3px 0 0 14px' }}>Projeto: {av.project.name}</p>}
          {av.area    && <p style={{ color: '#94a3b8', fontSize: '12px', margin: '3px 0 0 14px' }}>Área: {av.area.nome}</p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, borderRadius: '20px', padding: '4px 12px', ...STATUS_COLOR[av.status] }}>
            {STATUS_LABEL[av.status]}
          </span>
          <AvaliacaoControles avaliacaoId={av.id} status={av.status} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Radar geral com comparativo */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#0f2244', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Resultado Geral ({resultado.totalRespostas} resposta{resultado.totalRespostas !== 1 ? 's' : ''})
          </h2>
          {(mediaArea || mediaEmpresa) && resultado.totalRespostas > 0 && (
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 14px' }}>
              Comparando com {[mediaArea && 'média da área', mediaEmpresa && 'média da empresa'].filter(Boolean).join(' e ')}
            </p>
          )}
          {resultado.totalRespostas === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '13px', padding: '40px 0' }}>Aguardando respostas</p>
          ) : (
            <RadarChart series={mainSeries} />
          )}

          {/* Scores table */}
          {resultado.totalRespostas > 0 && (
            <table style={{ width: '100%', marginTop: '16px', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Cultura</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Atual</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Desejado</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Gap</th>
                  {mediaArea    && <th style={{ padding: '6px 8px', textAlign: 'center', color: '#3b82f6', fontWeight: 600 }}>Área</th>}
                  {mediaEmpresa && <th style={{ padding: '6px 8px', textAlign: 'center', color: '#8b5cf6', fontWeight: 600 }}>Empresa</th>}
                </tr>
              </thead>
              <tbody>
                {TIPOS_CULTURA.map((t) => {
                  const at  = resultado.geral.atual[t.id];
                  const de  = resultado.geral.desejado[t.id];
                  const gap = de - at;
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 600, color: t.cor }}>{t.label}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>{at.toFixed(1)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>{de.toFixed(1)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: gap > 0 ? '#15803d' : gap < 0 ? '#dc2626' : '#64748b', fontWeight: 600 }}>
                        {gap > 0 ? '+' : ''}{gap.toFixed(1)}
                      </td>
                      {mediaArea    && <td style={{ padding: '6px 8px', textAlign: 'center', color: '#3b82f6' }}>{mediaArea[t.id].toFixed(1)}</td>}
                      {mediaEmpresa && <td style={{ padding: '6px 8px', textAlign: 'center', color: '#8b5cf6' }}>{mediaEmpresa[t.id].toFixed(1)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Convites */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#0f2244', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Respondentes ({av.convites.filter((c) => c.respondidoEm).length}/{av.convites.length})
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              {av.status !== 'ENCERRADA' && (
                <Link href={`/cultura/${av.id}/convidar`} style={{ fontSize: '12px', color: '#0f2244', fontWeight: 600, textDecoration: 'none', border: '1px solid #d1d5db', borderRadius: '6px', padding: '4px 10px' }}>
                  + Convidar
                </Link>
              )}
              <Link href={`/cultura/${av.id}/resultados`} style={{ fontSize: '12px', color: '#64748b', textDecoration: 'none', border: '1px solid #d1d5db', borderRadius: '6px', padding: '4px 10px' }}>
                Entrada manual
              </Link>
            </div>
          </div>

          {av.convites.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
              {av.status === 'RASCUNHO'
                ? 'Ative a avaliação e convide os respondentes.'
                : 'Nenhum convidado ainda.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {av.convites.map((c) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#f8fafc', borderRadius: '6px', fontSize: '13px' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#0f2244' }}>{c.nome}</div>
                    <div style={{ color: '#64748b', fontSize: '11px' }}>{c.email}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {c.respondidoEm ? (
                      <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', borderRadius: '12px', padding: '2px 8px', fontWeight: 600 }}>✓ Respondido</span>
                    ) : (
                      <>
                        <span style={{ fontSize: '11px', background: '#fef9c3', color: '#854d0e', borderRadius: '12px', padding: '2px 8px' }}>Pendente</span>
                        <a
                          href={`${appUrl}/ocai/${c.token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '11px', color: '#0f2244', textDecoration: 'none', border: '1px solid #d1d5db', borderRadius: '4px', padding: '2px 6px' }}
                        >
                          Link
                        </a>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Por dimensão */}
      {resultado.totalRespostas > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 16px' }}>
            Resultado por Dimensão
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {DIMENSOES.map((dim) => (
              <div key={dim.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                <RadarChart
                  titulo={dim.label}
                  series={[
                    { label: 'Atual',   values: resultado.media[dim.id].atual,    color: '#0f2244' },
                    { label: 'Desejado', values: resultado.media[dim.id].desejado, color: '#c9a227', dashed: true },
                  ]}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
