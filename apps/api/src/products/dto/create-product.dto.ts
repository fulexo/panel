import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsObject, IsEnum, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class BundleItemDto {
  @IsString()
  productId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsBoolean()
  @IsOptional()
  isOptional?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  minQuantity?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  maxQuantity?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  discount?: number;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

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

  // Bundle product fields
  @IsString()
  @IsOptional()
  @IsEnum(['simple', 'variable', 'bundle', 'grouped', 'external'])
  productType?: string;

  @IsBoolean()
  @IsOptional()
  isBundle?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BundleItemDto)
  @IsOptional()
  bundleItems?: BundleItemDto[];

  @IsString()
  @IsOptional()
  @IsEnum(['fixed', 'dynamic'])
  bundlePricing?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  bundleDiscount?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  minBundleItems?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  maxBundleItems?: number;

  @IsString()
  @IsOptional()
  @IsEnum(['parent', 'children', 'both'])
  bundleStock?: string;
}