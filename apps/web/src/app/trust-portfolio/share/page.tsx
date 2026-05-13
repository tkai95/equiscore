import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { ComingSoon } from '@/components/coming-soon'

export default function Page() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />
      <ComingSoon
        title="Share your portfolio"
        subtitle="Control exactly who sees your Trust Portfolio and when."
      />
      <LandingFooter />
    </div>
  )
}
