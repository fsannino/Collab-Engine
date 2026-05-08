// Cross-system aggregators for the Bridge dashboard (Issue 034).
// Queries local Collab DB for owned data + best-effort REST calls to SMR/XPROC.
// Results are cached per project via Next.js unstable_cache (TTL 1h).
// A daily cron at /api/bridge/refresh can bust the cache for all projects.

import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

const SMR_URL  = process.env.SMR_API_URL  ?? '';
const SMR_KEY  = process.env.SMR_API_KEY  ?? '';
const XPROC_URL = process.env.XPROC_API_URL ?? '';
const XPROC_KEY = process.env.XPROC_API_KEY ?? '';

export type ProjectHealthData = {
  projectId:          string;
  projectName:        string;
  // Local Collab data
  impactosAbertos:    number;
  treinamentosAtrasados: number;
  // SMR data (null if API unreachable)
  tarefasAtrasadas:   number | null;
  riscosCriticos:     number | null;
  problemasAbertos:   number | null;
  // XPROC data (null if API unreachable)
  processosNaoRevisados: number | null;
  // Computed
  healthScore:        number;   // 0-100
  healthZone:         'verde' | 'amarelo' | 'laranja' | 'vermelho';
  lastUpdated:        string;   // ISO timestamp
};

// ─── Collab local queries ────────────────────────────────────────────────────

async function collabStatsForProject(projectId: string, tenantId: string): Promise<{
  impactosAbertos: number;
  treinamentosAtrasados: number;
}> {
  const now = new Date();
  const [impactos, treinamentos] = await Promise.all([
    prisma.changeImpact.count({
      where: {
        projectId,
        deletedAt: null,
        project: { tenantId },
        status: { in: ['ACTIVE', 'MITIGATING'] },
      },
    }),
    // Turmas (sessions) that are past due and not yet concluded/cancelled
    prisma.turma.count({
      where: {
        deletedAt: null,
        dataFim:   { lt: now },
        status:    { notIn: ['CONCLUIDA', 'CANCELADA'] },
        trainingItem: {
          deletedAt: null,
          plan: { projectId, deletedAt: null, project: { tenantId } },
        },
      },
    }),
  ]);
  return { impactosAbertos: impactos, treinamentosAtrasados: treinamentos };
}

// ─── SMR API calls (best-effort) ────────────────────────────────────────────

async function smrStatsForProject(smrProjectId: string): Promise<{
  tarefasAtrasadas: number | null;
  riscosCriticos:   number | null;
  problemasAbertos: number | null;
}> {
  if (!SMR_URL || !SMR_KEY) return { tarefasAtrasadas: null, riscosCriticos: null, problemasAbertos: null };
  try {
    const headers = { 'x-api-key': SMR_KEY, 'Content-Type': 'application/json' };
    const [tarefas, riscos, problemas] = await Promise.allSettled([
      fetch(`${SMR_URL}/api/v1/projects/${smrProjectId}/tasks/overdue`, { headers, next: { revalidate: 3600 } }),
      fetch(`${SMR_URL}/api/v1/projects/${smrProjectId}/risks?critical=true&status=OPEN`, { headers, next: { revalidate: 3600 } }),
      fetch(`${SMR_URL}/api/v1/projects/${smrProjectId}/problems?status=OPEN`, { headers, next: { revalidate: 3600 } }),
    ]);

    const parse = async (r: PromiseSettledResult<Response>): Promise<number | null> => {
      if (r.status !== 'fulfilled' || !r.value.ok) return null;
      const json = await r.value.json() as { total?: number; count?: number; data?: unknown[] };
      return json.total ?? json.count ?? (Array.isArray(json.data) ? json.data.length : null);
    };

    return {
      tarefasAtrasadas: await parse(tarefas),
      riscosCriticos:   await parse(riscos),
      problemasAbertos: await parse(problemas),
    };
  } catch {
    return { tarefasAtrasadas: null, riscosCriticos: null, problemasAbertos: null };
  }
}

// ─── XPROC API calls (best-effort) ──────────────────────────────────────────

