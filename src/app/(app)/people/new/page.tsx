'use client';

import { useRouter } from 'next/navigation';
import { useTransition, useState } from 'react';
import { createPessoaAction } from '@/modules/people/people.actions';

export default function NewPessoaPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    startTransition(async () => {
      const res = await createPessoaAction(data);
      if (res.ok) {
        router.push(`/people/${res.data.id}`);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nova Pessoa</h1>
        <p className="text-sm text-gray-500 mt-0.5">Cadastrar pessoa na base organizacional</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input name="nome" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
          <input name="email" type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CPF <span className="text-gray-400 font-normal">(11 dígitos, sem pontuação)</span></label>
          <input name="cpf" maxLength={11} pattern="\d{11}" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ID no HRIS <span className="text-gray-400 font-normal">(opcional)</span></label>
          <input name="hrisId" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Salvando…' : 'Criar Pessoa'}
          </button>
          <button type="button" onClick={() => router.back()} className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
