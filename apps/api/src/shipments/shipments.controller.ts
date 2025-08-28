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
  async list(@CurrentUser() user: any, @Query('page') page = 1, @Query('limit') limit = 50) {
    return this.shipments.list(user.tenantId, Number(page), Number(limit));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shipment by ID' })
  async get(@CurrentUser() user: any, @Param('id') id: string) {
    return this.shipments.get(user.tenantId, id);
  }
}