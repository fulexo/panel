import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';

export class CreateChargeDto {
  @IsString()
  chargeId!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(['card', 'bank_transfer', 'cash', 'other'])
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  externalId?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}