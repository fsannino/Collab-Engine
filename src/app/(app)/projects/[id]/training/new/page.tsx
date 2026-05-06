import { redirect } from 'next/navigation';

type Params = Promise<{ id: string }>;

// Redirect to the central training plans creation page, scoped to this project
export default async function NewProjectTrainingPage({ params }: { params: Params }) {
  const { id: projectId } = await params;
  redirect(`/training/plans/new?projectId=${projectId}`);
}
