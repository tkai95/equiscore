import { CanActivate, ExecutionContext, Injectable, BadRequestException } from '@nestjs/common'
import { AuthService } from '../auth/auth.service'
import { OrganisationsService } from './organisations.service'

@Injectable()
export class OrganisationAccessGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly organisations: OrganisationsService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const user = request.user as { clerkId: string; email: string; dbUserId?: string } | undefined
    if (!user) return false

    const dbUser = await this.authService.syncUser(user.clerkId, user.email)
    request.user = { ...user, dbUserId: dbUser.id }

    const params = request.params as Record<string, string | undefined>
    const headers = request.headers as Record<string, string | string[] | undefined>
    const organisationKey =
      params['organisationSlug'] ??
      params['organisationId'] ??
      this.headerValue(headers['x-organisation-slug']) ??
      this.headerValue(headers['x-organisation-id'])

    if (!organisationKey) {
      throw new BadRequestException('Organisation context is required')
    }

    request.orgContext = await this.organisations.resolveContext(dbUser.id, organisationKey)
    return true
  }

  private headerValue(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value
  }
}
