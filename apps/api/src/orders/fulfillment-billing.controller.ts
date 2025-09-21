import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FulfillmentBillingService } from './fulfillment-billing.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { 
  CreateFulfillmentServiceDto, 
  UpdateFulfillmentServiceDto,
  CreateFulfillmentBillingItemDto,
  UpdateFulfillmentBillingItemDto,
  CreateFulfillmentInvoiceDto,
  UpdateFulfillmentInvoiceDto,
  FulfillmentBillingQueryDto,
  FulfillmentInvoiceQueryDto,
  GenerateMonthlyInvoiceDto
} from './dto/fulfillment-billing.dto';

@ApiTags('fulfillment-billing')
@ApiBearerAuth()
@Controller('fulfillment-billing')
export class FulfillmentBillingController {
  constructor(private readonly fulfillmentBillingService: FulfillmentBillingService) {}

  // Fulfillment Services
  @Post('services')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create fulfillment service (admin only)' })
  async createService(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Body() dto: CreateFulfillmentServiceDto,
  ) {
    return this.fulfillmentBillingService.createService(user.tenantId, dto);
  }

  @Get('services')
  @ApiOperation({ summary: 'Get fulfillment services' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async getServices(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.fulfillmentBillingService.getServices(user.tenantId, includeInactive);
  }

  @Get('services/:id')
  @ApiOperation({ summary: 'Get fulfillment service by ID' })
  async getService(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
  ) {
    return this.fulfillmentBillingService.getService(user.tenantId, id);
  }

  @Put('services/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update fulfillment service (admin only)' })
  async updateService(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
    @Body() dto: UpdateFulfillmentServiceDto,
  ) {
    return this.fulfillmentBillingService.updateService(user.tenantId, id, dto);
  }

  @Delete('services/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete fulfillment service (admin only)' })
  async deleteService(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
  ) {
    return this.fulfillmentBillingService.deleteService(user.tenantId, id);
  }

  // Fulfillment Billing Items
  @Post('billing-items')
  @ApiOperation({ summary: 'Create fulfillment billing item' })
  async createBillingItem(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Body() dto: CreateFulfillmentBillingItemDto,
  ) {
    return this.fulfillmentBillingService.createBillingItem(user.tenantId, dto);
  }

  @Get('billing-items')
  @ApiOperation({ summary: 'Get fulfillment billing items' })
  @ApiQuery({ name: 'orderId', required: false, type: String })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'isBilled', required: false, type: Boolean })
  @ApiQuery({ name: 'serviceId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getBillingItems(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Query() query: FulfillmentBillingQueryDto,
  ) {
    return this.fulfillmentBillingService.getBillingItems(user.tenantId, query);
  }

  @Get('billing-items/:id')
  @ApiOperation({ summary: 'Get fulfillment billing item by ID' })
  async getBillingItem(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
  ) {
    return this.fulfillmentBillingService.getBillingItem(user.tenantId, id);
  }

  @Put('billing-items/:id')
  @ApiOperation({ summary: 'Update fulfillment billing item' })
  async updateBillingItem(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
    @Body() dto: UpdateFulfillmentBillingItemDto,
  ) {
    return this.fulfillmentBillingService.updateBillingItem(user.tenantId, id, dto);
  }

  @Delete('billing-items/:id')
  @ApiOperation({ summary: 'Delete fulfillment billing item' })
  async deleteBillingItem(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
  ) {
    return this.fulfillmentBillingService.deleteBillingItem(user.tenantId, id);
  }

  // Fulfillment Invoices
  @Post('invoices/generate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Generate monthly fulfillment invoice (admin only)' })
  async generateMonthlyInvoice(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Body() dto: GenerateMonthlyInvoiceDto,
  ) {
    return this.fulfillmentBillingService.generateMonthlyInvoice(user.tenantId, dto);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Get fulfillment invoices' })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getInvoices(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Query() query: FulfillmentInvoiceQueryDto,
  ) {
    return this.fulfillmentBillingService.getInvoices(user.tenantId, query);
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get fulfillment invoice by ID' })
  async getInvoice(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
  ) {
    return this.fulfillmentBillingService.getInvoice(user.tenantId, id);
  }

  @Put('invoices/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update fulfillment invoice (admin only)' })
  async updateInvoice(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
    @Body() dto: UpdateFulfillmentInvoiceDto,
  ) {
    return this.fulfillmentBillingService.updateInvoice(user.tenantId, id, dto);
  }

  // Statistics
  @Get('stats')
  @ApiOperation({ summary: 'Get fulfillment billing statistics' })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  async getBillingStats(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Query('customerId') customerId?: string,
  ) {
    return this.fulfillmentBillingService.getBillingStats(user.tenantId, customerId);
  }
}