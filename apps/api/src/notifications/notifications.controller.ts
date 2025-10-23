import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('api/notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  create(@Request() req, @Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(
      req.user.tenantId,
      createNotificationDto,
    );
  }

  @Get()
  findAll(
    @Request() req,
    @Query('type') type?: string,
    @Query('priority') priority?: string,
    @Query('read') read?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters = {
      type,
      priority,
      read: read !== undefined ? read === 'true' : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    // Admin can see all, customers see only their own
    const userId = req.user.role === 'ADMIN' ? undefined : req.user.id;

    return this.notificationsService.findAll(
      req.user.tenantId,
      userId,
      filters,
    );
  }

  @Get('stats')
  getStats(@Request() req) {
    const userId = req.user.role === 'ADMIN' ? undefined : req.user.id;
    return this.notificationsService.getStats(req.user.tenantId, userId);
  }

  @Get('unread-count')
  getUnreadCount(@Request() req) {
    const userId = req.user.role === 'ADMIN' ? undefined : req.user.id;
    return this.notificationsService.getUnreadCount(req.user.tenantId, userId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.notificationsService.findOne(req.user.tenantId, id);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationsService.update(
      req.user.tenantId,
      id,
      updateNotificationDto,
    );
  }

  @Patch(':id/read')
  markAsRead(@Request() req, @Param('id') id: string) {
    return this.notificationsService.markAsRead(req.user.tenantId, id);
  }

  @Post('mark-all-read')
  markAllAsRead(@Request() req) {
    const userId = req.user.role === 'ADMIN' ? undefined : req.user.id;
    return this.notificationsService.markAllAsRead(req.user.tenantId, userId);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.notificationsService.remove(req.user.tenantId, id);
  }
}
