import { IsEmail, IsString, MinLength, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty()
  @IsUUID()
  tenantId: string;

  @ApiProperty({ enum: ['FULEXO_ADMIN', 'FULEXO_STAFF', 'CUSTOMER_ADMIN', 'CUSTOMER_USER'] })
  @IsOptional()
  @IsEnum(['FULEXO_ADMIN', 'FULEXO_STAFF', 'CUSTOMER_ADMIN', 'CUSTOMER_USER'])
  role?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class Enable2FADto {
  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;
}

export class Verify2FADto {
  @ApiProperty({ example: '123456' })
  @IsString()
  token: string;
}