import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { JwtService } from '../jwt';
import { SessionService } from './session.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto, RegisterDto } from './dto';
import Redis from 'ioredis';

@Injectable()
export class AuthService {
  private redis: Redis;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private sessionService: SessionService,
    private auditService: AuditService,
  ) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://valkey:6379/0');
  }

  async login(dto: LoginDto, metadata: { ipAddress?: string; userAgent?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { tenant: true },
    });

    if (!user) {
      await this.auditService.log({
        action: 'login.failed',
        metadata: { email: dto.email, reason: 'user_not_found' },
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is locked. Please try again later.');
    }

    // Validate password using bcrypt against stored hash
    const isPasswordValid = user.passwordHash ? await bcrypt.compare(dto.password, user.passwordHash) : false;
    if (!isPasswordValid) {
      // Increment failed attempts
      const failedAttempts = user.failedAttempts + 1;
      const updates: any = { failedAttempts };
      
      // Lock account after 5 failed attempts
      if (failedAttempts >= 5) {
        updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      }
      
      await this.prisma.user.update({
        where: { id: user.id },
        data: updates,
      });

      await this.auditService.log({
        action: 'login.failed',
        userId: user.id,
        tenantId: user.tenantId,
        metadata: { reason: 'invalid_password', attempts: failedAttempts },
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed attempts on successful password verification
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Check if 2FA is enabled
    if (user.twofaEnabled) {
      // Generate temporary token for 2FA verification
      const tempToken = await this.generateTempToken(user.id);
      return {
        requiresTwoFactor: true,
        tempToken,
      };
    }

    // Generate tokens and create session
    const tokens = await this.generateTokens(user);
    await this.sessionService.createSession(user.id, tokens.access, metadata);

    await this.auditService.log({
      action: 'login.success',
      userId: user.id,
      tenantId: user.tenantId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant.name,
      },
    };
  }

  async register(dto: RegisterDto) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Get tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
    });

    if (!tenant) {
      throw new BadRequestException('Invalid tenant');
    }

    // Hash password with consistent cost factor
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: dto.role || 'CUSTOMER_USER',
        tenantId: dto.tenantId,
      },
      include: { tenant: true },
    });

    await this.auditService.log({
      action: 'user.registered',
      userId: user.id,
      tenantId: user.tenantId,
      metadata: { email: user.email, role: user.role },
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: user.tenant.name,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyRefreshToken(refreshToken);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { tenant: true },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(user);
      // Create a new session for the refreshed access token
      await this.sessionService.createSession(user.id, tokens.access, {});
      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async completeTwoFactorLogin(tempToken: string, twoFactorToken: string, metadata: { ipAddress?: string; userAgent?: string }) {
    const userId = await this.verifyTempToken(tempToken);
    if (!userId) {
      throw new UnauthorizedException('Invalid or expired temporary token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.twofaEnabled || !user.twofaSecret) {
      throw new UnauthorizedException('2FA not configured');
    }

    // Verify 2FA token
    const speakeasy = require('speakeasy');
    const verified = speakeasy.totp.verify({
      secret: user.twofaSecret,
      encoding: 'base32',
      token: twoFactorToken,
      window: 2,
    });

    if (!verified) {
      await this.auditService.log({
        action: '2fa.failed',
        userId: user.id,
        tenantId: user.tenantId,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });
      throw new UnauthorizedException('Invalid 2FA token');
    }

    // Generate tokens and create session
    const tokens = await this.generateTokens(user);
    await this.sessionService.createSession(user.id, tokens.access, metadata);

    await this.auditService.log({
      action: '2fa.success',
      userId: user.id,
      tenantId: user.tenantId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant.name,
      },
    };
  }

  async getUserInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        tenantId: true,
        twofaEnabled: true,
        createdAt: true,
        lastLoginAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const tokens = await this.jwtService.issueTokens(user.id, user.email, user.role, user.tenantId);
    return tokens;
  }

  private async generateTempToken(userId: string): Promise<string> {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await this.redis.setex(`temp_2fa:${token}`, 300, userId); // 5 minutes expiry
    return token;
  }

  private async verifyTempToken(token: string): Promise<string | null> {
    const userId = await this.redis.get(`temp_2fa:${token}`);
    if (userId) {
      await this.redis.del(`temp_2fa:${token}`);
    }
    return userId;
  }

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        twofaEnabled: true,
        createdAt: true,
        lastLoginAt: true,
        notificationPreferences: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async updateUserProfile(userId: string, dto: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const updateData: any = {};
    
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) {
      // Check if email is already taken by another user
      const existingUser = await this.prisma.user.findFirst({
        where: { email: dto.email, id: { not: userId } },
      });
      if (existingUser) {
        throw new ConflictException('Email is already taken');
      }
      updateData.email = dto.email;
    }
    if (dto.notificationPreferences !== undefined) {
      updateData.notificationPreferences = dto.notificationPreferences;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        twofaEnabled: true,
        createdAt: true,
        lastLoginAt: true,
        notificationPreferences: true,
      },
    });

    await this.auditService.log({
      action: 'profile.updated',
      userId,
      changes: dto,
    });

    return updatedUser;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = user.passwordHash ? await bcrypt.compare(currentPassword, user.passwordHash) : false;
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters long');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    await this.auditService.log({
      action: 'password.changed',
      userId,
    });

    return { message: 'Password changed successfully' };
  }
}