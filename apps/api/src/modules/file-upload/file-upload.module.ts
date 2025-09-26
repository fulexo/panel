import { Module } from '@nestjs/common';
import { FileUploadService } from './file-upload.service';
import { FileUploadController } from './file-upload.controller';
import { PrismaService } from '../../prisma.service';
import { EnvService } from '../../config/env.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [FileUploadService, PrismaService, EnvService],
  controllers: [FileUploadController],
  exports: [FileUploadService],
})
export class FileUploadModule {}