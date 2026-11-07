// Replaces <input type="month">, which Firefox and desktop Safari render as a
// free-text box. The value is `YYYY-MM`, or '' when empty. A half-filled value
// such as `2020-` is kept on purpose, so validation can ask for the other half.

const selectClass =
  'w-full rounded-lg border border-line bg-surface-card px-3 py-2.5 text-sm text-content focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'

const YEARS_SHOWN = 100

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

interface Props {
  label: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
}

export function MonthYearSelect({ label, value, onChange, onBlur }: Props) {
  const [year = '', month = ''] = value.split('-')
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: YEARS_SHOWN }, (_, i) => String(currentYear - i))

  const update = (nextYear: string, nextMonth: string) =>
    onChange(nextYear || nextMonth ? `${nextYear}-${nextMonth}` : '')

  return (
    <div role="group" aria-label={label} className="grid grid-cols-2 gap-3">
      <select
        aria-label={`${label}: month`}
        value={month}
        onChange={(e) => update(year, e.target.value)}
        onBlur={onBlur}
        className={selectClass}
      >
        <option value="">Month</option>
        {MONTHS.map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
      <select
        aria-label={`${label}: year`}
        value={year}
        onChange={(e) => update(e.target.value, month)}
        onBlur={onBlur}
        className={selectClass}
      >
        <option value="">Year</option>
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  )
}
