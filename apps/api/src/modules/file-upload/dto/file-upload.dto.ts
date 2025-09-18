import { IsString, IsNumber, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateUploadUrlDto {
  @ApiProperty({ description: 'Original filename' })
  @IsString()
  filename: string;

  @ApiProperty({ description: 'MIME type of the file' })
  @IsString()
  mimeType: string;

  @ApiProperty({ description: 'Maximum file size in bytes', required: false })
  @IsOptional()
  @IsInt()
  @Min(1024) // 1KB minimum
  @Max(100 * 1024 * 1024) // 100MB maximum
  maxSizeBytes?: number;

  @ApiProperty({ description: 'URL expiration time in seconds', required: false })
  @IsOptional()
  @IsInt()
  @Min(60) // 1 minute minimum
  @Max(3600) // 1 hour maximum
  expiresIn?: number;
}

export class ConfirmUploadDto {
  @ApiProperty({ description: 'S3/MinIO object key' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Actual file size in bytes' })
  @IsNumber()
  actualSize: number;
}

export class FileUploadResponseDto {
  @ApiProperty({ description: 'File ID' })
  id: string;

  @ApiProperty({ description: 'Stored filename' })
  filename: string;

  @ApiProperty({ description: 'Original filename' })
  originalName: string;

  @ApiProperty({ description: 'MIME type' })
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes' })
  size: number;

  @ApiProperty({ description: 'Public URL' })
  url: string;

  @ApiProperty({ description: 'S3/MinIO object key' })
  key: string;

  @ApiProperty({ description: 'Upload timestamp' })
  uploadedAt: Date;
}

export class PresignedUploadUrlDto {
  @ApiProperty({ description: 'Presigned upload URL' })
  uploadUrl: string;

  @ApiProperty({ description: 'S3/MinIO object key' })
  key: string;

  @ApiProperty({ description: 'URL expiration time in seconds' })
  expiresIn: number;
}

export class FileListResponseDto {
  @ApiProperty({ description: 'List of files', type: [FileUploadResponseDto] })
  files: FileUploadResponseDto[];

  @ApiProperty({ description: 'Total number of files' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;
}

export class FileDownloadUrlDto {
  @ApiProperty({ description: 'Presigned download URL' })
  downloadUrl: string;
}