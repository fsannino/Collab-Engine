type Props = { params: Promise<{ id: string }> };

export default async function ImpactsReportPage({ params }: Props) {
  const { id: projectId } = await params;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Relatório de Impactos</h1>
      <p className="text-sm text-gray-500 mb-6">Exportação em PDF/Excel do relatório consolidado de impactos organizacionais.</p>
      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
        <p className="text-gray-500 text-sm">Exportação de relatório — a implementar.</p>
        <a href={`/projects/${projectId}/impacts`} className="mt-4 inline-block text-blue-600 hover:underline text-sm">
          ← Voltar para a lista
        </a>
      </div>
    </div>
  );
}
