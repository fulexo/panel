import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { parseOptionalPositiveInt } from '../../common/utils/number.util';

export class BillingQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(['pending', 'processing', 'completed', 'failed'])
  @IsOptional()
  status?: string;

  @Transform(({ value }) => parseOptionalPositiveInt(value), { toClassOnly: true })
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @Transform(({ value }) => parseOptionalPositiveInt(value), { toClassOnly: true })
  @IsNumber()
  @IsOptional()
  limit?: number = 20;
}