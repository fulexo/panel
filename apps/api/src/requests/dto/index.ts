import { IsString, IsOptional, IsIn, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRequestDto {
  @ApiProperty({ enum: ['STOCK_ADJUSTMENT', 'NEW_PRODUCT', 'ORDER_NOTE', 'DOCUMENT_UPLOAD', 'OTHER'] })
  @IsString()
  @IsIn(['STOCK_ADJUSTMENT', 'NEW_PRODUCT', 'ORDER_NOTE', 'DOCUMENT_UPLOAD', 'OTHER'])
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priority?: 'low' | 'normal' | 'high' | 'critical';

  @ApiProperty()
  @IsObject()
  payload: any;
}

export class RejectRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AddCommentDto {
  @ApiProperty()
  @IsString()
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  isInternal?: boolean;
}