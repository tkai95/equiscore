import { SharedProfilesView } from '@/components/workspace/shared-profiles-view'

export default function SharedWithUsPage({ params }: { params: { organisationSlug: string } }) {
  return <SharedProfilesView organisationSlug={params.organisationSlug} />
}
