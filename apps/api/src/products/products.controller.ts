import { Controller, Get, Param, Query, Post, Put, Delete, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { normalizeLimit, normalizePage } from '../common/utils/number.util';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';



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

    @Query() query: ProductQueryDto,

  ) {

    const pageNumber = normalizePage(query.page, 1);

    const limitNumber = normalizeLimit(query.limit, 50, 200);

    if (process.env['NODE_ENV'] === 'development') {
      // eslint-disable-next-line no-console
      console.log('Products list request', { userId: user.id, tenant: Boolean(user.tenantId), page: pageNumber, limit: limitNumber, hasSearch: Boolean(query.search) });
    }

    try {

      const result = await this.products.list(user.tenantId, pageNumber, limitNumber, query.search, query.status, query.category, query.storeId);

      if (process.env['NODE_ENV'] === 'development') {
        // eslint-disable-next-line no-console
        console.log('Products list result', { total: result.pagination.total, count: result.data.length });
      }

      return result;

    } catch (error) {

      if (process.env['NODE_ENV'] === 'development') {
        // eslint-disable-next-line no-console
        console.error('Products list error');
      }

      throw error;

    }

  }



  @Get(':id')

  @ApiOperation({ summary: 'Get product by ID' })

  async get(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string) {

    return this.products.get(user.tenantId, id);

  }



  @Post()

  @ApiOperation({ summary: 'Create product' })

  async create(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Body() dto: CreateProductDto) {

    return this.products.create(user.tenantId, dto);

  }



  @Put(':id')

  @ApiOperation({ summary: 'Update product' })

  async update(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string, @Body() dto: UpdateProductDto) {

    return this.products.update(user.tenantId, id, dto);

  }



  @Delete(':id')

  @ApiOperation({ summary: 'Delete product' })

  async delete(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string) {

    return this.products.delete(user.tenantId, id);

  }



  @Put('bulk')

  @Roles('ADMIN', 'CUSTOMER')

  @ApiOperation({ summary: 'Bulk update products' })

  async bulkUpdate(

    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },

    @Body() body: { productIds: string[]; updates: Partial<UpdateProductDto> },

  ) {

    return this.products.bulkUpdate(user.tenantId, body.productIds, body.updates, user.id);

  }



  @Delete('bulk')

  @Roles('ADMIN', 'CUSTOMER')

  @ApiOperation({ summary: 'Bulk delete products' })

  async bulkDelete(

    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },

    @Body() body: { productIds: string[] },

  ) {

    return this.products.bulkDelete(user.tenantId, body.productIds, user.id);

  }



  // Bundle product endpoints

  @Get(':id/bundle-items')

  @ApiOperation({ summary: 'Get bundle items' })

  async getBundleItems(

    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },

    @Param('id') id: string,

  ) {

    return this.products.getBundleItems(user.tenantId, id);

  }



  @Post(':id/bundle-items')

  @ApiOperation({ summary: 'Add item to bundle' })

  async addBundleItem(

    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },

    @Param('id') id: string,

    @Body() body: { productId: string; quantity?: number; isOptional?: boolean },

  ) {

    return this.products.addBundleItem(user.tenantId, id, body.productId, body.quantity, body.isOptional);

  }



  @Put(':id/bundle-items/:productId')

  @ApiOperation({ summary: 'Update bundle item' })

  async updateBundleItem(

    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },

    @Param('id') id: string,

    @Param('productId') productId: string,

    @Body() body: {

      quantity?: number;

      isOptional?: boolean;

      minQuantity?: number;

      maxQuantity?: number;

      discount?: number;

      sortOrder?: number;

    },

  ) {

    return this.products.updateBundleItem(user.tenantId, id, productId, body);

  }



  @Delete(':id/bundle-items/:productId')

  @ApiOperation({ summary: 'Remove item from bundle' })

  async removeBundleItem(

    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },

    @Param('id') id: string,

    @Param('productId') productId: string,

  ) {

    return this.products.removeBundleItem(user.tenantId, id, productId);

  }



  @Post(':id/calculate-bundle-price')

  @ApiOperation({ summary: 'Calculate bundle price' })

  async calculateBundlePrice(

    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },

    @Param('id') id: string,

    @Body() body: { selectedItems?: { productId: string; quantity: number }[] },

  ) {

    return this.products.calculateBundlePrice(user.tenantId, id, body.selectedItems);

  }

  @Get(':id/sales')
  @ApiOperation({ summary: 'Get product sales statistics' })
  async getProductSales(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Param('id') id: string,
  ) {
    return this.products.getProductSales(user.tenantId, id);
  }

}

