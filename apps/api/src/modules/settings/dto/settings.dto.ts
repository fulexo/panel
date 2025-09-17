import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class EmailSettingsDto {
  @IsString()
  @IsOptional()
  smtpHost?: string;

  @IsNumber()
  @IsOptional()
  smtpPort?: number;

  @IsString()
  @IsOptional()
  smtpUser?: string;

  @IsString()
  @IsOptional()
  smtpPass?: string;

  @IsString()
  @IsOptional()
  smtpFrom?: string;

  @IsBoolean()
  @IsOptional()
  smtpSecure?: boolean;

  @IsString()
  @IsOptional()
  smtpFromName?: string;
}

export class NotificationSettingsDto {
  @IsBoolean()
  @IsOptional()
  emailNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  orderNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  shipmentNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  returnNotifications?: boolean;

  @IsString()
  @IsOptional()
  alertEmail?: string;
}

export class SecuritySettingsDto {
  @IsNumber()
  @IsOptional()
  sessionTimeout?: number;

  @IsNumber()
  @IsOptional()
  maxLoginAttempts?: number;

  @IsBoolean()
  @IsOptional()
  require2FA?: boolean;

  @IsBoolean()
  @IsOptional()
  passwordComplexity?: boolean;

  @IsNumber()
  @IsOptional()
  passwordMinLength?: number;
}

export class GeneralSettingsDto {
  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  companyEmail?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  language?: string;
}