import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

@Injectable()
export class TwoFactorService {
  constructor(private prisma: PrismaService) {}

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

    // Save secret temporarily (not enabled yet)
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twofaSecret: secret.base32,
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

    const verified = speakeasy.totp.verify({
      secret: user.twofaSecret,
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

    return speakeasy.totp.verify({
      secret: user.twofaSecret,
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

  async generateBackupCodes(userId: string): Promise<string[]> {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(speakeasy.generateSecret({ length: 8 }).base32.substring(0, 8));
    }
    
    // In production, these should be hashed and stored in the database
    // For now, we'll return them to the user
    return codes;
  }
}