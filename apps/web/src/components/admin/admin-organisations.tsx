'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Building2, Plus } from 'lucide-react'
import { adminApi } from '@/lib/admin-api'
import { Button, Card, PageHeader, PageLayout, Section, StatusPill } from '@/components/ui'
import { AdminTable, Cell, EmptyAdminState, formatMaybeDate, label } from './admin-table'

export function AdminOrganisations() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [allowance, setAllowance] = useState('25')

  const { data: organisations = [], isLoading } = useQuery({
    queryKey: ['admin-organisations'],
    queryFn: async () => adminApi.organisations.list((await getToken())!),
  })

  const create = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      return adminApi.organisations.create(token!, {
        name,
        ownerEmail: ownerEmail || undefined,
        ownerRole: 'owner',
        monthlyAssessmentAllowance: Number.parseInt(allowance, 10) || 0,
        currency: 'GBP',
      })
    },
    onSuccess: () => {
      setName('')
      setOwnerEmail('')
      setAllowance('25')
      void queryClient.invalidateQueries({ queryKey: ['admin-organisations'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-overview'] })
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (name.trim()) create.mutate()
  }

  return (
    <PageLayout width="wide">
      <PageHeader
        title="Partner organisations"
        description="Create partner tenants and invite the first owner/admin. Partner users then work inside their own workspace only."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card padding="lg">
          <Section
            title={
              <span className="flex items-center gap-2">
                <Building2 className="text-brand h-4 w-4" />
                All partners
              </span>
            }
          >
            {isLoading ? (
              <div className="bg-surface-hover h-40 animate-pulse rounded-xl" />
            ) : organisations.length === 0 ? (
              <EmptyAdminState
                title="No partner organisations yet"
                body="Create the first organisation from the admin panel."
              />
            ) : (
              <AdminTable
                columns={['Organisation', 'Status', 'Owner', 'Members', 'Usage', 'Created', '']}
              >
                {organisations.map((organisation) => (
                  <tr key={organisation.id}>
                    <Cell>
                      <div className="text-content font-medium">{organisation.name}</div>
                      <div className="text-content-muted text-xs">/{organisation.slug}</div>
                    </Cell>
                    <Cell>
                      <StatusPill
                        status={organisation.status === 'active' ? 'success' : 'warning'}
                        label={label(organisation.status)}
                      />
                    </Cell>
                    <Cell muted>{organisation.owner?.email ?? 'Not invited'}</Cell>
                    <Cell muted>{organisation.metrics.activeMembers}</Cell>
                    <Cell muted>{organisation.metrics.usageThisMonth}</Cell>
                    <Cell muted>{formatMaybeDate(organisation.createdAt)}</Cell>
                    <Cell>
                      <Link
                        href={`/admin/organisations/${organisation.slug}`}
                        aria-label={`Open ${organisation.name}`}
                        className="text-brand hover:bg-brand-50 inline-flex rounded-md p-1.5 transition-colors"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Cell>
                  </tr>
                ))}
              </AdminTable>
            )}
          </Section>
        </Card>

        <Card padding="lg" className="self-start">
          <Section title="Create partner">
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-content block text-sm font-medium" htmlFor="partner-name">
                  Organisation name
                </label>
                <input
                  id="partner-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="border-line focus:border-brand mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                  placeholder="Example Lettings"
                />
              </div>
              <div>
                <label className="text-content block text-sm font-medium" htmlFor="partner-owner">
                  First owner email
                </label>
                <input
                  id="partner-owner"
                  type="email"
                  value={ownerEmail}
                  onChange={(event) => setOwnerEmail(event.target.value)}
                  className="border-line focus:border-brand mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                  placeholder="owner@example.com"
                />
              </div>
              <div>
                <label
                  className="text-content block text-sm font-medium"
                  htmlFor="partner-allowance"
                >
                  Monthly assessment allowance
                </label>
                <input
                  id="partner-allowance"
                  type="number"
                  min="0"
                  value={allowance}
                  onChange={(event) => setAllowance(event.target.value)}
                  className="border-line focus:border-brand mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none"
                />
              </div>
              {create.isError && (
                <p className="text-danger-strong text-sm">{(create.error as Error).message}</p>
              )}
              {create.data?.invitation && (
                <div className="bg-surface-inset text-content-secondary rounded-lg p-3 text-sm">
                  Invite created for {create.data.invitation.email}. They will join automatically
                  when they sign in with that email.
                </div>
              )}
              <Button type="submit" loading={create.isPending} disabled={!name.trim()}>
                {!create.isPending && <Plus className="h-4 w-4" />}
                {create.isPending ? 'Creating...' : 'Create partner'}
              </Button>
            </form>
          </Section>
        </Card>
      </div>
    </PageLayout>
  )
}
