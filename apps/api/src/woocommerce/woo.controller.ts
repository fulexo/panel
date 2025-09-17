import { Controller, Get, Post, Delete, Param, Body, Req, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WooService } from './woo.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('woo')
@ApiBearerAuth()
@Controller('woo')
export class WooController {
  constructor(private readonly woo: WooService) {}

  @Get('stores')
  @ApiOperation({ summary: 'List Woo stores for tenant' })
  async listStores(@CurrentUser() user: any){
    return this.woo.listStores(user.tenantId);
  }

  @Post('stores')
  @ApiOperation({ summary: 'Add a Woo store' })
  async addStore(@CurrentUser() user: any, @Body() dto: any){
    return this.woo.addStore(user.tenantId, dto);
  }

  @Delete('stores/:id')
  @ApiOperation({ summary: 'Remove a Woo store' })
  async removeStore(@CurrentUser() user: any, @Param('id') id: string){
    return this.woo.removeStore(user.tenantId, id);
  }

  @Post('stores/:id/test')
  @ApiOperation({ summary: 'Test Woo store connection' })
  async test(@CurrentUser() user: any, @Param('id') id: string){
    return this.woo.testConnection(user.tenantId, id);
  }

  @Post('stores/:id/register-webhooks')
  @ApiOperation({ summary: 'Register Woo webhooks for store' })
  async registerWebhooks(@CurrentUser() user: any, @Param('id') id: string){
    return this.woo.registerWebhooks(user.tenantId, id);
  }

  @Public()
  @Post('webhooks/:id')
  @HttpCode(202)
  @ApiOperation({ summary: 'Woo webhook receiver (public)' })
  async webhook(@Param('id') storeId: string, @Req() req: any, @Body() body: any){
    const topic = req.headers['x-wc-webhook-topic'] || req.headers['X-WC-Webhook-Topic'] || 'unknown';
    const signature = req.headers['x-wc-webhook-signature'] || req.headers['X-WC-Webhook-Signature'] || '';
    // Get raw body for signature verification
    const rawBody = req.rawBody || JSON.stringify(body);
    await this.woo.handleWebhook(storeId, String(topic), String(signature), body, rawBody);
    return { ok: true };
  }
}