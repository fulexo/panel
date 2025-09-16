import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

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
  async list(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('search') search?: string,
  ) {
    return this.products.list(user.tenantId, Number(page), Number(limit), search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  async get(@CurrentUser() user: any, @Param('id') id: string) {
    return this.products.get(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create product' })
  async create(@CurrentUser() user: any, @Body() dto: any) {
    return this.products.create(user.tenantId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update product' })
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.products.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete product' })
  async delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.products.delete(user.tenantId, id);
  }
}