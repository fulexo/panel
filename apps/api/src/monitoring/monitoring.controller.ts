import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MonitoringService } from '../common/services/monitoring.service';
import { Public } from '../auth/decorators/public.decorator';
import { ErrorLogDto } from './dto/error-log.dto';
import { PerformanceLogDto } from './dto/performance-log.dto';
import { ActivityLogDto } from './dto/activity-log.dto';

@ApiTags('monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(private monitoringService: MonitoringService) {}

  @Public()
  @Post('errors')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log error from frontend' })
  async logError(@Body() errorData: ErrorLogDto) {
    await this.monitoringService.logError({
      type: errorData['type'] || 'unknown',
      message: errorData['message'] || 'Unknown error',
      stack: errorData['stack'],
      timestamp: errorData['timestamp'] || new Date().toISOString(),
      url: errorData['url'],
      userId: errorData['userId'],
      tenantId: errorData['tenantId'],
      metadata: {
        source: errorData['source'] || 'unknown',
        userAgent: errorData['userAgent'],
        ...errorData['metadata'],
      },
    });

    return { success: true };
  }

  @Public()
  @Post('performance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log performance metrics' })
  async logPerformance(@Body() performanceData: PerformanceLogDto) {
    await this.monitoringService.logPerformance(
      performanceData['operation'],
      performanceData['duration'],
      performanceData['metadata']
    );

    return { success: true };
  }

  @Public()
  @Post('activity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log user activity' })
  async logActivity(@Body() activityData: ActivityLogDto) {
    await this.monitoringService.logUserActivity(
      activityData['userId'],
      activityData['action'],
      activityData['metadata']
    );

    return { success: true };
  }
}