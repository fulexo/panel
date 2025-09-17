import { Controller, Get, Param, Query, Post, Put, Delete, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { ShipmentsService } from './shipments.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('shipments')
@ApiBearerAuth()
@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipments: ShipmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List shipments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'carrier', required: false, type: String })
  @ApiQuery({ name: 'dateFilter', required: false, type: String })
  @ApiQuery({ name: 'storeId', required: false, type: String })
  async list(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.shipments.list(user.tenantId, Number(query.page) || 1, Number(query.limit) || 50, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shipment by ID' })
  async get(@CurrentUser() user: Record<string, unknown>, @Param('id') id: string) {
    return this.shipments.get(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create shipment' })
  async create(@CurrentUser() user: Record<string, unknown>, @Body() dto: Record<string, unknown>) {
    return this.shipments.create(user.tenantId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update shipment' })
  async update(@CurrentUser() user: Record<string, unknown>, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.shipments.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete shipment' })
  async delete(@CurrentUser() user: Record<string, unknown>, @Param('id') id: string) {
    return this.shipments.delete(user.tenantId, id);
  }

  @Put('bulk')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bulk update shipments' })
  async bulkUpdate(
    @CurrentUser() user: Record<string, unknown>,
    @Body() body: { shipmentIds: string[]; updates: Record<string, unknown> },
  ) {
    return this.shipments.bulkUpdate(user.tenantId, body.shipmentIds, body.updates, user.id);
  }

  @Delete('bulk')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bulk delete shipments' })
  async bulkDelete(
    @CurrentUser() user: Record<string, unknown>,
    @Body() body: { shipmentIds: string[] },
  ) {
    return this.shipments.bulkDelete(user.tenantId, body.shipmentIds, user.id);
  }
}