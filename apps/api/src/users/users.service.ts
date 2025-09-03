import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async list(currentUser: any, page: number, limit: number, search?: string) {
    const offset = (page - 1) * limit;
    
    let whereClause: any = {};
    
    // Role-based filtering
    if (currentUser.role === 'CUSTOMER_ADMIN') {
      // Customer admins can only see users in their tenant
      whereClause.tenantId = currentUser.tenantId;
    }
    
    if (search) {
      whereClause.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { role: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          role: true,
          tenantId: true,
          twofaEnabled: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          failedAttempts: true,
          tenant: {
            select: {
              name: true,
              slug: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.user.count({ where: whereClause })
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async get(currentUser: any, id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        tenantId: true,
        twofaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        failedAttempts: true,
        tenant: {
          select: {
            name: true,
            slug: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check permissions
    if (currentUser.role === 'CUSTOMER_ADMIN' && user.tenantId !== currentUser.tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return user;
  }

  async update(currentUser: any, id: string, data: any) {
    const user = await this.get(currentUser, id);

    // Additional permission checks
    if (currentUser.role !== 'FULEXO_ADMIN') {
      // Non-admin users cannot change roles to admin roles
      if (data.role && ['FULEXO_ADMIN', 'FULEXO_STAFF'].includes(data.role)) {
        throw new ForbiddenException('Cannot assign admin roles');
      }
      
      // Customer admins cannot change tenant
      if (currentUser.role === 'CUSTOMER_ADMIN' && data.tenantId && data.tenantId !== currentUser.tenantId) {
        throw new ForbiddenException('Cannot change tenant');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        email: data.email,
        role: data.role,
        tenantId: data.tenantId
      },
      select: {
        id: true,
        email: true,
        role: true,
        tenantId: true,
        twofaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        tenant: {
          select: {
            name: true,
            slug: true
          }
        }
      }
    });

    return updatedUser;
  }

  async remove(currentUser: any, id: string) {
    if (currentUser.role !== 'FULEXO_ADMIN') {
      throw new ForbiddenException('Only FULEXO_ADMIN can delete users');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Cannot delete yourself
    if (user.id === currentUser.id) {
      throw new ForbiddenException('Cannot delete yourself');
    }

    await this.prisma.user.delete({ where: { id } });
    
    return { message: 'User deleted successfully' };
  }

  async resetPassword(currentUser: any, id: string, password?: string) {
    if (currentUser.role !== 'FULEXO_ADMIN') {
      throw new ForbiddenException('Only FULEXO_ADMIN can reset passwords');
    }
    if (!password || String(password).length < 8) {
      throw new ForbiddenException('Password must be at least 8 characters');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { message: 'Password reset successfully' };
  }
}
