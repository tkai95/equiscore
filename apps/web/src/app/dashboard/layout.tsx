import { AppSidebar, MobileTopBar } from '@/components/layout/app-sidebar'
import { DevAccessGate } from '@/components/layout/dev-access-gate'
import { OnboardingGate } from '@/components/layout/onboarding-gate'
import { ImportJobsChip } from '@/components/banking/import-jobs-chip'
import { ChatWidget } from '@/components/chat/chat-widget'

export const dynamic = 'force-dynamic'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    // On the invitation (dev) site the DevAccessGate replaces the dashboard
    // for anyone without a valid grant. On open/public sites it's a no-op.
    <DevAccessGate>
      {/* Force new users through onboarding before the dashboard is usable.
          A user who navigates away from /onboarding is sent back until their
          profileStage advances past 'created'. */}
      <OnboardingGate>
        <div className="flex h-screen overflow-hidden bg-surface-page">
          <AppSidebar />

          <div className="flex min-w-0 flex-1 flex-col">
            <MobileTopBar />
            {/* One canonical content width + gutter for EVERY dashboard page, so
                navigating between screens never shifts the column. */}
            <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              <div className="mx-auto w-full max-w-[1200px]">{children}</div>
            </main>
          </div>

          {/* Import-completion chip floats top-right; it renders nothing when idle. */}
          <div className="fixed right-5 top-4 z-30">
            <ImportJobsChip />
          </div>

          <ChatWidget />
        </div>
      </OnboardingGate>
    </DevAccessGate>
  )
}
