import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { ArrowRight } from 'lucide-react'

const POSTS = [
  {
    slug: 'cifas-fraud-markers',
    category: 'Financial exclusion',
    title: 'The problem with CIFAS fraud markers: who gets flagged and why the system fails them',
    excerpt: 'Over 374,000 fraud cases were filed in the UK in a single year. Many of the people behind those markers are not fraudsters. They are young people who were manipulated, victims of identity theft, and ordinary people who had no idea a case had been filed against them.',
    date: 'May 2025',
    readTime: '9 min read',
  },
  {
    slug: 'migrants-uk-financial-system',
    category: 'Financial exclusion',
    title: 'Arriving in the UK with a clean financial record and zero access: how the system fails migrants',
    excerpt: 'Net migration to the UK reached 204,000 in the year to June 2025. Every one of those people arrived needing a bank account, somewhere to live, and access to basic services. For most, the first experience of UK financial services is a wall of rejections.',
    date: 'May 2025',
    readTime: '8 min read',
  },
  {
    slug: 'gig-workers-financial-access',
    category: 'Financial exclusion',
    title: 'Why the gig economy leaves workers financially stranded',
    excerpt: 'There are over 460,000 gig economy workers in the UK by conservative estimates. Many earn well. Many earn consistently. The credit system, designed around permanent employment and monthly payslips, cannot assess them fairly and largely does not try.',
    date: 'May 2025',
    readTime: '8 min read',
  },
  {
    slug: 'thin-credit-file',
    category: 'Financial exclusion',
    title: 'What is a thin credit file and why does it lock people out of financial services',
    excerpt: 'Around 4 to 5 million UK adults have a credit file so limited it effectively does not work. Some have never used credit. Some have always paid cash. Some are young and just starting out. The credit system treats absence of history the same as bad history.',
    date: 'May 2025',
    readTime: '7 min read',
  },
  {
    slug: 'financial-equity-credit-system',
    category: 'Policy & society',
    title: 'The credit system was not designed for everyone. That was always the point.',
    excerpt: 'The UK credit infrastructure was built in the 1950s for a specific type of person: employed, settled, male, using credit regularly. The people it was not built for are still paying the price today. This is not a bug. It is a structural feature that has never been fully addressed.',
    date: 'May 2025',
    readTime: '10 min read',
  },
  {
    slug: 'how-to-check-your-cifas-record',
    category: 'Practical guides',
    title: 'How to check and challenge your CIFAS record in the UK',
    excerpt: 'You have a legal right to see your CIFAS file at any time. Most people never exercise it because they do not know it exists. This is a step-by-step guide to requesting your CIFAS report, understanding what it means, and what you can do if there is a marker on it.',
    date: 'May 2025',
    readTime: '6 min read',
  },
  {
    slug: 'bank-account-closed-what-to-do',
    category: 'Practical guides',
    title: 'Your bank account has been closed: what to do next',
    excerpt: 'Bank accounts are closed without warning every day in the UK. You are rarely told the real reason. This guide explains the most common causes, how to find out if a fraud marker is involved, and the practical steps you can take to get back on your feet.',
    date: 'May 2025',
    readTime: '7 min read',
  },
  {
    slug: 'build-credit-history-uk',
    category: 'Practical guides',
    title: 'How to build a credit history in the UK when you have none',
    excerpt: 'Building a credit history requires access to credit. But getting access to credit requires a credit history. This circular problem affects millions of people in the UK. Here is what actually works, what does not, and how alternative evidence can fill the gap.',
    date: 'May 2025',
    readTime: '8 min read',
  },
  {
    slug: 'open-banking-explained',
    category: 'Open banking',
    title: 'Open banking explained: what it is, how it works, and whether it is safe',
    excerpt: 'Millions of people in the UK use open banking without knowing it. Every budgeting app, expense tracker and financial comparison tool that connects to your bank is using it. This is a plain-language explanation of what it is, what it can and cannot do, and how to stay safe.',
    date: 'May 2025',
    readTime: '6 min read',
  },
  {
    slug: 'prove-income-freelancer-uk',
    category: 'Practical guides',
    title: 'How to prove your income as a freelancer or self-employed person in the UK',
    excerpt: 'Landlords, lenders and banks ask for proof of income. If you are self-employed, what counts? A single tax return is rarely enough. This guide covers what different institutions actually accept, what to prepare, and how to present variable income clearly.',
    date: 'May 2025',
    readTime: '7 min read',
  },
]

const CATEGORIES = ['All', 'Financial exclusion', 'Policy & society', 'Practical guides', 'Open banking']

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />

      {/* ── Header ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 pb-12 pt-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal/10 px-4 py-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-teal" />
          <span className="text-sm font-medium text-teal">Equiscore journal</span>
        </div>
        <h1 className="mb-4 text-4xl font-bold text-cream lg:text-5xl">
          Financial access, explained.
        </h1>
        <p className="mx-auto max-w-xl text-lg leading-relaxed text-cream">
          Research, guides and perspectives on the systems that decide who gets access to financial services, and the people those decisions affect most.
        </p>
      </section>

      {/* ── Category pills ───────────────────────────────────────── */}
      <div className="border-b border-ink-border">
        <div className="mx-auto max-w-6xl px-6 pb-4">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <span
                key={cat}
                className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                  cat === 'All'
                    ? 'bg-teal text-ink'
                    : 'border border-ink-border text-cream/60'
                }`}
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Featured article ─────────────────────────────────────── */}
      <section className="bg-ink py-12">
        <div className="mx-auto max-w-6xl px-6">
          <Link href={`/blog/${POSTS[0]!.slug}`} className="group block">
            <div className="rounded-2xl border border-ink-border bg-ink-mid p-8 transition-colors duration-200 hover:border-teal/30 md:p-12">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold text-teal">
                  {POSTS[0]!.category}
                </span>
                <span className="text-xs text-cream/40">{POSTS[0]!.date}</span>
                <span className="text-xs text-cream/40">{POSTS[0]!.readTime}</span>
              </div>
              <h2 className="mb-4 text-2xl font-bold leading-snug text-cream group-hover:text-teal md:text-3xl">
                {POSTS[0]!.title}
              </h2>
              <p className="mb-6 max-w-2xl leading-relaxed text-cream/70">
                {POSTS[0]!.excerpt}
              </p>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-teal">
                Read article <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* ── Article grid ─────────────────────────────────────────── */}
      <section className="bg-ink pb-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {POSTS.slice(1).map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
                <div className="flex h-full flex-col rounded-xl border border-ink-border bg-ink-mid p-6 transition-colors duration-200 hover:border-teal/30">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold text-teal">
                      {post.category}
                    </span>
                    <span className="text-xs text-cream/40">{post.readTime}</span>
                  </div>
                  <h2 className="mb-3 flex-1 text-base font-bold leading-snug text-cream group-hover:text-teal">
                    {post.title}
                  </h2>
                  <p className="mb-5 text-sm leading-relaxed text-cream/60 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal">
                    Read <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
