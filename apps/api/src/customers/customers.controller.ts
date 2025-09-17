import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CustomersService } from './customers.service';

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
    @Query('page') page = 1, 
    @Query('limit') limit = 50, 
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('tag') tag?: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.customers.list(user.tenantId, Number(page), Number(limit), search, status, tag, storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer' })
  async get(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string) {
    return this.customers.get(user.tenantId, id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create customer (admin only)' })
  async create(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Body() body: Record<string, unknown>) {
    return this.customers.create(user.tenantId, body);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update customer (admin only)' })
  async update(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.customers.update(user.tenantId, id, body);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete customer (admin only)' })
  async remove(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string) {
    return this.customers.remove(user.tenantId, id);
  }

  @Put('bulk')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bulk update customers' })
  async bulkUpdate(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Body() body: { customerIds: string[]; updates: Record<string, unknown> },
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

