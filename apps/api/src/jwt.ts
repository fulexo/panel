import * as jose from 'jose';
import { PrismaService } from './prisma.service';

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

  constructor(private prisma: PrismaService) {}

  async init() {
    // Production'da RSA key pair kullan, development'te HMAC
    if (process.env['NODE_ENV'] === 'production') {
      await this.initRSAKeys();
    } else {
      await this.initHMACKey();
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
            publicJwk: publicJwk as any,
            privatePem,
            active: true,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 yıl
          }
        });

        this.keyId = kid;
      }
    } catch (error) {
      // RSA key initialization failed, falling back to HMAC
      await this.initHMACKey();
    }
  }

  private async initHMACKey() {
    const secret = process.env['JWT_SECRET'] || 'dev-secret-key-change-in-production';
    
    // Validate secret strength
    if (secret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
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
    ];
    
    if (weakPatterns.some(pattern => secret.toLowerCase().includes(pattern))) {
      throw new Error('JWT_SECRET contains weak patterns. Please use a stronger secret.');
    }
    
    const secretBuffer = new TextEncoder().encode(secret);
    
    this.privateKey = secretBuffer as any;
    this.publicKey = this.privateKey;
    this.keyId = 'hmac-key';
  }

  async issueTokens(userId: string, email: string, role: string, tenantId: string) {
    if (!this.privateKey) {
      throw new Error('JWT service not initialized');
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

    const accessToken = await new jose.SignJWT(accessPayload as any)
      .setProtectedHeader({ 
        alg: process.env['NODE_ENV'] === 'production' ? 'RS256' : 'HS256',
        ...(this.keyId && { kid: this.keyId })
      })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(this.privateKey);

    const refreshToken = await new jose.SignJWT(refreshPayload as any)
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
    if (!this.publicKey) {
      throw new Error('JWT service not initialized');
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

      return payload as any;
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
    if (!this.publicKey) {
      throw new Error('JWT service not initialized');
    }

    try {
      const { payload } = await jose.jwtVerify(token, this.publicKey, {
        algorithms: [process.env['NODE_ENV'] === 'production' ? 'RS256' : 'HS256']
      });

      // Refresh token'ın jti'si refresh_ ile başlamalı
      if (!payload.jti?.startsWith('refresh_')) {
        throw new Error('Invalid refresh token');
      }

      return payload as any;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  getJwks() {
    if (!this.publicKey || !this.keyId) {
      return { keys: [] };
    }

    return {
      keys: [{
        kty: 'RSA',
        kid: this.keyId,
        use: 'sig',
        alg: 'RS256',
        // JWK formatında public key
      }]
    };
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
      // Check in database for blacklisted tokens
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
    } catch (error) {
      // Error checking token blacklist
      return false; // If error, allow token (fail open)
    }
  }

  // Blacklist a token
  async blacklistToken(jti: string, reason: string = 'User logout') {
    try {
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
      // Error blacklisting token
    }
  }

  // Generate secure random JTI
  private _generateSecureJTI(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `jti_${timestamp}_${random}`;
  }
}