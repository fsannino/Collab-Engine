'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { csvRowSchema } from '@/modules/stakeholder/csv-import.schema';
import { importStakeholdersFromCsvAction } from '@/modules/stakeholder/csv-import.actions';

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };
  const firstLine = lines[0];
  if (!firstLine) return { headers: [], rows: [] };
  const delim = firstLine.includes(';') ? ';' : ',';
  const clean = (s: string) => s.trim().replace(/^"|"$/g, '');
  const headers = firstLine.split(delim).map(clean);
  const rows = lines.slice(1).map(line => {
    const vals = line.split(delim).map(clean);
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
  });
  return { headers, rows };
}

// ── Field definitions ─────────────────────────────────────────────────────────

const FIELDS = [
  { key: 'name',              label: 'Nome',                 required: true },
  { key: 'position',          label: 'Posição',              required: true,  hint: 'CHAMPION / SUPPORTER / NEUTRAL / RESISTOR / ANTAGONIST' },
  { key: 'influence',         label: 'Influência (1-5)',     required: true },
  { key: 'interest',          label: 'Interesse (1-5)',      required: true },
  { key: 'email',             label: 'E-mail',               required: false },
  { key: 'organizationLevel', label: 'Nível Organizacional', required: false, hint: 'C_LEVEL / EXECUTIVE / MIDDLE_MANAGEMENT / OPERATIONAL / EXTERNAL' },
  { key: 'notes',             label: 'Observações',         required: false },
] as const;

type FieldKey = typeof FIELDS[number]['key'];

// ── Auto-detection ────────────────────────────────────────────────────────────

const DETECT_ALIASES: Record<FieldKey, string[]> = {
  name:              ['nome', 'name', 'stakeholder', 'colaborador'],
  email:             ['email', 'e-mail'],
  position:          ['posicao', 'posicao', 'position', 'tipo', 'perfil'],
  influence:         ['influencia', 'influencia', 'influence', 'poder'],
  interest:          ['interesse', 'interest'],
  organizationLevel: ['nivel', 'nivel', 'level', 'organizationlevel'],
  notes:             ['observacoes', 'observacoes', 'notas', 'notes', 'descricao'],
};

