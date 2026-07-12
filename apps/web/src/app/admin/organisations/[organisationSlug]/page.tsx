import { AdminOrganisationDetail } from '@/components/admin/admin-organisation-detail'

export default function AdminOrganisationDetailPage({
  params,
}: {
  params: { organisationSlug: string }
}) {
  return <AdminOrganisationDetail organisationSlug={params.organisationSlug} />
}
