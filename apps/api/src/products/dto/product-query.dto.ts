import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { parseOptionalPositiveInt } from '../../common/utils/number.util';

export class ProductQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  status?: 'active' | 'inactive';

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  storeId?: string;

  @Transform(({ value }) => parseOptionalPositiveInt(value), { toClassOnly: true })
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @Transform(({ value }) => parseOptionalPositiveInt(value), { toClassOnly: true })
  @IsNumber()
  @IsOptional()
  limit?: number = 20;
}