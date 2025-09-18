import { IsString, IsUrl, IsOptional, IsUUID } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  name!: string;

  @IsUrl()
  url!: string;

  @IsString()
  consumerKey!: string;

  @IsString()
  consumerSecret!: string;

  @IsUUID()
  customerId!: string;
}

export class UpdateStoreDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsString()
  consumerKey?: string;

  @IsOptional()
  @IsString()
  consumerSecret?: string;
}

export class StoreResponseDto {
  id!: string;
  name!: string;
  url!: string;
  status!: 'connected' | 'disconnected' | 'error';
  lastSyncAt!: Date | null;
  syncStatus!: 'success' | 'error' | 'pending' | null;
  lastError!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  customer!: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  _count!: {
    orders: number;
    products: number;
    customers: number;
  };
}

export class SyncResultDto {
  success!: boolean;
  message!: string;
  syncedItems!: {
    products: number;
    orders: number;
    customers: number;
  };
  errors!: string[];
}

export class ConnectionTestDto {
  success!: boolean;
  message!: string;
  error?: string;
}