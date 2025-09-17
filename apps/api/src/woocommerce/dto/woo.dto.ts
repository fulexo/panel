import { IsString, IsOptional, IsBoolean, IsUrl } from 'class-validator';

export class AddStoreDto {
  @IsString()
  name!: string;

  @IsUrl()
  url!: string;

  @IsString()
  consumerKey!: string;

  @IsString()
  consumerSecret!: string;

  @IsString()
  @IsOptional()
  baseUrl?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsString()
  @IsOptional()
  description?: string;
}