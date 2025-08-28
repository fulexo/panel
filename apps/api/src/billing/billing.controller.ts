import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { BillingService } from './billing.service';
import { Response } from 'express';
import { Res } from '@nestjs/common';

@ApiTags('billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('batches')
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
  @ApiOperation({ summary: 'List billing batches' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(@CurrentUser() user: any, @Query('page') page = 1, @Query('limit') limit = 50) {
    return this.billing.listBatches(user.tenantId, Number(page), Number(limit));
  }

  @Post('batches')
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
  @ApiOperation({ summary: 'Create billing batch' })
  async create(@CurrentUser() user: any, @Body() dto: { periodFrom?: string; periodTo?: string }) {
    return this.billing.createBatch(user.tenantId, dto);
  }

  @Get('batches/:id')
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
  @ApiOperation({ summary: 'Get billing batch' })
  async get(@CurrentUser() user: any, @Param('id') id: string) {
    return this.billing.getBatch(user.tenantId, id);
  }

  @Post('batches/:id/add-invoices')
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
  @ApiOperation({ summary: 'Add invoices to batch' })
  async add(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { invoiceIds: string[] }) {
    return this.billing.addInvoices(user.tenantId, id, body.invoiceIds || []);
  }

  @Delete('batches/:id/items/:itemId')
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
  @ApiOperation({ summary: 'Remove batch item' })
  async remove(@CurrentUser() user: any, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.billing.removeItem(user.tenantId, id, itemId);
  }

  @Post('batches/:id/issue')
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
  @ApiOperation({ summary: 'Issue billing batch' })
  async issue(@CurrentUser() user: any, @Param('id') id: string) {
    return this.billing.issue(user.tenantId, id);
  }

  @Get('batches/:id/export.csv')
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
  @ApiOperation({ summary: 'Export billing batch as CSV (detailed)' })
  async exportCsv(@CurrentUser() user: any, @Param('id') id: string, @Res() res: Response) {
    const batch = await this.billing.getBatch(user.tenantId, id);
    const header = ['invoice_number','order_id','amount','currency','issued_at'];
    const rows = batch.items.map((it:any)=> [it.invoice.number||'', it.invoice.orderId, it.amount, it.invoice.currency||'', it.invoice.issuedAt||'']);
    const csv = [header.join(','), ...rows.map(r=> r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="billing_${id}.csv"`);
    res.send(csv);
  }

  @Get('batches/:id/export.pdf')
  @Roles('FULEXO_ADMIN', 'FULEXO_STAFF')
  @ApiOperation({ summary: 'Export billing batch as PDF (summary)' })
  async exportPdf(@CurrentUser() user: any, @Param('id') id: string, @Res() res: Response) {
    const batch = await this.billing.getBatch(user.tenantId, id);
    // Minimal PDF via PDFKit (optional dependency). If not installed, return JSON fallback.
    try{
      const PDFDocument = require('pdfkit');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="billing_${id}.pdf"`);
      const doc = new PDFDocument();
      doc.pipe(res);
      doc.fontSize(18).text('Billing Summary', { underline: true });
      doc.moveDown();
      doc.fontSize(12).text(`Batch ID: ${batch.id}`);
      if(batch.periodFrom) doc.text(`Period From: ${new Date(batch.periodFrom as any).toLocaleString()}`);
      if(batch.periodTo) doc.text(`Period To: ${new Date(batch.periodTo as any).toLocaleString()}`);
      doc.text(`Status: ${batch.status}`);
      doc.text(`Total: ${batch.total || 0}`);
      doc.moveDown();
      doc.text(`Items: ${batch.items.length}`);
      doc.end();
    }catch(e){
      res.json({ ok:false, message:'PDF generator not available', summary: { id: batch.id, total: batch.total, items: batch.items.length } });
    }
  }
}

