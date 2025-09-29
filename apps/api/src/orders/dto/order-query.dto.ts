import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { parseOptionalPositiveInt } from '../../common/utils/number.util';

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

  @Transform(({ value }) => parseOptionalPositiveInt(value), { toClassOnly: true })
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @Transform(({ value }) => parseOptionalPositiveInt(value), { toClassOnly: true })
  @IsNumber()
  @IsOptional()
  limit?: number = 20;
}