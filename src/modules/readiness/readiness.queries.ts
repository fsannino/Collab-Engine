import { prisma } from '@/lib/prisma';

export interface ReadinessByArea {
  areaId: string;
  areaNome: string;
  total: number;
  concluidos: number;
  pct: number;
}

export interface ReadinessByFuncao {
  funcaoId: string;
  funcaoNome: string;
  total: number;
  concluidos: number;
  pct: number;
}

export interface ProjectReadiness {
  projectId: string;
  projectName: string;
  totalPessoas: number;
  concluidos: number;
  emAndamento: number;
  pendentes: number;
  pctReadiness: number;
  byArea: ReadinessByArea[];
  byFuncao: ReadinessByFuncao[];
}

/**
 * Calcula readiness de um projeto baseado no % de PessoaTreinamento concluídos.
 */
export async function getProjectReadiness(
  projectId: string,
  tenantId: string,
): Promise<ProjectReadiness | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!project) return null;

  // Todas as PessoaTreinamento vinculadas ao projeto
  const pessoasTreinamento = await prisma.pessoaTreinamento.findMany({
    where: {
      deletedAt: null,
      trainingItem: {
        deletedAt: null,
        plan: { projectId, deletedAt: null },
      },
    },
    select: {
      id: true,
      status: true,
      pessoa: {
        select: {
          id: true,
          areaId: true,
          area: { select: { id: true, nome: true } },
          funcoesAtuais: {
            where: { dataFim: null },
            select: { funcao: { select: { id: true, nome: true } } },
          },
        },
      },
    },
  });

  const total = pessoasTreinamento.length;
  const concluidos = pessoasTreinamento.filter((pt) => pt.status === 'CONCLUIDO').length;
  const emAndamento = pessoasTreinamento.filter((pt) => pt.status === 'EM_ANDAMENTO' || pt.status === 'INSCRITO').length;
  const pendentes = total - concluidos - emAndamento;

  // Agrupar por área
  const areaMap = new Map<string, { nome: string; total: number; concluidos: number }>();
  for (const pt of pessoasTreinamento) {
    const area = pt.pessoa.area;
    if (!area) continue;
    const entry = areaMap.get(area.id) ?? { nome: area.nome, total: 0, concluidos: 0 };
    entry.total++;
    if (pt.status === 'CONCLUIDO') entry.concluidos++;
    areaMap.set(area.id, entry);
  }

  // Agrupar por função
  const funcaoMap = new Map<string, { nome: string; total: number; concluidos: number }>();
  for (const pt of pessoasTreinamento) {
    for (const pf of pt.pessoa.funcoesAtuais) {
      const f = pf.funcao;
      const entry = funcaoMap.get(f.id) ?? { nome: f.nome, total: 0, concluidos: 0 };
      entry.total++;
      if (pt.status === 'CONCLUIDO') entry.concluidos++;
      funcaoMap.set(f.id, entry);
    }
  }

  return {
    projectId: project.id,
    projectName: project.name,
    totalPessoas: total,
    concluidos,
    emAndamento,
    pendentes,
    pctReadiness: total > 0 ? Math.round((concluidos / total) * 100) : 0,
    byArea: Array.from(areaMap.entries()).map(([areaId, v]) => ({
      areaId,
      areaNome: v.nome,
      total: v.total,
      concluidos: v.concluidos,
      pct: v.total > 0 ? Math.round((v.concluidos / v.total) * 100) : 0,
    })),
    byFuncao: Array.from(funcaoMap.entries()).map(([funcaoId, v]) => ({
      funcaoId,
      funcaoNome: v.nome,
      total: v.total,
      concluidos: v.concluidos,
      pct: v.total > 0 ? Math.round((v.concluidos / v.total) * 100) : 0,
    })),
  };
}
