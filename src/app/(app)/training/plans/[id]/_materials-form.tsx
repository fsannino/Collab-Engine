'use client';

import { useTransition, useState } from 'react';
import {
  addTrainingMaterialAction,
  deleteTrainingMaterialAction,
} from '@/modules/training/training.actions';

type Material = {
  id: string;
  tipo: string;
  titulo: string;
  url: string | null;
  descricao: string | null;
};

type Props = {
  trainingItemId: string;
  materiais: Material[];
};

const TIPO_LABEL: Record<string, string> = {
  ONLINE:  'Online',
  FISICO:  'Físico',
  DIGITAL: 'Digital',
};

const TIPO_COLOR: Record<string, { bg: string; color: string }> = {
  ONLINE:  { bg: '#dbeafe', color: '#1d4ed8' },
  FISICO:  { bg: '#dcfce7', color: '#15803d' },
  DIGITAL: { bg: '#f3e8ff', color: '#7e22ce' },
};

export function MaterialsForm({ trainingItemId, materiais }: Props) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<'ONLINE' | 'FISICO' | 'DIGITAL'>('ONLINE');
  const [titulo, setTitulo] = useState('');
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [adding, startAdd] = useTransition();
  const [deleting, startDelete] = useTransition();

  function handleAdd() {
    if (!titulo.trim()) return;
    startAdd(async () => {
      const res = await addTrainingMaterialAction({
        trainingItemId,
        tipo,
        titulo: titulo.trim(),
        url: url.trim() || '',
        descricao: '',
      });
      if (res.ok) {
        setTitulo('');
        setUrl('');
        setTipo('ONLINE');
        setMessage({ ok: true, text: 'Material adicionado.' });
      } else {
        setMessage({ ok: false, text: res.error });
      }
    });
  }

  function handleDelete(id: string) {
    startDelete(async () => {
      const res = await deleteTrainingMaterialAction(id);
      if (!res.ok) setMessage({ ok: false, text: res.error });
      else setMessage({ ok: true, text: 'Material removido.' });
    });
  }

  return (
    <div style={{ borderTop: '1px solid #f1f5f9' }}>
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          width: '100%',
          padding: '10px 20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: '12px',
          fontWeight: 600,
          color: '#64748b',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }}
        >
          ▶
        </span>
        Materiais ({materiais.length})
      </button>

      {open && (
        <div style={{ padding: '0 20px 12px' }}>
          {message && (
            <div
              style={{
                padding: '6px 10px',
                marginBottom: '8px',
                fontSize: '12px',
                background: message.ok ? '#f0fdf4' : '#fef2f2',
                color: message.ok ? '#166534' : '#991b1b',
                borderRadius: '6px',
              }}
            >
              {message.text}
            </div>
          )}

          {/* List */}
          {materiais.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', marginBottom: '8px' }}>
              Nenhum material cadastrado.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: '0 0 8px', padding: 0 }}>
              {materiais.map((mat) => {
                const colors = TIPO_COLOR[mat.tipo] ?? { bg: '#f1f5f9', color: '#475569' };
                return (
                  <li
                    key={mat.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom: '1px solid #f8fafc',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          background: colors.bg,
                          color: colors.color,
                          borderRadius: '9999px',
                          padding: '1px 7px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {TIPO_LABEL[mat.tipo] ?? mat.tipo}
                      </span>
                      {mat.url ? (
                        <a
                          href={mat.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}
                        >
                          {mat.titulo}
                        </a>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>{mat.titulo}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => handleDelete(mat.id)}
                      style={{
                        fontSize: '12px',
                        color: '#dc2626',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        flexShrink: 0,
                      }}
                    >
                      Remover
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Add form */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'ONLINE' | 'FISICO' | 'DIGITAL')}
              style={{
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '12px',
              }}
            >
              <option value="ONLINE">Online</option>
              <option value="FISICO">Físico</option>
              <option value="DIGITAL">Digital</option>
            </select>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título do material…"
              maxLength={200}
              style={{
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '12px',
                flex: '1 1 140px',
                minWidth: '120px',
              }}
            />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="URL (opcional)"
              style={{
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '12px',
                flex: '1 1 160px',
                minWidth: '120px',
              }}
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding || !titulo.trim()}
              style={{
                background: '#0f2244',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                opacity: adding || !titulo.trim() ? 0.5 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {adding ? 'Adicionando…' : 'Adicionar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
