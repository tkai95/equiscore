import { TeamSettingsView } from '@/components/workspace/team-settings-view'

export default function SettingsPage({ params }: { params: { organisationSlug: string } }) {
  return <TeamSettingsView organisationSlug={params.organisationSlug} />
}
