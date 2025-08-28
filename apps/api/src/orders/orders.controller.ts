import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateOrderDto, UpdateOrderDto, OrderQueryDto } from './dto';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async findAll(@CurrentUser() user: any, @Query() query: OrderQueryDto) {
    return this.ordersService.findAll(user.tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.findOne(user.tenantId, id);
  }

  @Post()
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
  @ApiOperation({ summary: 'Create order (admin only)' })
  async create(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.tenantId, dto, user.id);
  }

  @Put(':id')
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
  @ApiOperation({ summary: 'Update order' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.ordersService.update(user.tenantId, id, dto, user.id);
  }

  @Delete(':id')
  @Roles('FULEXO_ADMIN')
  @ApiOperation({ summary: 'Delete order (admin only)' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.remove(user.tenantId, id, user.id);
  }

  @Post(':id/refresh')
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
  @ApiOperation({ summary: 'Refresh order from BaseLinker' })
  async refresh(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.refreshFromBaseLinker(user.tenantId, id, user.id);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get order timeline' })
  async getTimeline(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.getOrderTimeline(user.tenantId, id);
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get orders summary statistics' })
  async getStats(@CurrentUser() user: any, @Query() query: { dateFrom?: string; dateTo?: string }) {
    return this.ordersService.getOrderStats(user.tenantId, query);
  }
}