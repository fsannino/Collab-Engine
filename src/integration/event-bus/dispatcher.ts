import { prisma } from '@/core/prisma/client';

type EventHandler = (
  payload: Record<string, unknown>,
  eventId: string,
) => Promise<void>;

const handlers = new Map<string, EventHandler>();

export function registerHandler(tipo: string, handler: EventHandler): void {
  handlers.set(tipo, handler);
}

const MAX_RETRIES = 3;
const BATCH_SIZE = 50;

export async function processEvents(): Promise<{
  processed: number;
  failed: number;
  skipped: number;
}> {
  const events = await prisma.eventoIntegracao.findMany({
    where: {
      OR: [
        { status: 'PENDENTE' },
        { status: 'FALHADO', tentativas: { lt: MAX_RETRIES } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: BATCH_SIZE,
  });

  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const event of events) {
    // Optimistic lock: claim the row before processing
    const claimed = await prisma.eventoIntegracao.updateMany({
      where: { id: event.id, status: { in: ['PENDENTE', 'FALHADO'] } },
      data: { status: 'PROCESSANDO' },
    });
    if (claimed.count === 0) { skipped++; continue; }

    const handler = handlers.get(event.tipo);
    if (!handler) {
      await prisma.eventoIntegracao.update({
        where: { id: event.id },
        data: { status: 'DESCARTADO', ultimoErro: `Sem handler: ${event.tipo}` },
      });
      skipped++;
      continue;
    }

    try {
      await handler(event.payload as Record<string, unknown>, event.id);
      await prisma.eventoIntegracao.update({
        where: { id: event.id },
        data: { status: 'PROCESSADO', processedAt: new Date() },
      });
      processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      const newTentativas = event.tentativas + 1;
      await prisma.eventoIntegracao.update({
        where: { id: event.id },
        data: {
          status: newTentativas >= MAX_RETRIES ? 'DESCARTADO' : 'FALHADO',
          tentativas: newTentativas,
          ultimoErro: message,
        },
      });
      failed++;
    }
  }

  return { processed, failed, skipped };
}
