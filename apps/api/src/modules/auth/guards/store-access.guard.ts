import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';

@Injectable()
export class StoreAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const storeId = request.params.storeId || request.params.id;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Admin can access all stores
    if (user.role === 'ADMIN') {
      return true;
    }

    // Customer can only access their own stores
    if (user.role === 'CUSTOMER') {
      if (!storeId) {
        return true; // Allow access to store list
      }

      // Check if the store belongs to the user
      const store = await this.prisma.store.findFirst({
        where: {
          id: storeId,
          customerId: user.id,
        },
      });

      if (!store) {
        throw new ForbiddenException('Access denied to this store');
      }

      return true;
    }

    throw new ForbiddenException('Invalid user role');
  }
}