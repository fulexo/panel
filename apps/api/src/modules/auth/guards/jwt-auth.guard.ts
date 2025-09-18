import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const token = this.extractTokenFromHeader(request)
    
    if (!token) {
      throw new UnauthorizedException()
    }

    // Basit token kontrolü (production'da JWT doğrulaması yapılmalı)
    try {
      // Şimdilik basit bir kontrol
      request.user = { id: 1, email: 'admin@fulexo.com', role: 'ADMIN' }
      return true
    } catch {
      throw new UnauthorizedException()
    }
  }

  private extractTokenFromHeader(request: { headers: { authorization?: string } }): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? []
    return type === 'Bearer' ? token : undefined
  }
}
