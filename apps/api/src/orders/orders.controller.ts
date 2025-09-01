import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateOrderDto, UpdateOrderDto, OrderQueryDto, CreateChargeDto } from './dto';
import { Public } from '../auth/decorators/public.decorator';

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
    return this.ordersService.findAll(user.tenantId, query, user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.findOne(user.tenantId, id, user.role);
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

  @Get(':id/charges')
  @ApiOperation({ summary: 'List service charges for an order' })
  async listCharges(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.listCharges(user.tenantId, id);
  }

  @Post(':id/charges')
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
  @ApiOperation({ summary: 'Add a service charge to an order' })
  async addCharge(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreateChargeDto,
  ) {
    return this.ordersService.addCharge(user.tenantId, id, dto, user.id);
  }

  @Delete(':id/charges/:chargeId')
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
  @ApiOperation({ summary: 'Remove a service charge from an order' })
  async removeCharge(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('chargeId') chargeId: string,
  ) {
    return this.ordersService.removeCharge(user.tenantId, id, chargeId, user.id);
  }

  @Post(':id/share')
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
  @ApiOperation({ summary: 'Create a share link token for order info (email-safe)' })
  async createShare(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.createShareLink(user.tenantId, id, user.id);
  }

  @Get('public/:token')
  @Public()
  @ApiOperation({ summary: 'Get public order info by share token' })
  async publicInfo(@Param('token') token: string) {
    return this.ordersService.getPublicInfo(token);
  }
}