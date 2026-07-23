// Cliente REST da API v1 do XPROC (Issue 021 — Sprint 4).
//
// Autenticação via header `x-api-key` (ver docs/INTEGRATION_GLOSSARY.md).
// Quando XPROC_API_URL/XPROC_API_KEY não estão configurados, a integração
// fica desabilitada e as funções de leitura retornam vazio (best-effort) —
// a UI exibe aviso em vez de quebrar.

import { env } from '@/core/config/env';

export type XprocProcesso = {
  id: string;
  nome: string;
  codigo?: string | null;
  area?: string | null;
  status?: string | null;
};

const TIMEOUT_MS = 5_000;

export function isXprocConfigured(): boolean {
  return Boolean(env.XPROC_API_URL && env.XPROC_API_KEY);
}

export class XprocError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'XprocError';
  }
}

async function xprocFetch<T>(path: string): Promise<T> {
  if (!isXprocConfigured()) {
    throw new XprocError('Integração XPROC não configurada (XPROC_API_URL/XPROC_API_KEY)');
  }

  const url = `${env.XPROC_API_URL!.replace(/\/$/, '')}${path}`;
  const res = await fetch(url, {
    headers: { 'x-api-key': env.XPROC_API_KEY!, Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new XprocError(`XPROC respondeu ${res.status} em ${path}`, res.status);
  }
  return (await res.json()) as T;
}

/** Lista processos do XPROC, com busca opcional por nome/código. */
export async function listProcessos(search?: string): Promise<XprocProcesso[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  const data = await xprocFetch<{ data?: XprocProcesso[] } | XprocProcesso[]>(
    `/api/v1/processos${qs}`
  );
  return Array.isArray(data) ? data : (data.data ?? []);
}

/** Detalhe de um processo. Retorna null se não encontrado. */
export async function getProcesso(id: string): Promise<XprocProcesso | null> {
  try {
    return await xprocFetch<XprocProcesso>(`/api/v1/processos/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof XprocError && e.status === 404) return null;
    throw e;
  }
}

/**
 * Resolve nomes de processos em lote (best-effort).
 * Falhas individuais ou integração desabilitada não quebram o chamador —
 * IDs sem resolução simplesmente não aparecem no Map.
 */
export async function getProcessosByIds(ids: string[]): Promise<Map<string, XprocProcesso>> {
  const map = new Map<string, XprocProcesso>();
  if (!isXprocConfigured() || ids.length === 0) return map;

  const results = await Promise.allSettled(ids.map((id) => getProcesso(id)));
  results.forEach((r, i) => {
    const id = ids[i];
    if (id && r.status === 'fulfilled' && r.value) map.set(id, r.value);
  });
  return map;
}
