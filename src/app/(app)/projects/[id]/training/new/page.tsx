import { TrainingMatrixForm } from './_form';

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ impactId?: string }>;

export default async function NewTrainingPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id: projectId } = await params;
  const { impactId }      = await searchParams;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Nova Trilha de Treinamento</h1>
      <TrainingMatrixForm projectId={projectId} impactId={impactId} />
    </div>
  );
}
