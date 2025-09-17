import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { EncryptionService } from '../crypto';

@Injectable()
export class TwoFactorService {
  private enc: EncryptionService;

  constructor(private prisma: PrismaService) {
    const key = process.env['MASTER_KEY_HEX'] || process.env['ENCRYPTION_KEY'] || ''.padEnd(64,'0');
    this.enc = new EncryptionService(key);
  }

  private encryptSecret(secretBase32: string): string {
    const payload = this.enc.encrypt(secretBase32);
    return JSON.stringify(payload);
  }

  private tryDecryptSecret(value: string | null | undefined): string | null {
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      if (parsed && parsed.ciphertext && parsed.nonce) {
        return this.enc.decrypt(parsed);
      }
    } catch {}
    return value;
  }

  async enableTwoFactor(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.twofaEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Fulexo (${user.email})`,
      issuer: 'Fulexo Platform',
    });

    // Save secret temporarily (not enabled yet) — encrypted at rest
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twofaSecret: this.encryptSecret(secret.base32),
      },
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntry: secret.otpauth_url,
    };
  }

  async verifyAndEnable(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twofaSecret) {
      throw new BadRequestException('2FA setup not initiated');
    }

    const base32 = this.tryDecryptSecret(user.twofaSecret);
    const verified = speakeasy.totp.verify({
      secret: base32 || '',
      encoding: 'base32',
      token,
      window: 2,
    });

    if (verified) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          twofaEnabled: true,
        },
      });
      return true;
    }

    return false;
  }

  async verifyToken(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twofaEnabled || !user.twofaSecret) {
      return false;
    }

    const base32 = this.tryDecryptSecret(user.twofaSecret);
    return speakeasy.totp.verify({
      secret: base32 || '',
      encoding: 'base32',
      token,
      window: 2,
    });
  }

  async disableTwoFactor(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twofaEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    // Verify token before disabling
    const verified = await this.verifyToken(userId, token);
    if (!verified) {
      throw new BadRequestException('Invalid 2FA token');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twofaEnabled: false,
        twofaSecret: null,
      },
    });
  }

  async generateBackupCodes(_userId: string): Promise<string[]> {
    const codes: string[] = [];
    const crypto = require('crypto');
    
    for (let i = 0; i < 10; i++) {
      // Use cryptographically secure random generation
      const randomBytes = crypto.randomBytes(4);
      const code = randomBytes.toString('hex').toUpperCase().substring(0, 8);
      codes.push(code);
    }
    
    // In production, these should be hashed and stored in the database
    // For now, we'll return them to the user
    return codes;
  }

  async generateSecret(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Fulexo (${user.email})`,
      issuer: 'Fulexo Platform',
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntry: secret.otpauth_url,
    };
  }

  async generateTempToken(userId: string): Promise<string> {
    const crypto = require('crypto');
    
    // Generate cryptographically secure random token with timestamp and user context
    const timestamp = Date.now().toString();
    const randomBytes = crypto.randomBytes(32);
    const userContext = crypto.createHash('sha256').update(userId).digest('hex').substring(0, 8);
    
    // Combine all elements for maximum entropy
    const combined = `${timestamp}_${userContext}_${randomBytes.toString('hex')}`;
    const token = crypto.createHash('sha256').update(combined).digest('hex');
    
    // Store token temporarily in database with expiration
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        temp2faToken: token,
        temp2faTokenExpires: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      },
    });
    
    return token;
  }

  async validateTempToken(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.temp2faToken || !user.temp2faTokenExpires) {
      return false;
    }

    if (user.temp2faToken !== token) {
      return false;
    }

    if (new Date() > user.temp2faTokenExpires) {
      // Clean up expired token
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          temp2faToken: null,
          temp2faTokenExpires: null,
        },
      });
      return false;
    }

    return true;
  }
}