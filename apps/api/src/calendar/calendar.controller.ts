import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CalendarService } from './calendar.service';

@ApiTags('calendar')
@ApiBearerAuth()
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  // Events - Simplified (only for internal use)
  @Get('events')
  @ApiOperation({ summary: 'List calendar events (internal use)' })
  async listEvents(@CurrentUser() user: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.calendar.listEvents(user.tenantId, from, to);
  }

  @Post('events')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create calendar event (admin only)' })
  async createEvent(@CurrentUser() user: any, @Body() dto: any) {
    return this.calendar.createEvent(user.tenantId, dto);
  }

  @Put('events/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update calendar event (admin only)' })
  async updateEvent(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.calendar.updateEvent(user.tenantId, id, dto);
  }

  @Delete('events/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete calendar event (admin only)' })
  async deleteEvent(@CurrentUser() user: any, @Param('id') id: string) {
    return this.calendar.deleteEvent(user.tenantId, id);
  }

  // Business hours
  @Get('business-hours')
  @ApiOperation({ summary: 'Get business hours' })
  async getBusinessHours(@CurrentUser() user: any) {
    return this.calendar.getBusinessHours(user.tenantId);
  }

  @Post('business-hours')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Set business hours (admin)' })
  async setBusinessHours(@CurrentUser() user: any, @Body() dto: any) {
    return this.calendar.setBusinessHours(user.tenantId, dto);
  }

  // Holidays
  @Get('holidays')
  @ApiOperation({ summary: 'List holidays' })
  async listHolidays(@CurrentUser() user: any) {
    return this.calendar.listHolidays(user.tenantId);
  }

  @Post('holidays')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Add holiday (admin)' })
  async addHoliday(@CurrentUser() user: any, @Body() dto: any) {
    return this.calendar.addHoliday(user.tenantId, dto);
  }

  @Delete('holidays/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remove holiday (admin)' })
  async removeHoliday(@CurrentUser() user: any, @Param('id') id: string) {
    return this.calendar.removeHoliday(user.tenantId, id);
  }

  // OAuth credential storage (removed - not needed for simple calendar)
}

