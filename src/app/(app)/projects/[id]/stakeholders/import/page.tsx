import { ImportWizard } from './_wizard';

type Params = Promise<{ id: string }>;

export default async function ImportStakeholdersPage({ params }: { params: Params }) {
  const { id: projectId } = await params;
  return <ImportWizard projectId={projectId} />;
}
