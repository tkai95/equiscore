'use client'

import Link from 'next/link'
import { useAuth, useClerk, useUser } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Building2, Lock } from 'lucide-react'
import { workspaceApi, type WorkspaceOrganisation } from '@/lib/workspace-api'
import { Button, Card, PageHeader, PageLayout, Section, StatusPill } from '@/components/ui'

export function WorkspaceHome() {
  const { getToken } = useAuth()
  const { signOut } = useClerk()
  const { user } = useUser()

  const { data: organisations = [], isLoading } = useQuery({
    queryKey: ['workspace-organisations'],
    queryFn: async () => workspaceApi.organisations.list((await getToken())!),
  })

  return (
    <PageLayout width="wide">
      <PageHeader
        title="Company workspace"
        description="Use partners.equiscore.app for invited company assessment workflows. Each organisation is an isolated workspace with its own cases, policies, usage and audit trail."
      />

      <Card padding="lg">
        <Section
          title={
            <span className="flex items-center gap-2">
              <Building2 className="text-brand h-4 w-4" />
              Your organisations
            </span>
          }
        >
          {isLoading ? (
            <div className="bg-surface-hover h-28 animate-pulse rounded-xl" />
          ) : organisations.length === 0 ? (
            <div className="border-line bg-surface-card rounded-xl border border-dashed p-8 text-center">
              <div className="bg-surface-inset text-brand mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full">
                <Lock className="h-5 w-5" />
              </div>
              <p className="text-content font-medium">No partner workspace access yet</p>
              <p className="text-content-secondary mx-auto mt-1 max-w-xl text-sm">
                You are signed in as{' '}
                <span className="font-medium">
                  {user?.primaryEmailAddress?.emailAddress ?? 'this account'}
                </span>
                , but this account is not authorised for a partner organisation. Ask an EquiScore
                admin or your organisation owner to invite the correct email address.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-4"
                onClick={() => void signOut({ redirectUrl: '/sign-in' })}
              >
                Switch account
              </Button>
            </div>
          ) : (
            <div className="divide-line-subtle divide-y">
              {organisations.map((organisation: WorkspaceOrganisation) => (
                <Link
                  key={organisation.id}
                  href={`/workspace/o/${organisation.slug}`}
                  className="hover:bg-surface-hover flex items-center justify-between gap-4 rounded-lg py-4 transition-colors sm:px-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-content font-medium">{organisation.name}</p>
                      <StatusPill
                        status="success"
                        label={organisation.member.role.replace('_', ' ')}
                      />
                    </div>
                    <p className="text-content-muted mt-1 text-sm">/{organisation.slug}</p>
                  </div>
                  <ArrowRight className="text-content-muted h-4 w-4 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </Section>
      </Card>
    </PageLayout>
  )
}
