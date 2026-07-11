import { AssessmentCasesView } from '@/components/workspace/assessment-cases-view'

export default function AssessmentsPage({ params }: { params: { organisationSlug: string } }) {
  return <AssessmentCasesView organisationSlug={params.organisationSlug} />
}
