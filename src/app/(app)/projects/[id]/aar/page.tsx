import { getSession } from '@/core/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { upsertAarAction as _upsertAarAction } from '@/modules/aar/aar.actions'

export const metadata = { title: 'After Action Review — Collab:Evolve' }

const SECTION_STYLE = {
  wrapper: { marginBottom: '24px' },
  label: { fontSize: '13px', fontWeight: 700, color: '#0B1F3A', marginBottom: '6px', display: 'block' as const },
  textarea: {
    width: '100%',
    minHeight: '120px',
    border: '1px solid #e9ecf0',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '13px',
    color: '#0B1F3A',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
    lineHeight: 1.6,
    boxSizing: 'border-box' as const,
  },
}

export default async function AarPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: projectId } = await params
  const session = await getSession()
  if (!session) redirect('/login')

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: session.tenantId, deletedAt: null },
    select: { id: true, name: true },
  })
  if (!project) redirect('/projects')

  const aar = await prisma.afterActionReview.findUnique({
    where: { projectId },
  })

  async function saveAar(formData: FormData) {
    'use server'
    await _upsertAarAction(formData)
  }

  return (
    <div style={{ padding: '40px 44px', maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#1a6e8e', marginBottom: '8px' }}>
          <Link href={`/projects/${projectId}`} style={{ color: '#1a6e8e', textDecoration: 'none' }}>
            {project.name}
          </Link>
          {' / '}After Action Review
        </div>
        <h1 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: '32px', fontWeight: 400, color: '#0B1F3A', margin: '0 0 6px' }}>
          After Action Review
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          Retrospectiva estruturada para capturar aprendizados do projeto.
        </p>
      </div>

      {/* Meta info if AAR exists */}
      {aar && (aar.conductedAt ?? aar.conductedBy) && (
        <div style={{ background: '#f8fafc', border: '1px solid #e9ecf0', borderRadius: '10px', padding: '14px 18px', marginBottom: '24px', fontSize: '13px', color: '#475569' }}>
          {aar.conductedAt && (
            <span>
              Realizada em: <strong>{new Date(aar.conductedAt).toLocaleDateString('pt-BR')}</strong>
            </span>
          )}
          {aar.conductedAt && aar.conductedBy && <span style={{ margin: '0 10px' }}>·</span>}
          {aar.conductedBy && (
            <span>
              Por: <strong>{aar.conductedBy}</strong>
            </span>
          )}
        </div>
      )}

      {/* If no AAR yet: show start button + empty form */}
      {!aar && (
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '32px', textAlign: 'center', marginBottom: '32px' }}>
          <p style={{ fontSize: '15px', color: '#0369a1', marginBottom: '16px', fontWeight: 500 }}>
            Nenhuma retrospectiva iniciada para este projeto.
          </p>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '0' }}>
            Preencha o formulário abaixo para iniciar a retrospectiva.
          </p>
        </div>
      )}

      {/* Form */}
      <form
        action={saveAar}
        style={{ background: '#fff', border: '1px solid #e9ecf0', borderRadius: '12px', padding: '28px 32px' }}
      >
        <input type="hidden" name="projectId" value={projectId} />

        <div style={SECTION_STYLE.wrapper}>
          <label htmlFor="whatWorked" style={SECTION_STYLE.label}>
            O que funcionou
          </label>
          <textarea
            id="whatWorked"
            name="whatWorked"
            placeholder="Descreva o que funcionou bem durante o projeto…"
            defaultValue={aar?.whatWorked ?? ''}
            style={SECTION_STYLE.textarea}
          />
        </div>

        <div style={SECTION_STYLE.wrapper}>
          <label htmlFor="whatDidntWork" style={SECTION_STYLE.label}>
            O que não funcionou
          </label>
          <textarea
            id="whatDidntWork"
            name="whatDidntWork"
            placeholder="Descreva o que não funcionou ou poderia ter sido melhor…"
            defaultValue={aar?.whatDidntWork ?? ''}
            style={SECTION_STYLE.textarea}
          />
        </div>

        <div style={SECTION_STYLE.wrapper}>
          <label htmlFor="lessons" style={SECTION_STYLE.label}>
            Lições aprendidas
          </label>
          <textarea
            id="lessons"
            name="lessons"
            placeholder="Quais lições a equipe leva desta experiência?…"
            defaultValue={aar?.lessons ?? ''}
            style={SECTION_STYLE.textarea}
          />
        </div>

        <div style={SECTION_STYLE.wrapper}>
          <label htmlFor="recommendations" style={SECTION_STYLE.label}>
            Recomendações
          </label>
          <textarea
            id="recommendations"
            name="recommendations"
            placeholder="O que recomendaria para projetos futuros similares?…"
            defaultValue={aar?.recommendations ?? ''}
            style={SECTION_STYLE.textarea}
          />
        </div>

        {/* Meta fields row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label htmlFor="conductedBy" style={SECTION_STYLE.label}>
              Conduzida por
            </label>
            <input
              id="conductedBy"
              name="conductedBy"
              type="text"
              placeholder="Nome do facilitador"
              defaultValue={aar?.conductedBy ?? ''}
              style={{ width: '100%', border: '1px solid #e9ecf0', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#0B1F3A', fontFamily: 'inherit', boxSizing: 'border-box' as const }}
            />
          </div>
          <div>
            <label htmlFor="conductedAt" style={SECTION_STYLE.label}>
              Data da retrospectiva
            </label>
            <input
              id="conductedAt"
              name="conductedAt"
              type="date"
              defaultValue={aar?.conductedAt ? new Date(aar.conductedAt).toISOString().slice(0, 10) : ''}
              style={{ width: '100%', border: '1px solid #e9ecf0', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#0B1F3A', fontFamily: 'inherit', boxSizing: 'border-box' as const }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            style={{ background: '#0B1F3A', color: '#fff', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >
            {aar ? 'Salvar retrospectiva' : 'Iniciar retrospectiva'}
          </button>
        </div>
      </form>
    </div>
  )
}
