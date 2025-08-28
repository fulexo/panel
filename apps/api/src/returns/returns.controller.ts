import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReturnsService } from './returns.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('returns')
@ApiBearerAuth()
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  @ApiOperation({ summary: 'List returns' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(@CurrentUser() user: any, @Query('page') page = 1, @Query('limit') limit = 50) {
    return this.returnsService.list(user.tenantId, Number(page), Number(limit));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get return by ID' })
  async get(@CurrentUser() user: any, @Param('id') id: string) {
    return this.returnsService.get(user.tenantId, id);
  }
}