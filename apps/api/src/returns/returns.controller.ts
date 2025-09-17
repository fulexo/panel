import { Controller, Get, Param, Query, Post, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReturnsService } from './returns.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/user.types';

@ApiTags('returns')
@ApiBearerAuth()
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  @ApiOperation({ summary: 'List returns' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(@CurrentUser() user: AuthenticatedUser, @Query('page') page = 1, @Query('limit') limit = 50) {
    return this.returnsService.list(user.tenantId, Number(page), Number(limit));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get return by ID' })
  async get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.returnsService.get(user.tenantId, id);
  }

  @Post(':id/photos')
  @ApiOperation({ summary: 'Add photo to return' })
  async addPhoto(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: { fileUrl: string; note?: string }) {
    return this.returnsService.addPhoto(user.tenantId, id, dto.fileUrl, dto.note);
  }

  @Post(':id/notify')
  @ApiOperation({ summary: 'Send customer notification about return' })
  async notify(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: { channel: string; subject?: string; message?: string }) {
    return this.returnsService.notify(user.tenantId, id, dto.channel, dto.subject, dto.message);
  }
}