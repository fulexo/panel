import { Controller, Get, Post, Put, Delete, Body, Param, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CalendarService } from './calendar.service';

@ApiTags('calendar')
@ApiBearerAuth()
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  // Events
  @Get('events')
  @ApiOperation({ summary: 'List calendar events (public for tenant)' })
  async listEvents(@CurrentUser() user: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.calendar.listEvents(user.tenantId, from, to);
  }

  @Get('ics')
  @ApiOperation({ summary: 'ICS feed for tenant events' })
  async ics(@CurrentUser() user: any, @Res() res: any) {
    const ics = await this.calendar.generateIcs(user.tenantId);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.send(ics);
  }

  @Post('events')
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
  @ApiOperation({ summary: 'Create calendar event (admin)' })
  async createEvent(@CurrentUser() user: any, @Body() dto: any) {
    return this.calendar.createEvent(user.tenantId, dto);
  }

  @Put('events/:id')
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
  @ApiOperation({ summary: 'Update calendar event (admin)' })
  async updateEvent(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.calendar.updateEvent(user.tenantId, id, dto);
  }

  @Delete('events/:id')
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
  @ApiOperation({ summary: 'Delete calendar event (admin)' })
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
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
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
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
  @ApiOperation({ summary: 'Add holiday (admin)' })
  async addHoliday(@CurrentUser() user: any, @Body() dto: any) {
    return this.calendar.addHoliday(user.tenantId, dto);
  }

  @Delete('holidays/:id')
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
  @ApiOperation({ summary: 'Remove holiday (admin)' })
  async removeHoliday(@CurrentUser() user: any, @Param('id') id: string) {
    return this.calendar.removeHoliday(user.tenantId, id);
  }

  // OAuth credential storage (Google Calendar)
  @Post('oauth/google')
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
  @ApiOperation({ summary: 'Save Google Calendar OAuth credentials (encrypted)' })
  async saveGoogleOAuth(@CurrentUser() user: any, @Body() dto: { credentialsJson: any }) {
    return this.calendar.saveOAuth(user.tenantId, 'google_calendar', dto.credentialsJson);
  }
}