function autoDetect(headers: string[]): Partial<Record<FieldKey, string>> {
  const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const result: Partial<Record<FieldKey, string>> = {};
  for (const [field, aliases] of Object.entries(DETECT_ALIASES) as [FieldKey, string[]][]) {
    const match = headers.find(h => aliases.includes(norm(h)));
    if (match) result[field] = match;
  }
  return result;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ValidatedRow = {
  index: number;
  data: Record<string, unknown> | null;
  firstError: string;
};

type Step = 'upload' | 'map' | 'done';

// ── Wizard ────────────────────────────────────────────────────────────────────

export function ImportWizard({ projectId }: { projectId: string }) {
  const [step, setStep]         = useState<Step>('upload');
  const [headers, setHeaders]   = useState<string[]>([]);
  const [rawRows, setRawRows]   = useState<Record<string, string>[]>([]);
  const [mapping, setMapping]   = useState<Partial<Record<FieldKey, string>>>({});
  const [validated, setValidated] = useState<ValidatedRow[] | null>(null);
  const [result, setResult]     = useState<{ imported: number; skipped: number } | null>(null);
  const [serverError, setServerError] = useState('');
  const [isPending, startTransition]  = useTransition();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const { headers: h, rows } = parseCsv(ev.target?.result as string);
      setHeaders(h);
      setRawRows(rows);
      setMapping(autoDetect(h));
      setValidated(null);
      setStep('map');
    };
    reader.readAsText(file, 'utf-8');
  }

  function handleValidate() {
    const rows: ValidatedRow[] = rawRows.map((raw, index) => {
      const mapped: Record<string, string> = {};
      for (const [field, col] of Object.entries(mapping) as [FieldKey, string][]) {
        if (col) mapped[field] = raw[col] ?? '';
      }
      const r = csvRowSchema.safeParse(mapped);
      if (r.success) return { index, data: r.data as Record<string, unknown>, firstError: '' };
      const allErrors = Object.values(r.error.flatten().fieldErrors).flat() as string[];
      return { index, data: null, firstError: allErrors[0] ?? 'Linha inválida' };
    });
    setValidated(rows);
  }

  function handleImport() {
    if (!validated) return;
    const validData = validated.filter(r => r.data !== null).map(r => r.data);
    startTransition(async () => {
      setServerError('');
      const res = await importStakeholdersFromCsvAction(projectId, validData);
      if (res.ok) {
        setResult(res.data);
        setStep('done');
      } else {
        setServerError(res.error);
      }
    });
  }

  const validCount = validated ? validated.filter(r => r.data !== null).length : 0;
  const errorCount = validated ? validated.filter(r => r.data === null).length  : 0;

  // ── Step: Upload ─────────────────────────────────────────────────────────────
  if (step === 'upload') {
    return (
      <div className="max-w-lg mx-auto p-8 space-y-6">
        <h1 className="text-2xl font-bold">Importar Partes Interessadas</h1>
        <p className="text-sm text-muted-foreground">
          Faça upload de um arquivo CSV com as colunas obrigatórias:{' '}
          <strong>nome, posição, influência (1-5), interesse (1-5)</strong>. Separador vírgula ou ponto-e-vírgula.
        </p>
        <div className="border-2 border-dashed rounded-xl p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Selecione um arquivo .csv</p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="block w-full text-sm text-muted-foreground
              file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
              file:bg-primary file:text-primary-foreground file:cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">UTF-8 · máx. 10.000 linhas</p>
        </div>
        <Link href={`/projects/${projectId}/stakeholders`} className="text-sm text-primary hover:underline">
          ← Voltar para Partes Interessadas
        </Link>
      </div>
    );
  }

  // ── Step: Map + Validate + Preview ───────────────────────────────────────────
  if (step === 'map') {
    return (
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        <h1 className="text-2xl font-bold">Mapeamento de Colunas</h1>
        <p className="text-sm text-muted-foreground">
          {rawRows.length} linha{rawRows.length !== 1 ? 's' : ''} detectada{rawRows.length !== 1 ? 's' : ''}
          · {headers.length} coluna{headers.length !== 1 ? 's' : ''} no arquivo
        </p>

        {/* Column mapping */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FIELDS.map(f => (
            <label key={f.key} className="flex flex-col gap-1">
              <span className="text-sm font-medium">
                {f.label}
                {f.required && <span className="text-red-500 ml-1">*</span>}
              </span>
              {'hint' in f && (
                <span className="text-xs text-muted-foreground">{f.hint}</span>
              )}
              <select
                value={mapping[f.key] ?? ''}
                onChange={e => {
                  const val = e.target.value;
                  setMapping(m => ({ ...m, [f.key]: val }));
                  setValidated(null);
                }}
                className="border rounded-lg p-2 text-sm bg-background"
              >
                <option value="">— ignorar —</option>
                {headers.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleValidate}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90"
          >
            Validar {rawRows.length} linhas
          </button>
          <button
            onClick={() => setStep('upload')}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-accent"
          >
            Voltar
          </button>
        </div>

        {/* Validation preview */}
        {validated && (
          <div className="space-y-4">
            <div className="flex gap-6 text-sm">
              {validCount > 0 && (
                <span className="font-medium text-green-600">{validCount} linha{validCount !== 1 ? 's' : ''} válida{validCount !== 1 ? 's' : ''}</span>
              )}
              {errorCount > 0 && (
                <span className="font-medium text-red-500">{errorCount} linha{errorCount !== 1 ? 's' : ''} com erro</span>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 text-left w-8">#</th>
                    <th className="p-2 text-left">Nome</th>
                    <th className="p-2 text-left">Posição</th>
                    <th className="p-2 text-center w-12">Inf.</th>
                    <th className="p-2 text-center w-12">Int.</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {validated.map(row => {
                    const nameCol = mapping.name ?? '';
                    const posCol  = mapping.position ?? '';
                    const infCol  = mapping.influence ?? '';
                    const intCol  = mapping.interest ?? '';
                    return (
                      <tr
                        key={row.index}
                        className={row.data ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}
                      >
                        <td className="p-2 text-muted-foreground">{row.index + 1}</td>
                        <td className="p-2">{nameCol ? (rawRows[row.index]?.[nameCol] ?? '—') : '—'}</td>
                        <td className="p-2">{posCol  ? (rawRows[row.index]?.[posCol]  ?? '—') : '—'}</td>
                        <td className="p-2 text-center">{infCol ? (rawRows[row.index]?.[infCol] ?? '—') : '—'}</td>
                        <td className="p-2 text-center">{intCol ? (rawRows[row.index]?.[intCol] ?? '—') : '—'}</td>
                        <td className="p-2">
                          {row.data
                            ? <span className="text-green-700 dark:text-green-400">✓ válida</span>
                            : <span className="text-red-600 dark:text-red-400" title={row.firstError}>✗ {row.firstError}</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {serverError && (
              <p className="text-sm text-red-600">{serverError}</p>
            )}

            {validCount > 0 && (
              <button
                onClick={handleImport}
                disabled={isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isPending
                  ? 'Importando…'
                  : `Importar ${validCount} parte${validCount !== 1 ? 's' : ''} interessada${validCount !== 1 ? 's' : ''}`
                }
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Step: Done ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto p-8 space-y-6 text-center">
      <div className="text-5xl">✓</div>
      <h1 className="text-2xl font-bold">Importação concluída</h1>
      {result && (
        <div className="flex justify-center gap-8">
          <div>
            <p className="text-3xl font-bold text-green-600">{result.imported}</p>
            <p className="text-sm text-muted-foreground">importadas</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-muted-foreground">{result.skipped}</p>
            <p className="text-sm text-muted-foreground">já existiam</p>
          </div>
        </div>
      )}
      <div className="flex justify-center gap-3">
        <Link
          href={`/projects/${projectId}/stakeholders`}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity"
        >
          Ver Partes Interessadas
        </Link>
        <button
          onClick={() => {
            setStep('upload');
            setValidated(null);
            setResult(null);
            setServerError('');
          }}
          className="px-4 py-2 border rounded-lg text-sm hover:bg-accent transition-colors"
        >
          Nova Importação
        </button>
      </div>
    </div>
  );
}