async function xprocStatsForProject(xprocProjectId: string): Promise<{ processosNaoRevisados: number | null }> {
  if (!XPROC_URL || !XPROC_KEY) return { processosNaoRevisados: null };
  try {
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const res = await fetch(
      `${XPROC_URL}/api/v1/projects/${xprocProjectId}/processes?lastReviewedBefore=${threeMonthsAgo}`,
      { headers: { 'x-api-key': XPROC_KEY }, next: { revalidate: 3600 } },
    );
    if (!res.ok) return { processosNaoRevisados: null };
    const json = await res.json() as { total?: number; count?: number; data?: unknown[] };
    return { processosNaoRevisados: json.total ?? json.count ?? (Array.isArray(json.data) ? json.data.length : null) };
  } catch {
    return { processosNaoRevisados: null };
  }
}

// ─── Health score ────────────────────────────────────────────────────────────

function computeHealthScore(d: Omit<ProjectHealthData, 'healthScore' | 'healthZone' | 'lastUpdated' | 'projectName'>): number {
  let score = 100;

  // Collab deductions (data always available)
  score -= Math.min(30, d.impactosAbertos * 5);
  score -= Math.min(20, d.treinamentosAtrasados * 4);

  // SMR deductions (if data available)
  if (d.tarefasAtrasadas !== null) score -= Math.min(20, d.tarefasAtrasadas * 2);
  if (d.riscosCriticos   !== null) score -= Math.min(20, d.riscosCriticos   * 5);
  if (d.problemasAbertos !== null) score -= Math.min(10, d.problemasAbertos  * 2);

  // XPROC deduction
  if (d.processosNaoRevisados !== null) score -= Math.min(10, d.processosNaoRevisados * 2);

  return Math.max(0, Math.round(score));
}

function toHealthZone(score: number): ProjectHealthData['healthZone'] {
  if (score >= 80) return 'verde';
  if (score >= 60) return 'amarelo';
  if (score >= 40) return 'laranja';
  return 'vermelho';
}

// ─── Public API ─────────────────────────────────────────────────────────────

async function aggregateProjectHealth(
  projectId:      string,
  projectName:    string,
  tenantId:       string,
  smrProjectId?:  string,
  xprocProjectId?: string,
): Promise<ProjectHealthData> {
  const [collab, smr, xproc] = await Promise.all([
    collabStatsForProject(projectId, tenantId),
    smrProjectId  ? smrStatsForProject(smrProjectId)   : Promise.resolve({ tarefasAtrasadas: null, riscosCriticos: null, problemasAbertos: null }),
    xprocProjectId ? xprocStatsForProject(xprocProjectId) : Promise.resolve({ processosNaoRevisados: null }),
  ]);

  const partial = { projectId, ...collab, ...smr, ...xproc };
  const healthScore = computeHealthScore(partial);

  return {
    ...partial,
    projectName,
    healthScore,
    healthZone: toHealthZone(healthScore),
    lastUpdated: new Date().toISOString(),
  };
}

/** Cached per-project health aggregation (1h TTL). */
export const getProjectHealthCached = (
  projectId:      string,
  projectName:    string,
  tenantId:       string,
  smrProjectId?:  string,
  xprocProjectId?: string,
): Promise<ProjectHealthData> =>
  unstable_cache(
    () => aggregateProjectHealth(projectId, projectName, tenantId, smrProjectId, xprocProjectId),
    [`bridge-health-${projectId}`],
    { revalidate: 3600, tags: [`bridge-project-${projectId}`, 'bridge-all'] },
  )();

/** Aggregate health for all active projects in a tenant. Parallelised with concurrency limit. */
export async function getAllProjectsHealth(tenantId: string): Promise<ProjectHealthData[]> {
  const projects = await prisma.project.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, name: true, smrProjectId: true },
    orderBy: { name: 'asc' },
  });

  // Process in batches of 5 to avoid hammering external APIs
  const results: ProjectHealthData[] = [];
  for (let i = 0; i < projects.length; i += 5) {
    const batch = projects.slice(i, i + 5);
    const batchResults = await Promise.all(
      batch.map((p) => getProjectHealthCached(p.id, p.name, tenantId, p.smrProjectId ?? undefined)),
    );
    results.push(...batchResults);
  }
  return results;
}
