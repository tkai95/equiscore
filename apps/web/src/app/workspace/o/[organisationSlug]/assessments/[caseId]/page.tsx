import { AssessmentCaseDetailView } from '@/components/workspace/assessment-case-detail-view'

export default function AssessmentCaseDetailPage({
  params,
}: {
  params: { organisationSlug: string; caseId: string }
}) {
  return (
    <AssessmentCaseDetailView organisationSlug={params.organisationSlug} caseId={params.caseId} />
  )
}
