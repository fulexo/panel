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
  async list(@CurrentUser() user: any, @Query('page') page = 1, @Query('limit') limit = 50, @Query('search') search?: string) {
    return this.customers.list(user.tenantId, Number(page), Number(limit), search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer' })
  async get(@CurrentUser() user: any, @Param('id') id: string) {
    return this.customers.get(user.tenantId, id);
  }

  @Post()
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
  @ApiOperation({ summary: 'Create customer (admin/staff)' })
  async create(@CurrentUser() user: any, @Body() body: any) {
    return this.customers.create(user.tenantId, body);
  }

  @Put(':id')
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
  @ApiOperation({ summary: 'Update customer (admin/staff)' })
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.customers.update(user.tenantId, id, body);
  }

  @Delete(':id')
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
  @ApiOperation({ summary: 'Delete customer (admin/staff)' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.customers.remove(user.tenantId, id);
  }
}

