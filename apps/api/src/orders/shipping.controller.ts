import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ShippingService } from './shipping.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { 
  CreateShippingZoneDto, 
  UpdateShippingZoneDto,
  CreateShippingPriceDto,
  UpdateShippingPriceDto,
  CreateCustomerShippingPriceDto,
  UpdateCustomerShippingPriceDto,
  CalculateShippingDto
} from './dto/shipping.dto';

@ApiTags('shipping')
@ApiBearerAuth()
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  // Shipping Zones
  @Post('zones')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create shipping zone (admin only)' })
  async createZone(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Body() dto: CreateShippingZoneDto,
  ) {
    return this.shippingService.createZone(user.tenantId, dto);
  }

  @Get('zones')
  @ApiOperation({ summary: 'Get shipping zones' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async getZones(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.shippingService.getZones(user.tenantId, includeInactive);
  }

  @Get('zones/:id')
  @ApiOperation({ summary: 'Get shipping zone by ID' })
  async getZone(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
  ) {
    return this.shippingService.getZone(user.tenantId, id);
  }

  @Put('zones/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update shipping zone (admin only)' })
  async updateZone(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
    @Body() dto: UpdateShippingZoneDto,
  ) {
    return this.shippingService.updateZone(user.tenantId, id, dto);
  }

  @Delete('zones/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete shipping zone (admin only)' })
  async deleteZone(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
  ) {
    return this.shippingService.deleteZone(user.tenantId, id);
  }

  // Shipping Prices
  @Post('prices')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create shipping price (admin only)' })
  async createPrice(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Body() dto: CreateShippingPriceDto,
  ) {
    return this.shippingService.createPrice(user.tenantId, dto);
  }

  @Get('prices')
  @ApiOperation({ summary: 'Get shipping prices' })
  @ApiQuery({ name: 'zoneId', required: false, type: String })
  async getPrices(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Query('zoneId') zoneId?: string,
  ) {
    return this.shippingService.getPrices(user.tenantId, zoneId);
  }

  @Get('prices/:id')
  @ApiOperation({ summary: 'Get shipping price by ID' })
  async getPrice(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
  ) {
    return this.shippingService.getPrice(user.tenantId, id);
  }

  @Put('prices/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update shipping price (admin only)' })
  async updatePrice(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
    @Body() dto: UpdateShippingPriceDto,
  ) {
    return this.shippingService.updatePrice(user.tenantId, id, dto);
  }

  @Delete('prices/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete shipping price (admin only)' })
  async deletePrice(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
  ) {
    return this.shippingService.deletePrice(user.tenantId, id);
  }

  // Customer-specific pricing
  @Post('customer-prices')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create customer-specific shipping price (admin only)' })
  async createCustomerPrice(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Body() dto: CreateCustomerShippingPriceDto,
  ) {
    return this.shippingService.createCustomerPrice(user.tenantId, dto);
  }

  @Get('customer-prices')
  @ApiOperation({ summary: 'Get customer-specific shipping prices' })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  async getCustomerPrices(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Query('customerId') customerId?: string,
  ) {
    return this.shippingService.getCustomerPrices(user.tenantId, customerId);
  }

  @Put('customer-prices/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update customer-specific shipping price (admin only)' })
  async updateCustomerPrice(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
    @Body() dto: UpdateCustomerShippingPriceDto,
  ) {
    return this.shippingService.updateCustomerPrice(user.tenantId, id, dto);
  }

  @Delete('customer-prices/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete customer-specific shipping price (admin only)' })
  async deleteCustomerPrice(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
  ) {
    return this.shippingService.deleteCustomerPrice(user.tenantId, id);
  }

  // Calculate shipping
  @Post('calculate')
  @ApiOperation({ summary: 'Calculate shipping cost' })
  async calculateShipping(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Body() dto: CalculateShippingDto,
  ) {
    return this.shippingService.calculateShipping(user.tenantId, dto);
  }

  @Get('options')
  @ApiOperation({ summary: 'Get shipping options for customer display' })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  async getShippingOptions(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Query('customerId') customerId?: string,
  ) {
    return this.shippingService.getShippingOptions(user.tenantId, customerId);
  }
}