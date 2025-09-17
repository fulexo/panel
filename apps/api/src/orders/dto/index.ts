import { IsString, IsNumber, IsOptional, IsArray, IsDateString, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty()
  @IsString()
  sku!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsNumber()
  qty!: number;

  @ApiProperty()
  @IsNumber()
  price!: number;
}

export class CreateOrderDto {
  

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalOrderNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderSource?: string;

  @ApiProperty()
  @IsString()
  status!: string;

  @ApiProperty()
  @IsNumber()
  total!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  shippingAddress?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  billingAddress?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  confirmedAt?: string;

  @ApiPropertyOptional({ type: [OrderItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];
}

export class UpdateOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  shippingAddress?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  billingAddress?: any;
}

export class OrderQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderSource?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storeId?: string;
}

export class CreateChargeDto {
  @ApiProperty()
  @IsString()
  type!: string;

  @ApiProperty()
  @IsNumber()
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}