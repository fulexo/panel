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
    
    // Check for existing sessions and limit them
    const existingSessions = await this.prisma.session.count({
      where: { userId }
    });
    
    const maxSessions = 5; // Maximum 5 concurrent sessions per user
    
    if (existingSessions >= maxSessions) {
      // Remove oldest sessions
      const sessionsToDelete = await this.prisma.session.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        take: existingSessions - maxSessions + 1,
        select: { id: true }
      });
      
      await this.prisma.session.deleteMany({
        where: {
          id: { in: sessionsToDelete.map(s => s.id) }
        }
      });
    }
    
    // Session oluştur
    const session = await this.prisma.session.create({
      data: {
        userId,
        token: tokenHash,
        fingerprint,
        ipAddress: metadata.ipAddress || null,
        userAgent: metadata.userAgent || null,
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

  // Session rotation - create new session and invalidate old one
  async rotateSession(userId: string, oldToken: string, newToken: string, metadata: SessionMetadata) {
    const oldTokenHash = crypto.createHash('sha256').update(oldToken).digest('hex');
    const newTokenHash = crypto.createHash('sha256').update(newToken).digest('hex');
    
    // Find existing session
    const existingSession = await this.prisma.session.findFirst({
      where: {
        userId,
        token: oldTokenHash,
        expiresAt: { gt: new Date() }
      }
    });

    if (!existingSession) {
      throw new Error('Session not found or expired');
    }

    // Update session with new token
    const updatedSession = await this.prisma.session.update({
      where: { id: existingSession.id },
      data: {
        token: newTokenHash,
        fingerprint: this.generateFingerprint(metadata),
        ipAddress: metadata.ipAddress || null,
        userAgent: metadata.userAgent || null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 dakika
      }
    });

    return updatedSession;
  }

  // Check for suspicious session activity
  async checkSuspiciousActivity(userId: string, metadata: SessionMetadata): Promise<boolean> {
    const fingerprint = this.generateFingerprint(metadata);
    
    // Check if this fingerprint has been used recently
    const recentSessions = await this.prisma.session.findMany({
      where: {
        userId,
        fingerprint: { not: fingerprint },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      }
    });

    // If user has sessions from different fingerprints in last 24 hours, it might be suspicious
    return recentSessions.length > 3;
  }

  // Get session statistics
  async getSessionStats(userId: string) {
    const [totalSessions, activeSessions, expiredSessions] = await Promise.all([
      this.prisma.session.count({ where: { userId } }),
      this.prisma.session.count({ 
        where: { 
          userId, 
          expiresAt: { gt: new Date() } 
        } 
      }),
      this.prisma.session.count({ 
        where: { 
          userId, 
          expiresAt: { lte: new Date() } 
        } 
      })
    ]);

    return {
      totalSessions,
      activeSessions,
      expiredSessions
    };
  }

  // Cleanup old sessions (called by cron job)
  async cleanupOldSessions() {
    const result = await this.prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });

    return result.count;
  }

  // Force logout all sessions for a user (security measure)
  async forceLogoutAllSessions(userId: string, reason: string = 'Security measure') {
    const result = await this.prisma.session.deleteMany({
      where: { userId }
    });

    // Log this action
    await this.prisma.auditLog.create({
      data: {
        action: 'FORCE_LOGOUT_ALL_SESSIONS',
        entityType: 'USER',
        entityId: userId,
        changes: {
          reason,
          sessionsDeleted: result.count,
          timestamp: new Date().toISOString()
        },
        metadata: {
          reason,
          sessionsDeleted: result.count
        }
      }
    });

    return result.count;
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

  // Additional methods for better session management
  async getSessionById(sessionId: string) {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });
  }

  async updateSessionActivity(sessionId: string) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // Extend by 15 minutes
      },
    });
  }

  async getActiveSessionsCount(userId: string): Promise<number> {
    return this.prisma.session.count({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
    });
  }
}