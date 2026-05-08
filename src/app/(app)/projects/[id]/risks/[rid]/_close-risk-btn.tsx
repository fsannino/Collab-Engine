'use client'

import { useState, useTransition } from 'react'

type OrphanItem = {
  id: string
  description: string
  status: string
  pctComplete: number
}

type Props = {
  riskId: string
  projectId: string
  openItemCount: number
  openItems: OrphanItem[]
  closeAction: (formData: FormData) => Promise<{ ok?: boolean; orphanActions?: OrphanItem[]; error?: unknown }>
}

type OrphanResolution = 'CANCEL_ALL' | 'REASSIGN' | 'STANDALONE'

export function CloseRiskButton({ riskId, openItemCount, closeAction }: Props) {
  const [pending, startTransition] = useTransition()
  const [orphans, setOrphans]    = useState<OrphanItem[] | null>(null)
  const [resolution, setResolution] = useState<OrphanResolution>('CANCEL_ALL')
  const [justification, setJustification] = useState('')

  function handleClose() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('riskId', riskId)
      const result = await closeAction(fd)
      if (result.orphanActions) {
        setOrphans(result.orphanActions)
      }
    })
  }

  function handleConfirmResolution() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('riskId', riskId)
      fd.set('orphanResolution', resolution)
      if (resolution === 'STANDALONE') fd.set('standaloneJustification', justification)
      await closeAction(fd)
      // Recarrega após fechar
      window.location.reload()
    })
  }

  return (
    <>
      <button
        onClick={handleClose}
        disabled={pending}
        style={{
          background: '#0B1F3A', color: '#fff', border: 'none', borderRadius: '7px',
          padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: pending ? 'wait' : 'pointer',
          flexShrink: 0,
        }}
      >
        {pending ? 'Aguarde…' : 'Fechar risco'}
      </button>

      {/* Modal de ações órfãs */}
      {orphans && orphans.length > 0 && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div style={{
            background: '#fff', borderRadius: '14px', maxWidth: '560px', width: '100%',
            padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}>
            <h2 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: '20px', fontWeight: 400, color: '#0B1F3A', margin: '0 0 8px' }}>
              Ações vinculadas em aberto
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 }}>
              Este risco tem <strong>{orphans.length} ação{orphans.length > 1 ? 'ões' : ''}</strong> do plano ainda em aberto. Como deseja proceder?
            </p>

            {/* Lista das órfãs */}
            <div style={{ background: '#f8fafc', border: '1px solid #e9ecf0', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
              {orphans.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#374151' }}>{item.description.slice(0, 55)}{item.description.length > 55 ? '…' : ''}</span>
                  <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '11px' }}>{item.pctComplete}%</span>
                </div>
              ))}
            </div>

            {/* Opções */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {([
                { value: 'CANCEL_ALL', label: 'Cancelar todas as ações junto com o risco', sub: 'Status → CANCELLED' },
                { value: 'STANDALONE', label: 'Manter ações sem vínculo de risco (standalone)', sub: 'As ações continuam no plano independentes' },
              ] as { value: OrphanResolution; label: string; sub: string }[]).map(opt => (
                <label key={opt.value} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer',
                  background: resolution === opt.value ? '#f0f9ff' : '#f8fafc',
                  border: `1px solid ${resolution === opt.value ? '#0ea5e9' : '#e9ecf0'}`,
                  borderRadius: '8px', padding: '10px 14px',
                }}>
                  <input
                    type="radio"
                    name="resolution"
                    value={opt.value}
                    checked={resolution === opt.value}
                    onChange={() => setResolution(opt.value)}
                    style={{ marginTop: '2px', flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0B1F3A' }}>{opt.label}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{opt.sub}</div>
                  </div>
                </label>
              ))}
            </div>

            {resolution === 'STANDALONE' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
                  Justificativa obrigatória
                </label>
                <textarea
                  rows={2}
                  value={justification}
                  onChange={e => setJustification(e.target.value)}
                  placeholder="Por que as ações devem continuar sem o risco-pai?"
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '8px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setOrphans(null)}
                style={{ background: 'transparent', border: '1px solid #e9ecf0', borderRadius: '7px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', color: '#64748b' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmResolution}
                disabled={pending || (resolution === 'STANDALONE' && !justification.trim())}
                style={{
                  background: '#0B1F3A', color: '#fff', border: 'none', borderRadius: '7px',
                  padding: '8px 20px', fontSize: '13px', fontWeight: 600,
                  cursor: (pending || (resolution === 'STANDALONE' && !justification.trim())) ? 'not-allowed' : 'pointer',
                  opacity: (pending || (resolution === 'STANDALONE' && !justification.trim())) ? 0.6 : 1,
                }}
              >
                {pending ? 'Aguarde…' : 'Confirmar e fechar risco'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
