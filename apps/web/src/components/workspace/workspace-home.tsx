'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Building2, Plus } from 'lucide-react'
import { workspaceApi, type WorkspaceOrganisation } from '@/lib/workspace-api'
import { Button, Card, PageHeader, PageLayout, Section, StatusPill } from '@/components/ui'

export function WorkspaceHome() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')

  const { data: organisations = [], isLoading } = useQuery({
    queryKey: ['workspace-organisations'],
    queryFn: async () => workspaceApi.organisations.list((await getToken())!),
  })

  const create = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      return workspaceApi.organisations.create(token!, { name })
    },
    onSuccess: () => {
      setName('')
      void queryClient.invalidateQueries({ queryKey: ['workspace-organisations'] })
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (name.trim()) create.mutate()
  }

  return (
    <PageLayout width="wide">
      <PageHeader
        title="Company workspace"
        description="Use partners.equiscore.app for company assessment workflows. Organisations are isolated workspaces with their own cases, policies, usage and audit trail."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card padding="lg">
          <Section
            title={
              <span className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-brand" />
                Your organisations
              </span>
            }
          >
            {isLoading ? (
              <div className="h-28 animate-pulse rounded-xl bg-surface-hover" />
            ) : organisations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-surface-card p-8 text-center">
                <p className="font-medium text-content">No company organisation yet</p>
                <p className="mx-auto mt-1 max-w-xl text-sm text-content-secondary">
                  Create one to start building the Company Assessment Workspace foundation.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-line-subtle">
                {organisations.map((organisation: WorkspaceOrganisation) => (
                  <Link
                    key={organisation.id}
                    href={`/workspace/o/${organisation.slug}`}
                    className="flex items-center justify-between gap-4 rounded-lg py-4 transition-colors hover:bg-surface-hover sm:px-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-content">{organisation.name}</p>
                        <StatusPill status="success" label={organisation.member.role.replace('_', ' ')} />
                      </div>
                      <p className="mt-1 text-sm text-content-muted">/{organisation.slug}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-content-muted" />
                  </Link>
                ))}
              </div>
            )}
          </Section>
        </Card>

        <Card padding="lg" className="self-start">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-brand" />
            <h2 className="text-lg font-semibold text-content">Create organisation</h2>
          </div>
          <p className="mt-1 text-sm text-content-secondary">
            This creates the tenant boundary for assessment cases, policies and usage events.
          </p>
          <form onSubmit={submit} className="mt-5 space-y-3">
            <label className="block text-sm font-medium text-content" htmlFor="organisation-name">
              Organisation name
            </label>
            <input
              id="organisation-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
              placeholder="Example Lettings"
            />
            {create.isError && <p className="text-sm text-danger-strong">{(create.error as Error).message}</p>}
            <Button type="submit" loading={create.isPending} disabled={!name.trim()}>
              {!create.isPending && <Plus className="h-4 w-4" />}
              {create.isPending ? 'Creating...' : 'Create'}
            </Button>
          </form>
        </Card>
      </div>
    </PageLayout>
  )
}
