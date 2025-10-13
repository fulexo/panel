import * as jose from 'jose';
import { PrismaService } from './prisma.service';
import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  tenantId: string;
  iat?: number;
  exp?: number;
  jti?: string;
}

export class JwtService {
  private privateKey: CryptoKey | null = null;
  private publicKey: CryptoKey | null = null;
  private keyId: string | null = null;
  private initialized: boolean = false;
  private readonly logger = new Logger(JwtService.name);

  constructor(private prisma: PrismaService) {
    // Initialize immediately
    this.init().catch(error => {
      this.logger.error('JWT Service initialization failed:', error);
    });
  }

  async init() {
    if (this.initialized) return;
    
    try {
      // Production'da RSA key pair kullan, development'te HMAC
      if (process.env['NODE_ENV'] === 'production') {
        await this.initRSAKeys();
      } else {
        await this.initHMACKey();
      }
      this.initialized = true;
    } catch (error) {
      this.logger.error('JWT Service initialization failed:', error);
      throw error;
    }
  }

  private async initRSAKeys() {
    try {
      // Mevcut aktif key'i kontrol et
      const existingKey = await this.prisma.jwtKey.findFirst({
        where: { active: true },
        orderBy: { createdAt: 'desc' }
      });

      if (existingKey && existingKey.privatePem) {
        // Mevcut key'i kullan
        this.privateKey = await jose.importPKCS8(existingKey.privatePem, 'RS256');
        this.publicKey = await jose.importJWK(existingKey.publicJwk as jose.JWK, 'RS256') as CryptoKey;
        this.keyId = existingKey.kid;
      } else {
        // Yeni key pair oluştur
        const { publicKey, privateKey } = await jose.generateKeyPair('RS256');
        this.privateKey = privateKey;
        this.publicKey = publicKey;
        
        const kid = `key_${Date.now()}`;
        const publicJwk = await jose.exportJWK(publicKey);
        const privatePem = await jose.exportPKCS8(privateKey);

        await this.prisma.jwtKey.create({
          data: {
            kid,
            alg: 'RS256',
            publicJwk: publicJwk as Prisma.InputJsonValue,
            privatePem,
            active: true,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 yıl
          }
        });

        this.keyId = kid;
      }
    } catch {
      // RSA key initialization failed, falling back to HMAC
      await this.initHMACKey();
    }
  }

  private async initHMACKey() {
    let secret = process.env['JWT_SECRET'];
    
    if (!secret) {
      if (process.env['NODE_ENV'] === 'development') {
        // Generate a secure fallback for development
        const crypto = require('crypto');
        secret = crypto.randomBytes(64).toString('hex');
        this.logger.warn('JWT_SECRET not set, using generated fallback for development. This should NOT be used in production.');
      } else {
        throw new Error('JWT_SECRET environment variable is required');
      }
    }
    
    // Validate secret strength
    if (secret && secret.length < 64) {
      if (process.env['NODE_ENV'] === 'development') {
        this.logger.warn('JWT_SECRET is shorter than 64 characters. This is not recommended for production.');
        // Pad with random data for development
        const crypto = require('crypto');
        const padding = crypto.randomBytes(64 - secret!.length).toString('hex');
        secret = secret + padding;
      } else {
        throw new Error('JWT_SECRET must be at least 64 characters long');
      }
    }
    
    // Check for weak secrets
    const weakPatterns = [
      'dev-secret',
      'change-in-production',
      'your-secret',
      'secret-key',
      'jwt-secret',
      '1234567890',
      'abcdefghijklmnopqrstuvwxyz',
      'password',
      'admin',
      'test',
      'demo',
    ];
    
    if (secret && weakPatterns.some(pattern => secret!.toLowerCase().includes(pattern))) {
      if (process.env['NODE_ENV'] === 'development') {
        this.logger.warn('JWT_SECRET contains weak patterns. This is not recommended for production.');
        // Generate a secure replacement for development
        const crypto = require('crypto');
        secret = crypto.randomBytes(64).toString('hex');
        this.logger.warn('Using generated secure secret for development.');
      } else {
        throw new Error('JWT_SECRET contains weak patterns. Please use a stronger secret.');
      }
    }
    
    // Check for sufficient entropy
    const uniqueChars = new Set(secret).size;
    if (uniqueChars < 16) {
      if (process.env['NODE_ENV'] === 'development') {
        this.logger.warn('JWT_SECRET has insufficient entropy. This is not recommended for production.');
        // Generate a secure replacement for development
        const crypto = require('crypto');
        secret = crypto.randomBytes(64).toString('hex');
        this.logger.warn('Using generated secure secret for development.');
      } else {
        throw new Error('JWT_SECRET must contain at least 16 unique characters');
      }
    }
    
    const secretBuffer = new TextEncoder().encode(secret);
    
    this.privateKey = secretBuffer as unknown as CryptoKey;
    this.publicKey = this.privateKey;
    this.keyId = 'hmac-key';
  }

