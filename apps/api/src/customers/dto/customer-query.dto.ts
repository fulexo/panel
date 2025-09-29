import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
import { parseOptionalPositiveInt } from '../../common/utils/number.util';

export class CustomerQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  status?: 'active' | 'inactive';

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @Transform(({ value }) => parseOptionalPositiveInt(value), { toClassOnly: true })
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @Transform(({ value }) => parseOptionalPositiveInt(value), { toClassOnly: true })
  @IsNumber()
  @IsOptional()
  limit?: number = 20;
}