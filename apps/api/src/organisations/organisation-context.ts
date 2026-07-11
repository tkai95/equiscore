import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { OrganisationPermission, OrganisationRole } from './permissions'

export interface OrganisationContext {
  organisationId: string
  organisationSlug: string
  organisationName: string
  memberId: string
  role: OrganisationRole
  permissions: OrganisationPermission[]
}

export const CurrentOrganisation = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): OrganisationContext => {
    const request = ctx.switchToHttp().getRequest()
    return request.orgContext as OrganisationContext
  }
)
