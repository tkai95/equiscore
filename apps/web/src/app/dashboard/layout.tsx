import { AppSidebar } from '@/components/layout/app-sidebar'
import { ImportJobsChip } from '@/components/banking/import-jobs-chip'

export const dynamic = 'force-dynamic'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    // Fixed to the viewport so only the main column scrolls — the sidebar (and
    // its account footer) stays put.
    <div className="flex h-screen overflow-hidden bg-[#F7F6F2]">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center justify-end gap-3 border-b border-[#D8D6C9] bg-[#F7F6F2] px-8">
          <ImportJobsChip />
        </header>
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  )
}
