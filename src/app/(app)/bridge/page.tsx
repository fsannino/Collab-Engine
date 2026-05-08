import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import { ReprocessarBtn, DescartarBtn } from './_event-actions';

export const metadata = { title: 'Bridge — Collab Engine' };

// Refresh every 30 s via Next.js revalidation
export const revalidate = 30;

const SISTEMA_LABEL: Record<string, string> = { SMR: 'SMR Projetos', XPROC: 'XPROC', COLLAB: 'Collab Engine' };
const SISTEMA_COLOR: Record<string, string> = { SMR: '#3b82f6', XPROC: '#8b5cf6', COLLAB: '#c9a227' };

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  PENDENTE:     { background: '#fef9c3', color: '#854d0e' },
  PROCESSANDO:  { background: '#dbeafe', color: '#1d4ed8' },
  PROCESSADO:   { background: '#dcfce7', color: '#15803d' },
  FALHADO:      { background: '#fee2e2', color: '#dc2626' },
  DESCARTADO:   { background: '#f1f5f9', color: '#64748b' },
};

function fmtAge(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60)  return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function pill(label: string, style: React.CSSProperties) {
  return (
    <span style={{ fontSize: '11px', fontWeight: 600, borderRadius: '20px', padding: '2px 8px', ...style }}>
      {label}
    </span>
  );
}

