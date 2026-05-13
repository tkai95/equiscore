import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { ComingSoon } from '@/components/coming-soon'

export default function Page() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />
      <ComingSoon
        title="Trust Portfolio for bank accounts"
        subtitle="Help banks understand your financial behaviour beyond a credit check."
      />
      <LandingFooter />
    </div>
  )
}
