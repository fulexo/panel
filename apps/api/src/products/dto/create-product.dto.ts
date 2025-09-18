import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsObject } from 'class-validator';

export class CreateProductDto {
  @IsString()
  sku!: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  stock?: string;

  @IsNumber()
  @IsOptional()
  weight?: number;

  @IsObject()
  @IsOptional()
  dimensions?: Record<string, unknown>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  storeId!: string;

  @IsNumber()
  @IsOptional()
  regularPrice?: number;
}