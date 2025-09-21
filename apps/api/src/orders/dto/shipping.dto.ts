import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, Min, Max } from 'class-validator';

export enum AdjustmentType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed'
}

export class CreateShippingZoneDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateShippingZoneDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateShippingPriceDto {
  @IsString()
  zoneId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  freeShippingThreshold?: number;

  @IsOptional()
  @IsString()
  estimatedDays?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  priority?: number;
}

export class UpdateShippingPriceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  freeShippingThreshold?: number;

  @IsOptional()
  @IsString()
  estimatedDays?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  priority?: number;
}

export class CreateCustomerShippingPriceDto {
  @IsString()
  zoneId: string;

  @IsString()
  priceId: string;

  @IsOptional()
  @IsString()
  customerId?: string; // null for all customers

  @IsEnum(AdjustmentType)
  adjustmentType: AdjustmentType;

  @IsNumber()
  adjustmentValue: number; // +10 for 10% increase, -10 for 10% decrease

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCustomerShippingPriceDto {
  @IsOptional()
  @IsEnum(AdjustmentType)
  adjustmentType?: AdjustmentType;

  @IsOptional()
  @IsNumber()
  adjustmentValue?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CalculateShippingDto {
  @IsString()
  zoneId: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsNumber()
  @Min(0)
  orderTotal: number;
}