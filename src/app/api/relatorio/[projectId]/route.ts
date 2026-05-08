import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import React, { type ReactElement } from 'react';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import { calcularResultado } from '@/modules/cultura/cultura.utils';
import RelatorioDocument from '@/modules/relatorio/RelatorioDocument';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { projectId } = await params;

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: session.tenantId, deletedAt: null },
  });
  if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });

  // Fetch all OCM data in parallel
  const [stakeholderLinks, impactos, trainingPlans, avaliacaoCultura, liderancas] = await Promise.all([
    prisma.projectStakeholder.findMany({
      where: { projectId, deletedAt: null },
      include: { stakeholder: { select: { name: true } } },
      orderBy: [{ position: 'asc' }, { influence: 'desc' }],
    }),
    prisma.changeImpact.findMany({
      where: { projectId, deletedAt: null },
      select: { title: true, dimension: true, status: true, score: true, severityScore: true, extentScore: true },
      orderBy: { score: 'desc' },
    }),
    prisma.trainingPlan.findMany({
      where: { projectId, deletedAt: null },
      select: {
        name: true,
        items: {
          where: { deletedAt: null },
          select: { pessoas: { where: { deletedAt: null }, select: { status: true } } },
        },
      },
    }),
    prisma.avaliacaoCultura.findFirst({
      where: { projectId, tenantId: session.tenantId, deletedAt: null },
      include: { respostas: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.lideranca.findMany({
      where: { projectId, tenantId: session.tenantId, deletedAt: null },
      include: {
        pessoa:    { select: { nome: true } },
        avaliacoes: { select: { dimensao: true, pontuacao: true } },
      },
    }),
  ]);

  // Build treinos summary
  const treinos = trainingPlans.map((plan) => {
    const all = plan.items.flatMap((i) => i.pessoas);
    return {
      planName: plan.name,
      total: all.length,
      concluidos: all.filter((p) => p.status === 'CONCLUIDO').length,
    };
  });

  // Build cultura summary
  let culturaData: Parameters<typeof RelatorioDocument>[0]['data']['cultura'] = null;
  if (avaliacaoCultura) {
    const resultado = calcularResultado(avaliacaoCultura.respostas);
    if (resultado.totalRespostas > 0) {
      culturaData = {
        nome: avaliacaoCultura.nome,
        atual: resultado.geral.atual,
        desejado: resultado.geral.desejado,
        totalRespostas: resultado.totalRespostas,
      };
    }
  }

  const data = {
    projeto: {
      name:          project.name,
      status:        project.status,
      description:   project.description,
      startDate:     project.startDate,
      targetEndDate: project.targetEndDate,
    },
    stakeholders: stakeholderLinks.map((sl) => ({
      name:      sl.stakeholder.name,
      position:  sl.position,
      influence: sl.influence,
      interest:  sl.interest,
    })),
    impactos: impactos.map((i) => ({
      title:         i.title,
      dimension:     i.dimension,
      status:        i.status,
      score:         i.score,
      severityScore: i.severityScore,
      extentScore:   i.extentScore,
    })),
    treinos,
    cultura: culturaData,
    lideres: liderancas.map((l) => ({
      nome:      l.pessoa.nome,
      papel:     l.papel,
      avaliacoes: l.avaliacoes,
    })),
    dataGeracao: new Date(),
  };

  const element = React.createElement(RelatorioDocument, { data }) as unknown as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(element);

  const filename = `relatorio-ocm-${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
