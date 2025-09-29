import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { normalizeLimit, normalizePage } from '../common/utils/number.util';
import { Roles } from '../auth/decorators/roles.decorator';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'List customers' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'tag', required: false, type: String })
  @ApiQuery({ name: 'storeId', required: false, type: String })
  async list(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('tag') tag?: string,
    @Query('storeId') storeId?: string,
  ) {
    const pageNumber = normalizePage(page, 1);
    const limitNumber = normalizeLimit(limit, 50, 200);
    return this.customers.list(user.tenantId, pageNumber, limitNumber, search, status, tag, storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer' })
  async get(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string) {
    return this.customers.get(user.tenantId, id);
  }

  @Post()
  @Roles('ADMIN', 'CUSTOMER')
  @ApiOperation({ summary: 'Create customer' })
  async create(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Body() body: CreateCustomerDto) {
    return this.customers.create(user.tenantId, body);
  }

  @Put(':id')
  @Roles('ADMIN', 'CUSTOMER')
  @ApiOperation({ summary: 'Update customer' })
  async update(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string, @Body() body: UpdateCustomerDto) {
    return this.customers.update(user.tenantId, id, body);
  }

  @Delete(':id')
  @Roles('ADMIN', 'CUSTOMER')
  @ApiOperation({ summary: 'Delete customer' })
  async remove(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string) {
    return this.customers.remove(user.tenantId, id);
  }

  @Put('bulk')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bulk update customers' })
  async bulkUpdate(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Body() body: { customerIds: string[]; updates: Partial<UpdateCustomerDto> },
  ) {
    return this.customers.bulkUpdate(user.tenantId, body.customerIds, body.updates, user.id);
  }

  @Delete('bulk')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bulk delete customers' })
  async bulkDelete(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Body() body: { customerIds: string[] },
  ) {
    return this.customers.bulkDelete(user.tenantId, body.customerIds, user.id);
  }
}

