import { Controller, Get, Post, Delete, Param, Body, Query, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { BillingService } from './billing.service';
import { Response } from 'express';
import { Res } from '@nestjs/common';
import { CreateBillingBatchDto } from './dto/create-billing-batch.dto';
// import { UpdateBillingBatchDto } from './dto/update-billing-batch.dto';

@ApiTags('billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('batches')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List billing batches' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Query('page') page = 1, @Query('limit') limit = 50) {
    return this.billing.listBatches(user.tenantId, Number(page), Number(limit));
  }

  @Post('batches')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create billing batch' })
  async create(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Body() dto: CreateBillingBatchDto) {
    return this.billing.createBatch(user.tenantId, dto as Record<string, unknown>);
  }

  @Get('batches/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get billing batch' })
  async get(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string) {
    return this.billing.getBatch(user.tenantId, id);
  }

  @Post('batches/:id/add-invoices')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Add invoices to batch' })
  async add(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string, @Body() body: { invoiceIds: string[] }) {
    return this.billing.addInvoices(user.tenantId, id, body.invoiceIds || []);
  }

  @Delete('batches/:id/items/:itemId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remove batch item' })
  async remove(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.billing.removeItem(user.tenantId, id, itemId);
  }

  @Post('batches/:id/issue')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Issue billing batch' })
  async issue(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string) {
    return this.billing.issue(user.tenantId, id);
  }

  @Get('batches/:id/export.csv')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Export billing batch as CSV (detailed)' })
  async exportCsv(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string, @Res() res: Response) {
    const batch = await this.billing.getBatch(user.tenantId, id);
    const header = ['invoice_number','order_id','amount','currency','issued_at'];
    const rows = batch.items.map((it: Record<string, unknown>)=> [(it['invoice'] as Record<string, unknown>)?.number||'', (it['invoice'] as Record<string, unknown>)?.orderId, it['amount'], (it['invoice'] as Record<string, unknown>)?.currency||'', (it['invoice'] as Record<string, unknown>)?.issuedAt||'']);
    const csv = [header.join(','), ...rows.map((r: unknown[])=> r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="billing_${id}.csv"`);
    res.send(csv);
  }

  @Get('batches/:id/export.pdf')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Export billing batch as PDF (summary)' })
  async exportPdf(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string, @Res() res: Response) {
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
      if(batch.periodFrom) doc.text(`Period From: ${new Date(batch.periodFrom as Record<string, unknown>).toLocaleString()}`);
      if(batch.periodTo) doc.text(`Period To: ${new Date(batch.periodTo as Record<string, unknown>).toLocaleString()}`);
      doc.text(`Status: ${batch.status}`);
      doc.text(`Total: ${batch.total || 0}`);
      doc.moveDown();
      doc.text(`Items: ${batch.items.length}`);
      doc.end();
    }catch{
      res.json({ ok:false, message:'PDF generator not available', summary: { id: batch.id, total: batch.total, items: batch.items.length } });
    }
  }

  // Invoice endpoints
  @Get('invoices')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List invoices' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'dateFilter', required: false, type: String })
  async listInvoices(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Query() query: Record<string, unknown>) {
    return this.billing.listInvoices(user.tenantId, query);
  }

  @Post('invoices')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create invoice' })
  async createInvoice(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Body() dto: Record<string, unknown>) {
    return this.billing.createInvoice(user.tenantId, dto);
  }

  @Get('invoices/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get invoice' })
  async getInvoice(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string) {
    return this.billing.getInvoice(user.tenantId, id);
  }

  @Put('invoices/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update invoice' })
  async updateInvoice(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.billing.updateInvoice(user.tenantId, id, dto);
  }

  @Delete('invoices/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete invoice' })
  async deleteInvoice(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string) {
    return this.billing.deleteInvoice(user.tenantId, id);
  }

  // Payment endpoints
  @Get('payments')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List payments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'method', required: false, type: String })
  @ApiQuery({ name: 'dateFilter', required: false, type: String })
  async listPayments(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Query() query: Record<string, unknown>) {
    return this.billing.listPayments(user.tenantId, query);
  }

  @Get('payments/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get payment' })
  async getPayment(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string) {
    return this.billing.getPayment(user.tenantId, id);
  }

  @Put('payments/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update payment' })
  async updatePayment(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.billing.updatePayment(user.tenantId, id, dto);
  }

  @Post('payments/:id/refund')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Refund payment' })
  async refundPayment(@CurrentUser() user: { id: string; email: string; role: string; tenantId: string }, @Param('id') id: string) {
    return this.billing.refundPayment(user.tenantId, id);
  }

  @Put('batches/bulk')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bulk update billing batches' })
  async bulkUpdateBatches(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Body() body: { batchIds: string[]; updates: Record<string, unknown> },
  ) {
    return this.billing.bulkUpdateBatches(user.tenantId, body.batchIds, body.updates, user.id);
  }

  @Delete('batches/bulk')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bulk delete billing batches' })
  async bulkDeleteBatches(
    @CurrentUser() user: { id: string; email: string; role: string; tenantId: string },
    @Body() body: { batchIds: string[] },
  ) {
    return this.billing.bulkDeleteBatches(user.tenantId, body.batchIds, user.id);
  }
}

