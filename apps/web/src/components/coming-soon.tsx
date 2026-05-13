import Link from 'next/link'
import { Clock, ArrowLeft } from 'lucide-react'

export function ComingSoon({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center bg-ink px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-teal/20 bg-teal/10">
        <Clock className="h-7 w-7 text-teal" />
      </div>
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">Coming soon</p>
      <h1 className="mb-4 text-4xl font-bold text-cream lg:text-5xl">{title}</h1>
      <p className="mb-10 max-w-md text-lg text-cream/70">{subtitle}</p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-xl border border-cream/20 px-6 py-3 text-sm font-semibold text-cream transition-colors hover:border-cream/40"
      >
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>
    </main>
  )
}
