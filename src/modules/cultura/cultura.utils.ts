// Shared OCAI types, constants, and pure functions — no 'use server' directive

export const DIMENSOES = [
  { id: 'CARACTERISTICAS', label: 'Características Dominantes' },
  { id: 'LIDERANCA',       label: 'Liderança Organizacional' },
  { id: 'GESTAO_PESSOAS',  label: 'Gestão de Pessoas' },
  { id: 'COESAO',          label: 'Coesão Organizacional' },
  { id: 'ENFASE',          label: 'Ênfase Estratégica' },
  { id: 'CRITERIOS',       label: 'Critérios de Sucesso' },
] as const;

export type DimensaoId = typeof DIMENSOES[number]['id'];

export const TIPOS_CULTURA = [
  { id: 'CLAN',      label: 'Clã',        descricao: 'Colaboração, pessoas, trabalho em equipe', cor: '#3b82f6' },
  { id: 'ADHOCRACY', label: 'Adhocracia', descricao: 'Inovação, criatividade, flexibilidade',    cor: '#f59e0b' },
  { id: 'MARKET',    label: 'Mercado',    descricao: 'Resultados, competitividade, externo',      cor: '#ef4444' },
  { id: 'HIERARCHY', label: 'Hierarquia', descricao: 'Controle, processos, estabilidade',         cor: '#8b5cf6' },
] as const;

export type TipoCulturaId = typeof TIPOS_CULTURA[number]['id'];

export type OcaiValores = {
  CLAN: number; ADHOCRACY: number; MARKET: number; HIERARCHY: number;
};

export type OcaiRespostas = {
  [dim in DimensaoId]: { atual: OcaiValores; desejado: OcaiValores };
};

export type ResultadoOcai = {
  totalRespostas: number;
  media: { [dim in DimensaoId]: { atual: OcaiValores; desejado: OcaiValores } };
  geral: { atual: OcaiValores; desejado: OcaiValores };
};

export function calcularResultado(respostas: { respostas: unknown }[]): ResultadoOcai {
  const n = respostas.length;
  if (n === 0) {
    const zero: OcaiValores = { CLAN: 0, ADHOCRACY: 0, MARKET: 0, HIERARCHY: 0 };
    const emptyDim = { atual: zero, desejado: zero };
    return {
      totalRespostas: 0,
      media: Object.fromEntries(DIMENSOES.map((d) => [d.id, emptyDim])) as ResultadoOcai['media'],
      geral: emptyDim,
    };
  }

  const sums: Record<string, { atual: OcaiValores; desejado: OcaiValores }> = {};
  for (const dim of DIMENSOES) {
    sums[dim.id] = { atual: { CLAN: 0, ADHOCRACY: 0, MARKET: 0, HIERARCHY: 0 }, desejado: { CLAN: 0, ADHOCRACY: 0, MARKET: 0, HIERARCHY: 0 } };
  }

  for (const r of respostas) {
    const data = r.respostas as OcaiRespostas;
    for (const dim of DIMENSOES) {
      const d = data[dim.id];
      if (!d) continue;
      for (const tipo of ['CLAN', 'ADHOCRACY', 'MARKET', 'HIERARCHY'] as TipoCulturaId[]) {
        sums[dim.id].atual[tipo]    += d.atual[tipo]    ?? 0;
        sums[dim.id].desejado[tipo] += d.desejado[tipo] ?? 0;
      }
    }
  }

  const media: ResultadoOcai['media'] = {} as ResultadoOcai['media'];
  const geralAtual:    OcaiValores = { CLAN: 0, ADHOCRACY: 0, MARKET: 0, HIERARCHY: 0 };
  const geralDesejado: OcaiValores = { CLAN: 0, ADHOCRACY: 0, MARKET: 0, HIERARCHY: 0 };

  for (const dim of DIMENSOES) {
    const id = dim.id as DimensaoId;
    media[id] = {
      atual:    { CLAN: sums[id].atual.CLAN / n,    ADHOCRACY: sums[id].atual.ADHOCRACY / n,    MARKET: sums[id].atual.MARKET / n,    HIERARCHY: sums[id].atual.HIERARCHY / n },
      desejado: { CLAN: sums[id].desejado.CLAN / n, ADHOCRACY: sums[id].desejado.ADHOCRACY / n, MARKET: sums[id].desejado.MARKET / n, HIERARCHY: sums[id].desejado.HIERARCHY / n },
    };
    for (const tipo of ['CLAN', 'ADHOCRACY', 'MARKET', 'HIERARCHY'] as TipoCulturaId[]) {
      geralAtual[tipo]    += media[id].atual[tipo]    / DIMENSOES.length;
      geralDesejado[tipo] += media[id].desejado[tipo] / DIMENSOES.length;
    }
  }

  return { totalRespostas: n, media, geral: { atual: geralAtual, desejado: geralDesejado } };
}
