import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SearchService } from './search.service';
import { AuthenticatedUser } from '../auth/types/user.types';

@ApiTags('search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global search across orders, products, customers' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'types', required: false, type: String, description: 'Comma-separated: orders,products,customers' })
  @ApiQuery({ name: 'limitPerType', required: false, type: Number })
  async query(
    @CurrentUser() user: AuthenticatedUser,
    @Query('q') q: string,
    @Query('types') types?: string,
    @Query('limitPerType') limitPerType: number = 10,
  ) {
    const selected = (types || 'orders,products,customers')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => ['orders', 'products', 'customers'].includes(s));

    return this.search.query(user.tenantId, q, selected, Math.min(Number(limitPerType) || 10, 50));
  }
}

