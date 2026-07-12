'use client'

import { useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { api, type Breakdown, type TxnRow } from '@/lib/api'
import { Drawer } from '@/components/ui/drawer'
import { formatCurrency, formatDate } from '@/lib/utils'

export interface DrawerSpec {
  type: 'category' | 'commitment' | 'income' | 'month'
  key: string
  title: string
  subtitle?: string
}

export function BreakdownDrawer({ spec, onClose }: { spec: DrawerSpec | null; onClose: () => void }) {
  const { getToken } = useAuth()
  const { data, isLoading } = useQuery<Breakdown>({
    queryKey: ['breakdown', spec?.type, spec?.key],
    enabled: !!spec,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const token = await getToken()
      return api.insights.getBreakdown(token!, spec!.type, spec!.key)
    },
  })

  return (
    <Drawer
      open={!!spec}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={spec?.title ?? ''}
      subtitle={spec?.subtitle}
    >
      {isLoading || !data ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-panel bg-surface-hover" />
          ))}
        </div>
      ) : data.kind === 'category' ? (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Monthly avg" value={formatCurrency(data.monthlyAverage)} />
            <Stat label="Total" value={formatCurrency(data.total)} />
            <Stat label="Payments" value={String(data.transactionCount)} />
          </div>
          {data.merchants.length > 0 && (
            <Section title="Top merchants">
              <div className="space-y-1.5">
                {data.merchants.map((m) => (
                  <div key={m.name} className="flex items-center justify-between text-sm">
                    <span className="min-w-0 truncate text-content-secondary">{m.name}</span>
                    <span className="shrink-0 tabular-nums text-content-muted">
                      {formatCurrency(m.total)}
                      <span className="ml-1 text-xs text-content-muted">×{m.count}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}
          <Section title={`Transactions (${data.transactionCount})`}>
            <TxnList rows={data.transactions} />
          </Section>
        </div>
      ) : data.kind === 'commitment' || data.kind === 'income' ? (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <Stat
              label="Typical"
              value={formatCurrency(data.typicalAmount)}
              tone={data.kind === 'income' ? 'in' : undefined}
            />
            <Stat
              label={data.kind === 'income' ? 'Total received' : 'Total paid'}
              value={formatCurrency(data.total)}
              tone={data.kind === 'income' ? 'in' : undefined}
            />
            <Stat label="Payments" value={String(data.count)} />
          </div>
          <Section title={data.kind === 'income' ? 'Money received' : 'Payment history'}>
            <TxnList rows={data.transactions} positive={data.kind === 'income'} />
          </Section>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="In" value={formatCurrency(data.income)} tone="in" />
            <Stat label="Out" value={formatCurrency(data.spend)} tone="out" />
            <Stat
              label="Net"
              value={`${data.net >= 0 ? '+' : ''}${formatCurrency(data.net)}`}
              tone={data.net >= 0 ? 'in' : 'out'}
            />
          </div>
          {data.categories.length > 0 && (
            <Section title="Where it went">
              <div className="space-y-1.5">
                {data.categories.map((c) => (
                  <div key={c.label} className="flex items-center justify-between text-sm">
                    <span className="min-w-0 truncate text-content-secondary">{c.label}</span>
                    <span className="shrink-0 tabular-nums text-content-muted">{formatCurrency(c.total)}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
          {data.largest.length > 0 && (
            <Section title="Largest payments">
              <TxnList rows={data.largest} />
            </Section>
          )}
        </div>
      )}
    </Drawer>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'in' | 'out' }) {
  return (
    <div className="rounded-panel bg-surface-inset px-3 py-2.5">
      <p className="text-xs text-content-muted">{label}</p>
      <p
        className={`mt-0.5 text-sm font-semibold tabular-nums ${
          tone === 'in' ? 'text-success-strong' : tone === 'out' ? 'text-danger-strong' : 'text-content'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">{title}</h3>
      {children}
    </div>
  )
}

function TxnList({ rows, positive }: { rows: TxnRow[]; positive?: boolean }) {
  if (rows.length === 0) return <p className="text-sm text-content-muted">No transactions found.</p>
  return (
    <div className="divide-y divide-line-subtle">
      {rows.map((t, i) => (
        <div key={`${t.date}-${i}`} className="flex items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm text-content-secondary">{t.description || 'Transaction'}</p>
            <p className="text-xs text-content-muted">{formatDate(t.date)}</p>
          </div>
          <span
            className={`shrink-0 text-sm font-medium tabular-nums ${
              positive ? 'text-success-strong' : 'text-content'
            }`}
          >
            {positive ? '+' : ''}
            {formatCurrency(t.amount)}
          </span>
        </div>
      ))}
    </div>
  )
}
