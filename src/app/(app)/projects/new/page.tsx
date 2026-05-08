'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createProjectAction } from '@/actions/project'

const PROJECT_TYPES = [
  { value: 'DIGITAL_TRANSFORMATION', label: 'Transformação Digital' },
  { value: 'CULTURAL_TRANSFORMATION', label: 'Transformação Cultural' },
  { value: 'ERP_IMPLEMENTATION', label: 'Implantação de ERP' },
  { value: 'INFRASTRUCTURE', label: 'Infraestrutura' },
  { value: 'MERGER_ACQUISITION', label: 'Fusão & Aquisição' },
  { value: 'INNOVATION', label: 'Inovação' },
  { value: 'LEAN_SIX_SIGMA', label: 'Lean / Six Sigma' },
  { value: 'SOCIAL_IMPACT', label: 'Impacto Social' },
]

const DELIVERY_MODELS = [
  { value: 'HYBRID', label: 'Híbrido' },
  { value: 'AGILE', label: 'Ágil' },
  { value: 'WATERFALL', label: 'Cascata' },
]

export default function NewProjectPage() {
  const router = useRouter()
  const [state, action, pending] = useActionState(createProjectAction, null)

  return (
    <div style={{ padding:'40px 48px', fontFamily:'system-ui,-apple-system,sans-serif', maxWidth:'640px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'32px' }}>
        <div style={{ width:'4px', height:'24px', background:'#c9a227', borderRadius:'2px' }} />
        <h1 style={{ fontSize:'24px', fontWeight:700, color:'#0f2244', margin:0 }}>Novo Projeto</h1>
      </div>

      <form action={action} style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
        {state && !state.ok && (
          <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:'8px', padding:'12px 16px', color:'#dc2626', fontSize:'13px' }}>
            {state.error}
          </div>
        )}

        <div>
          <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'6px' }}>Nome do Projeto *</label>
          <input
            name="name"
            required
            style={{ width:'100%', border:'1px solid #d1d5db', borderRadius:'8px', padding:'9px 12px', fontSize:'14px', boxSizing:'border-box', outline:'none' }}
          />
          {state?.issues?.name && <p style={{ color:'#dc2626', fontSize:'12px', marginTop:'4px' }}>{state.issues.name[0]}</p>}
        </div>

        <div>
          <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'6px' }}>Descrição</label>
          <textarea
            name="description"
            rows={3}
            style={{ width:'100%', border:'1px solid #d1d5db', borderRadius:'8px', padding:'9px 12px', fontSize:'14px', boxSizing:'border-box', resize:'vertical', outline:'none' }}
          />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
          <div>
            <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'6px' }}>Tipo de Projeto *</label>
            <select
              name="projectType"
              required
              style={{ width:'100%', border:'1px solid #d1d5db', borderRadius:'8px', padding:'9px 12px', fontSize:'14px', boxSizing:'border-box', outline:'none', background:'#fff' }}
            >
              <option value="">— selecione —</option>
              {PROJECT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'6px' }}>Modelo de Entrega</label>
            <select
              name="deliveryModel"
              style={{ width:'100%', border:'1px solid #d1d5db', borderRadius:'8px', padding:'9px 12px', fontSize:'14px', boxSizing:'border-box', outline:'none', background:'#fff' }}
            >
              {DELIVERY_MODELS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
          <div>
            <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'6px' }}>Data de Início</label>
            <input name="startDate" type="date" style={{ width:'100%', border:'1px solid #d1d5db', borderRadius:'8px', padding:'9px 12px', fontSize:'14px', boxSizing:'border-box', outline:'none' }} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'6px' }}>Previsão de Término</label>
            <input name="targetEndDate" type="date" style={{ width:'100%', border:'1px solid #d1d5db', borderRadius:'8px', padding:'9px 12px', fontSize:'14px', boxSizing:'border-box', outline:'none' }} />
          </div>
        </div>

        <div style={{ display:'flex', gap:'12px', paddingTop:'8px' }}>
          <button
            type="submit"
            disabled={pending}
            style={{ padding:'10px 24px', background:'#0f2244', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer', opacity: pending ? 0.6 : 1 }}
          >
            {pending ? 'Criando…' : 'Criar Projeto'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            style={{ padding:'10px 20px', background:'transparent', color:'#374151', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'14px', cursor:'pointer' }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
