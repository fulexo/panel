import { Controller, Post, Get, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FileUploadService } from './file-upload.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthGuard } from '../../auth/auth.guard';
import { RateLimit } from '../../rate-limit.decorator';
import { 
  GenerateUploadUrlDto, 
  ConfirmUploadDto, 
  FileUploadResponseDto, 
  PresignedUploadUrlDto,
  FileListResponseDto,
  FileDownloadUrlDto 
} from './dto/file-upload.dto';

@ApiTags('file-upload')
@ApiBearerAuth()
@Controller('file-upload')
@UseGuards(AuthGuard)
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post('generate-upload-url')
  @ApiOperation({ summary: 'Generate presigned URL for file upload' })
  @RateLimit({ points: 10, duration: 60_000, scope: 'user' })
  async generateUploadUrl(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body() dto: GenerateUploadUrlDto,
  ): Promise<PresignedUploadUrlDto> {
    return this.fileUploadService.generatePresignedUploadUrl(
      user.tenantId,
      dto.filename,
      dto.mimeType,
      dto.maxSizeBytes,
      dto.expiresIn,
    );
  }

  @Post('confirm-upload')
  @ApiOperation({ summary: 'Confirm file upload completion' })
  @RateLimit({ points: 20, duration: 60_000, scope: 'user' })
  async confirmUpload(
    @CurrentUser() user: { id: string; tenantId: string },
    @Body() dto: ConfirmUploadDto,
  ): Promise<FileUploadResponseDto> {
    return this.fileUploadService.confirmUpload(
      user.tenantId,
      dto.key,
      dto.actualSize,
    );
  }

  @Get('files')
  @ApiOperation({ summary: 'List uploaded files' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async listFiles(
    @CurrentUser() user: { id: string; tenantId: string },
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('search') search?: string,
  ): Promise<FileListResponseDto> {
    return this.fileUploadService.listFiles(
      user.tenantId,
      page,
      limit,
      search,
    );
  }

  @Get('files/:id')
  @ApiOperation({ summary: 'Get file details' })
  async getFile(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') id: string,
  ): Promise<FileUploadResponseDto | null> {
    return this.fileUploadService.getFile(user.tenantId, id);
  }

  @Get('files/:id/download-url')
  @ApiOperation({ summary: 'Generate presigned download URL' })
  @ApiQuery({ name: 'expiresIn', required: false, type: Number })
  async generateDownloadUrl(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') id: string,
    @Query('expiresIn') expiresIn: number = 3600,
  ): Promise<FileDownloadUrlDto> {
    const downloadUrl = await this.fileUploadService.generatePresignedDownloadUrl(
      user.tenantId,
      id,
      expiresIn,
    );
    return { downloadUrl };
  }

  @Delete('files/:id')
  @ApiOperation({ summary: 'Delete file' })
  @RateLimit({ points: 5, duration: 60_000, scope: 'user' })
  async deleteFile(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    const file = await this.fileUploadService.getFile(user.tenantId, id);
    if (!file) {
      throw new Error('File not found');
    }

    await this.fileUploadService.deleteFile(user.tenantId, file.key);
    return { message: 'File deleted successfully' };
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Cleanup expired files (admin only)' })
  @RateLimit({ points: 1, duration: 60_000, scope: 'user' })
  async cleanupExpiredFiles(): Promise<{ deletedCount: number }> {
    const deletedCount = await this.fileUploadService.cleanupExpiredFiles();
    return { deletedCount };
  }
}