import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as crypto from 'crypto';

export interface SessionMetadata {
  ipAddress?: string;
  userAgent?: string;
  fingerprint?: string;
}

@Injectable()
export class SessionService {
  constructor(private prisma: PrismaService) {}

  async createSession(userId: string, accessToken: string, metadata: SessionMetadata) {
    // Token'ı hash'le
    const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
    
    // Fingerprint oluştur
    const fingerprint = this.generateFingerprint(metadata);
    
    // Session oluştur
    const session = await this.prisma.session.create({
      data: {
        userId,
        token: tokenHash,
        fingerprint,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 dakika
      }
    });

    return session;
  }

  async validateSession(accessToken: string): Promise<{ valid: boolean; userId?: string; sessionId?: string }> {
    const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
    
    const session = await this.prisma.session.findFirst({
      where: {
        token: tokenHash,
        expiresAt: { gt: new Date() }
      }
    });

    if (!session) {
      return { valid: false };
    }

    return { 
      valid: true, 
      userId: session.userId,
      sessionId: session.id
    };
  }

  async invalidateSession(sessionId: string) {
    await this.prisma.session.delete({
      where: { id: sessionId }
    });
  }

  async invalidateUserSessions(userId: string) {
    await this.prisma.session.deleteMany({
      where: { userId }
    });
  }

  async invalidateExpiredSessions() {
    const result = await this.prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });

    return result.count;
  }

  async getUserSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  private generateFingerprint(metadata: SessionMetadata): string {
    const components = [
      metadata.userAgent || '',
      metadata.ipAddress || '',
      // Diğer fingerprint bileşenleri eklenebilir
    ];

    const fingerprint = components.join('|');
    return crypto.createHash('sha256').update(fingerprint).digest('hex');
  }

  async refreshSession(sessionId: string, newAccessToken: string) {
    const tokenHash = crypto.createHash('sha256').update(newAccessToken).digest('hex');
    
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        token: tokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 dakika
      }
    });
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
        userId,
        id: sessionId,
      },
    });
  }

  async revokeAllSessions(userId: string, currentToken: string) {
    const hashedCurrentToken = this.hashToken(currentToken);
    await this.prisma.session.deleteMany({
      where: {
        userId,
        token: {
          not: hashedCurrentToken,
        },
      },
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}