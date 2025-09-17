import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateRequestDto, RejectRequestDto, AddCommentDto } from './dto';

@ApiTags('requests')
@ApiBearerAuth()
@Controller('requests')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get()
  @ApiOperation({ summary: 'List requests' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(@CurrentUser() user: Record<string, unknown>, @Query('page') page = 1, @Query('limit') limit = 50) {
    return this.requests.list(user.tenantId, Number(page), Number(limit));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get request by ID' })
  async get(@CurrentUser() user: Record<string, unknown>, @Param('id') id: string) {
    return this.requests.get(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create request' })
  async create(@CurrentUser() user: Record<string, unknown>, @Body() dto: CreateRequestDto) {
    return this.requests.create(user.tenantId, user.id, dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit request' })
  async submit(@CurrentUser() user: Record<string, unknown>, @Param('id') id: string) {
    return this.requests.submit(user.tenantId, id, user.id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve request' })
  async approve(@CurrentUser() user: Record<string, unknown>, @Param('id') id: string) {
    return this.requests.approve(user.tenantId, id, user.id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject request' })
  async reject(@CurrentUser() user: Record<string, unknown>, @Param('id') id: string, @Body() dto: RejectRequestDto) {
    return this.requests.reject(user.tenantId, id, user.id, dto.reason);
  }

  @Post(':id/apply')
  @ApiOperation({ summary: 'Apply approved request' })
  async apply(@CurrentUser() user: Record<string, unknown>, @Param('id') id: string) {
    return this.requests.apply(user.tenantId, id, user.id);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add comment to request' })
  async addComment(@CurrentUser() user: Record<string, unknown>, @Param('id') id: string, @Body() dto: AddCommentDto) {
    return this.requests.addComment(user.tenantId, id, user.id, dto.message, !!dto.isInternal);
  }
}