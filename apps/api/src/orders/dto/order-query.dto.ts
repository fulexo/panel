import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class OrderQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  storeId?: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsOptional()
  limit?: number = 20;
}