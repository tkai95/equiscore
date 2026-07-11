import { PoliciesView } from '@/components/workspace/policies-view'

export default function PoliciesPage({ params }: { params: { organisationSlug: string } }) {
  return <PoliciesView organisationSlug={params.organisationSlug} />
}
