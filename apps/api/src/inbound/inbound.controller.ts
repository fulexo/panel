import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InboundService } from './inbound.service';

@ApiTags('inbound')
@ApiBearerAuth()
@Controller('inbound')
export class InboundController {
  constructor(private readonly inbound: InboundService) {}

  @Get('shipments')
  @ApiOperation({ summary: 'List inbound shipments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Query('page') page = 1, @Query('limit') limit = 50) {
    return this.inbound.list(user.tenantId, Number(page), Number(limit));
  }

  @Post('shipments')
  @ApiOperation({ summary: 'Create inbound shipment' })
  async create(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Body() dto: { reference?: string }) {
    return this.inbound.create(user.tenantId, dto);
  }

  @Post('shipments/:id/items')
  @ApiOperation({ summary: 'Add item to inbound shipment' })
  async addItem(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
    @Body() dto: { productId?: string; sku?: string; name?: string; quantity: number },
  ) {
    return this.inbound.addItem(user.tenantId, id, dto);
  }

  @Post('shipments/:id/receive')
  @ApiOperation({ summary: 'Mark inbound shipment as received and apply stock' })
  async receive(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string) {
    return this.inbound.receive(user.tenantId, id);
  }
}

