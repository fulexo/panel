import { Controller, Get, Param, Query, Post, Put, Delete, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'storeId', required: false, type: String })
  async list(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.products.list(user.tenantId, Number(page), Number(limit), search, status, category, storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  async get(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string) {
    return this.products.get(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create product' })
  async create(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Body() dto: Record<string, unknown>) {
    return this.products.create(user.tenantId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update product' })
  async update(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.products.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete product' })
  async delete(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string) {
    return this.products.delete(user.tenantId, id);
  }

  @Put('bulk')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bulk update products' })
  async bulkUpdate(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Body() body: { productIds: string[]; updates: Record<string, unknown> },
  ) {
    return this.products.bulkUpdate(user.tenantId, body.productIds, body.updates, user.id);
  }

  @Delete('bulk')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bulk delete products' })
  async bulkDelete(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Body() body: { productIds: string[] },
  ) {
    return this.products.bulkDelete(user.tenantId, body.productIds, user.id);
  }
}