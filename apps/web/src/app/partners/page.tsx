import { LandingNav } from '@/components/landing/nav'
import { LandingFooter } from '@/components/landing/footer'
import { ComingSoon } from '@/components/coming-soon'

export default function Page() {
  return (
    <div className="min-h-screen bg-ink">
      <LandingNav dark />
      <ComingSoon
        title="Partner with us"
        subtitle="Work with Equiscore to bring fairer financial decisions to your customers."
      />
      <LandingFooter />
    </div>
  )
}
