import { IsString, IsOptional, IsObject } from 'class-validator';

export class ActivityLogDto {
  @IsString()
  userId!: string;

  @IsString()
  action!: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}