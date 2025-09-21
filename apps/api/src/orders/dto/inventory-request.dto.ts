import { IsString, IsOptional, IsNumber, IsEnum, IsObject, Min } from 'class-validator';

export enum InventoryRequestType {
  STOCK_ADJUSTMENT = 'stock_adjustment',
  NEW_PRODUCT = 'new_product',
  PRODUCT_UPDATE = 'product_update'
}

export enum InventoryRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export class CreateInventoryRequestDto {
  @IsString()
  storeId!: string;

  @IsEnum(InventoryRequestType)
  type!: InventoryRequestType;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  // For stock adjustments
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentStock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  requestedStock?: number;

  @IsOptional()
  @IsString()
  adjustmentReason?: string;

  // For new products
  @IsOptional()
  @IsObject()
  productData?: {
    name: string;
    sku?: string;
    price: number;
    regularPrice?: number;
    description?: string;
    shortDescription?: string;
    weight?: number;
    dimensions?: {
      length?: number;
      width?: number;
      height?: number;
    };
    images?: string[];
    categories?: string[];
    tags?: string[];
  };

  // For product updates
  @IsOptional()
  @IsObject()
  updateData?: Record<string, unknown>;
}

export class UpdateInventoryRequestDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentStock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  requestedStock?: number;

  @IsOptional()
  @IsString()
  adjustmentReason?: string;

  @IsOptional()
  @IsObject()
  productData?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  updateData?: Record<string, unknown>;
}

export class ReviewInventoryRequestDto {
  @IsEnum(InventoryRequestStatus)
  status!: InventoryRequestStatus;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class InventoryRequestQueryDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}