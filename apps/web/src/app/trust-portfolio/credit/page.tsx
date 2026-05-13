import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { ComingSoon } from '@/components/coming-soon'

export default function Page() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />
      <ComingSoon
        title="Trust Portfolio for credit & lending"
        subtitle="Give lenders the context they need to make a fairer decision."
      />
      <LandingFooter />
    </div>
  )
}
