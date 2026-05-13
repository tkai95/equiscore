import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { ComingSoon } from '@/components/coming-soon'

export default function Page() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />
      <ComingSoon
        title="Put on a fraud list or CIFAS marker"
        subtitle="We help people with fraud markers rebuild their financial story with verified evidence."
      />
      <LandingFooter />
    </div>
  )
}
