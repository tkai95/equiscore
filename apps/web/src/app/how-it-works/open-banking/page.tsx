import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { ComingSoon } from '@/components/coming-soon'

export default function Page() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />
      <ComingSoon
        title="Open banking & affordability"
        subtitle="How we use your real transaction data to verify income and financial behaviour."
      />
      <LandingFooter />
    </div>
  )
}
