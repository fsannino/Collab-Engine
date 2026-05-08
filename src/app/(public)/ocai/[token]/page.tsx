import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { DIMENSOES, TIPOS_CULTURA } from '@/modules/cultura/cultura.utils';
import OcaiForm from './_form';

export default async function OcaiResponderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const convite = await prisma.conviteOcai.findUnique({
    where: { token },
    include: { avaliacao: { select: { id: true, nome: true, descricao: true, status: true } } },
  });

  if (!convite) notFound();

  if (convite.respondidoEm) {
    return (
      <div style={{ minHeight: '100vh', background: '#f4f6f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '48px', maxWidth: '480px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f2244', margin: '0 0 8px' }}>Resposta já registrada</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Obrigado, {convite.nome}! Sua resposta para <strong>{convite.avaliacao.nome}</strong> já foi registrada.</p>
        </div>
      </div>
    );
  }

  if (convite.avaliacao.status !== 'ATIVA') {
    return (
      <div style={{ minHeight: '100vh', background: '#f4f6f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '48px', maxWidth: '480px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f2244', margin: '0 0 8px' }}>Avaliação não está ativa</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Esta avaliação ainda não foi aberta ou já foi encerrada.</p>
        </div>
      </div>
    );
  }

  return (
    <OcaiForm
      token={token}
      nomeRespondente={convite.nome}
      avaliacao={convite.avaliacao}
      dimensoes={DIMENSOES}
      tiposCultura={TIPOS_CULTURA}
    />
  );
}
