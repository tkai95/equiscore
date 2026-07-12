import { cn, formatDate } from '@/lib/utils'

export function EmptyAdminState({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-line bg-surface-card rounded-xl border border-dashed p-8 text-center">
      <p className="text-content font-medium">{title}</p>
      <p className="text-content-secondary mx-auto mt-1 max-w-lg text-sm">{body}</p>
    </div>
  )
}

export function AdminTable({
  columns,
  children,
}: {
  columns: string[]
  children: React.ReactNode
}) {
  return (
    <div className="border-line bg-surface-card overflow-hidden rounded-xl border">
      <div className="overflow-x-auto">
        <table className="divide-line-subtle min-w-full divide-y text-sm">
          <thead className="bg-surface-hover text-content-muted text-xs font-semibold uppercase tracking-wide">
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col" className="whitespace-nowrap px-4 py-3 text-left">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-line-subtle divide-y">{children}</tbody>
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
    <td
      className={cn(
        'whitespace-nowrap px-4 py-3 align-top',
        muted ? 'text-content-muted' : 'text-content',
        className
      )}
    >
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
