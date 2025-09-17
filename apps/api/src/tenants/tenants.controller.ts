import { Controller, Get, Param, Query, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List tenants (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(@Query('page') page = 1, @Query('limit') limit = 50) {
    return this.tenants.list(Number(page), Number(limit));
  }

  @Get(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get tenant by ID (admin only)' })
  async get(@Param('id') id: string) {
    return this.tenants.get(id);
  }

  @Post(':id/impersonate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Impersonate tenant (admin only)' })
  async impersonate(@CurrentUser() user: Record<string, unknown>, @Param('id') id: string) {
    return this.tenants.impersonate(user.sub || user.id, id);
  }

  @Post('impersonate/stop')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Stop impersonation, revert to original tenant' })
  async stopImpersonation(@CurrentUser() user: Record<string, unknown>) {
    return this.tenants.stopImpersonation(user);
  }
}