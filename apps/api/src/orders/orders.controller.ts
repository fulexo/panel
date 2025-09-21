import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { CreateChargeDto } from './dto/create-charge.dto';
import { CreateCustomerOrderDto } from './dto/create-customer-order.dto';
import { ApproveOrderDto, RejectOrderDto } from './dto/approve-order.dto';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';
import { CartService } from './cart.service';
import { Public } from '../auth/decorators/public.decorator';
import { RateLimit } from '../rate-limit.decorator';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly cartService: CartService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List orders' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async findAll(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Query() query: OrderQueryDto) {
    return this.ordersService.findAll(user.tenantId, query, user.role);
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get orders summary statistics' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'storeId', required: false, type: String })
  async getStats(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Query() query: { dateFrom?: string; dateTo?: string; storeId?: string }) {
    return this.ordersService.getOrderStats(user.tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  async findOne(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string) {
    return this.ordersService.findOne(user.tenantId, id, user.role);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create order (admin only)' })
  async create(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.tenantId, dto, user.id);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update order' })
  async update(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.ordersService.update(user.tenantId, id, dto, user.id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete order (admin only)' })
  async remove(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string) {
    return this.ordersService.remove(user.tenantId, id, user.id);
  }

  @Put('bulk')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bulk update orders' })
  async bulkUpdate(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Body() body: { orderIds: string[]; updates: Partial<UpdateOrderDto> },
  ) {
    return this.ordersService.bulkUpdate(user.tenantId, body.orderIds, body.updates, user.id);
  }

  @Delete('bulk')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bulk delete orders' })
  async bulkDelete(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Body() body: { orderIds: string[] },
  ) {
    return this.ordersService.bulkDelete(user.tenantId, body.orderIds, user.id);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get order timeline' })
  async getTimeline(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string) {
    return this.ordersService.getOrderTimeline(user.tenantId, id);
  }

  @Get(':id/charges')
  @ApiOperation({ summary: 'List service charges for an order' })
  async listCharges(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string) {
    return this.ordersService.listCharges(user.tenantId, id);
  }

  @Post(':id/charges')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Add a service charge to an order' })
  async addCharge(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
    @Body() dto: CreateChargeDto,
  ) {
    return this.ordersService.addCharge(user.tenantId, id, dto, user.id);
  }

  @Delete(':id/charges/:chargeId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remove a service charge from an order' })
  async removeCharge(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
    @Param('chargeId') chargeId: string,
  ) {
    return this.ordersService.removeCharge(user.tenantId, id, chargeId, user.id);
  }

  @Post(':id/share')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a share link token for order info (email-safe)' })
  async createShare(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string) {
    return this.ordersService.createShareLink(user.tenantId, id, user.id);
  }

  @Get('public/:token')
  @Public()
  @RateLimit({ points: 10, duration: 60 }) // 10 requests per minute
  @ApiOperation({ summary: 'Get public order info by share token' })
  async publicInfo(@Param('token') token: string) {
    return this.ordersService.getPublicInfo(token);
  }

  // Customer order creation endpoints
  @Post('customer')
  @ApiOperation({ summary: 'Create order as customer' })
  async createCustomerOrder(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Body() dto: CreateCustomerOrderDto,
  ) {
    return this.ordersService.createCustomerOrder(user.tenantId, dto, user.id);
  }

  @Get('pending-approvals')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get orders pending approval (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'storeId', required: false, type: String })
  async getPendingApprovals(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Query() query: { page?: number; limit?: number; storeId?: string },
  ) {
    return this.ordersService.getPendingApprovals(user.tenantId, query);
  }

  @Put(':id/approve')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Approve order (admin only)' })
  async approveOrder(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
    @Body() dto: ApproveOrderDto,
  ) {
    return this.ordersService.approveOrder(user.tenantId, id, dto, user.id);
  }

  @Put(':id/reject')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reject order (admin only)' })
  async rejectOrder(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
    @Body() dto: RejectOrderDto,
  ) {
    return this.ordersService.rejectOrder(user.tenantId, id, dto, user.id);
  }

  // Cart endpoints
  @Get('cart/:storeId')
  @ApiOperation({ summary: 'Get user cart for store' })
  async getCart(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('storeId') storeId: string,
  ) {
    return this.cartService.getCart(user.tenantId, user.id, storeId);
  }

  @Get('cart/:storeId/summary')
  @ApiOperation({ summary: 'Get cart summary' })
  async getCartSummary(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('storeId') storeId: string,
  ) {
    return this.cartService.getCartSummary(user.tenantId, user.id, storeId);
  }

  @Post('cart/:storeId/items')
  @ApiOperation({ summary: 'Add item to cart' })
  async addToCart(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('storeId') storeId: string,
    @Body() dto: AddToCartDto,
  ) {
    return this.cartService.addToCart(user.tenantId, user.id, storeId, dto);
  }

  @Put('cart/:storeId/items/:productId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  async updateCartItem(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItem(user.tenantId, user.id, storeId, productId, dto);
  }

  @Delete('cart/:storeId/items/:productId')
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeFromCart(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
  ) {
    return this.cartService.removeFromCart(user.tenantId, user.id, storeId, productId);
  }

  @Delete('cart/:storeId')
  @ApiOperation({ summary: 'Clear cart' })
  async clearCart(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('storeId') storeId: string,
  ) {
    return this.cartService.clearCart(user.tenantId, user.id, storeId);
  }
}