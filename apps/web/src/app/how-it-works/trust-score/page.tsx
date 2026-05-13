import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { ComingSoon } from '@/components/coming-soon'

export default function Page() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />
      <ComingSoon
        title="How we build the trust score"
        subtitle="A transparent look at the evidence we analyse to generate your Trust Score."
      />
      <LandingFooter />
    </div>
  )
}
