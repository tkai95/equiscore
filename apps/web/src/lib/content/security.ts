// Shared security/privacy content — used by both the public marketing
// /security page and the in-app /dashboard/privacy page so the two never drift.

import { ShieldCheck, Lock, Eye, Trash2, Server, Key, type LucideIcon } from 'lucide-react'

export type SecurityPillar = { icon: LucideIcon; title: string; body: string }

export const SECURITY_PILLARS: SecurityPillar[] = [
  {
    icon: ShieldCheck,
    title: 'Verified evidence you control',
    body: 'You build your Trust Portfolio by uploading statements and documents. Live open-banking connections are coming soon and will be FCA-authorised, read-only, and never able to move money.',
  },
  {
    icon: Lock,
    title: 'Encrypted in transit and at rest',
    body: 'All data transmitted between your browser and our servers uses TLS 1.3. Your data is encrypted at rest on Railway-hosted infrastructure. We do not store your raw bank credentials at any point.',
  },
  {
    icon: Key,
    title: 'Secure authentication',
    body: 'Account access is handled by Clerk, which supports multi-factor authentication, session management, and device tracking. We recommend enabling MFA on your Equiscore account.',
  },
  {
    icon: Eye,
    title: 'You control what gets shared',
    body: 'Landlords and lenders see only your verified trust profile. They never see your raw transaction data. Share links expire and can be revoked from your dashboard at any time.',
  },
  {
    icon: Server,
    title: 'Infrastructure security',
    body: 'Equiscore runs on Railway, with automated backups and network isolation between services. Our database is not publicly accessible. Access is restricted to application services only.',
  },
  {
    icon: Trash2,
    title: 'Data deletion',
    body: 'You can delete your account and all associated data at any time from your settings page. Deletion requests are processed within 30 days. You can remove individual statements without closing your account.',
  },
]
