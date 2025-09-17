import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export class BillingQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(['pending', 'processing', 'completed', 'failed'])
  @IsOptional()
  status?: string;

  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsOptional()
  limit?: number = 20;
}