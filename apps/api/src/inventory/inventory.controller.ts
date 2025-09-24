import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryApprovalDto } from './dto/inventory.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('inventory')
@UseGuards(AuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('approvals')
  async getApprovals(
    @CurrentUser() user: User,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('storeId') storeId?: string,
  ) {
    // Filter by user's store if customer
    const userStoreId = user.role === 'CUSTOMER' ? user.stores?.[0]?.id : storeId;
    return this.inventoryService.getApprovals({ page, limit, status, storeId: userStoreId });
  }

  @Post('approvals')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER')
  async createApproval(
    @Body() createApprovalDto: CreateInventoryApprovalDto,
    @CurrentUser() user: User,
  ) {
    return this.inventoryService.createApproval(createApprovalDto, user.id);
  }

  @Put('approvals/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CUSTOMER')
  async approveChange(@Param('id') id: string, @CurrentUser() user: User) {
    return this.inventoryService.approveChange(id, user.id);
  }

  @Put('approvals/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CUSTOMER')
  async rejectChange(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @CurrentUser() user: User,
  ) {
    return this.inventoryService.rejectChange(id, user.id, body.reason);
  }

  @Get('approvals/:id')
  async getApproval(@Param('id') id: string, @CurrentUser() user: User) {
    return this.inventoryService.getApproval(id, user);
  }

  @Get('stock-levels')
  async getStockLevels(
    @CurrentUser() user: User,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('storeId') storeId?: string,
    @Query('lowStock') lowStock?: boolean,
  ) {
    // Filter by user's store if customer
    const userStoreId = user.role === 'CUSTOMER' ? user.stores?.[0]?.id : storeId;
    return this.inventoryService.getStockLevels({ 
      page, 
      limit, 
      storeId: userStoreId, 
      lowStock: lowStock === true 
    });
  }

  @Post('stock-update')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER')
  async requestStockUpdate(
    @Body() body: { productId: string; newQuantity: number; reason?: string },
    @CurrentUser() user: User,
  ) {
    return this.inventoryService.requestStockUpdate(
      body.productId,
      body.newQuantity,
      user.id,
      body.reason,
    );
  }
}