import { cn, formatDate } from '@/lib/utils'

export function EmptyWorkspaceState({
  title,
  body,
}: {
  title: string
  body: string
}) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface-card p-8 text-center">
      <p className="font-medium text-content">{title}</p>
      <p className="mx-auto mt-1 max-w-lg text-sm text-content-secondary">{body}</p>
    </div>
  )
}

export function WorkspaceTable({
  columns,
  children,
}: {
  columns: string[]
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface-card">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line-subtle text-sm">
          <thead className="bg-surface-hover text-xs font-semibold uppercase tracking-wide text-content-muted">
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col" className="whitespace-nowrap px-4 py-3 text-left">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line-subtle">{children}</tbody>
        </table>
      </div>
    </div>
  )
}

export function Cell({
  children,
  muted,
  className,
}: {
  children: React.ReactNode
  muted?: boolean
  className?: string
}) {
  return (
    <td className={cn('whitespace-nowrap px-4 py-3 align-top', muted ? 'text-content-muted' : 'text-content', className)}>
      {children}
    </td>
  )
}

export function formatMaybeDate(value: string | null | undefined): string {
  return value ? formatDate(value) : 'Not set'
}

export function label(value: string | null | undefined): string {
  return value ? value.replace(/_/g, ' ') : 'None'
}
