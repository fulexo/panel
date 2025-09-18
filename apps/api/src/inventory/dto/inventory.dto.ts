import { IsString, IsOptional, IsUUID, IsEnum, IsObject, IsNumber } from 'class-validator';

export class CreateInventoryApprovalDto {
  @IsUUID()
  storeId: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsEnum(['stock_update', 'price_update', 'status_update'])
  changeType: string;

  @IsObject()
  newValue: any;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateInventoryApprovalDto {
  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected'])
  status?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class InventoryApprovalResponseDto {
  id: string;
  storeId: string;
  productId?: string;
  changeType: string;
  oldValue?: any;
  newValue: any;
  requestedBy: string;
  status: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
  store: {
    id: string;
    name: string;
    customer?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  };
  product?: {
    id: string;
    name: string;
    sku: string;
  };
}

export class StockUpdateRequestDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  newQuantity: number;

  @IsOptional()
  @IsString()
  reason?: string;
}