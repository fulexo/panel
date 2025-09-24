import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InventoryRequestService } from './inventory-request.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { 
  CreateInventoryRequestDto, 
  UpdateInventoryRequestDto, 
  ReviewInventoryRequestDto,
  InventoryRequestQueryDto
} from './dto/inventory-request.dto';

@ApiTags('inventory-requests')
@ApiBearerAuth()
@Controller('inventory-requests')
export class InventoryRequestController {
  constructor(private readonly inventoryRequestService: InventoryRequestService) {}

  @Post()
  @ApiOperation({ summary: 'Create inventory request' })
  async create(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Body() dto: CreateInventoryRequestDto,
  ) {
    return this.inventoryRequestService.create(user.tenantId, dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get inventory requests' })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'storeId', required: false, type: String })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Query() query: InventoryRequestQueryDto,
  ) {
    return this.inventoryRequestService.findAll(user.tenantId, query, user.role, user.id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get inventory request statistics' })
  async getStats(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
  ) {
    return this.inventoryRequestService.getStats(user.tenantId, user.role, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory request by ID' })
  async findOne(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
  ) {
    return this.inventoryRequestService.findOne(user.tenantId, id, user.role, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update inventory request' })
  async update(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
    @Body() dto: UpdateInventoryRequestDto,
  ) {
    return this.inventoryRequestService.update(user.tenantId, id, dto, user.role, user.id);
  }

  @Put(':id/review')
  @Roles('ADMIN', 'CUSTOMER')
  @ApiOperation({ summary: 'Review inventory request' })
  async review(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
    @Body() dto: ReviewInventoryRequestDto,
  ) {
    return this.inventoryRequestService.review(user.tenantId, id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete inventory request' })
  async delete(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
  ) {
    return this.inventoryRequestService.delete(user.tenantId, id, user.role, user.id);
  }
}