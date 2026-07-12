import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export type InternalAdminRole =
  | 'owner'
  | 'admin'
  | 'support'
  | 'billing'
  | 'compliance'
  | 'readonly'

export type InternalAdminPermission =
  | 'admin:read'
  | 'admin:manage_organisations'
  | 'admin:manage_access'
  | 'admin:manage_billing'
  | 'admin:manage_compliance'

export interface InternalAdminContext {
  userId: string
  email: string
  role: InternalAdminRole
  permissions: InternalAdminPermission[]
  source: 'bootstrap_env' | 'database'
}

export const INTERNAL_ADMIN_PERMISSIONS: Record<InternalAdminRole, InternalAdminPermission[]> = {
  owner: [
    'admin:read',
    'admin:manage_organisations',
    'admin:manage_access',
    'admin:manage_billing',
    'admin:manage_compliance',
  ],
  admin: [
    'admin:read',
    'admin:manage_organisations',
    'admin:manage_access',
    'admin:manage_billing',
  ],
  support: ['admin:read', 'admin:manage_organisations', 'admin:manage_access'],
  billing: ['admin:read', 'admin:manage_billing'],
  compliance: ['admin:read', 'admin:manage_compliance'],
  readonly: ['admin:read'],
}

export function permissionsForInternalAdminRole(
  role: InternalAdminRole
): InternalAdminPermission[] {
  return INTERNAL_ADMIN_PERMISSIONS[role] ?? INTERNAL_ADMIN_PERMISSIONS.readonly
}

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): InternalAdminContext => {
    const request = ctx.switchToHttp().getRequest()
    return request.adminContext as InternalAdminContext
  }
)
