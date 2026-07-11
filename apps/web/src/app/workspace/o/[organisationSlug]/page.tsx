import { WorkspaceOverview } from '@/components/workspace/workspace-overview'

export default function OrganisationWorkspacePage({ params }: { params: { organisationSlug: string } }) {
  return <WorkspaceOverview organisationSlug={params.organisationSlug} />
}
