import { Test, TestingModule } from '@nestjs/testing';
import { FileUploadService } from '../../../apps/api/src/modules/file-upload/file-upload.service';
import { PrismaService } from '../../../apps/api/src/prisma.service';
import { EnvService } from '../../../apps/api/src/config/env.service';
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

  afterEach(() => {
    jest.clearAllMocks();
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

    it('should throw error for file size exceeding limit', async () => {
      const tenantId = 'test-tenant';
      const filename = 'test.jpg';
      const mimeType = 'image/jpeg';
      const maxSizeBytes = 100 * 1024 * 1024; // 100MB - too large

      await expect(
        service.generatePresignedUploadUrl(tenantId, filename, mimeType, maxSizeBytes)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle database errors', async () => {
      const tenantId = 'test-tenant';
      const filename = 'test.jpg';
      const mimeType = 'image/jpeg';

      mockPrismaService.fileUpload.create.mockRejectedValue(new Error('Database error'));

      await expect(
        service.generatePresignedUploadUrl(tenantId, filename, mimeType)
      ).rejects.toThrow('Database error');
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

    it('should throw error for file not found', async () => {
      const tenantId = 'test-tenant';
      const key = 'uploads/test-tenant/non-existent.jpg';
      const actualSize = 1024;

      mockPrismaService.fileUpload.findFirst.mockResolvedValue(null);

      await expect(
        service.confirmUpload(tenantId, key, actualSize)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for already completed file', async () => {
      const tenantId = 'test-tenant';
      const key = 'uploads/test-tenant/uuid-test.jpg';
      const actualSize = 1024;

      const mockFileRecord = {
        id: 'file-id',
        tenantId,
        key,
        status: 'COMPLETED',
        maxSize: 1024 * 1024,
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

    it('should handle pagination correctly', async () => {
      const tenantId = 'test-tenant';
      const page = 2;
      const limit = 5;

      mockPrismaService.fileUpload.findMany.mockResolvedValue([]);
      mockPrismaService.fileUpload.count.mockResolvedValue(0);

      const result = await service.listFiles(tenantId, page, limit);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(mockPrismaService.fileUpload.findMany).toHaveBeenCalledWith({
        where: { tenantId },
        skip: 5, // (page - 1) * limit
        take: limit,
        orderBy: { uploadedAt: 'desc' },
      });
    });

    it('should filter files by status', async () => {
      const tenantId = 'test-tenant';
      const page = 1;
      const limit = 10;
      const status = 'COMPLETED';

      mockPrismaService.fileUpload.findMany.mockResolvedValue([]);
      mockPrismaService.fileUpload.count.mockResolvedValue(0);

      await service.listFiles(tenantId, page, limit, status);

      expect(mockPrismaService.fileUpload.findMany).toHaveBeenCalledWith({
        where: { tenantId, status },
        skip: 0,
        take: limit,
        orderBy: { uploadedAt: 'desc' },
      });
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const tenantId = 'test-tenant';
      const fileId = 'file-123';

      mockPrismaService.fileUpload.findFirst.mockResolvedValue({
        id: fileId,
        tenantId,
        key: 'uploads/test-tenant/file.jpg',
        status: 'COMPLETED',
      });
      mockPrismaService.fileUpload.update.mockResolvedValue({
        id: fileId,
        status: 'DELETED',
        deletedAt: new Date(),
      });

      const result = await service.deleteFile(tenantId, fileId);

      expect(result).toBe(true);
      expect(mockPrismaService.fileUpload.update).toHaveBeenCalledWith({
        where: { id: fileId, tenantId },
        data: { status: 'DELETED', deletedAt: expect.any(Date) },
      });
    });

    it('should throw error for file not found', async () => {
      const tenantId = 'test-tenant';
      const fileId = 'non-existent';

      mockPrismaService.fileUpload.findFirst.mockResolvedValue(null);

      await expect(service.deleteFile(tenantId, fileId)).rejects.toThrow(BadRequestException);
    });

    it('should throw error for file not owned by tenant', async () => {
      const tenantId = 'test-tenant';
      const fileId = 'file-123';

      mockPrismaService.fileUpload.findFirst.mockResolvedValue({
        id: fileId,
        tenantId: 'other-tenant',
        key: 'uploads/other-tenant/file.jpg',
        status: 'COMPLETED',
      });

      await expect(service.deleteFile(tenantId, fileId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getFileUrl', () => {
    it('should return file URL for completed file', async () => {
      const tenantId = 'test-tenant';
      const fileId = 'file-123';

      const mockFile = {
        id: fileId,
        tenantId,
        key: 'uploads/test-tenant/file.jpg',
        status: 'COMPLETED',
        filename: 'file.jpg',
        mimeType: 'image/jpeg',
      };

      mockPrismaService.fileUpload.findFirst.mockResolvedValue(mockFile);

      const result = await service.getFileUrl(tenantId, fileId);

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('mimeType');
    });

    it('should throw error for file not found', async () => {
      const tenantId = 'test-tenant';
      const fileId = 'non-existent';

      mockPrismaService.fileUpload.findFirst.mockResolvedValue(null);

      await expect(service.getFileUrl(tenantId, fileId)).rejects.toThrow(BadRequestException);
    });

    it('should throw error for incomplete file', async () => {
      const tenantId = 'test-tenant';
      const fileId = 'file-123';

      const mockFile = {
        id: fileId,
        tenantId,
        key: 'uploads/test-tenant/file.jpg',
        status: 'PENDING',
        filename: 'file.jpg',
        mimeType: 'image/jpeg',
      };

      mockPrismaService.fileUpload.findFirst.mockResolvedValue(mockFile);

      await expect(service.getFileUrl(tenantId, fileId)).rejects.toThrow(BadRequestException);
    });
  });
});