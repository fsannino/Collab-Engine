import { prisma } from '@/core/prisma/client';
import { calcularResultado } from '@/modules/cultura/cultura.utils';
import type { OcaiValores } from '@/modules/cultura/cultura.utils';

export async function handleCulturalAssessmentCompleted(
  payload: Record<string, unknown>,
): Promise<void> {
  const {
    avaliacaoId,
    projectId,
    areaId,
    tenantId,
    totalRespostas,
    geral,
  } = payload as {
    avaliacaoId: string;
    projectId:   string | null;
    areaId:      string | null;
    tenantId:    string;
    totalRespostas: number;
    geral: { atual: OcaiValores; desejado: OcaiValores };
  };

  type EventRow = import('@prisma/client').Prisma.EventoIntegracaoCreateManyInput;
  const downstream: EventRow[] = [];

  // 1. Notify SMR when the survey is tied to a project
  if (projectId) {
    downstream.push({
      tipo:    'project.culture-assessment-completed',
      payload: { avaliacaoId, projectId, tenantId, totalRespostas },
      origem:  'COLLAB',
      destino: 'SMR',
      status:  'PENDENTE',
    });
  }

  // 2. Detect significant culture gaps (≥10 pts) → request training matrix review
  if (geral && projectId) {
    const tipos = ['CLAN', 'ADHOCRACY', 'MARKET', 'HIERARCHY'] as const;
    const hasGap = tipos.some(
      (t) => Math.abs(geral.desejado[t] - geral.atual[t]) >= 10,
    );
    if (hasGap) {
      downstream.push({
        tipo:    'training.matrix-generation-needed',
        payload: {
          trigger:     'culture-gap',
          avaliacaoId,
          projectId,
          areaId,
          tenantId,
          reason:      'Lacuna cultural significativa detectada (≥10 pontos)',
        },
        origem:  'COLLAB',
        destino: 'COLLAB',
        status:  'PENDENTE',
      });
    }
  }

  if (downstream.length > 0) {
    await prisma.eventoIntegracao.createMany({ data: downstream, skipDuplicates: true });
  }
}

// Handler for individual response submissions — currently a no-op that lets the
// monitor dashboard poll EventoIntegracao for live counts without extra work here.
export async function handleCulturalAssessmentResponse(
  _payload: Record<string, unknown>,
): Promise<void> {
  // Future: push real-time webhook to RESEARCH_ADMIN dashboard
}
