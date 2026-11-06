import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as jose from 'jose'
import {
  LOCAL_AUTH_TOKEN,
  LOCAL_AUTH_USER,
  isLocalAuthEnabled,
  isLoopbackClient,
} from '../utils/local-auth'

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly localAuth: boolean

  constructor(private config: ConfigService) {
    this.localAuth = isLocalAuthEnabled(config)
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const token = this.extractToken(request)

    if (!token) throw new UnauthorizedException('No authentication token provided')

    if (
      this.localAuth &&
      token === LOCAL_AUTH_TOKEN &&
      isLoopbackClient(request.socket?.remoteAddress)
    ) {
      request.user = { ...LOCAL_AUTH_USER }
      return true
    }

    try {
      const issuer = this.config.get<string>('CLERK_ISSUER') ?? ''
      const JWKS = jose.createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`))
      const { payload } = await jose.jwtVerify(token, JWKS, {
        issuer,
      })

      request.user = {
        clerkId: payload.sub,
        email: (payload['email'] as string | undefined) ?? '',
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
