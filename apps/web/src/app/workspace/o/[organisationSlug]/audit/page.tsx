import { AuditView } from '@/components/workspace/audit-view'

export default function AuditPage({ params }: { params: { organisationSlug: string } }) {
  return <AuditView organisationSlug={params.organisationSlug} />
}
