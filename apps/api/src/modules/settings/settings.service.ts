import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
// import { Settings } from '@prisma/client';

export interface SettingCategory {
  email: {
    smtp_host: string;
    smtp_port: string;
    smtp_user: string;
    smtp_pass: string;
    smtp_from: string;
    smtp_secure: string;
  };
  notification: {
    slack_webhook: string;
    discord_webhook: string;
    email_notifications: string;
  };
  general: {
    company_name: string;
    support_email: string;
    timezone: string;
    date_format: string;
    currency: string;
  };
}

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  async getSettings(tenantId: string, category?: string): Promise<Record<string, unknown>[]> {
    const where: Record<string, unknown> = { tenantId };
    if (category) where.category = category;

    const settings = await this.prisma.settings.findMany({ where });

    // Decrypt sensitive values
    return settings.map(setting => ({
      ...setting,
      value: setting.isSecret && setting.value 
        ? this.encryption.decrypt(setting.value)
        : setting.value,
    }));
  }

  async getSettingsByCategory<K extends keyof SettingCategory>(
    tenantId: string,
    category: K
  ): Promise<Partial<SettingCategory[K]>> {
    const settings = await this.getSettings(tenantId, category);
    
    const result: Record<string, unknown> = {};
    settings.forEach(setting => {
      result[setting['key'] as string] = setting['value'];
    });
    
    return result as any;
  }

  async getSetting(
    tenantId: string,
    category: string,
    key: string
  ): Promise<string | null> {
    const setting = await this.prisma.settings.findUnique({
      where: {
        tenantId_category_key: { tenantId, category, key },
      },
    });

    if (!setting) return null;

    return setting.isSecret && setting.value
      ? this.encryption.decrypt(setting.value)
      : setting.value;
  }

  async upsertSetting(
    tenantId: string,
    category: string,
    key: string,
    value: string | null,
    isSecret: boolean = false,
    updatedBy?: string,
    metadata?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const encryptedValue = isSecret && value 
      ? this.encryption.encrypt(value)
      : value;

    return this.prisma.settings.upsert({
      where: {
        tenantId_category_key: { tenantId, category, key },
      },
      create: {
        tenantId,
        category,
        key,
        value: encryptedValue,
        isSecret,
        updatedBy: updatedBy || null,
        metadata: metadata as any,
      },
      update: {
        value: encryptedValue,
        isSecret,
        updatedBy: updatedBy || null,
        metadata: metadata as any,
      },
    });
  }

  async updateSettings(
    tenantId: string,
    category: string,
    settings: Record<string, unknown>,
    updatedBy?: string
  ): Promise<void> {
    const secretKeys = this.getSecretKeys(category);

    await this.prisma.$transaction(
      Object.entries(settings).map(([key, value]) =>
        this.prisma.settings.upsert({
          where: {
            tenantId_category_key: { tenantId, category, key },
          },
          create: {
            tenantId,
            category,
            key,
            value: secretKeys.includes(key) && value
              ? this.encryption.encrypt(value as string)
              : value as string,
            isSecret: secretKeys.includes(key),
            updatedBy: updatedBy || null,
          },
          update: {
            value: secretKeys.includes(key) && value
              ? this.encryption.encrypt(value as string)
              : value as string,
            updatedBy: updatedBy || null,
          },
        })
      )
    );
  }

  async deleteSetting(
    tenantId: string,
    category: string,
    key: string
  ): Promise<void> {
    await this.prisma.settings.delete({
      where: {
        tenantId_category_key: { tenantId, category, key },
      },
    });
  }

  async testEmailSettings(tenantId: string): Promise<boolean> {
    // Import email service dynamically to avoid circular dependency
    const { EmailService } = await import('../email/email.service');
    const emailService = new EmailService(this);
    return emailService.testConnection(tenantId);
  }

  private getSecretKeys(category: string): string[] {
    const secretKeys: Record<string, string[]> = {
      email: ['smtp_pass'],
      notification: ['slack_webhook', 'discord_webhook'],
    };

    return secretKeys[category] || [];
  }

  // Helper method to get settings as environment variables format
  async getEnvironmentVariables(tenantId: string): Promise<Record<string, string>> {
    const settings = await this.getSettings(tenantId);
    const env: Record<string, string> = {};

    settings.forEach(setting => {
      if (setting['value']) {
        const envKey = `${setting['category']}_${setting['key']}`.toUpperCase();
        env[envKey] = setting['value'] as string;
      }
    });

    return env;
  }
}