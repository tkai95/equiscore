'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, CalendarDays } from 'lucide-react'
import type { CompassPayload, CompassCalendarEvent } from '@/lib/compass-types'
import { cn } from '@/lib/utils'
import { Card, CardTitle, EmptyState, Pill, StatTile, money } from './compass-ui'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const signed = (n: number) => `${n >= 0 ? '+' : '-'}${money(Math.abs(n))}`

export function CalendarSection({ data }: { data: CompassPayload }) {
  const cal = data.calendar
  const [offset, setOffset] = useState(0)

  const now = new Date()
  const view = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const year = view.getFullYear()
  const month = view.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7 // Monday-first
  const isCurrentMonth = offset === 0
  const todayDate = now.getDate()

  // Place each recurring event on its day (clamped to the last day of the month).
  const byDay = new Map<number, CompassCalendarEvent[]>()
  for (const e of cal.events) {
    const d = Math.min(e.day, daysInMonth)
    const list = byDay.get(d)
    if (list) list.push(e)
    else byDay.set(d, [e])
  }

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  if (cal.events.length === 0 && cal.unscheduled.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays className="h-8 w-8" />}
        title="No guaranteed cashflow detected yet"
        body="Once we can see a few months of regular income and bills, your predictable money in and out will appear here on a calendar."
      />
    )
  }

  const ordered = [...cal.events].sort(
    (a, b) => a.day - b.day || (a.direction === b.direction ? 0 : a.direction === 'in' ? -1 : 1),
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle
          title="Guaranteed cashflow"
          subtitle="Your predictable money in and out, on the day it lands. Only steady, recurring amounts — variable spending isn't shown."
        />
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Guaranteed in" value={money(cal.guaranteedIn)} tone="in" />
          <StatTile label="Guaranteed out" value={money(cal.guaranteedOut)} tone="out" />
          <StatTile
            label="Left over"
            value={signed(cal.net)}
            tone={cal.net >= 0 ? 'in' : 'out'}
            hint="After fixed commitments"
          />
        </div>
      </Card>

      {cal.events.length > 0 && (
        <>
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {MONTHS[month]} {year}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setOffset((o) => o - 1)}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {offset !== 0 && (
              <button
                onClick={() => setOffset(0)}
                className="rounded-lg px-2 py-1 text-xs font-medium text-brand hover:bg-brand-50"
              >
                Today
              </button>
            )}
            <button
              onClick={() => setOffset((o) => o + 1)}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            if (day == null) return <div key={`b${i}`} />
            const events = byDay.get(day) ?? []
            const isToday = isCurrentMonth && day === todayDate
            return (
              <div
                key={day}
                className={cn(
                  'min-h-[64px] rounded-lg border p-1.5 sm:min-h-[84px]',
                  isToday ? 'border-brand bg-brand-50/40' : 'border-gray-100',
                )}
              >
                <div className={cn('text-[11px] font-medium', isToday ? 'text-brand' : 'text-gray-400')}>{day}</div>
                <div className="mt-0.5 space-y-0.5">
                  {events.slice(0, 3).map((e) => (
                    <div
                      key={e.id}
                      title={`${e.label} · ${money(e.amount)}`}
                      className={cn(
                        'truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight sm:text-[11px]',
                        e.direction === 'in' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
                      )}
                    >
                      <span className="hidden sm:inline">{e.direction === 'in' ? '+' : '−'}</span>
                      {money(e.amount)}
                    </div>
                  ))}
                  {events.length > 3 && <div className="px-1 text-[10px] text-gray-400">+{events.length - 3} more</div>}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-emerald-200" /> Money in
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-rose-200" /> Money out
          </span>
        </div>
      </Card>

      {/* Chronological ledger — clearest read, and the primary view on mobile */}
      <Card>
        <CardTitle title="This month's schedule" subtitle="Every guaranteed amount, in the order it lands." />
        <div className="divide-y divide-gray-50">
          {ordered.map((e) => (
            <div key={e.id} className="flex items-center gap-3 py-2.5">
              <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-gray-50 text-center">
                <span className="text-sm font-semibold leading-none text-gray-700">{e.day}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-gray-800">{e.label}</span>
                  {e.confidence === 'medium' && <Pill tone="neutral">≈</Pill>}
                </div>
                <span className="text-xs capitalize text-gray-400">{e.cadence.replace('_', ' ')}</span>
              </div>
              <span
                className={cn(
                  'flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums',
                  e.direction === 'in' ? 'text-emerald-600' : 'text-rose-600',
                )}
              >
                {e.direction === 'in' ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {e.direction === 'in' ? '+' : '−'}
                {money(e.amount)}
              </span>
            </div>
          ))}
        </div>
      </Card>
        </>
      )}

      {cal.unscheduled.length > 0 && <UnscheduledCard cal={cal} />}
    </div>
  )
}

function UnscheduledCard({ cal }: { cal: CompassPayload['calendar'] }) {
  const parts: string[] = []
  if (cal.unscheduledIn > 0) parts.push(`about ${money(cal.unscheduledIn)}/mo in`)
  if (cal.unscheduledOut > 0) parts.push(`about ${money(cal.unscheduledOut)}/mo out`)
  return (
    <Card>
      <CardTitle
        title="Recurring, no fixed date"
        subtitle="Predictable amounts that don't land on a set day each month, such as weekly or four-weekly payments."
      />
      <div className="divide-y divide-gray-50">
        {cal.unscheduled.map((e) => (
          <div key={e.id} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <span className="truncate text-sm font-medium text-gray-800">{e.label}</span>
              <span className="block text-xs capitalize text-gray-400">{e.cadence.replace('_', ' ')}</span>
            </div>
            <span
              className={cn(
                'flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums',
                e.direction === 'in' ? 'text-emerald-600' : 'text-rose-600',
              )}
            >
              {e.direction === 'in' ? '+' : '−'}
              {money(e.amount)}
            </span>
          </div>
        ))}
      </div>
      {parts.length > 0 && (
        <p className="mt-3 text-xs text-gray-400">Roughly {parts.join(' and ')} from these.</p>
      )}
    </Card>
  )
}
