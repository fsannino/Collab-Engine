import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/core/auth/session'
import { prisma } from '@/lib/prisma'

const STATUS_LABEL: Record<string, string> = {
  PLANNING:  'Planejamento',
  ACTIVE:    'Ativo',
  ON_HOLD:   'Pausado',
  CLOSING:   'Encerrando',
  COMPLETED: 'Concluído',
  ARCHIVED:  'Arquivado',
}

const STATUS_COLOR: Record<string, string> = {
  PLANNING:  'background:#dbeafe;color:#1d4ed8',
  ACTIVE:    'background:#dcfce7;color:#15803d',
  ON_HOLD:   'background:#fef9c3;color:#854d0e',
  CLOSING:   'background:#fde8d8;color:#9a3412',
  COMPLETED: 'background:#f0fdf4;color:#166534',
  ARCHIVED:  'background:#f1f5f9;color:#64748b',
}

const TYPE_LABEL: Record<string, string> = {
  ERP_IMPLEMENTATION:    'ERP',
  DIGITAL_TRANSFORMATION:'Transformação Digital',
  INFRASTRUCTURE:        'Infraestrutura',
  MERGER_ACQUISITION:    'M&A',
  INNOVATION:            'Inovação',
  SOCIAL_IMPACT:         'Impacto Social',
  LEAN_SIX_SIGMA:        'Lean / Six Sigma',
  CULTURAL_TRANSFORMATION:'Transformação Cultural',
}

export const metadata = { title: 'Projetos — Collab Engine' }

export default async function ProjectsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const projects = await prisma.project.findMany({
    where: { tenantId: session.tenantId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div style={{ padding:'40px 48px', fontFamily:'system-ui,-apple-system,sans-serif', maxWidth:'1100px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'32px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'4px', height:'24px', background:'#c9a227', borderRadius:'2px' }} />
          <h1 style={{ fontSize:'24px', fontWeight:700, color:'#0f2244', margin:0 }}>Projetos</h1>
        </div>
        <Link
          href="/projects/new"
          style={{ padding:'9px 18px', background:'#0f2244', color:'#fff', borderRadius:'8px', textDecoration:'none', fontSize:'13px', fontWeight:600 }}
        >
          + Novo Projeto
        </Link>
      </div>

      {projects.length === 0 ? (
        <div style={{ border:'2px dashed #e2e8f0', borderRadius:'12px', padding:'60px', textAlign:'center' }}>
          <p style={{ color:'#94a3b8', fontSize:'14px', margin:'0 0 16px' }}>Nenhum projeto cadastrado.</p>
          <Link href="/projects/new" style={{ color:'#0f2244', fontWeight:600, fontSize:'13px' }}>Criar primeiro projeto</Link>
        </div>
      ) : (
        <div style={{ display:'grid', gap:'12px' }}>
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}/dashboard`}
              style={{ display:'block', background:'#fff', border:'1px solid #e2e8f0', borderRadius:'10px', padding:'18px 20px', textDecoration:'none', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px' }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontWeight:600, color:'#0f2244', fontSize:'15px', marginBottom:'4px' }}>{p.name}</div>
                  {p.description && (
                    <div style={{ color:'#64748b', fontSize:'13px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.description}</div>
                  )}
                  <div style={{ color:'#94a3b8', fontSize:'12px', marginTop:'6px' }}>{TYPE_LABEL[p.projectType] ?? p.projectType}</div>
                </div>
                <div style={{ flexShrink:0 }}>
                  <span style={{ fontSize:'11px', fontWeight:600, borderRadius:'20px', padding:'3px 10px', ...Object.fromEntries((STATUS_COLOR[p.status] ?? '').split(';').filter(Boolean).map(s => s.split(':') as [string,string])) }}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
