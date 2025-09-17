import { Controller, Get, Put, Delete, Param, Body, Query, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async list(@CurrentUser() user: Record<string, unknown>, @Query('page') page = 1, @Query('limit') limit = 50, @Query('search') search?: string) {
    return this.users.list(user, Number(page), Number(limit), search);
  }

  @Get(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get user' })
  async get(@CurrentUser() user: Record<string, unknown>, @Param('id') id: string) {
    return this.users.get(user, id);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update user' })
  async update(@CurrentUser() user: Record<string, unknown>, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.users.update(user, id, body);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete user (admin only)' })
  async remove(@CurrentUser() user: Record<string, unknown>, @Param('id') id: string) {
    return this.users.remove(user, id);
  }

  @Post(':id/reset-password')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reset user password (admin only)' })
  async resetPassword(
    @CurrentUser() user: Record<string, unknown>,
    @Param('id') id: string,
    @Body() body: { password: string }
  ) {
    return this.users.resetPassword(user, id, body?.password);
  }
}
