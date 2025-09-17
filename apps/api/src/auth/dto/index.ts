import { IsEmail, IsString, MinLength, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  @MinLength(6)
  password!: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty()
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ enum: ['ADMIN', 'CUSTOMER'] })
  @IsOptional()
  @IsEnum(['ADMIN', 'CUSTOMER'])
  role?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class Enable2FADto {
  @ApiProperty()
  @IsString()
  @MinLength(6)
  password!: string;
}

export class Verify2FADto {
  @ApiProperty({ example: '123456' })
  @IsString()
  token!: string;
}