import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupportService } from './support.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';
import { CreateSupportMessageDto } from './dto/create-support-message.dto';
import { SupportTicketQueryDto } from './dto/support-ticket-query.dto';

interface CurrentUserInfo {
  id: string;
  role: string;
  tenantId: string;
}

@ApiTags('support')
@ApiBearerAuth()
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'List support tickets' })
  async listTickets(
    @CurrentUser() user: CurrentUserInfo,
    @Query() query: SupportTicketQueryDto,
  ) {
    return this.supportService.listTickets(user.tenantId, query, user.role, user.id);
  }

  @Post('tickets')
  @ApiOperation({ summary: 'Create support ticket' })
  async createTicket(
    @CurrentUser() user: CurrentUserInfo,
    @Body() dto: CreateSupportTicketDto,
  ) {
    return this.supportService.createTicket(user.tenantId, dto, user);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get support ticket details' })
  async getTicket(
    @CurrentUser() user: CurrentUserInfo,
    @Param('id') id: string,
  ) {
    return this.supportService.getTicket(user.tenantId, id, user.role, user.id);
  }

  @Put('tickets/:id')
  @ApiOperation({ summary: 'Update support ticket' })
  async updateTicket(
    @CurrentUser() user: CurrentUserInfo,
    @Param('id') id: string,
    @Body() dto: UpdateSupportTicketDto,
  ) {
    return this.supportService.updateTicket(user.tenantId, id, dto, user.role, user.id);
  }

  @Get('tickets/:id/messages')
  @ApiOperation({ summary: 'List support ticket messages' })
  async getMessages(
    @CurrentUser() user: CurrentUserInfo,
    @Param('id') id: string,
  ) {
    return this.supportService.getMessages(user.tenantId, id, user.role, user.id);
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Add message to support ticket' })
  async addMessage(
    @CurrentUser() user: CurrentUserInfo,
    @Param('id') id: string,
    @Body() dto: CreateSupportMessageDto,
  ) {
    return this.supportService.addMessage(user.tenantId, id, user, dto);
  }
}
