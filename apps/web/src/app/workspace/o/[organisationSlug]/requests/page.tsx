import { AssessmentRequestsView } from '@/components/workspace/assessment-requests-view'

export default function RequestsPage({ params }: { params: { organisationSlug: string } }) {
  return <AssessmentRequestsView organisationSlug={params.organisationSlug} />
}
