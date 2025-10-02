import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7).trim();
    const expectedToken = (this.configService.get<string>('FULEXO_INTERNAL_API_TOKEN') || '').trim();

    if (!expectedToken || token !== expectedToken) {
      throw new UnauthorizedException('Invalid internal API token');
    }

    const tenantHeader = request.headers['x-tenant-id'];
    const tenantId =
      typeof tenantHeader === 'string' && tenantHeader.trim().length > 0
        ? tenantHeader.trim()
        : 'system';

    request.user = {
      id: 'internal-worker',
      sub: 'internal-worker',
      email: 'internal@fulexo.com',
      role: 'INTERNAL',
      tenantId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      jti: `internal_${Date.now()}`,
    };

    return true;
  }
}
