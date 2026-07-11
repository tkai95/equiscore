export type OrganisationRole =
  | 'owner'
  | 'admin'
  | 'policy_admin'
  | 'reviewer'
  | 'manager'
  | 'billing_admin'
  | 'auditor'

export type OrganisationPermission =
  | 'organisation:read'
  | 'organisation:update'
  | 'members:manage'
  | 'assessments:read'
  | 'assessments:write'
  | 'assessments:decide'
  | 'policies:read'
  | 'policies:write'
  | 'policies:approve'
  | 'usage:read'
  | 'audit:read'

const REVIEWER_PERMISSIONS: OrganisationPermission[] = [
  'organisation:read',
  'assessments:read',
  'assessments:write',
  'policies:read',
]

export const ROLE_PERMISSIONS: Record<OrganisationRole, OrganisationPermission[]> = {
  owner: [
    'organisation:read',
    'organisation:update',
    'members:manage',
    'assessments:read',
    'assessments:write',
    'assessments:decide',
    'policies:read',
    'policies:write',
    'policies:approve',
    'usage:read',
    'audit:read',
  ],
  admin: [
    'organisation:read',
    'organisation:update',
    'members:manage',
    'assessments:read',
    'assessments:write',
    'assessments:decide',
    'policies:read',
    'policies:write',
    'usage:read',
    'audit:read',
  ],
  policy_admin: ['organisation:read', 'assessments:read', 'policies:read', 'policies:write'],
  reviewer: REVIEWER_PERMISSIONS,
  manager: [...REVIEWER_PERMISSIONS, 'assessments:decide', 'audit:read'],
  billing_admin: ['organisation:read', 'usage:read'],
  auditor: ['organisation:read', 'assessments:read', 'policies:read', 'usage:read', 'audit:read'],
}

export function permissionsForRole(role: OrganisationRole): OrganisationPermission[] {
  return ROLE_PERMISSIONS[role] ?? []
}
