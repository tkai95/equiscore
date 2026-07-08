/** Small deterministic stats + date helpers shared across the engine. */

export function toDate(iso: string): Date {
  return new Date(iso)
}

export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function dayOfMonth(d: Date): number {
  return d.getUTCDate()
}

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

export function median(xs: number[]): number {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!
}

export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)))
}

/** Coefficient of variation (stdev / mean); 0 when flat, 1 when mean is 0. */
export function coefficientOfVariation(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  if (m === 0) return 1
  return stdev(xs) / Math.abs(m)
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

/** Circular stdev of day-of-month values, so the 1st and 31st are treated as close. */
export function dayOfMonthVariance(days: number[]): number {
  if (days.length < 2) return 0
  // Map day (1–31) onto a circle and take the resultant-vector spread.
  const angles = days.map((d) => (2 * Math.PI * (d - 1)) / 31)
  const sin = mean(angles.map(Math.sin))
  const cos = mean(angles.map(Math.cos))
  const r = Math.sqrt(sin * sin + cos * cos)
  const circularStd = Math.sqrt(Math.max(0, -2 * Math.log(Math.max(r, 1e-9))))
  // Convert radians back to days.
  return round2((circularStd * 31) / (2 * Math.PI))
}

export function monthsBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24 * 30.4)
}
