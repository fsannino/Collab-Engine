import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { OcaiValores } from '@/modules/cultura/cultura.utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RelatorioData = {
  projeto: {
    name: string;
    status: string;
    description?: string | null;
    startDate?: Date | null;
    targetEndDate?: Date | null;
  };
  stakeholders: {
    name: string;
    position: string;
    influence: number;
    interest: number;
  }[];
  impactos: {
    title: string;
    dimension: string;
    status: string;
    score: number;
    severityScore: number;
    extentScore: number;
  }[];
  treinos: {
    planName: string;
    total: number;
    concluidos: number;
  }[];
  cultura: {
    nome: string;
    atual: OcaiValores;
    desejado: OcaiValores;
    totalRespostas: number;
  } | null;
  lideres: {
    nome: string;
    papel: string;
    avaliacoes: { dimensao: string; pontuacao: number }[];
  }[];
  dataGeracao: Date;
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const NAVY  = '#0f2244';
const GOLD  = '#c9a227';
const GRAY  = '#64748b';
const LGRAY = '#f1f5f9';
const GREEN = '#15803d';
const AMBER = '#d97706';
const RED   = '#dc2626';

const s = StyleSheet.create({
  page:      { padding: '36pt 44pt', fontFamily: 'Helvetica', fontSize: 9, color: '#1e293b', backgroundColor: '#fff' },
  header:    { marginBottom: 20 },
  bar:       { width: 40, height: 4, backgroundColor: GOLD, borderRadius: 2, marginBottom: 6 },
  h1:        { fontSize: 20, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 2 },
  h2:        { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 8, marginTop: 16 },
  h3:        { fontSize: 9, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 4 },
  subtitle:  { fontSize: 9, color: GRAY, marginBottom: 2 },
  meta:      { fontSize: 8, color: GRAY },
  sectionHr: { borderBottom: '1pt solid #e2e8f0', marginBottom: 10, marginTop: 2 },
  row:       { flexDirection: 'row', gap: 10, marginBottom: 10 },
  kpiCard:   { flex: 1, backgroundColor: LGRAY, borderRadius: 4, padding: '8pt 10pt' },
  kpiVal:    { fontSize: 18, fontFamily: 'Helvetica-Bold', color: NAVY, lineHeight: 1 },
  kpiLabel:  { fontSize: 7.5, color: GRAY, marginTop: 2 },
  table:     { marginBottom: 10 },
  thead:     { flexDirection: 'row', backgroundColor: NAVY, borderRadius: 2, padding: '4pt 6pt', marginBottom: 2 },
  th:        { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#fff' },
  trow:      { flexDirection: 'row', padding: '3pt 6pt', borderBottom: '0.5pt solid #e2e8f0' },
  td:        { fontSize: 8, color: '#374151' },
  badge:     { borderRadius: 10, padding: '1pt 5pt', fontSize: 7, fontFamily: 'Helvetica-Bold' },
  barRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 6 },
  barLabel:  { fontSize: 8, color: NAVY, width: 64 },
  barTrack:  { flex: 1, height: 8, backgroundColor: '#e2e8f0', borderRadius: 2 },
  barFill:   { height: 8, borderRadius: 2 },
  barVal:    { fontSize: 8, color: GRAY, width: 28, textAlign: 'right' },
  footer:    { position: 'absolute', bottom: 20, left: 44, right: 44, flexDirection: 'row', justifyContent: 'space-between', borderTop: '0.5pt solid #e2e8f0', paddingTop: 6 },
  footerTxt: { fontSize: 7, color: '#94a3b8' },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_PT: Record<string, string> = {
  PLANNING: 'Planejamento', ACTIVE: 'Ativo', ON_HOLD: 'Em espera',
  CLOSING: 'Encerrando', COMPLETED: 'Concluído',
  DRAFT: 'Rascunho', MITIGATING: 'Mitigando', RESOLVED: 'Resolvido', CLOSED: 'Fechado',
};

const POS_PT: Record<string, string> = {
  CHAMPION: 'Campeão', SUPPORTER: 'Apoiador', NEUTRAL: 'Neutro',
  RESISTOR: 'Resistente', ANTAGONIST: 'Antagonista',
};

const DIM_PT: Record<string, string> = {
  PROCESS: 'Processo', PEOPLE: 'Pessoas', TECHNOLOGY: 'Tecnologia',
  STRUCTURE: 'Estrutura', CULTURE: 'Cultura', STRATEGY: 'Estratégia',
};

function scoreColor(s: number): string {
  if (s >= 16) return RED;
  if (s >= 10) return '#ea580c';
  if (s >= 5)  return AMBER;
  return GREEN;
}

function adkarColor(v: number): string {
  if (v >= 7) return GREEN;
  if (v >= 4) return AMBER;
  return RED;
}

function fmtDate(d?: Date | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const DIMENSOES_ADKAR = ['Awareness', 'Desire', 'Knowledge', 'Ability', 'Reinforcement'];
const CULTURA_TIPOS: { id: keyof OcaiValores; label: string; color: string }[] = [
  { id: 'CLAN',      label: 'Clã',        color: '#3b82f6' },
  { id: 'ADHOCRACY', label: 'Adhocracia', color: '#f59e0b' },
  { id: 'MARKET',    label: 'Mercado',    color: '#ef4444' },
  { id: 'HIERARCHY', label: 'Hierarquia', color: '#8b5cf6' },
];

// ─── Document ────────────────────────────────────────────────────────────────

export default function RelatorioDocument({ data }: { data: RelatorioData }) {
  const { projeto, stakeholders, impactos, treinos, cultura, lideres, dataGeracao } = data;

  const champions = stakeholders.filter((s) => s.position === 'CHAMPION').length;
  const resistors = stakeholders.filter((s) => ['RESISTOR', 'ANTAGONIST'].includes(s.position)).length;
  const openImpacts = impactos.filter((i) => ['DRAFT', 'ACTIVE', 'MITIGATING'].includes(i.status)).length;
  const totalEnrolled = treinos.reduce((s, t) => s + t.total, 0);
  const totalConcluidos = treinos.reduce((s, t) => s + t.concluidos, 0);
  const trainingPct = totalEnrolled > 0 ? Math.round((totalConcluidos / totalEnrolled) * 100) : 0;
  const adkarAvg = lideres.length > 0 && lideres.some((l) => l.avaliacoes.length > 0)
    ? (() => {
        const allAv = lideres.flatMap((l) => l.avaliacoes);
        return allAv.length > 0 ? allAv.reduce((s, a) => s + a.pontuacao, 0) / allAv.length : null;
      })()
    : null;

  return (
    <Document title={`Relatório OCM — ${projeto.name}`} author="Collab:Evolve">
      <Page size="A4" style={s.page}>

        {/* ── Cover / Header ── */}
        <View style={s.header}>
          <View style={s.bar} />
          <Text style={s.h1}>{projeto.name}</Text>
          <Text style={s.subtitle}>Relatório Executivo de Gestão de Mudança</Text>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
            <Text style={s.meta}>Status: {STATUS_PT[projeto.status] ?? projeto.status}</Text>
            {projeto.startDate && <Text style={s.meta}>Início: {fmtDate(projeto.startDate)}</Text>}
            {projeto.targetEndDate && <Text style={s.meta}>Término previsto: {fmtDate(projeto.targetEndDate)}</Text>}
            <Text style={s.meta}>Gerado em: {fmtDate(dataGeracao)}</Text>
          </View>
          {projeto.description && <Text style={{ ...s.meta, marginTop: 4 }}>{projeto.description}</Text>}
        </View>

        <View style={s.sectionHr} />

        {/* ── KPI Summary ── */}
        <Text style={s.h2}>Resumo Executivo</Text>
        <View style={s.row}>
          <View style={s.kpiCard}>
            <Text style={s.kpiVal}>{stakeholders.length}</Text>
            <Text style={s.kpiLabel}>Stakeholders</Text>
            <Text style={{ ...s.kpiLabel, color: GREEN }}>+{champions} campeões</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={{ ...s.kpiVal, color: openImpacts > 0 ? AMBER : GREEN }}>{openImpacts}</Text>
            <Text style={s.kpiLabel}>Impactos em aberto</Text>
            <Text style={s.kpiLabel}>{impactos.length} total</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={{ ...s.kpiVal, color: trainingPct >= 70 ? GREEN : trainingPct >= 40 ? AMBER : RED }}>{trainingPct}%</Text>
            <Text style={s.kpiLabel}>Cobertura de treinamento</Text>
            <Text style={s.kpiLabel}>{totalConcluidos}/{totalEnrolled} concluídos</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={{ ...s.kpiVal, color: adkarAvg !== null ? adkarColor(adkarAvg) : GRAY }}>
              {adkarAvg !== null ? adkarAvg.toFixed(1) : '—'}
            </Text>
            <Text style={s.kpiLabel}>ADKAR médio</Text>
            <Text style={s.kpiLabel}>{lideres.length} líderes</Text>
          </View>
        </View>

        {/* ── Stakeholders ── */}
        <Text style={s.h2}>Partes Interessadas</Text>
        <View style={s.table}>
          <View style={s.thead}>
            <Text style={{ ...s.th, flex: 3 }}>Nome</Text>
            <Text style={{ ...s.th, flex: 2 }}>Posição</Text>
            <Text style={{ ...s.th, flex: 1, textAlign: 'center' }}>Influência</Text>
            <Text style={{ ...s.th, flex: 1, textAlign: 'center' }}>Interesse</Text>
          </View>
          {stakeholders.slice(0, 12).map((sk, i) => (
            <View key={i} style={{ ...s.trow, backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
              <Text style={{ ...s.td, flex: 3 }}>{sk.name}</Text>
              <Text style={{ ...s.td, flex: 2, color: sk.position === 'CHAMPION' ? GREEN : ['RESISTOR','ANTAGONIST'].includes(sk.position) ? RED : GRAY }}>
                {POS_PT[sk.position] ?? sk.position}
              </Text>
              <Text style={{ ...s.td, flex: 1, textAlign: 'center' }}>{sk.influence}/5</Text>
              <Text style={{ ...s.td, flex: 1, textAlign: 'center' }}>{sk.interest}/5</Text>
            </View>
          ))}
          {stakeholders.length > 12 && (
            <Text style={{ ...s.meta, marginTop: 3 }}>...e mais {stakeholders.length - 12} stakeholders</Text>
          )}
        </View>

        {/* ── Change Impacts ── */}
        <Text style={s.h2}>Impactos da Mudança</Text>
        {impactos.length === 0 ? (
          <Text style={s.meta}>Nenhum impacto cadastrado.</Text>
        ) : (
          <View style={s.table}>
            <View style={s.thead}>
              <Text style={{ ...s.th, flex: 4 }}>Título</Text>
              <Text style={{ ...s.th, flex: 2 }}>Dimensão</Text>
              <Text style={{ ...s.th, flex: 2 }}>Status</Text>
              <Text style={{ ...s.th, flex: 1, textAlign: 'center' }}>Score</Text>
            </View>
            {impactos.slice(0, 10).map((imp, i) => (
              <View key={i} style={{ ...s.trow, backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <Text style={{ ...s.td, flex: 4 }}>{imp.title}</Text>
                <Text style={{ ...s.td, flex: 2, color: GRAY }}>{DIM_PT[imp.dimension] ?? imp.dimension}</Text>
                <Text style={{ ...s.td, flex: 2, color: STATUS_PT[imp.status] ? GRAY : RED }}>{STATUS_PT[imp.status] ?? imp.status}</Text>
                <Text style={{ ...s.td, flex: 1, textAlign: 'center', color: scoreColor(imp.score), fontFamily: 'Helvetica-Bold' }}>{imp.score}</Text>
              </View>
            ))}
            {impactos.length > 10 && (
              <Text style={{ ...s.meta, marginTop: 3 }}>...e mais {impactos.length - 10} impactos</Text>
            )}
          </View>
        )}

        {/* Footer page 1 */}
        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>Collab:Evolve · CollabZ Consultoria</Text>
          <Text style={s.footerTxt} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>

      {/* ── Page 2: Training + Culture + Leadership ── */}
      <Page size="A4" style={s.page}>

        {/* ── Training ── */}
        <Text style={s.h2}>Planos de Treinamento</Text>
        {treinos.length === 0 ? (
          <Text style={s.meta}>Nenhum plano de treinamento cadastrado.</Text>
        ) : (
          <View style={s.table}>
            <View style={s.thead}>
              <Text style={{ ...s.th, flex: 4 }}>Plano</Text>
              <Text style={{ ...s.th, flex: 1, textAlign: 'center' }}>Total</Text>
              <Text style={{ ...s.th, flex: 1, textAlign: 'center' }}>Concluídos</Text>
              <Text style={{ ...s.th, flex: 2, textAlign: 'center' }}>Cobertura</Text>
            </View>
            {treinos.map((t, i) => {
              const pct = t.total > 0 ? Math.round((t.concluidos / t.total) * 100) : 0;
              return (
                <View key={i} style={{ ...s.trow, backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <Text style={{ ...s.td, flex: 4 }}>{t.planName}</Text>
                  <Text style={{ ...s.td, flex: 1, textAlign: 'center' }}>{t.total}</Text>
                  <Text style={{ ...s.td, flex: 1, textAlign: 'center' }}>{t.concluidos}</Text>
                  <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 6 }}>
                    <View style={{ flex: 1, height: 6, backgroundColor: '#e2e8f0', borderRadius: 2 }}>
                      <View style={{ width: `${pct}%`, height: 6, backgroundColor: pct >= 70 ? GREEN : pct >= 40 ? AMBER : RED, borderRadius: 2 }} />
                    </View>
                    <Text style={{ ...s.td, width: 24 }}>{pct}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Culture ── */}
        <Text style={s.h2}>Perfil Cultural OCAI</Text>
        {cultura === null ? (
          <Text style={s.meta}>Nenhuma avaliação cultural cadastrada para este projeto.</Text>
        ) : (
          <View>
            <Text style={{ ...s.meta, marginBottom: 8 }}>
              {cultura.nome} · {cultura.totalRespostas} resposta{cultura.totalRespostas !== 1 ? 's' : ''}
            </Text>
            {CULTURA_TIPOS.map((ct) => {
              const at = cultura.atual[ct.id];
              const de = cultura.desejado[ct.id];
              const gap = de - at;
              return (
                <View key={ct.id}>
                  <View style={s.barRow}>
                    <Text style={{ ...s.barLabel, color: ct.color, fontFamily: 'Helvetica-Bold' }}>{ct.label}</Text>
                    <View style={s.barTrack}>
                      <View style={{ ...s.barFill, width: `${at}%`, backgroundColor: ct.color }} />
                    </View>
                    <Text style={s.barVal}>{at.toFixed(1)}</Text>
                    <Text style={{ fontSize: 7.5, color: gap > 0 ? GREEN : gap < 0 ? RED : GRAY, width: 36 }}>
                      → {de.toFixed(1)} ({gap > 0 ? '+' : ''}{gap.toFixed(1)})
                    </Text>
                  </View>
                </View>
              );
            })}
            <Text style={{ ...s.meta, marginTop: 4 }}>Barras = Atual · → Desejado · gap = Desejado − Atual</Text>
          </View>
        )}

        {/* ── Leadership ADKAR ── */}
        <Text style={s.h2}>Liderança — Avaliação ADKAR</Text>
        {lideres.length === 0 ? (
          <Text style={s.meta}>Nenhum líder cadastrado para este projeto.</Text>
        ) : (
          <View style={s.table}>
            <View style={s.thead}>
              <Text style={{ ...s.th, flex: 3 }}>Líder</Text>
              <Text style={{ ...s.th, flex: 2 }}>Papel</Text>
              {DIMENSOES_ADKAR.map((d) => (
                <Text key={d} style={{ ...s.th, flex: 1, textAlign: 'center' }}>{d.charAt(0)}</Text>
              ))}
              <Text style={{ ...s.th, flex: 1, textAlign: 'center' }}>Méd.</Text>
            </View>
            {lideres.map((l, i) => {
              const avMap: Record<string, number> = {};
              for (const av of l.avaliacoes) avMap[av.dimensao] = av.pontuacao;
              const scores = DIMENSOES_ADKAR.map((d) => avMap[d]);
              const filled = scores.filter((v) => v !== undefined);
              const avg = filled.length > 0 ? filled.reduce((a, b) => a + (b ?? 0), 0) / filled.length : null;
              return (
                <View key={i} style={{ ...s.trow, backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <Text style={{ ...s.td, flex: 3 }}>{l.nome}</Text>
                  <Text style={{ ...s.td, flex: 2, color: GRAY }}>{l.papel}</Text>
                  {scores.map((v, si) => (
                    <Text key={si} style={{ ...s.td, flex: 1, textAlign: 'center', color: v !== undefined ? adkarColor(v) : '#cbd5e1', fontFamily: v !== undefined ? 'Helvetica-Bold' : 'Helvetica' }}>
                      {v !== undefined ? v.toFixed(1) : '—'}
                    </Text>
                  ))}
                  <Text style={{ ...s.td, flex: 1, textAlign: 'center', color: avg !== null ? adkarColor(avg) : GRAY, fontFamily: 'Helvetica-Bold' }}>
                    {avg !== null ? avg.toFixed(1) : '—'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Próximos passos */}
        <Text style={s.h2}>Próximos Passos Recomendados</Text>
        <View style={{ gap: 4 }}>
          {resistors > 0 && (
            <Text style={s.meta}>• {resistors} stakeholder{resistors > 1 ? 's' : ''} resistente{resistors > 1 ? 's' : ''} requer{resistors === 1 ? '' : 'em'} plano de engajamento.</Text>
          )}
          {openImpacts > 0 && (
            <Text style={s.meta}>• {openImpacts} impacto{openImpacts > 1 ? 's' : ''} em aberto — priorizar resolução ou mitigação.</Text>
          )}
          {trainingPct < 70 && totalEnrolled > 0 && (
            <Text style={s.meta}>• Cobertura de treinamento abaixo de 70% ({trainingPct}%) — acelerar conclusão das trilhas.</Text>
          )}
          {adkarAvg !== null && adkarAvg < 5 && (
            <Text style={s.meta}>• ADKAR médio abaixo de 5 — revisar suporte e comunicação com líderes.</Text>
          )}
          {cultura !== null && (() => {
            const maxGap = Math.max(...CULTURA_TIPOS.map((ct) => Math.abs(cultura.desejado[ct.id] - cultura.atual[ct.id])));
            return maxGap > 15 ? (
              <Text style={s.meta}>• Gap cultural acima de 15 pontos detectado — priorizar iniciativas de transformação cultural.</Text>
            ) : null;
          })()}
          {resistors === 0 && openImpacts === 0 && trainingPct >= 70 && (
            <Text style={{ ...s.meta, color: GREEN }}>• Projeto em boa saúde OCM. Manter cadência de monitoramento.</Text>
          )}
        </View>

        {/* Footer page 2 */}
        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>Collab:Evolve · CollabZ Consultoria</Text>
          <Text style={s.footerTxt} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
