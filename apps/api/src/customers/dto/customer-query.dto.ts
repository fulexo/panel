import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

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

  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsOptional()
  limit?: number = 20;
}