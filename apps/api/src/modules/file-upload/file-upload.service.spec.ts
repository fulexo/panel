import { Test, TestingModule } from '@nestjs/testing';
import { FileUploadService } from './file-upload.service';
import { PrismaService } from '../../prisma.service';
import { EnvService } from '../../config/env.service';
import { BadRequestException } from '@nestjs/common';

describe('FileUploadService', () => {
  let service: FileUploadService;
  let prismaService: PrismaService;
  let envService: EnvService;

  const mockPrismaService = {
    fileUpload: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockEnvService = {
    s3Endpoint: 'https://minio.example.com',
    s3Bucket: 'test-bucket',
    s3AccessKey: 'test-access-key',
    s3SecretKey: 'test-secret-key',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileUploadService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EnvService,
          useValue: mockEnvService,
        },
      ],
    }).compile();

    service = module.get<FileUploadService>(FileUploadService);
    prismaService = module.get<PrismaService>(PrismaService);
    envService = module.get<EnvService>(EnvService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generatePresignedUploadUrl', () => {
    it('should generate presigned URL for valid file', async () => {
      const tenantId = 'test-tenant';
      const filename = 'test.jpg';
      const mimeType = 'image/jpeg';
      const maxSizeBytes = 1024 * 1024; // 1MB

      mockPrismaService.fileUpload.create.mockResolvedValue({
        id: 'file-id',
        tenantId,
        filename: 'test.jpg',
        originalName: filename,
        mimeType,
        size: 0,
        key: 'uploads/test-tenant/uuid-test.jpg',
        status: 'PENDING',
        maxSize: maxSizeBytes,
      });

      const result = await service.generatePresignedUploadUrl(
        tenantId,
        filename,
        mimeType,
        maxSizeBytes
      );

      expect(result).toHaveProperty('uploadUrl');
      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('expiresIn');
      expect(mockPrismaService.fileUpload.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          filename: 'test.jpg',
          originalName: filename,
          mimeType,
          maxSize: maxSizeBytes,
        }),
      });
    });

    it('should throw error for invalid file type', async () => {
      const tenantId = 'test-tenant';
      const filename = 'test.exe';
      const mimeType = 'application/x-executable';

      await expect(
        service.generatePresignedUploadUrl(tenantId, filename, mimeType)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmUpload', () => {
    it('should confirm upload for valid file', async () => {
      const tenantId = 'test-tenant';
      const key = 'uploads/test-tenant/uuid-test.jpg';
      const actualSize = 1024;

      const mockFileRecord = {
        id: 'file-id',
        tenantId,
        key,
        status: 'PENDING',
        maxSize: 1024 * 1024,
      };

      mockPrismaService.fileUpload.findFirst.mockResolvedValue(mockFileRecord);
      mockPrismaService.fileUpload.update.mockResolvedValue({
        ...mockFileRecord,
        size: actualSize,
        status: 'COMPLETED',
        uploadedAt: new Date(),
      });

      const result = await service.confirmUpload(tenantId, key, actualSize);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('url');
      expect(mockPrismaService.fileUpload.update).toHaveBeenCalled();
    });

    it('should throw error for file size exceeding limit', async () => {
      const tenantId = 'test-tenant';
      const key = 'uploads/test-tenant/uuid-test.jpg';
      const actualSize = 2 * 1024 * 1024; // 2MB

      const mockFileRecord = {
        id: 'file-id',
        tenantId,
        key,
        status: 'PENDING',
        maxSize: 1024 * 1024, // 1MB limit
      };

      mockPrismaService.fileUpload.findFirst.mockResolvedValue(mockFileRecord);

      await expect(
        service.confirmUpload(tenantId, key, actualSize)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listFiles', () => {
    it('should list files for tenant', async () => {
      const tenantId = 'test-tenant';
      const page = 1;
      const limit = 10;

      const mockFiles = [
        {
          id: 'file-1',
          filename: 'test1.jpg',
          originalName: 'test1.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          key: 'uploads/test-tenant/uuid-test1.jpg',
          uploadedAt: new Date(),
        },
      ];

      mockPrismaService.fileUpload.findMany.mockResolvedValue(mockFiles);
      mockPrismaService.fileUpload.count.mockResolvedValue(1);

      const result = await service.listFiles(tenantId, page, limit);

      expect(result).toHaveProperty('files');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result.files).toHaveLength(1);
    });
  });
});