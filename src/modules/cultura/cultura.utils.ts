// Shared OCAI types, constants, and pure functions — no 'use server' directive

export const DIMENSOES = [
  { id: 'CARACTERISTICAS', label: 'Características Dominantes',  stem: 'A organização é melhor descrita como…'              },
  { id: 'LIDERANCA',       label: 'Liderança Organizacional',    stem: 'A liderança na organização é geralmente reconhecida por…' },
  { id: 'GESTAO_PESSOAS',  label: 'Gestão de Pessoas',           stem: 'O estilo de gestão na organização é caracterizado por…' },
  { id: 'COESAO',          label: 'Coesão Organizacional',       stem: 'O que mantém a organização unida é…'                 },
  { id: 'ENFASE',          label: 'Ênfase Estratégica',          stem: 'A organização enfatiza…'                             },
  { id: 'CRITERIOS',       label: 'Critérios de Sucesso',        stem: 'A organização define sucesso com base em…'           },
] as const;

export type DimensaoId = typeof DIMENSOES[number]['id'];

export const TIPOS_CULTURA = [
  { id: 'CLAN',      label: 'Clã',        descricao: 'Colaboração, pessoas, trabalho em equipe', cor: '#3b82f6' },
  { id: 'ADHOCRACY', label: 'Adhocracia', descricao: 'Inovação, criatividade, flexibilidade',    cor: '#f59e0b' },
  { id: 'MARKET',    label: 'Mercado',    descricao: 'Resultados, competitividade, externo',      cor: '#ef4444' },
  { id: 'HIERARCHY', label: 'Hierarquia', descricao: 'Controle, processos, estabilidade',         cor: '#8b5cf6' },
] as const;

export type TipoCulturaId = typeof TIPOS_CULTURA[number]['id'];

// 24 afirmações OCAI — 6 dimensões × 4 tipos de cultura
// Respondentes lêem cada afirmação e distribuem 100 pontos conforme identificação com a organização
export const OCAI_AFIRMACOES: Record<DimensaoId, Record<TipoCulturaId, string>> = {
  CARACTERISTICAS: {
    CLAN:      'Um lugar muito pessoal, como uma grande família. As pessoas parecem compartilhar muito de si mesmas.',
    ADHOCRACY: 'Um lugar dinâmico e empreendedor. As pessoas assumem riscos e são inovadoras.',
    MARKET:    'Um lugar muito voltado a resultados. As pessoas são competitivas e fortemente focadas em objetivos.',
    HIERARCHY: 'Um lugar muito controlado e estruturado. Os procedimentos formais geralmente determinam o que as pessoas fazem.',
  },
  LIDERANCA: {
    CLAN:      'Mentoria, facilitação ou cuidado com o desenvolvimento das pessoas.',
    ADHOCRACY: 'Empreendedorismo, inovação ou disposição para assumir riscos.',
    MARKET:    'Foco agressivo em resultados, sem rodeios na busca por conquistas.',
    HIERARCHY: 'Coordenação, organização e garantia de eficiência operacional.',
  },
  GESTAO_PESSOAS: {
    CLAN:      'Trabalho em equipe, consenso e participação.',
    ADHOCRACY: 'Assunção de riscos individuais, inovação, liberdade e originalidade.',
    MARKET:    'Competitividade intensa, altas exigências e foco contínuo em conquistas.',
    HIERARCHY: 'Segurança no emprego, conformidade, previsibilidade e estabilidade nos relacionamentos.',
  },
  COESAO: {
    CLAN:      'A lealdade e a confiança mútua. O comprometimento com a organização é muito alto.',
    ADHOCRACY: 'O compromisso com a inovação e o desenvolvimento. Há forte ênfase em estar na vanguarda.',
    MARKET:    'A ênfase em realizações e no cumprimento de metas. Competitividade e vencer são temas recorrentes.',
    HIERARCHY: 'Regras e políticas formais. Manter uma organização bem-estruturada e eficiente é prioritário.',
  },
  ENFASE: {
    CLAN:      'O desenvolvimento humano. Alta confiança, abertura e participação são constantes.',
    ADHOCRACY: 'A aquisição de novos recursos e a criação de novos desafios. Experimentar e buscar oportunidades são valorizados.',
    MARKET:    'Ações competitivas e conquistas. Atingir metas ambiciosas e vencer no mercado são dominantes.',
    HIERARCHY: 'Permanência e estabilidade. Eficiência, controle e operações tranquilas são prioritários.',
  },
  CRITERIOS: {
    CLAN:      'Desenvolvimento de pessoas, trabalho em equipe, comprometimento dos colaboradores e cuidado com as pessoas.',
    ADHOCRACY: 'Ter os produtos mais inovadores ou mais recentes. Ser líder em inovação e referência no setor.',
    MARKET:    'Vencer no mercado e superar a concorrência. Ser o melhor do setor.',
    HIERARCHY: 'Eficiência. Entregas confiáveis, planejamento eficiente e baixo custo de produção são fundamentais.',
  },
};

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
      const s = sums[dim.id]!;
      for (const tipo of ['CLAN', 'ADHOCRACY', 'MARKET', 'HIERARCHY'] as TipoCulturaId[]) {
        s.atual[tipo]    += d.atual[tipo]    ?? 0;
        s.desejado[tipo] += d.desejado[tipo] ?? 0;
      }
    }
  }

  const media: ResultadoOcai['media'] = {} as ResultadoOcai['media'];
  const geralAtual:    OcaiValores = { CLAN: 0, ADHOCRACY: 0, MARKET: 0, HIERARCHY: 0 };
  const geralDesejado: OcaiValores = { CLAN: 0, ADHOCRACY: 0, MARKET: 0, HIERARCHY: 0 };

  for (const dim of DIMENSOES) {
    const id = dim.id as DimensaoId;
    const s = sums[id]!;
    media[id] = {
      atual:    { CLAN: s.atual.CLAN / n,    ADHOCRACY: s.atual.ADHOCRACY / n,    MARKET: s.atual.MARKET / n,    HIERARCHY: s.atual.HIERARCHY / n },
      desejado: { CLAN: s.desejado.CLAN / n, ADHOCRACY: s.desejado.ADHOCRACY / n, MARKET: s.desejado.MARKET / n, HIERARCHY: s.desejado.HIERARCHY / n },
    };
    for (const tipo of ['CLAN', 'ADHOCRACY', 'MARKET', 'HIERARCHY'] as TipoCulturaId[]) {
      geralAtual[tipo]    += media[id].atual[tipo]    / DIMENSOES.length;
      geralDesejado[tipo] += media[id].desejado[tipo] / DIMENSOES.length;
    }
  }

  return { totalRespostas: n, media, geral: { atual: geralAtual, desejado: geralDesejado } };
}

// Returns the overall ATUAL average as a flat OcaiValores (for radar comparisons)
export function calcularMediaGeral(respostas: { respostas: unknown }[]): OcaiValores {
  return calcularResultado(respostas).geral.atual;
}
