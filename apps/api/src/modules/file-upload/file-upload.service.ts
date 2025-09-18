import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { EnvService } from '../../config/env.service';
import { PrismaService } from '../../prisma.service';
import * as crypto from 'crypto';
import * as path from 'path';

export interface FileUploadResult {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  key: string;
  uploadedAt: Date;
}

export interface PresignedUploadUrl {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private s3Client: S3Client;

  constructor(
    private envService: EnvService,
    private prisma: PrismaService,
  ) {
    this.s3Client = new S3Client({
      endpoint: this.envService.s3Endpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId: this.envService.s3AccessKey,
        secretAccessKey: this.envService.s3SecretKey,
      },
      forcePathStyle: true, // Required for MinIO
    });
  }

  async generatePresignedUploadUrl(
    tenantId: string,
    filename: string,
    mimeType: string,
    maxSizeBytes: number = 10 * 1024 * 1024, // 10MB default
    expiresIn: number = 3600, // 1 hour
  ): Promise<PresignedUploadUrl> {
    try {
      // Validate file type
      const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];

      if (!allowedMimeTypes.includes(mimeType)) {
        throw new BadRequestException(`File type ${mimeType} is not allowed`);
      }

      // Generate unique key
      const fileExtension = path.extname(filename);
      const baseName = path.basename(filename, fileExtension);
      const uniqueId = crypto.randomUUID();
      const key = `uploads/${tenantId}/${uniqueId}-${baseName}${fileExtension}`;

      // Create presigned URL
      const command = new PutObjectCommand({
        Bucket: this.envService.s3Bucket,
        Key: key,
        ContentType: mimeType,
        ContentLength: maxSizeBytes,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

      // Store file metadata in database
      const fileRecord = await this.prisma.fileUpload.create({
        data: {
          tenantId,
          filename: `${baseName}${fileExtension}`,
          originalName: filename,
          mimeType,
          size: 0, // Will be updated after upload
          key,
          status: 'PENDING',
          maxSize: maxSizeBytes,
        },
      });

      this.logger.log(`Generated presigned URL for file: ${filename}`);

      return {
        uploadUrl,
        key,
        expiresIn,
      };
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async confirmUpload(
    tenantId: string,
    key: string,
    actualSize: number,
  ): Promise<FileUploadResult> {
    try {
      // Get file record
      const fileRecord = await this.prisma.fileUpload.findFirst({
        where: {
          tenantId,
          key,
          status: 'PENDING',
        },
      });

      if (!fileRecord) {
        throw new BadRequestException('File upload not found or already processed');
      }

      // Check size limit
      if (actualSize > fileRecord.maxSize) {
        // Delete from S3
        await this.deleteFile(tenantId, key);
        throw new BadRequestException(`File size ${actualSize} exceeds limit ${fileRecord.maxSize}`);
      }

      // Update file record
      const updatedFile = await this.prisma.fileUpload.update({
        where: { id: fileRecord.id },
        data: {
          size: actualSize,
          status: 'COMPLETED',
          uploadedAt: new Date(),
        },
      });

      const url = `${this.envService.s3Endpoint}/${this.envService.s3Bucket}/${key}`;

      this.logger.log(`File upload confirmed: ${fileRecord.filename}`);

      return {
        id: updatedFile.id,
        filename: updatedFile.filename,
        originalName: updatedFile.originalName,
        mimeType: updatedFile.mimeType,
        size: updatedFile.size,
        url,
        key: updatedFile.key,
        uploadedAt: updatedFile.uploadedAt!,
      };
    } catch (error) {
      this.logger.error(`Failed to confirm upload: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async deleteFile(tenantId: string, key: string): Promise<void> {
    try {
      // Delete from S3
      const command = new DeleteObjectCommand({
        Bucket: this.envService.s3Bucket,
        Key: key,
      });

      await this.s3Client.send(command);

      // Update database record
      await this.prisma.fileUpload.updateMany({
        where: {
          tenantId,
          key,
        },
        data: {
          status: 'DELETED',
          deletedAt: new Date(),
        },
      });

      this.logger.log(`File deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async getFile(tenantId: string, fileId: string): Promise<FileUploadResult | null> {
    try {
      const fileRecord = await this.prisma.fileUpload.findFirst({
        where: {
          id: fileId,
          tenantId,
          status: 'COMPLETED',
        },
      });

      if (!fileRecord) {
        return null;
      }

      const url = `${this.envService.s3Endpoint}/${this.envService.s3Bucket}/${fileRecord.key}`;

      return {
        id: fileRecord.id,
        filename: fileRecord.filename,
        originalName: fileRecord.originalName,
        mimeType: fileRecord.mimeType,
        size: fileRecord.size,
        url,
        key: fileRecord.key,
        uploadedAt: fileRecord.uploadedAt!,
      };
    } catch (error) {
      this.logger.error(`Failed to get file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async generatePresignedDownloadUrl(
    tenantId: string,
    fileId: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const fileRecord = await this.prisma.fileUpload.findFirst({
        where: {
          id: fileId,
          tenantId,
          status: 'COMPLETED',
        },
      });

      if (!fileRecord) {
        throw new BadRequestException('File not found');
      }

      const command = new GetObjectCommand({
        Bucket: this.envService.s3Bucket,
        Key: fileRecord.key,
      });

      const downloadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

      return downloadUrl;
    } catch (error) {
      this.logger.error(`Failed to generate download URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async listFiles(
    tenantId: string,
    page: number = 1,
    limit: number = 50,
    search?: string,
  ): Promise<{ files: FileUploadResult[]; total: number; page: number; limit: number }> {
    try {
      const where: any = {
        tenantId,
        status: 'COMPLETED',
      };

      if (search) {
        where.OR = [
          { filename: { contains: search, mode: 'insensitive' } },
          { originalName: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [files, total] = await Promise.all([
        this.prisma.fileUpload.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { uploadedAt: 'desc' },
        }),
        this.prisma.fileUpload.count({ where }),
      ]);

      const fileResults: FileUploadResult[] = files.map(file => ({
        id: file.id,
        filename: file.filename,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        url: `${this.envService.s3Endpoint}/${this.envService.s3Bucket}/${file.key}`,
        key: file.key,
        uploadedAt: file.uploadedAt!,
      }));

      return {
        files: fileResults,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async cleanupExpiredFiles(): Promise<number> {
    try {
      const expiredFiles = await this.prisma.fileUpload.findMany({
        where: {
          status: 'PENDING',
          createdAt: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
          },
        },
      });

      let deletedCount = 0;

      for (const file of expiredFiles) {
        try {
          await this.deleteFile(file.tenantId, file.key);
          deletedCount++;
        } catch (error) {
          this.logger.error(`Failed to cleanup file ${file.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      this.logger.log(`Cleaned up ${deletedCount} expired files`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`Failed to cleanup expired files: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 0;
    }
  }
}