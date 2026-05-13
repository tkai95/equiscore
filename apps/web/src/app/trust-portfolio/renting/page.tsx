import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { ComingSoon } from '@/components/coming-soon'

export default function Page() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />
      <ComingSoon
        title="Trust Portfolio for renting"
        subtitle="Show landlords and letting agents the evidence they need to say yes."
      />
      <LandingFooter />
    </div>
  )
}
