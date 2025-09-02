import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  EmailSettingsDto,
  NotificationSettingsDto,
  GeneralSettingsDto,
  TestConnectionDto,
} from './dto/update-settings.dto';

@ApiTags('settings')
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all settings' })
  @Roles('admin', 'manager')
  async getSettings(@Req() req: any, @Query('category') category?: string) {
    return this.settingsService.getSettings(req.user.tenantId, category);
  }

  @Get('email')
  @ApiOperation({ summary: 'Get email settings' })
  @Roles('admin', 'manager')
  async getEmailSettings(@Req() req: any) {
    return this.settingsService.getSettingsByCategory(req.user.tenantId, 'email');
  }

  @Put('email')
  @ApiOperation({ summary: 'Update email settings' })
  @Roles('admin')
  async updateEmailSettings(
    @Req() req: any,
    @Body() dto: EmailSettingsDto
  ) {
    await this.settingsService.updateSettings(
      req.user.tenantId,
      'email',
      dto,
      req.user.id
    );
    return { message: 'Email settings updated successfully' };
  }

  

  @Get('notification')
  @ApiOperation({ summary: 'Get notification settings' })
  @Roles('admin', 'manager')
  async getNotificationSettings(@Req() req: any) {
    return this.settingsService.getSettingsByCategory(req.user.tenantId, 'notification');
  }

  @Put('notification')
  @ApiOperation({ summary: 'Update notification settings' })
  @Roles('admin')
  async updateNotificationSettings(
    @Req() req: any,
    @Body() dto: NotificationSettingsDto
  ) {
    await this.settingsService.updateSettings(
      req.user.tenantId,
      'notification',
      dto,
      req.user.id
    );
    return { message: 'Notification settings updated successfully' };
  }

  @Get('general')
  @ApiOperation({ summary: 'Get general settings' })
  @Roles('admin', 'manager', 'viewer')
  async getGeneralSettings(@Req() req: any) {
    return this.settingsService.getSettingsByCategory(req.user.tenantId, 'general');
  }

  @Put('general')
  @ApiOperation({ summary: 'Update general settings' })
  @Roles('admin')
  async updateGeneralSettings(
    @Req() req: any,
    @Body() dto: GeneralSettingsDto
  ) {
    await this.settingsService.updateSettings(
      req.user.tenantId,
      'general',
      dto,
      req.user.id
    );
    return { message: 'General settings updated successfully' };
  }

  @Post('test-connection')
  @ApiOperation({ summary: 'Test service connection' })
  @Roles('admin')
  async testConnection(@Req() req: any, @Body() dto: TestConnectionDto) {
    let result: boolean;
    
    switch (dto.service) {
      case 'email':
        result = await this.settingsService.testEmailSettings(req.user.tenantId);
        break;
      default:
        throw new Error('Invalid service');
    }

    return {
      service: dto.service,
      connected: result,
      message: result ? 'Connection successful' : 'Connection failed',
    };
  }

  @Get(':category/:key')
  @ApiOperation({ summary: 'Get specific setting' })
  @Roles('admin', 'manager')
  async getSetting(
    @Req() req: any,
    @Param('category') category: string,
    @Param('key') key: string
  ) {
    const value = await this.settingsService.getSetting(
      req.user.tenantId,
      category,
      key
    );
    return { category, key, value };
  }

  @Delete(':category/:key')
  @ApiOperation({ summary: 'Delete specific setting' })
  @Roles('admin')
  async deleteSetting(
    @Req() req: any,
    @Param('category') category: string,
    @Param('key') key: string
  ) {
    await this.settingsService.deleteSetting(req.user.tenantId, category, key);
    return { message: 'Setting deleted successfully' };
  }
}