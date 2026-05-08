import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getSession } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import { DIMENSOES, TIPOS_CULTURA } from '@/modules/cultura/cultura.utils';
import type { OcaiRespostas } from '@/modules/cultura/cultura.utils';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { id } = await params;

  const av = await prisma.avaliacaoCultura.findFirst({
    where:   { id, tenantId: session.tenantId, deletedAt: null },
    select:  { id: true, nome: true },
  });
  if (!av) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

  const respostas = await prisma.respostaOcai.findMany({
    where: { avaliacaoId: id },
    include: { convite: { select: { nome: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });

  // ── Build column headers ──────────────────────────────────────────────────

  const dimCols: string[] = [];
  for (const dim of DIMENSOES) {
    for (const tipo of TIPOS_CULTURA) {
      dimCols.push(`${dim.label} — ${tipo.label} (Atual)`);
      dimCols.push(`${dim.label} — ${tipo.label} (Desejado)`);
    }
  }

  const headers = [
    'Respondente',
    'E-mail',
    'Tipo',
    'Cargo (declarado)',
    'Área (declarada)',
    'Tempo na empresa',
    'Data resposta',
    ...dimCols,
  ];

  // ── Build rows ────────────────────────────────────────────────────────────

  const rows = respostas.map((r) => {
    const data = r.respostas as OcaiRespostas;

    const dimValues: (number | string)[] = [];
    for (const dim of DIMENSOES) {
      const d = data[dim.id];
      for (const tipo of TIPOS_CULTURA) {
        dimValues.push(d?.atual[tipo.id]    ?? '');
        dimValues.push(d?.desejado[tipo.id] ?? '');
      }
    }

    return [
      r.convite?.nome  ?? (r.manual ? 'Manual' : '—'),
      r.convite?.email ?? '—',
      r.manual ? 'Manual' : 'Convidado',
      (r as { cargoSnapshot?: string | null }).cargoSnapshot ?? '',
      (r as { areaSnapshot?:  string | null }).areaSnapshot  ?? '',
      (r as { tempoEmpresa?:  string | null }).tempoEmpresa  ?? '',
      r.createdAt.toLocaleDateString('pt-BR'),
      ...dimValues,
    ];
  });

  // ── Build XLSX ────────────────────────────────────────────────────────────

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Column widths: first 7 descriptive cols + 48 data cols
  ws['!cols'] = [
    { wch: 28 }, { wch: 32 }, { wch: 10 }, { wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 14 },
    ...Array(dimCols.length).fill({ wch: 10 }),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Respostas OCAI');

  // Summary sheet
  const sumHeaders = ['Tipo de Cultura', 'Atual (média)', 'Desejado (média)', 'Gap'];
  const sumRows: (string | number)[][] = [];
  if (respostas.length > 0) {
    for (const tipo of TIPOS_CULTURA) {
      const atuals    = respostas.map((r) => {
        const d = r.respostas as OcaiRespostas;
        return (1 / DIMENSOES.length) * DIMENSOES.reduce((acc, dim) => acc + (d[dim.id]?.atual[tipo.id] ?? 0), 0);
      });
      const desejados = respostas.map((r) => {
        const d = r.respostas as OcaiRespostas;
        return (1 / DIMENSOES.length) * DIMENSOES.reduce((acc, dim) => acc + (d[dim.id]?.desejado[tipo.id] ?? 0), 0);
      });
      const avgAtual    = atuals.reduce((a, b) => a + b, 0) / respostas.length;
      const avgDesejado = desejados.reduce((a, b) => a + b, 0) / respostas.length;
      sumRows.push([tipo.label, +avgAtual.toFixed(2), +avgDesejado.toFixed(2), +(avgDesejado - avgAtual).toFixed(2)]);
    }
  }
  const wsSummary = XLSX.utils.aoa_to_sheet([sumHeaders, ...sumRows]);
  wsSummary['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

  const raw      = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as number[];
  const buffer   = new Uint8Array(raw);
  const filename = `ocai-${av.nome.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  });
}