export default async function BridgePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const since24h = new Date(Date.now() - 86_400_000);

  // Fetch queue summary + recent events + failures in parallel
  const [statusCounts, recentEvents, failedEvents, throughput] = await Promise.all([
    // Counts by status (all time)
    prisma.eventoIntegracao.groupBy({
      by:       ['status'],
      _count:   { id: true },
    }),
    // Last 60 events (for log)
    prisma.eventoIntegracao.findMany({
      orderBy: { createdAt: 'desc' },
      take:    60,
      select:  { id: true, tipo: true, origem: true, destino: true, status: true, tentativas: true, ultimoErro: true, createdAt: true, processedAt: true },
    }),
    // Actionable failures (FALHADO only — DESCARTADO already terminal)
    prisma.eventoIntegracao.findMany({
      where:   { status: 'FALHADO' },
      orderBy: { createdAt: 'desc' },
      take:    20,
      select:  { id: true, tipo: true, origem: true, destino: true, tentativas: true, ultimoErro: true, createdAt: true },
    }),
    // Throughput in last 24h
    prisma.eventoIntegracao.count({
      where: { status: 'PROCESSADO', processedAt: { gte: since24h } },
    }),
  ]);

  const countMap: Record<string, number> = {};
  for (const g of statusCounts) countMap[g.status] = g._count.id;

  const total      = Object.values(countMap).reduce((a, b) => a + b, 0);
  const processed  = countMap['PROCESSADO']  ?? 0;
  const pending    = countMap['PENDENTE']    ?? 0;
  const failed     = countMap['FALHADO']     ?? 0;
  const discarded  = countMap['DESCARTADO']  ?? 0;
  const processing = countMap['PROCESSANDO'] ?? 0;
  const successRate = total > 0 ? Math.round((processed / total) * 100) : 100;

  // Event types breakdown
  const typeMap: Record<string, number> = {};
  for (const e of recentEvents) typeMap[e.tipo] = (typeMap[e.tipo] ?? 0) + 1;
  const topTypes = Object.entries(typeMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Systems seen
  const systemsSeen = new Set(recentEvents.flatMap((e) => [e.origem, e.destino].filter(Boolean)));

  return (
    <div style={{ padding: '40px 48px', fontFamily: 'system-ui,-apple-system,sans-serif', maxWidth: '1100px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ width: '4px', height: '24px', background: '#c9a227', borderRadius: '2px' }} />
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f2244', margin: 0 }}>Bridge</h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 0 14px' }}>
            Integração cross-sistema · SMR Projetos ↔ Collab Engine ↔ XPROC
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link
            href="/bridge/dashboard"
            style={{ fontSize: '12px', fontWeight: 600, color: '#0f2244', textDecoration: 'none', border: '1px solid #d1d5db', borderRadius: '6px', padding: '5px 12px', background: '#fff', whiteSpace: 'nowrap' }}
          >
            Dashboard Cross-Sistema →
          </Link>
          {(['SMR', 'COLLAB', 'XPROC'] as const).map((sys) => (
            <span
              key={sys}
              style={{
                fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px',
                background: systemsSeen.has(sys) ? SISTEMA_COLOR[sys] + '22' : '#f1f5f9',
                color: systemsSeen.has(sys) ? SISTEMA_COLOR[sys] : '#94a3b8',
                border: `1px solid ${systemsSeen.has(sys) ? SISTEMA_COLOR[sys] + '44' : '#e2e8f0'}`,
              }}
            >
              {systemsSeen.has(sys) ? '● ' : '○ '}{SISTEMA_LABEL[sys]}
            </span>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Pendentes',     value: pending,    color: '#854d0e',  bg: '#fef9c3' },
          { label: 'Processando',   value: processing, color: '#1d4ed8',  bg: '#dbeafe' },
          { label: 'Processados',   value: processed,  color: '#15803d',  bg: '#dcfce7' },
          { label: 'Falhas',        value: failed,     color: '#dc2626',  bg: '#fee2e2' },
          { label: 'Descartados',   value: discarded,  color: '#64748b',  bg: '#f1f5f9' },
          { label: 'Taxa sucesso',  value: `${successRate}%`, color: successRate >= 95 ? '#15803d' : successRate >= 80 ? '#d97706' : '#dc2626', bg: '#f8fafc' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ background: bg, borderRadius: '10px', padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', marginBottom: '24px' }}>

        {/* Recent events log */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#0f2244', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Log de Eventos
            </h2>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{throughput} processados nas últimas 24h</span>
          </div>
          <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                <tr>
                  {['Tipo', 'Rota', 'Status', 'Tentativas', 'Há'].map((h) => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '11px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((ev) => (
                  <tr key={ev.id} style={{ borderTop: '1px solid #f8fafc' }}>
                    <td style={{ padding: '7px 12px', color: '#0f2244', fontFamily: 'monospace', fontSize: '11px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.tipo}
                    </td>
                    <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{ color: SISTEMA_COLOR[ev.origem] ?? '#64748b', fontWeight: 600, fontSize: '11px' }}>{ev.origem}</span>
                      {ev.destino && (
                        <>
                          <span style={{ color: '#94a3b8' }}> → </span>
                          <span style={{ color: SISTEMA_COLOR[ev.destino] ?? '#64748b', fontWeight: 600, fontSize: '11px' }}>{ev.destino}</span>
                        </>
                      )}
                    </td>
                    <td style={{ padding: '7px 12px' }}>{pill(ev.status, STATUS_STYLE[ev.status] ?? {})}</td>
                    <td style={{ padding: '7px 12px', color: ev.tentativas > 1 ? '#dc2626' : '#64748b', textAlign: 'center', fontSize: '11px' }}>{ev.tentativas}</td>
                    <td style={{ padding: '7px 12px', color: '#94a3b8', fontSize: '11px', whiteSpace: 'nowrap' }}>{fmtAge(ev.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column: event types + throughput */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Top event types */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#0f2244', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Tipos de Evento
            </h2>
            {topTypes.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '12px' }}>Nenhum evento registrado.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {topTypes.map(([tipo, count]) => {
                  const pct = Math.round((count / recentEvents.length) * 100);
                  return (
                    <div key={tipo}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '11px', color: '#374151', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                          {tipo}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b', flexShrink: 0, marginLeft: '8px' }}>{count}</span>
                      </div>
                      <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '2px' }}>
                        <div style={{ height: '4px', background: '#0f2244', borderRadius: '2px', width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Queue health */}
          <div style={{ background: pending > 20 ? '#fffbeb' : '#f0fdf4', border: `1px solid ${pending > 20 ? '#fde68a' : '#86efac'}`, borderRadius: '12px', padding: '16px 20px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#0f2244', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Saúde da Fila
            </h2>
            {pending === 0 && failed === 0 ? (
              <p style={{ color: '#15803d', fontSize: '13px', margin: 0, fontWeight: 600 }}>✓ Fila limpa</p>
            ) : (
              <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '12px', color: '#64748b', lineHeight: 1.8 }}>
                {pending > 0 && <li>{pending} evento{pending !== 1 ? 's' : ''} aguardando processamento</li>}
                {failed > 0  && <li style={{ color: '#dc2626', fontWeight: 600 }}>{failed} evento{failed !== 1 ? 's' : ''} com falha — ação necessária</li>}
                {discarded > 0 && <li>{discarded} descartado{discarded !== 1 ? 's' : ''}</li>}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Failed events — actionable section */}
      {failedEvents.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #fca5a5', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', background: '#fef2f2', borderBottom: '1px solid #fca5a5' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#dc2626', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Falhas — {failedEvents.length} evento{failedEvents.length !== 1 ? 's' : ''} com erro
            </h2>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                {['Tipo', 'Origem → Destino', 'Erro', 'Tentativas', 'Há', 'Ações'].map((h) => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '11px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {failedEvents.map((ev) => (
                <tr key={ev.id} style={{ borderTop: '1px solid #fee2e2' }}>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px', color: '#0f2244', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ev.tipo}
                  </td>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', fontSize: '11px' }}>
                    <span style={{ color: SISTEMA_COLOR[ev.origem] ?? '#64748b', fontWeight: 600 }}>{ev.origem}</span>
                    {ev.destino && <><span style={{ color: '#94a3b8' }}> → </span><span style={{ color: SISTEMA_COLOR[ev.destino] ?? '#64748b', fontWeight: 600 }}>{ev.destino}</span></>}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#dc2626', fontSize: '11px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ev.ultimoErro ?? '—'}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', color: '#dc2626', fontWeight: 700, fontSize: '12px' }}>{ev.tentativas}</td>
                  <td style={{ padding: '8px 12px', color: '#94a3b8', fontSize: '11px', whiteSpace: 'nowrap' }}>{fmtAge(ev.createdAt)}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <ReprocessarBtn eventoId={ev.id} />
                      <DescartarBtn   eventoId={ev.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {failedEvents.length === 0 && recentEvents.length === 0 && (
        <div style={{ border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
            Nenhum evento de integração registrado ainda.<br />
            Os eventos aparecem automaticamente quando ações bridge são disparadas.
          </p>
        </div>
      )}

      <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '16px' }}>
        Atualiza automaticamente a cada 30s · Fuso horário: local do servidor
      </p>
    </div>
  );
}
