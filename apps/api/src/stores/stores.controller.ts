import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto, UpdateStoreDto } from './dto/stores.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('stores')
@UseGuards(AuthGuard)
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ) {
    return this.storesService.findAll({ page, limit, search });
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async findOne(@Param('id') id: string) {
    return this.storesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async create(@Body() createStoreDto: CreateStoreDto) {
    return this.storesService.create(createStoreDto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() updateStoreDto: UpdateStoreDto) {
    return this.storesService.update(id, updateStoreDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async remove(@Param('id') id: string) {
    return this.storesService.remove(id);
  }

  @Post(':id/sync')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async syncStore(@Param('id') id: string, @CurrentUser() user: User) {
    return this.storesService.syncStore(id, user.tenantId || '');
  }

  @Post(':id/test-connection')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async testConnection(@Param('id') id: string) {
    return this.storesService.testConnection(id);
  }

  @Get(':id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getStoreStatus(@Param('id') id: string) {
    return this.storesService.getStoreStatus(id);
  }

  @Get('customer/:customerId')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER')
  async getCustomerStore(@Param('customerId') customerId: string, @CurrentUser() user: User) {
    // Customer can only see their own store
    if (user.id !== customerId) {
      throw new Error('Unauthorized');
    }
    return this.storesService.findByCustomerId(customerId);
  }
}