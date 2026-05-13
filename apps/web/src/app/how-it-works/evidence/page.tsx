import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { ComingSoon } from '@/components/coming-soon'

export default function Page() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />
      <ComingSoon
        title="What evidence we use"
        subtitle="From open banking to identity documents, here is what goes into your Trust Portfolio."
      />
      <LandingFooter />
    </div>
  )
}
