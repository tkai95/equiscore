'use client'

import { useState } from 'react'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Layers,
  MinusCircle,
  PiggyBank,
  Repeat,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'
import type { CompassPayload } from '@/lib/compass-types'
import type { CompassActions } from '@/lib/use-compass'
import type { DrawerSpec } from '@/components/analytics/breakdown-drawer'
import { ReasonCodeList } from '@/components/trust-score/reason-code-list'
import { formatDate, TIER_COLORS, cn } from '@/lib/utils'
import type { TrustTier } from '@equiscore/shared'
import { Bar, Card, CardTitle, DrillRow, EmptyState, Label, Pill, StatTile, money } from './compass-ui'

type Drill = (spec: DrawerSpec) => void

const pct = (v: number) => `${Math.round(v * 100)}%`
const signed = (n: number) => `${n >= 0 ? '+' : '-'}${money(Math.abs(n))}`
const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`

/** True only while the reminder with this id is being mutated (per-row spinner). */
function reminderBusy(actions: CompassActions, id: string): boolean {
  return actions.updateReminder.isPending && actions.updateReminder.variables?.id === id
}

// ─── Overview ─────────────────────────────────────────────────────────────────

export function OverviewSection({
  data,
  onDrill,
  actions,
}: {
  data: CompassPayload
  onDrill: Drill
  actions: CompassActions
}) {
  const o = data.overview
  const surplusTone = o.monthlySurplus >= 0 ? 'in' : 'out'
  const dueReminders = data.reminders.filter((r) => r.due)
  return (
    <div className="space-y-6">
      {dueReminders.length > 0 && <RemindersStrip reminders={dueReminders} actions={actions} />}
      <Card>
        <CardTitle title="Your monthly money picture" subtitle="Averaged across your available history, with transfers between your own accounts removed." />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Income" value={money(o.monthlyIncome)} tone="in" hint="Genuine external income" />
          <StatTile label="Spending" value={money(o.monthlySpend)} tone="out" />
          <StatTile label="Surplus" value={signed(o.monthlySurplus)} tone={surplusTone} hint="Left after all spend" />
          <StatTile label="Savings" value={money(o.monthlySavings)} hint="Moved to savings" />
        </div>
        {(o.internalTransfersMonthly > 0 || o.personalTransfersMonthly > 0) && (
          <p className="mt-3 flex items-start gap-2 text-xs text-gray-500">
            <Repeat className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span>
              {o.internalTransfersMonthly > 0 && (
                <>You move about {money(o.internalTransfersMonthly)}/mo between your own accounts. </>
              )}
              {o.personalTransfersMonthly > 0 && (
                <>You receive about {money(o.personalTransfersMonthly)}/mo from people. </>
              )}
              {o.internalTransfersMonthly > 0 && o.personalTransfersMonthly > 0
                ? 'Neither counts as income or spending.'
                : 'This does not count as income or spending.'}
            </span>
          </p>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle title="What supports your profile" />
          {o.profileImpact.length === 0 ? (
            <p className="text-sm text-gray-500">Add more evidence to surface positive signals.</p>
          ) : (
            <ul className="space-y-2.5">
              {o.profileImpact.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {s}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle title="Top things to review" />
          {o.topOpportunities.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing pressing right now. Nice.</p>
          ) : (
            <ul className="space-y-2.5">
              {o.topOpportunities.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  {s}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {data.monthlyReview && <MonthlyReviewCard data={data} onDrill={onDrill} />}
    </div>
  )
}

function MonthlyReviewCard({ data, onDrill }: { data: CompassPayload; onDrill: Drill }) {
  const r = data.monthlyReview!
  return (
    <Card>
      <CardTitle
        title={`${r.label} review`}
        subtitle={r.headline}
        right={
          <button
            onClick={() => onDrill({ type: 'month', key: r.month, title: `${r.label}`, subtitle: 'Money in and out' })}
            className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            View month
          </button>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Income" value={money(r.income)} tone="in" hint={`${signed(r.vsAverage.income)} vs usual`} />
        <StatTile label="Spending" value={money(r.spend)} tone="out" hint={`${signed(r.vsAverage.spend)} vs usual`} />
        <StatTile label="Essentials" value={money(r.essentialSpend)} />
        <StatTile label="Net" value={signed(r.net)} tone={r.net >= 0 ? 'in' : 'out'} hint={`${signed(r.vsAverage.net)} vs usual`} />
      </div>
      {r.drivers.length > 0 && (
        <div className="mt-4">
          <Label>What moved</Label>
          <div className="mt-2 space-y-1.5">
            {r.drivers.map((d) => (
              <div key={d.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-700">
                  {d.direction === 'up' ? (
                    <TrendingUp className="h-3.5 w-3.5 text-rose-400" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                  {d.label}
                </span>
                <span className={cn('font-semibold tabular-nums', d.direction === 'up' ? 'text-rose-600' : 'text-emerald-600')}>
                  {signed(d.delta)} vs last month
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

function RemindersStrip({
  reminders,
  actions,
}: {
  reminders: CompassPayload['reminders']
  actions: CompassActions
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Bell className="h-4 w-4 text-amber-600" />
        <p className="text-sm font-semibold text-amber-900">Reminders</p>
      </div>
      <div className="space-y-2">
        {reminders.map((rem) => (
          <div key={rem.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/70 p-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-800">{rem.title}</p>
              <p className="text-xs text-gray-500">
                {rem.daysUntilDue > 0
                  ? `Due in ${rem.daysUntilDue} day${rem.daysUntilDue === 1 ? '' : 's'} (${formatDate(rem.dueDate)})`
                  : `Was due ${formatDate(rem.dueDate)}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => actions.updateReminder.mutate({ id: rem.id, status: 'completed' })}
                disabled={reminderBusy(actions, rem.id)}
                className="rounded-lg p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-40"
                aria-label="Mark done"
                title="Mark done"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => actions.updateReminder.mutate({ id: rem.id, status: 'dismissed' })}
                disabled={reminderBusy(actions, rem.id)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 disabled:opacity-40"
                aria-label="Dismiss"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Money map ────────────────────────────────────────────────────────────────

const FLOW_META: Record<
  CompassPayload['moneyMap']['flows'][number]['kind'],
  { tone: 'brand' | 'amber' | 'rose'; dot: string }
> = {
  income: { tone: 'brand', dot: 'bg-emerald-500' },
  personal: { tone: 'amber', dot: 'bg-amber-400' },
  internal: { tone: 'amber', dot: 'bg-gray-400' },
  bills: { tone: 'rose', dot: 'bg-rose-400' },
  discretionary: { tone: 'rose', dot: 'bg-rose-300' },
  savings: { tone: 'brand', dot: 'bg-brand' },
}

export function MoneyMapSection({ data }: { data: CompassPayload }) {
  const m = data.moneyMap
  const inflows = m.flows.filter((f) => f.kind === 'income' || f.kind === 'personal')
  const outflows = m.flows.filter((f) => f.kind === 'bills' || f.kind === 'discretionary' || f.kind === 'savings')
  const internal = m.flows.find((f) => f.kind === 'internal')
  const maxAmt = Math.max(1, ...m.flows.map((f) => f.monthly))

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle title="How your money moves" subtitle="Each month, where it comes from and where it goes. Movement between your own accounts is shown separately and never double counted." />
        <div className="grid gap-6 md:grid-cols-2">
          <FlowColumn title="Money in" flows={inflows} maxAmt={maxAmt} align="left" />
          <FlowColumn title="Money out" flows={outflows} maxAmt={maxAmt} align="left" />
        </div>
        {internal && (
          <div className="mt-5 flex items-start gap-3 rounded-lg bg-gray-50 p-3">
            <Repeat className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-800">
                {money(internal.monthly)}/mo moves between your own accounts
              </p>
              <p className="mt-0.5 text-xs text-gray-500">{internal.detail}</p>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <CardTitle title="Your accounts" subtitle={m.note} />
        {m.accounts.length === 0 ? (
          <p className="text-sm text-gray-500">No accounts detected yet.</p>
        ) : (
          <div className="space-y-2">
            {m.accounts.map((a, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Wallet className="h-4 w-4 shrink-0 text-gray-400" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">{a.label}</p>
                    <p className="truncate text-xs text-gray-500">{a.note}</p>
                  </div>
                </div>
                <Pill tone={a.connected ? 'good' : 'neutral'}>{a.connected ? 'Connected' : 'Inferred'}</Pill>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function FlowColumn({
  title,
  flows,
  maxAmt,
}: {
  title: string
  flows: CompassPayload['moneyMap']['flows']
  maxAmt: number
  align: 'left'
}) {
  return (
    <div>
      <Label>{title}</Label>
      <div className="mt-3 space-y-3">
        {flows.length === 0 && <p className="text-sm text-gray-400">Nothing detected.</p>}
        {flows.map((f) => (
          <div key={f.id}>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-gray-700">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', FLOW_META[f.kind].dot)} />
                <span className="truncate">{f.kind === 'income' || f.kind === 'personal' ? f.from : f.to}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-gray-900">{money(f.monthly)}</span>
            </div>
            <div className="mt-1.5">
              <Bar value={f.monthly / maxAmt} tone={FLOW_META[f.kind].tone} />
            </div>
            <p className="mt-1 text-xs text-gray-400">{f.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Income ───────────────────────────────────────────────────────────────────

const CHARACTER_LABEL: Record<string, string> = {
  employment: 'Employment income',
  self_employed: 'Self-employed income',
  gig: 'Gig / variable income',
  benefits: 'Benefit income',
  mixed: 'Mixed income',
  unclear: 'Income (unclassified)',
}

export function IncomeSection({ data, onDrill }: { data: CompassPayload; onDrill: Drill }) {
  const inc = data.income
  return (
    <div className="space-y-6">
      <Card>
        <CardTitle
          title={CHARACTER_LABEL[inc.character] ?? 'Your income'}
          subtitle={inc.narrative}
          right={<Pill tone="neutral">{inc.consistency.replace('_', ' ')}</Pill>}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Monthly income" value={money(inc.monthlyIncome)} tone="in" />
          <StatTile label="Net per year" value={money(inc.netAnnualIncome)} />
          {inc.estimatedGrossAnnualSalary != null && (
            <StatTile label="Est. gross salary" value={money(inc.estimatedGrossAnnualSalary)} hint="Estimate, before tax" />
          )}
          <StatTile label="Month-to-month swing" value={pct(inc.volatility)} hint="Lower is steadier" />
        </div>
        {inc.characterTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {inc.characterTags.map((t) => (
              <Pill key={t}>{t}</Pill>
            ))}
          </div>
        )}
        {inc.personalTransfersMonthly > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50/60 p-3 text-xs text-amber-800 ring-1 ring-amber-100">
            <MinusCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            About {money(inc.personalTransfersMonthly)}/mo comes in from individuals. We treat this as personal transfers,
            not income, so it does not inflate your affordability.
          </p>
        )}
      </Card>

      <Card>
        <CardTitle title="Where your income comes from" />
        {inc.sources.length === 0 ? (
          <p className="text-sm text-gray-500">No recurring income sources detected yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {inc.sources.map((s) => (
              <DrillRow key={s.key} onClick={() => onDrill({ type: 'income', key: s.key, title: s.name, subtitle: 'Money received' })}>
                <CircleDollarSign className="h-4 w-4 shrink-0 text-emerald-500" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-800">{s.name}</span>
                  <span className="block text-xs text-gray-500">
                    {s.monthsPresent} month{s.monthsPresent === 1 ? '' : 's'} seen
                    {s.pendingConfirmation ? ' · awaiting your confirmation' : ''}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">{money(s.monthlyAverage)}/mo</span>
              </DrillRow>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ─── Spending ───────────────────────────────────────────────────────────────

export function SpendingSection({ data, onDrill }: { data: CompassPayload; onDrill: Drill }) {
  const sp = data.spending
  const cats = [...sp.categories].sort((a, b) => b.monthlyAverage - a.monthlyAverage)
  const maxAmt = Math.max(1, ...cats.map((c) => c.monthlyAverage))
  return (
    <div className="space-y-6">
      <Card>
        <CardTitle
          title="Where your money goes"
          subtitle={sp.narrative}
          right={<Pill tone="neutral">{pct(sp.essentialShare)} essential</Pill>}
        />
        {cats.length === 0 ? (
          <EmptyState
            icon={<Layers className="h-8 w-8" />}
            title="No categorised spending yet"
            body="Once we can see everyday payments in your history, your spending by category will appear here."
          />
        ) : (
          <>
        <p className="mb-1 text-sm text-gray-500">
          About <span className="font-semibold text-gray-800">{money(sp.averageMonthlySpend)}</span> a month. Tap a
          category to see the merchants and payments behind it.
        </p>
        <div className="mt-3 divide-y divide-gray-50">
          {cats.map((c) => (
            <DrillRow key={c.key} onClick={() => onDrill({ type: 'category', key: c.key, title: c.label, subtitle: 'Spending breakdown' })}>
              <span className="min-w-0 flex-1">
                <span className="mb-1 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 truncate text-sm font-medium text-gray-800">
                    {c.label}
                    {c.essential ? <Pill tone="neutral">Essential</Pill> : <Pill tone="neutral">Flexible</Pill>}
                    {c.unconfirmed && <Pill tone="warn">Check</Pill>}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">{money(c.monthlyAverage)}/mo</span>
                </span>
                <Bar value={c.monthlyAverage / maxAmt} tone={c.essential ? 'brand' : 'amber'} />
              </span>
            </DrillRow>
          ))}
        </div>
          </>
        )}
      </Card>
    </div>
  )
}

// ─── Bills & commitments ──────────────────────────────────────────────────────

export function BillsSection({
  data,
  onDrill,
  actions,
}: {
  data: CompassPayload
  onDrill: Drill
  actions: CompassActions
}) {
  const pb = data.paymentBehaviour
  const commitments = [...data.commitments].sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent)
  return (
    <div className="space-y-6">
      <Card>
        <CardTitle
          title="Payment reliability"
          subtitle="How consistently your recurring commitments are met. This is one of the strongest signals credit checks miss."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Paid on time" value={pct(pb.onTimeRatio)} tone="in" />
          <StatTile label="Missed" value={String(pb.missedPayments)} tone={pb.missedPayments > 0 ? 'out' : 'neutral'} />
          <StatTile label="Returned" value={String(pb.returnedPayments)} tone={pb.returnedPayments > 0 ? 'out' : 'neutral'} />
          <StatTile
            label="Overdraft months"
            value={pb.overdraftMonths == null ? 'n/a' : String(pb.overdraftMonths)}
            tone={pb.overdraftMonths && pb.overdraftMonths > 0 ? 'out' : 'neutral'}
          />
        </div>
      </Card>

      {data.reminders.length > 0 && (
        <Card>
          <CardTitle title="Upcoming reminders" subtitle="We will surface these when they are due so you can review before anything renews." />
          <div className="space-y-2">
            {data.reminders.map((rem) => (
              <div key={rem.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{rem.title}</p>
                  <p className="text-xs text-gray-500">
                    {rem.type === 'renewal' ? 'Renews' : 'Due'} {formatDate(rem.dueDate)}
                    {rem.daysUntilDue > 0 ? ` · in ${days(rem.daysUntilDue)}` : ' · now due'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {rem.due && <Pill tone="warn">Due</Pill>}
                  <button
                    onClick={() => actions.updateReminder.mutate({ id: rem.id, status: 'completed' })}
                    disabled={reminderBusy(actions, rem.id)}
                    className="rounded-lg p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-40"
                    aria-label="Mark done"
                    title="Mark done"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => actions.updateReminder.mutate({ id: rem.id, status: 'dismissed' })}
                    disabled={reminderBusy(actions, rem.id)}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 disabled:opacity-40"
                    aria-label="Remove"
                    title="Remove"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardTitle title="Recurring commitments" subtitle="Detected by behaviour, not just labels. Confirm one, set a renewal date, or open it to see its full history." />
        {commitments.length === 0 ? (
          <EmptyState icon={<CalendarClock className="h-8 w-8" />} title="No recurring commitments detected yet" body="Once we can see a few months of regular payments, your rent, bills and subscriptions will appear here." />
        ) : (
          <div className="space-y-2">
            {commitments.map((c) => (
              <CommitmentRow key={c.key} c={c} onDrill={onDrill} actions={actions} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function CommitmentRow({
  c,
  onDrill,
  actions,
}: {
  c: CompassPayload['commitments'][number]
  onDrill: Drill
  actions: CompassActions
}) {
  const [renewOpen, setRenewOpen] = useState(false)
  const [date, setDate] = useState(c.setting?.renewalDate?.slice(0, 10) ?? '')
  const [remind, setRemind] = useState(true)
  const acting = actions.confirmCommitment.variables?.key === c.key
  const busy = actions.confirmCommitment.isPending && acting
  const failed = actions.confirmCommitment.isError && acting

  const save = () => {
    if (!date) return
    actions.confirmCommitment.mutate(
      { key: c.key, status: 'active', name: c.name, renewalDate: new Date(date).toISOString(), remind },
      { onSuccess: () => setRenewOpen(false) },
    )
  }

  return (
    <div className="rounded-lg border border-gray-100">
      <button
        onClick={() => onDrill({ type: 'commitment', key: c.key, title: c.name, subtitle: 'Payment history' })}
        className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-gray-800">{c.name}</span>
            {c.essential && <Pill tone="neutral">Essential</Pill>}
            {c.setting?.confirmed && <Pill tone="good">Confirmed</Pill>}
            {c.returnedCount > 0 && <Pill tone="warn">{c.returnedCount} returned</Pill>}
          </span>
          <span className="mt-0.5 block text-xs text-gray-500">
            {money(c.amount)} · {c.cadence.replace('_', ' ')}
            {c.typicalDayOfMonth ? ` · around the ${ordinal(c.typicalDayOfMonth)}` : ''}
            {' · '}
            {c.occurrences - c.missedCount}/{c.occurrences} on time
          </span>
          {c.reminder ? (
            <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-700">
              <Bell className="h-3 w-3" />
              Renewal reminder set for {formatDate(c.reminder.dueDate)}
            </span>
          ) : (
            c.nextExpected && (
              <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-500">
                <CalendarClock className="h-3 w-3" />
                Next expected {formatDate(c.nextExpected.date)}
                {c.nextExpected.inDays >= 0 ? ` (in ${c.nextExpected.inDays} day${c.nextExpected.inDays === 1 ? '' : 's'})` : ''}
              </span>
            )
          )}
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">{money(c.monthlyEquivalent)}/mo</span>
      </button>

      <div className="flex flex-wrap items-center gap-2 border-t border-gray-50 px-3 py-2">
        <button
          onClick={() => setRenewOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-brand hover:bg-brand-50"
        >
          <CalendarClock className="h-3.5 w-3.5" />
          {c.setting?.renewalDate ? 'Edit renewal' : 'Add renewal date'}
        </button>
        <button
          onClick={() => actions.confirmCommitment.mutate({ key: c.key, status: 'inactive' })}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
        >
          <X className="h-3.5 w-3.5" />
          No longer active
        </button>
      </div>

      {renewOpen && (
        <div className="flex flex-wrap items-center gap-3 border-t border-gray-50 bg-gray-50/60 px-3 py-3">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            Renews on
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-md border border-gray-200 px-2 py-1 text-sm focus:border-brand focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-600">
            <input type="checkbox" checked={remind} onChange={(e) => setRemind(e.target.checked)} className="accent-brand" />
            Remind me before it renews
          </label>
          <button
            onClick={save}
            disabled={busy || !date}
            className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-cream-surface hover:bg-brand-dark disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
          {failed && <span className="text-xs text-rose-600">Couldn&apos;t save. Try again.</span>}
        </div>
      )}
    </div>
  )
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!)
}

// ─── Resilience ───────────────────────────────────────────────────────────────

const RATING_TONE: Record<string, 'good' | 'warn'> = {
  comfortable: 'good',
  manageable: 'good',
  stretched: 'warn',
  at_risk: 'warn',
}

export function ResilienceSection({ data }: { data: CompassPayload }) {
  const r = data.resilience
  const eb = r.emergencyBuffer
  const bufferProgress = eb.monthsCovered != null ? Math.min(1, eb.monthsCovered / 3) : 0
  return (
    <div className="space-y-6">
      <Card>
        <CardTitle
          title="How resilient are you?"
          subtitle="A read on how much room you have if money got tight."
          right={<Pill tone={RATING_TONE[r.rating] ?? 'neutral'}>{r.rating.replace('_', ' ')}</Pill>}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Monthly surplus" value={signed(r.surplusAfterAll)} tone={r.surplusAfterAll >= 0 ? 'in' : 'out'} />
          <StatTile label="Savings rate" value={pct(r.savingsRate)} hint={`${money(r.monthlySavings)}/mo`} />
          <StatTile label="Essentials" value={pct(r.ratios.essentialsToIncome)} hint="of income" />
          <StatTile
            label="If income dropped 20%"
            value={r.stressTest.stillPositive ? 'Still positive' : signed(r.stressTest.surplusUnderStress)}
            tone={r.stressTest.stillPositive ? 'in' : 'out'}
          />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle title="Emergency buffer" />
          {eb.monthsCovered != null ? (
            <>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-semibold tabular-nums text-gray-900">
                  {eb.monthsCovered.toFixed(1)}
                  <span className="ml-1 text-base font-normal text-gray-500">months covered</span>
                </p>
                <p className="text-sm text-gray-500">target 3.0</p>
              </div>
              <div className="mt-3">
                <Bar value={bufferProgress} tone={bufferProgress >= 1 ? 'brand' : 'amber'} />
              </div>
              <p className="mt-2 text-xs text-gray-500">{eb.note}</p>
            </>
          ) : (
            <div className="flex items-start gap-2.5 rounded-lg bg-gray-50 p-3">
              <PiggyBank className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <p className="text-sm text-gray-600">{eb.note}</p>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle title="Income vs commitments" />
          <div className="space-y-3">
            <RatioRow label="Essentials to income" value={r.ratios.essentialsToIncome} warnAbove={0.7} />
            {r.ratios.rentToIncome != null && <RatioRow label="Rent to income" value={r.ratios.rentToIncome} warnAbove={0.4} />}
            <RatioRow label="Commitments to income" value={r.ratios.commitmentsToIncome} warnAbove={0.6} />
            <RatioRow label="Debt to income" value={r.ratios.debtToIncome} warnAbove={0.4} />
          </div>
        </Card>
      </div>

      {(r.bestMonth || r.tightestMonth) && (
        <Card>
          <CardTitle title="Your months, compared" subtitle="Use your tightest month as a planning baseline." />
          <div className="grid gap-3 sm:grid-cols-2">
            {r.bestMonth && (
              <div className="flex items-center gap-3 rounded-lg bg-emerald-50/50 p-3 ring-1 ring-emerald-100">
                <TrendingUp className="h-5 w-5 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-xs text-gray-500">Best month</p>
                  <p className="text-sm font-semibold text-gray-800">{r.bestMonth.label}</p>
                </div>
                <p className="ml-auto text-sm font-semibold tabular-nums text-emerald-700">{signed(r.bestMonth.surplus)}</p>
              </div>
            )}
            {r.tightestMonth && (
              <div className="flex items-center gap-3 rounded-lg bg-amber-50/50 p-3 ring-1 ring-amber-100">
                <ArrowDownRight className="h-5 w-5 shrink-0 text-amber-500" />
                <div>
                  <p className="text-xs text-gray-500">Tightest month</p>
                  <p className="text-sm font-semibold text-gray-800">{r.tightestMonth.label}</p>
                </div>
                <p className="ml-auto text-sm font-semibold tabular-nums text-amber-700">{signed(r.tightestMonth.surplus)}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card>
        <CardTitle title="Stability signals" />
        <div className="grid gap-2 sm:grid-cols-2">
          <Signal ok={data.resilience.stability.stableIncome} label="Stable income" />
          <Signal ok={data.resilience.stability.rentNeverMissed} label="Rent never missed" />
          <Signal ok={data.resilience.stability.billsPaidOnTime} label="Bills paid on time" />
          <Signal ok={data.resilience.stability.positiveMonthlySurplus} label="Positive monthly surplus" />
          <Signal ok={data.resilience.stability.noOverdraftDependency} label="No overdraft dependency" />
          <Signal ok={data.resilience.stability.noRecurringFailedPayments} label="No recurring failed payments" />
        </div>
      </Card>
    </div>
  )
}

function RatioRow({ label, value, warnAbove }: { label: string; value: number; warnAbove: number }) {
  const warn = value > warnAbove
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className={cn('font-semibold tabular-nums', warn ? 'text-amber-600' : 'text-gray-900')}>{pct(value)}</span>
      </div>
      <Bar value={value} tone={warn ? 'amber' : 'brand'} />
    </div>
  )
}

function Signal({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
      ) : (
        <MinusCircle className="h-4 w-4 shrink-0 text-gray-300" />
      )}
      <span className={ok ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
    </div>
  )
}

// ─── Savings opportunities ────────────────────────────────────────────────────

const EFFORT_LABEL: Record<string, string> = { low: 'Easy win', medium: 'Some effort', high: 'Bigger project' }

export function SavingsSection({ data, actions }: { data: CompassPayload; actions: CompassActions }) {
  const ops = data.opportunities
  return (
    <div className="space-y-6">
      {/* key by goal id so the edit form re-seeds when the goal changes (e.g. suggested -> saved). */}
      {data.goal && <GoalCard key={data.goal.id} goal={data.goal} actions={actions} />}

      <Card>
        <CardTitle title="Ways to save and strengthen your position" subtitle="Based on your transaction history. These are prompts to review, not automatic switches." />
        {ops.length === 0 ? (
          <EmptyState icon={<Sparkles className="h-8 w-8" />} title="No opportunities to flag right now" body="As your history builds we will surface places you may be able to save or improve your buffer." />
        ) : (
          <div className="space-y-3">
            {ops.map((o) => (
              <div key={o.id} className="relative rounded-xl border border-gray-200 p-4">
                <button
                  onClick={() => actions.dismissOpportunity.mutate(o.id)}
                  disabled={actions.dismissOpportunity.isPending && actions.dismissOpportunity.variables === o.id}
                  className="absolute right-2 top-2 rounded-lg p-1 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-500 disabled:opacity-40"
                  aria-label="Dismiss this suggestion"
                  title="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex items-start justify-between gap-3 pr-6">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{o.title}</p>
                    <p className="mt-1 text-sm text-gray-600">{o.description}</p>
                  </div>
                  {o.estimatedSavingHigh != null && (
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums text-emerald-700">
                        {money(o.estimatedSavingLow ?? 0)}–{money(o.estimatedSavingHigh)}
                      </p>
                      <p className="text-[11px] text-gray-400">per month</p>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Pill tone={o.priority === 'high' ? 'warn' : 'neutral'}>{o.priority} priority</Pill>
                  <Pill tone="neutral">{EFFORT_LABEL[o.effort] ?? o.effort}</Pill>
                  {o.estimatedAnnualHigh != null && (
                    <Pill tone="good">up to {money(o.estimatedAnnualHigh)}/yr</Pill>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-400">Why you are seeing this: {o.reason}</p>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs text-gray-400">
          Provider comparisons are coming later. For now, these highlight where a review may pay off.
        </p>
      </Card>
    </div>
  )
}

function GoalCard({ goal, actions }: { goal: NonNullable<CompassPayload['goal']>; actions: CompassActions }) {
  const [editing, setEditing] = useState(false)
  const [target, setTarget] = useState(String(goal.targetAmount))
  const [contribution, setContribution] = useState(goal.monthlyContribution ? String(goal.monthlyContribution) : '')
  const [months, setMonths] = useState(goal.targetMonths ? String(goal.targetMonths) : '')
  const progress = goal.targetAmount > 0 ? goal.currentSaved / goal.targetAmount : 0
  const busy = actions.upsertGoal.isPending
  const failed = actions.upsertGoal.isError

  const save = () => {
    const targetAmount = Number(target)
    if (!targetAmount || targetAmount <= 0) return
    actions.upsertGoal.mutate(
      {
        type: goal.type,
        label: goal.label ?? undefined,
        targetAmount,
        monthlyContribution: contribution ? Number(contribution) : undefined,
        targetMonths: months ? Number(months) : undefined,
      },
      { onSuccess: () => setEditing(false) },
    )
  }

  return (
    <Card>
      <CardTitle
        title={goal.label ?? 'Savings goal'}
        subtitle={goal.suggested ? 'A suggested target. Set it to start tracking your progress.' : 'Your active savings goal.'}
        right={
          <button
            onClick={() => setEditing((e) => !e)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Target className="h-3.5 w-3.5" />
            {goal.suggested ? 'Set goal' : 'Adjust'}
          </button>
        }
      />

      <div className="flex items-end justify-between">
        <p className="text-2xl font-semibold tabular-nums text-gray-900">
          {money(goal.currentSaved)}
          <span className="ml-1 text-base font-normal text-gray-500">of {money(goal.targetAmount)}</span>
        </p>
        {goal.monthsToGoal != null && (
          <p className="text-sm text-gray-500">
            {goal.monthsToGoal === 0
              ? 'Target reached'
              : `about ${goal.monthsToGoal} month${goal.monthsToGoal === 1 ? '' : 's'} to go`}
          </p>
        )}
      </div>
      <div className="mt-3">
        <Bar value={progress} tone={progress >= 1 ? 'brand' : 'amber'} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        <span>Gap {money(goal.gap)}</span>
        {goal.monthlyContribution != null && <span>Saving {money(goal.monthlyContribution)}/mo</span>}
        {goal.onTrack != null && (
          <Pill tone={goal.onTrack ? 'good' : 'warn'}>{goal.onTrack ? 'On track' : 'Behind target'}</Pill>
        )}
      </div>

      {editing && (
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-gray-100 pt-4">
          <label className="text-xs text-gray-600">
            Target amount
            <div className="mt-1 flex items-center rounded-md border border-gray-200 px-2">
              <span className="text-sm text-gray-400">£</span>
              <input
                type="number"
                min="1"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-28 px-1 py-1 text-sm focus:outline-none"
              />
            </div>
          </label>
          <label className="text-xs text-gray-600">
            Monthly saving (optional)
            <div className="mt-1 flex items-center rounded-md border border-gray-200 px-2">
              <span className="text-sm text-gray-400">£</span>
              <input
                type="number"
                min="0"
                value={contribution}
                onChange={(e) => setContribution(e.target.value)}
                placeholder="auto"
                className="w-28 px-1 py-1 text-sm focus:outline-none"
              />
            </div>
          </label>
          <label className="text-xs text-gray-600">
            Reach it within (months, optional)
            <div className="mt-1 flex items-center rounded-md border border-gray-200 px-2">
              <input
                type="number"
                min="1"
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                placeholder="e.g. 12"
                className="w-24 px-1 py-1 text-sm focus:outline-none"
              />
            </div>
          </label>
          <button
            onClick={save}
            disabled={busy}
            className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-cream-surface hover:bg-brand-dark disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save goal'}
          </button>
          {failed && <span className="text-xs text-rose-600">Couldn&apos;t save. Try again.</span>}
        </div>
      )}
    </Card>
  )
}

// ─── EquiScore impact ─────────────────────────────────────────────────────────

export function ImpactSection({ data }: { data: CompassPayload }) {
  const imp = data.impact
  return (
    <div className="space-y-6">
      <Card>
        <CardTitle
          title="How this affects your EquiScore"
          subtitle="Your financial behaviour feeds your Trust Portfolio. Here is what is helping and what could lift it."
          right={
            imp.overallTier ? (
              <span className={cn('rounded-lg border px-3 py-1.5 text-sm font-semibold', TIER_COLORS[imp.overallTier as TrustTier])}>
                {imp.overallScore}/100 · {imp.overallTier}
              </span>
            ) : undefined
          }
        />
        <ReasonCodeList reasonCodes={imp.reasonCodes} />
      </Card>

      {imp.improvements.length > 0 && (
        <Card>
          <CardTitle title="What could improve your profile" />
          <div className="space-y-2.5">
            {imp.improvements.map((i) => (
              <a
                key={i.id}
                href={i.href}
                className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
              >
                <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800">{i.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{i.detail}</p>
                </div>
                {i.estimatedGain != null && (
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                    +{i.estimatedGain}
                    {i.reachesTier ? ` → ${i.reachesTier}` : ''}
                  </span>
                )}
                <ArrowRight className="mt-0.5 hidden h-4 w-4 shrink-0 text-gray-300 sm:block" />
              </a>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