  async issueTokens(userId: string, email: string, role: string, tenantId: string) {
    if (!this.initialized || !this.privateKey) {
      await this.init();
      if (!this.privateKey) {
        throw new Error('JWT service not initialized');
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const jti = `jti_${userId}_${now}`;

    const accessPayload: JWTPayload = {
      sub: userId,
      email,
      role,
      tenantId,
      iat: now,
      exp: now + (15 * 60), // 15 dakika
      jti
    };

    const refreshPayload: JWTPayload = {
      sub: userId,
      email,
      role,
      tenantId,
      iat: now,
      exp: now + (7 * 24 * 60 * 60), // 7 gün
      jti: `refresh_${jti}`
    };

    const accessToken = await new jose.SignJWT(accessPayload as unknown as jose.JWTPayload)
      .setProtectedHeader({ 
        alg: process.env['NODE_ENV'] === 'production' ? 'RS256' : 'HS256',
        ...(this.keyId && { kid: this.keyId })
      })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(this.privateKey);

    const refreshToken = await new jose.SignJWT(refreshPayload as unknown as jose.JWTPayload)
      .setProtectedHeader({ 
        alg: process.env['NODE_ENV'] === 'production' ? 'RS256' : 'HS256',
        ...(this.keyId && { kid: this.keyId })
      })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(this.privateKey);

    return {
      access: accessToken,
      refresh: refreshToken
    };
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    if (!this.initialized || !this.publicKey) {
      await this.init();
      if (!this.publicKey) {
        throw new Error('JWT service not initialized');
      }
    }

    try {
      const { payload } = await jose.jwtVerify(token, this.publicKey, {
        algorithms: [process.env['NODE_ENV'] === 'production' ? 'RS256' : 'HS256'],
        clockTolerance: 30, // 30 seconds tolerance
        maxTokenAge: '15m', // Maximum token age
      });

      // Additional validation
      if (!payload.sub || !payload['email'] || !payload['role'] || !payload['tenantId']) {
        throw new Error('Invalid token payload');
      }

      // Check if token is blacklisted (if implemented)
      if (payload.jti && await this.isTokenBlacklisted(payload.jti as string)) {
        throw new Error('Token has been revoked');
      }

      return payload as unknown as JWTPayload;
    } catch (error) {
      if (error instanceof jose.errors.JWTExpired) {
        throw new Error('Token has expired');
      } else if (error instanceof jose.errors.JWTInvalid) {
        throw new Error('Invalid token format');
      } else if (error instanceof jose.errors.JWTClaimValidationFailed) {
        throw new Error('Token claim validation failed');
      } else {
        throw new Error('Invalid or expired access token');
      }
    }
  }

  async verifyRefreshToken(token: string): Promise<JWTPayload> {
    if (!this.initialized || !this.publicKey) {
      await this.init();
      if (!this.publicKey) {
        throw new Error('JWT service not initialized');
      }
    }

    try {
      const { payload } = await jose.jwtVerify(token, this.publicKey, {
        algorithms: [process.env['NODE_ENV'] === 'production' ? 'RS256' : 'HS256']
      });

      // Refresh token'ın jti'si refresh_ ile başlamalı
      if (!payload.jti?.startsWith('refresh_')) {
        throw new Error('Invalid refresh token');
      }

      return payload as unknown as JWTPayload;
    } catch {
      throw new Error('Invalid or expired refresh token');
    }
  }

  async getJwks() {
    // In non-production (HS256) mode, never expose keys
    if (process.env['NODE_ENV'] !== 'production') {
      return { keys: [] };
    }

    if (!this.publicKey || !this.keyId) {
      return { keys: [] };
    }

    try {
      // Export the public key in JWK format
      const jwk = await jose.exportJWK(this.publicKey);
      
      return {
        keys: [{
          ...jwk,
          kid: this.keyId,
          use: 'sig',
          alg: 'RS256',
        }]
      };
    } catch {
      // Fallback to empty keys if export fails
      return { keys: [] };
    }
  }

  async rotateKeys() {
    if (process.env['NODE_ENV'] !== 'production') {
      return; // Sadece production'da key rotation
    }

    // Mevcut key'i deaktive et
    await this.prisma.jwtKey.updateMany({
      where: { active: true },
      data: { 
        active: false,
        rotatedAt: new Date()
      }
    });

    // Yeni key oluştur
    await this.initRSAKeys();
  }

  // Check if token is blacklisted
  private async isTokenBlacklisted(jti: string): Promise<boolean> {
    try {
      // Use Redis for faster token blacklist checking
      const Redis = require('ioredis');
      const redis = new Redis(process.env['REDIS_URL'] || 'redis://valkey:6379/0');
      
      const isBlacklisted = await redis.exists(`blacklist:${jti}`);
      await redis.quit();
      
      return isBlacklisted === 1;
    } catch {
      // Fallback to database check if Redis fails
      try {
        const blacklistedToken = await this.prisma.auditLog.findFirst({
          where: {
            action: 'TOKEN_BLACKLISTED',
            changes: {
              path: ['jti'],
              equals: jti
            }
          }
        });
        
        return !!blacklistedToken;
      } catch {
        // Error checking token blacklist
        return false; // If error, allow token (fail open)
      }
    }
  }

  // Blacklist a token
  async blacklistToken(jti: string, reason: string = 'User logout') {
    try {
      // Use Redis for fast token blacklisting
      const Redis = require('ioredis');
      const redis = new Redis(process.env['REDIS_URL'] || 'redis://valkey:6379/0');
      
      // Set token as blacklisted with 7 days expiry (same as refresh token)
      await redis.setex(`blacklist:${jti}`, 7 * 24 * 60 * 60, JSON.stringify({
        reason,
        blacklistedAt: new Date().toISOString()
      }));
      
      await redis.quit();
      
      // Also log to database for audit trail
      await this.prisma.auditLog.create({
        data: {
          action: 'TOKEN_BLACKLISTED',
          entityType: 'JWT_TOKEN',
          changes: {
            jti,
            reason,
            blacklistedAt: new Date().toISOString()
          },
          metadata: {
            reason,
            blacklistedAt: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      // Error blacklisting token - log but don't fail
      this.logger.error('Error blacklisting token:', error);
    }
  }

  // Generate secure random JTI
  // Removed unused method
}