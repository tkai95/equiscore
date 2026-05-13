import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { ComingSoon } from '@/components/coming-soon'

export default function Page() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />
      <ComingSoon
        title="Rebuild financial access"
        subtitle="A practical path to rebuilding your financial reputation from wherever you are today."
      />
      <LandingFooter />
    </div>
  )
}
