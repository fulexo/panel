import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '../jwt';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { SessionService } from './session.service';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private sessionService: SessionService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAccessToken(token);
      const sessionResult = await this.sessionService.validateSession(token);
      if (!sessionResult.valid) {
        throw new UnauthorizedException('Session expired or revoked');
      }
      const user = await this.prisma.user.findUnique({ where: { id: String((payload as any).sub) } });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      request.user = { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}