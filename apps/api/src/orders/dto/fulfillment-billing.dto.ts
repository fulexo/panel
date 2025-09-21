import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, Min, IsDateString } from 'class-validator';

export enum FulfillmentInvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue'
}

export class CreateFulfillmentServiceDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  unit!: string; // "adet", "kg", "m3", "saat"

  @IsNumber()
  @Min(0)
  basePrice!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFulfillmentServiceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateFulfillmentBillingItemDto {
  @IsString()
  orderId!: string;

  @IsString()
  serviceId!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number; // If not provided, uses service base price

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  serviceDate?: string; // If not provided, uses current date
}

export class UpdateFulfillmentBillingItemDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  serviceDate?: string;
}

export class CreateFulfillmentInvoiceDto {
  @IsString()
  customerId: string;

  @IsNumber()
  @Min(1)
  @Min(12)
  month: number;

  @IsNumber()
  @Min(2020)
  year: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string; // If not provided, uses month end + 30 days
}

export class UpdateFulfillmentInvoiceDto {
  @IsOptional()
  @IsEnum(FulfillmentInvoiceStatus)
  status?: FulfillmentInvoiceStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;
}

export class FulfillmentBillingQueryDto {
  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsBoolean()
  isBilled?: boolean;

  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class FulfillmentInvoiceQueryDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsEnum(FulfillmentInvoiceStatus)
  status?: FulfillmentInvoiceStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Min(12)
  month?: number;

  @IsOptional()
  @IsNumber()
  @Min(2020)
  year?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class GenerateMonthlyInvoiceDto {
  @IsString()
  customerId: string;

  @IsNumber()
  @Min(1)
  @Min(12)
  month: number;

  @IsNumber()
  @Min(2020)
  year: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}