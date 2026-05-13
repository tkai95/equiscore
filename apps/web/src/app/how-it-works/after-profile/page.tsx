import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { ComingSoon } from '@/components/coming-soon'

export default function Page() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />
      <ComingSoon
        title="After you build a profile"
        subtitle="What happens next, and how to use your Trust Portfolio to open doors."
      />
      <LandingFooter />
    </div>
  )
}
