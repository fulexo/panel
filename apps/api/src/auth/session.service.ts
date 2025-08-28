import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class SessionService {
  constructor(private prisma: PrismaService) {}

  async createSession(userId: string, token: string, metadata: { ipAddress?: string; userAgent?: string }) {
    const fingerprint = this.generateFingerprint(metadata.userAgent || '');
    
    const session = await this.prisma.session.create({
      data: {
        userId,
        token: this.hashToken(token),
        fingerprint,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return session;
  }

  async validateSession(token: string): Promise<boolean> {
    const hashedToken = this.hashToken(token);
    const session = await this.prisma.session.findUnique({
      where: { token: hashedToken },
    });

    if (!session) {
      return false;
    }

    if (session.expiresAt < new Date()) {
      await this.prisma.session.delete({
        where: { id: session.id },
      });
      return false;
    }

    return true;
  }

  async getUserSessions(userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions;
  }

  async revokeSession(userId: string, token: string) {
    const hashedToken = this.hashToken(token);
    await this.prisma.session.deleteMany({
      where: {
        userId,
        token: hashedToken,
      },
    });
  }

  async revokeSessionById(userId: string, sessionId: string) {
    await this.prisma.session.deleteMany({
      where: {
        id: sessionId,
        userId,
      },
    });
  }

  async revokeAllSessions(userId: string, exceptToken?: string) {
    if (exceptToken) {
      const hashedToken = this.hashToken(exceptToken);
      await this.prisma.session.deleteMany({
        where: {
          userId,
          NOT: { token: hashedToken },
        },
      });
    } else {
      await this.prisma.session.deleteMany({
        where: { userId },
      });
    }
  }

  async cleanExpiredSessions() {
    await this.prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateFingerprint(userAgent: string): string {
    return crypto.createHash('sha256').update(userAgent).digest('hex');
  }
}