import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { ShipmentsService } from './shipments.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

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
  async list(@CurrentUser() user: any, @Query() query: any) {
    return this.shipments.list(user.tenantId, Number(query.page) || 1, Number(query.limit) || 50, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shipment by ID' })
  async get(@CurrentUser() user: any, @Param('id') id: string) {
    return this.shipments.get(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create shipment' })
  async create(@CurrentUser() user: any, @Body() dto: any) {
    return this.shipments.create(user.tenantId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update shipment' })
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.shipments.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete shipment' })
  async delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.shipments.delete(user.tenantId, id);
  }
}