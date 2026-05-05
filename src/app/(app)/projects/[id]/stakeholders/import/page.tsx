type Props = { params: Promise<{ id: string }> };

export default async function StakeholderImportPage({ params }: Props) {
  const { id: projectId } = await params;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Importar Stakeholders via CSV</h1>
      <p className="text-sm text-gray-500 mb-6">Importe múltiplos stakeholders a partir de um arquivo CSV.</p>
      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
        <p className="text-gray-500 text-sm">Importão em lote — implementado na <strong>Issue 018</strong>.</p>
        <a href={`/projects/${projectId}/stakeholders`} className="mt-4 inline-block text-blue-600 hover:underline text-sm">
          ← Voltar para a lista
        </a>
      </div>
    </div>
  );
}
