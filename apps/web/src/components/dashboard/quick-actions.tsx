import Link from 'next/link'
import { Landmark, FileText, RefreshCw, Share2 } from 'lucide-react'

interface Props {
  hasScore: boolean
}

export function QuickActions({ hasScore }: Props) {
  const actions = [
    { href: '/dashboard/connections', icon: Landmark, label: 'Connect bank', desc: 'Add Open Banking data' },
    { href: '/dashboard/documents', icon: FileText, label: 'Upload documents', desc: 'Add supporting evidence' },
    { href: '/dashboard/trust-score', icon: RefreshCw, label: hasScore ? 'Refresh score' : 'Generate score', desc: hasScore ? 'Recompute with latest data' : 'Get your trust profile' },
    { href: '/dashboard/share', icon: Share2, label: 'Share profile', desc: 'Send to landlord or lender' },
  ]

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <h2 className="mb-4 font-semibold text-gray-900">Quick actions</h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map(({ href, icon: Icon, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col gap-2 rounded-xl border border-gray-100 p-4 transition-colors hover:border-[#D8D6C9] hover:bg-cream"
          >
            <Icon className="h-5 w-5 text-brand" />
            <span className="text-sm font-medium text-gray-900">{label}</span>
            <span className="text-xs text-gray-500">{desc}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
