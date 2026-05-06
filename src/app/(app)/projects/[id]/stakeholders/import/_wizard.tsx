'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { csvRowSchema, STAKEHOLDER_POSITIONS, STAKEHOLDER_LEVELS, type CsvRow } from '@/modules/stakeholder/csv-import.schema';
import { importStakeholdersFromCsvAction } from '@/modules/stakeholder/csv-import.actions';

type ParsedRow = { raw: Record<string, string>; parsed?: CsvRow; errors?: string[] };

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0]!.split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
}

const COLUMN_MAP: Record<string, keyof CsvRow> = {
  nome: 'name', name: 'name',
  email: 'email',
  posicao: 'position', posição: 'position', position: 'position',
  influencia: 'influence', influência: 'influence', influence: 'influence',
  interesse: 'interest', interest: 'interest',
  nivel_organizacional: 'organizationLevel', organization_level: 'organizationLevel', nivel: 'organizationLevel',
  notas: 'notes', notes: 'notes', observacoes: 'notes', observações: 'notes',
};

function normalizeRow(raw: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const mapped = COLUMN_MAP[k];
    if (mapped) out[mapped] = v;
  }
  return out;
}

export function ImportWizard({ projectId }: { projectId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rawRows = parseCsv(text);
      const parsed: ParsedRow[] = rawRows.map((raw) => {
        const normalized = normalizeRow(raw);
        const result = csvRowSchema.safeParse(normalized);
        if (result.success) return { raw, parsed: result.data };
        const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
        return { raw, errors };
      });
      setRows(parsed);
      setStep('preview');
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleImport() {
    const validRows = rows.filter((r) => r.parsed).map((r) => r.parsed!);
    startTransition(async () => {
      const res = await importStakeholdersFromCsvAction(projectId, validRows);
      if (res.ok) {
        setResult(res.data);
        setStep('done');
      } else {
        setError(res.error);
      }
    });
  }

  const validCount = rows.filter((r) => r.parsed).length;
  const invalidCount = rows.filter((r) => r.errors).length;

  if (step === 'done' && result) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center space-y-4">
        <div className="text-4xl">✓</div>
        <h2 className="text-xl font-semibold text-gray-900">Importação concluída</h2>
        <p className="text-sm text-gray-600">
          {result.imported} stakeholder{result.imported !== 1 ? 's' : ''} importado{result.imported !== 1 ? 's' : ''}.
          {result.skipped > 0 && ` ${result.skipped} ignorado${result.skipped !== 1 ? 's' : ''} (já existiam).`}
        </p>
        <button
          onClick={() => router.push(`/projects/${projectId}/stakeholders`)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          Ver stakeholders
        </button>
      </div>
    );
  }

  if (step === 'preview') {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Prévia da importação</h2>
            <p className="text-sm text-gray-500">
              {validCount} válido{validCount !== 1 ? 's' : ''}
              {invalidCount > 0 && `, ${invalidCount} com erro${invalidCount !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setRows([]); setStep('upload'); }} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              Novo arquivo
            </button>
            <button
              onClick={handleImport}
              disabled={validCount === 0 || isPending}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Importando…' : `Importar ${validCount}`}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">#</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Nome</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Posição</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Influência</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Interesse</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, i) => (
                <tr key={i} className={row.errors ? 'bg-red-50' : 'bg-white'}>
                  <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-gray-900">{row.raw.name ?? row.raw.nome ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-700">{row.raw.position ?? row.raw.posicao ?? row.raw.posição ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-700">{row.raw.influence ?? row.raw.influencia ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-700">{row.raw.interest ?? row.raw.interesse ?? '—'}</td>
                  <td className="px-3 py-2">
                    {row.errors ? (
                      <span className="text-red-600" title={row.errors.join('; ')}>✗ Erro</span>
                    ) : (
                      <span className="text-green-600">✓ OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Importar stakeholders via CSV</h2>
        <p className="text-sm text-gray-500 mt-1">
          O arquivo deve ter as colunas: <code className="bg-gray-100 px-1 rounded">name, email, position, influence, interest</code>
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
      >
        <p className="text-sm text-gray-600">Arraste um arquivo CSV ou clique para selecionar</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-xs text-gray-600 space-y-1">
        <p className="font-medium text-gray-700">Valores válidos:</p>
        <p><strong>position:</strong> {STAKEHOLDER_POSITIONS.join(', ')}</p>
        <p><strong>influence / interest:</strong> 1 a 5</p>
        <p><strong>organizationLevel (opcional):</strong> {STAKEHOLDER_LEVELS.join(', ')}</p>
      </div>
    </div>
  );
}
