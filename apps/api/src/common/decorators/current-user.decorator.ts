import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export interface RequestUser {
  clerkId: string
  email: string
  dbUserId?: string
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest()
    return request.user as RequestUser
  }
)
