import { IsString, IsOptional, IsBoolean, IsNumber, IsEmail, IsUrl, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EmailSettingsDto {
  @ApiProperty({ description: 'SMTP host address' })
  @IsString()
  @IsOptional()
  smtp_host?: string;

  @ApiProperty({ description: 'SMTP port' })
  @IsString()
  @IsOptional()
  smtp_port?: string;

  @ApiProperty({ description: 'SMTP username' })
  @IsString()
  @IsOptional()
  smtp_user?: string;

  @ApiProperty({ description: 'SMTP password' })
  @IsString()
  @IsOptional()
  smtp_pass?: string;

  @ApiProperty({ description: 'From email address' })
  @IsEmail()
  @IsOptional()
  smtp_from?: string;

  @ApiProperty({ description: 'Use TLS/SSL' })
  @IsString()
  @IsOptional()
  smtp_secure?: string;
}

export class NotificationSettingsDto {
  @ApiProperty({ description: 'Enable email notifications' })
  @IsString()
  @IsOptional()
  email_notifications?: string;

  @ApiProperty({ description: 'Enable order notifications' })
  @IsString()
  @IsOptional()
  order_notifications?: string;

  @ApiProperty({ description: 'Enable product notifications' })
  @IsString()
  @IsOptional()
  product_notifications?: string;

  @ApiProperty({ description: 'Enable system notifications' })
  @IsString()
  @IsOptional()
  system_notifications?: string;
}

export class GeneralSettingsDto {
  @ApiProperty({ description: 'Company name' })
  @IsString()
  @IsOptional()
  company_name?: string;

  @ApiProperty({ description: 'Support email address' })
  @IsEmail()
  @IsOptional()
  support_email?: string;

  @ApiProperty({ description: 'Timezone' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty({ description: 'Date format' })
  @IsString()
  @IsOptional()
  date_format?: string;

  @ApiProperty({ description: 'Currency code' })
  @IsString()
  @IsOptional()
  currency?: string;
}

export class WooCommerceSettingsDto {
  @ApiProperty({ description: 'Default WooCommerce API version' })
  @IsString()
  @IsOptional()
  default_woo_version?: string;

  @ApiProperty({ description: 'Sync interval in minutes' })
  @IsString()
  @IsOptional()
  sync_interval?: string;

  @ApiProperty({ description: 'Webhook timeout in seconds' })
  @IsString()
  @IsOptional()
  webhook_timeout?: string;

  @ApiProperty({ description: 'Number of retry attempts' })
  @IsString()
  @IsOptional()
  retry_attempts?: string;

  @ApiProperty({ description: 'Enable automatic synchronization' })
  @IsString()
  @IsOptional()
  enable_auto_sync?: string;

  @ApiProperty({ description: 'Auto create new products' })
  @IsString()
  @IsOptional()
  auto_create_products?: string;

  @ApiProperty({ description: 'Auto update existing products' })
  @IsString()
  @IsOptional()
  auto_update_products?: string;

  @ApiProperty({ description: 'Sync product categories' })
  @IsString()
  @IsOptional()
  sync_categories?: string;

  @ApiProperty({ description: 'Sync customer data' })
  @IsString()
  @IsOptional()
  sync_customers?: string;
}

export class SecuritySettingsDto {
  @ApiProperty({ description: 'Session timeout in minutes' })
  @IsString()
  @IsOptional()
  session_timeout?: string;

  @ApiProperty({ description: 'Maximum login attempts' })
  @IsString()
  @IsOptional()
  max_login_attempts?: string;

  @ApiProperty({ description: 'Minimum password length' })
  @IsString()
  @IsOptional()
  password_min_length?: string;

  @ApiProperty({ description: 'Require 2FA' })
  @IsString()
  @IsOptional()
  require_2fa?: string;

  @ApiProperty({ description: 'Auto logout on inactivity' })
  @IsString()
  @IsOptional()
  auto_logout?: string;
}

export class TestConnectionDto {
  @ApiProperty({ description: 'Service to test', enum: ['email'] })
  @IsIn(['email'])
  service: string;
}