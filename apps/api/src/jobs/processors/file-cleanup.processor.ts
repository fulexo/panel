import { Worker, Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { FileUploadService } from '../../modules/file-upload/file-upload.service';
import { EnvService } from '../../config/env.service';
import Redis from 'ioredis';

export interface FileCleanupJobData {
  tenantId?: string; // If not provided, cleanup all tenants
  olderThanHours?: number; // Default 24 hours
}

export class FileCleanupProcessor {
  private readonly logger = new Logger(FileCleanupProcessor.name);

  constructor(
    private prisma: PrismaService,
    private fileUploadService: FileUploadService,
  ) {}

  async processFileCleanup(job: Job<FileCleanupJobData>) {
    const { tenantId, olderThanHours = 24 } = job.data;
    
    try {
      this.logger.log(`Starting file cleanup${tenantId ? ` for tenant ${tenantId}` : ' for all tenants'}`);

      let deletedCount = 0;

      if (tenantId) {
        // Cleanup specific tenant
        deletedCount = await this.cleanupTenantFiles(tenantId, olderThanHours);
      } else {
        // Cleanup all tenants
        const tenants = await this.prisma.tenant.findMany({
          select: { id: true },
        });

        for (const tenant of tenants) {
          const count = await this.cleanupTenantFiles(tenant.id, olderThanHours);
          deletedCount += count;
        }
      }

      this.logger.log(`File cleanup completed: ${deletedCount} files deleted`);
      
      return { success: true, deletedCount };
    } catch (error) {
      this.logger.error(`File cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async processOrphanedFileCleanup() {
    try {
      this.logger.log('Starting orphaned file cleanup');

      // Find files that are not referenced by any entity
      const orphanedFiles = await this.prisma.fileUpload.findMany({
        where: {
          status: 'COMPLETED',
          createdAt: {
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          },
        },
        select: {
          id: true,
          tenantId: true,
          key: true,
        },
      });

      let deletedCount = 0;

      for (const file of orphanedFiles) {
        try {
          await this.fileUploadService.deleteFile(file.tenantId, file.key);
          deletedCount++;
        } catch (error) {
          this.logger.error(`Failed to delete orphaned file ${file.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      this.logger.log(`Orphaned file cleanup completed: ${deletedCount} files deleted`);
      
      return { success: true, deletedCount };
    } catch (error) {
      this.logger.error(`Orphaned file cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private async cleanupTenantFiles(tenantId: string, olderThanHours: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    const expiredFiles = await this.prisma.fileUpload.findMany({
      where: {
        tenantId,
        status: 'PENDING',
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    let deletedCount = 0;

    for (const file of expiredFiles) {
      try {
        await this.fileUploadService.deleteFile(tenantId, file.key);
        deletedCount++;
      } catch (error) {
        this.logger.error(`Failed to cleanup file ${file.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return deletedCount;
  }
}

export function createFileCleanupWorker(redis: Redis): Worker {
  return new Worker('file-cleanup', async (job) => {
    const processor = new FileCleanupProcessor(
      new PrismaService(),
      new FileUploadService(new EnvService(), new PrismaService())
    );

    switch (job.name) {
      case 'cleanup-expired-files':
        return processor.processFileCleanup(job);
      case 'cleanup-orphaned-files':
        return processor.processOrphanedFileCleanup();
      default:
        throw new Error(`Unknown file cleanup job type: ${job.name}`);
    }
  }, {
    connection: redis,
    concurrency: 3,
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 25 },
  });
}