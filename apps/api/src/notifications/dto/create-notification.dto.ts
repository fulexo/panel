import { IsString, IsOptional, IsEnum, IsBoolean, IsObject } from 'class-validator';

export enum NotificationType {
  ORDER = 'order',
  INVENTORY = 'inventory',
  CUSTOMER = 'customer',
  SYSTEM = 'system',
  RETURN = 'return',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class CreateNotificationDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @IsBoolean()
  @IsOptional()
  read?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
