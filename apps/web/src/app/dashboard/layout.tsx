import { AppSidebar } from '@/components/layout/app-sidebar'
import { ImportJobsChip } from '@/components/banking/import-jobs-chip'
import { ChatWidget } from '@/components/chat/chat-widget'

export const dynamic = 'force-dynamic'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    // Fixed to the viewport so only the main column scrolls — the sidebar (and
    // its account footer) stays put.
    <div className="flex h-screen overflow-hidden bg-[#F7F6F2]">
      <AppSidebar />
      <main className="min-w-0 flex-1 overflow-y-auto p-8">{children}</main>

      {/* Import-completion chip floats top-right; it renders nothing when idle. */}
      <div className="fixed right-5 top-4 z-30">
        <ImportJobsChip />
      </div>

      <ChatWidget />
    </div>
  )
}
