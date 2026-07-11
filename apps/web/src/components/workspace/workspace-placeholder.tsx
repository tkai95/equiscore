import { PageHeader, PageLayout, Card } from '@/components/ui'

export function WorkspacePlaceholder({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <PageLayout width="wide">
      <PageHeader title={title} description={description} />
      <Card>
        <p className="text-sm text-content-secondary">
          The tenant foundation is in place. This workflow will connect to assessment cases, snapshots,
          policies and usage events as the next vertical slice is built.
        </p>
      </Card>
    </PageLayout>
  )
}
