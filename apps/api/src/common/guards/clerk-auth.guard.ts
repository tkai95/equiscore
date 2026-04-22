import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as jose from 'jose'

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const token = this.extractToken(request)

    if (!token) throw new UnauthorizedException('No authentication token provided')

    try {
      const jwksUrl = `https://api.clerk.com/v1/jwks`
      const JWKS = jose.createRemoteJWKSet(new URL(jwksUrl))
      const { payload } = await jose.jwtVerify(token, JWKS, {
        issuer: this.config.get<string>('CLERK_ISSUER'),
      })

      request.user = {
        clerkId: payload.sub,
        email: payload.email as string,
      }

      return true
    } catch {
      throw new UnauthorizedException('Invalid or expired token')
    }
  }

  private extractToken(request: { headers: Record<string, string> }): string | null {
    const [type, token] = request.headers['authorization']?.split(' ') ?? []
    return type === 'Bearer' ? token : null
  }
}
