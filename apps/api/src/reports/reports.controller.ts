import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiQuery({ name: 'storeId', required: false, type: String })
  async getDashboardStats(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Query('storeId') storeId?: string
  ) {
    return this.reportsService.getDashboardStats(user.tenantId, storeId, user.role);
  }

  @Get('sales')
  @ApiOperation({ summary: 'Get sales report' })
  @ApiQuery({ name: 'storeId', required: false, type: String })
  async getSalesReport(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Query('storeId') storeId?: string
  ) {
    return this.reportsService.getSalesReport(user.tenantId, storeId, user.role);
  }

  @Get('products')
  @ApiOperation({ summary: 'Get products report' })
  @ApiQuery({ name: 'storeId', required: false, type: String })
  async getProductReport(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Query('storeId') storeId?: string
  ) {
    return this.reportsService.getProductReport(user.tenantId, storeId, user.role);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Get customers report' })
  @ApiQuery({ name: 'storeId', required: false, type: String })
  async getCustomerReport(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Query('storeId') storeId?: string
  ) {
    return this.reportsService.getCustomerReport(user.tenantId, storeId, user.role);
  }
}
