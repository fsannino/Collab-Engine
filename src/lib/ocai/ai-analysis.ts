'use server';

import Anthropic from '@anthropic-ai/sdk';
import { unstable_cache } from 'next/cache';
import { perfilDominante, analisarGap } from './engine';
import type { OcaiValores } from '@/modules/cultura/cultura.utils';

const client = new Anthropic();

export type AnaliseIaResult = {
  narrativa: string;
  recomendacoes: string[];
  geradaEm: string;
};

async function gerarAnaliseInterna(
  avaliacaoId: string,
  atual: OcaiValores,
  desejado: OcaiValores,
  totalRespostas: number,
  nomePesquisa: string,
): Promise<AnaliseIaResult> {
  const dominanteAtual    = perfilDominante(atual);
  const dominanteDesejado = perfilDominante(desejado);
  const gaps              = analisarGap(atual, desejado);

  const gapsOrdenados = [...gaps].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
  const gapTexto = gapsOrdenados
    .map((g) => `  - ${g.label}: atual ${g.atual.toFixed(1)}, desejado ${g.desejado.toFixed(1)}, gap ${g.gap > 0 ? '+' : ''}${g.gap.toFixed(1)} (${g.direction === 'increase' ? 'aumentar' : g.direction === 'decrease' ? 'reduzir' : 'estável'})`)
    .join('\n');

  const prompt = `Você é um especialista em diagnóstico cultural organizacional com base no framework OCAI de Cameron & Quinn (Competing Values Framework).

Analise os resultados abaixo da pesquisa cultural "${nomePesquisa}" (${totalRespostas} respondente${totalRespostas !== 1 ? 's' : ''}) e escreva:

1. Uma análise narrativa em 2-3 parágrafos em português, explicando o perfil atual predominante, o que isso significa na prática, e o gap em relação ao perfil desejado.
2. Uma lista com 3 a 5 recomendações concretas de ações de mudança para reduzir o gap.

Dados:
- Perfil atual dominante: ${dominanteAtual.label} (score: ${dominanteAtual.score.toFixed(1)}, intensidade: ${dominanteAtual.intensidade})
- Perfil desejado dominante: ${dominanteDesejado.label} (score: ${dominanteDesejado.score.toFixed(1)}, intensidade: ${dominanteDesejado.intensidade})

Scores por tipo de cultura (escala 0-100, soma ~100):
  Atual:    Clã ${atual.CLAN.toFixed(1)} | Adhocracia ${atual.ADHOCRACY.toFixed(1)} | Mercado ${atual.MARKET.toFixed(1)} | Hierarquia ${atual.HIERARCHY.toFixed(1)}
  Desejado: Clã ${desejado.CLAN.toFixed(1)} | Adhocracia ${desejado.ADHOCRACY.toFixed(1)} | Mercado ${desejado.MARKET.toFixed(1)} | Hierarquia ${desejado.HIERARCHY.toFixed(1)}

Gaps por dimensão (desejado − atual):
${gapTexto}

Responda EXCLUSIVAMENTE em JSON com esta estrutura (sem markdown, sem explicações fora do JSON):
{
  "narrativa": "texto da análise em 2-3 parágrafos",
  "recomendacoes": ["recomendação 1", "recomendação 2", "recomendação 3"]
}`;

  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1500,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Resposta inesperada da IA');
  }

  const jsonStr = textBlock.text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  const parsed  = JSON.parse(jsonStr) as { narrativa: string; recomendacoes: string[] };

  return {
    narrativa:      parsed.narrativa,
    recomendacoes:  parsed.recomendacoes,
    geradaEm:       new Date().toISOString(),
  };
}

export const gerarAnaliseOcai = (
  avaliacaoId: string,
  atual: OcaiValores,
  desejado: OcaiValores,
  totalRespostas: number,
  nomePesquisa: string,
): Promise<AnaliseIaResult> =>
  unstable_cache(
    () => gerarAnaliseInterna(avaliacaoId, atual, desejado, totalRespostas, nomePesquisa),
    [`ocai-ai-analysis-${avaliacaoId}`],
    { revalidate: 86400, tags: [`ocai-${avaliacaoId}`] },
  )();
