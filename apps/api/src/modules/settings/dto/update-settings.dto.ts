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
  @ApiProperty({ description: 'Slack webhook URL' })
  @IsUrl()
  @IsOptional()
  slack_webhook?: string;

  @ApiProperty({ description: 'Discord webhook URL' })
  @IsUrl()
  @IsOptional()
  discord_webhook?: string;

  @ApiProperty({ description: 'Enable email notifications' })
  @IsString()
  @IsOptional()
  email_notifications?: string;
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

export class TestConnectionDto {
  @ApiProperty({ description: 'Service to test', enum: ['email'] })
  @IsIn(['email'])
  service: string;
}