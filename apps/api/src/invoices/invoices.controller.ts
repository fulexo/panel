import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'List invoices' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(@CurrentUser() user: any, @Query('page') page = 1, @Query('limit') limit = 50) {
    return this.invoices.list(user.tenantId, Number(page), Number(limit));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  async get(@CurrentUser() user: any, @Param('id') id: string) {
    return this.invoices.get(user.tenantId, id);
  }
}