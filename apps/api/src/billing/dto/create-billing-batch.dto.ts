import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';

export class CreateBillingBatchDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  orderIds?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}