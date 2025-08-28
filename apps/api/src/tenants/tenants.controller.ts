import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
  @ApiOperation({ summary: 'List tenants (admin/staff)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(@Query('page') page = 1, @Query('limit') limit = 50) {
    return this.tenants.list(Number(page), Number(limit));
  }

  @Get(':id')
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
  @ApiOperation({ summary: 'Get tenant by ID (admin/staff)' })
  async get(@Param('id') id: string) {
    return this.tenants.get(id);
  }
}