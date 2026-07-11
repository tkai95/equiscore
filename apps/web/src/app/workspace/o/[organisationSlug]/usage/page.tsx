import { UsageView } from '@/components/workspace/usage-view'

export default function UsagePage({ params }: { params: { organisationSlug: string } }) {
  return <UsageView organisationSlug={params.organisationSlug} />
}
