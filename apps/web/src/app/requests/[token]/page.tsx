import { AssessmentRequestCompletion } from '@/components/requests/assessment-request-completion'

export const dynamic = 'force-dynamic'

export default function AssessmentRequestPage({ params }: { params: { token: string } }) {
  return <AssessmentRequestCompletion requestToken={params.token} />
}
