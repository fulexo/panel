import { Controller, Get, Post, Delete, Param, Body, Req, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WooCommerceService } from './woo.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { AuthenticatedUser } from '../auth/types/user.types';
import { AddStoreDto } from './dto/woo.dto';

@ApiTags('woo')
@ApiBearerAuth()
@Controller('woo')
export class WooController {
  constructor(private readonly woo: WooCommerceService) {}

  @Get('stores')
  @ApiOperation({ summary: 'List Woo stores for tenant' })
  async listStores(@CurrentUser() user: AuthenticatedUser){
    return this.woo.listStores(user.tenantId);
  }

  @Post('stores')
  @ApiOperation({ summary: 'Add a Woo store' })
  async addStore(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddStoreDto){
    return this.woo.addStore(user.tenantId, {
      name: dto.name,
      baseUrl: dto.baseUrl || dto.url,
      consumerKey: dto.consumerKey,
      consumerSecret: dto.consumerSecret,
    });
  }

  @Delete('stores/:id')
  @ApiOperation({ summary: 'Remove a Woo store' })
  async removeStore(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string){
    return this.woo.removeStore(user.tenantId, id);
  }

  @Post('stores/:id/test')
  @ApiOperation({ summary: 'Test Woo store connection' })
  async test(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string){
    return this.woo.testStoreConnection(user.tenantId, id);
  }

  @Post('stores/:id/register-webhooks')
  @ApiOperation({ summary: 'Register Woo webhooks for store' })
  async registerWebhooks(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string){
    return this.woo.registerWebhooks(user.tenantId, id);
  }

  @Public()
  @Post('webhooks/:id')
  @HttpCode(202)
  @ApiOperation({ summary: 'Woo webhook receiver (public)' })
  async webhook(@Param('id') storeId: string, @Req() req: Record<string, unknown>, @Body() body: Record<string, unknown>){
    const headers = req.headers as Record<string, unknown>;
    const topic = headers['x-wc-webhook-topic'] || headers['X-WC-Webhook-Topic'] || 'unknown';
    const signature = headers['x-wc-webhook-signature'] || headers['X-WC-Webhook-Signature'] || '';
    // Get raw body for signature verification
    const rawBody = (req.rawBody as string) || JSON.stringify(body);
    await this.woo.handleWebhook(storeId, String(topic), String(signature), body, rawBody);
    return { ok: true };
  }
}