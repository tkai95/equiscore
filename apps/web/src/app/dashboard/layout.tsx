import { Bell } from 'lucide-react'
import { AppSidebar } from '@/components/layout/app-sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#F7F6F2]">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-10 flex items-center justify-end border-b border-[#D8D6C9] bg-[#F7F6F2]/90 px-8 py-3 backdrop-blur">
          <button className="rounded-lg p-2 text-charcoal-mid transition-colors hover:bg-white/60">
            <Bell className="h-5 w-5" />
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  )
}
