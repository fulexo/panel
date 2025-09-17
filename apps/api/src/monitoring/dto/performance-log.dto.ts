import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';

export class PerformanceLogDto {
  @IsString()
  operation!: string;

  @IsNumber()
  duration!: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}