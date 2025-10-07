import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { toPrismaJsonValue } from '../common/utils/prisma-json.util';
import { KarrioService } from '../karrio/karrio.service';

type ParcelInput = {
  weight: { value: number; unit?: string };
  dimensions: { length: number; width: number; height: number; unit?: string };
  [key: string]: any;
};

@Injectable()
export class ShipmentsService {
  constructor(private prisma: PrismaService, private karrio: KarrioService) {}

  private async runTenant<T>(tenantId: string, fn: (db: PrismaClient) => Promise<T>): Promise<T> {
    return this.prisma.withTenant(tenantId, fn);
  }

  async list(tenantId: string, page = 1, limit = 50, query: Record<string, unknown> = {}) {
    const take = Math.min(limit, 200);
    const skip = (page - 1) * take;

    const where: Record<string, unknown> = { order: { tenantId } };
    
    if (query['search']) {
      where['OR'] = [
        { trackingNo: { contains: query['search'], mode: 'insensitive' } },
        { carrier: { contains: query['search'], mode: 'insensitive' } },
        { order: { externalOrderNo: { contains: query['search'], mode: 'insensitive' } } },
        { order: { customerEmail: { contains: query['search'], mode: 'insensitive' } } },
      ];
    }
    
    if (query['status']) {
      where['status'] = query['status'];
    }
    
    if (query['carrier']) {
      where['carrier'] = query['carrier'];
    }

    if (query['dateFilter']) {
      const now = new Date();
      let dateFrom: Date;
      
      switch (query['dateFilter']) {
        case 'today':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          dateFrom = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        case 'year':
          dateFrom = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          dateFrom = new Date(0);
      }
      
      where['createdAt'] = { gte: dateFrom };
    }

    if (query['storeId']) {
      const orderWhere = where['order'] as Record<string, unknown> | undefined;
      where['order'] = { ...orderWhere, storeId: query['storeId'] };
    }

    const [data, total] = await this.runTenant(tenantId, async (db) => Promise.all([
      db.shipment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { order: true }
      }),
      db.shipment.count({ where }),
    ]));
    return { data, pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async get(tenantId: string, id: string) {
    const shipment = await this.runTenant(tenantId, async (db) => db.shipment.findFirst({
      where: { id, order: { tenantId } },
      include: { order: true }
    }));
    if (!shipment) throw new NotFoundException('Shipment not found');
    return shipment;
  }

  async create(tenantId: string, dto: Record<string, unknown>) {
    // Verify order exists and belongs to tenant
    const order = await this.runTenant(tenantId, async (db) => db.order.findFirst({
      where: { id: dto.orderId as string, tenantId }
    }));
    if (!order) throw new NotFoundException('Order not found');

    return this.runTenant(tenantId, async (db) => db.shipment.create({
      data: {
        order: {
          connect: { id: dto.orderId as string }
        },
        tenant: {
          connect: { id: tenantId }
        },
        carrier: dto.carrier as string,
        trackingNo: dto.trackingNo as string,
        status: (dto.status as string) || 'pending',
        weight: dto.weight ? new Decimal(dto.weight as string) : null,
        dimensions: dto.dimensions ? toPrismaJsonValue(dto.dimensions) : undefined,
        ...(dto.status === 'shipped' && { shippedAt: new Date() }),
        ...(dto.status === 'delivered' && { deliveredAt: new Date() }),
      },
    }));
  }

  async update(tenantId: string, id: string, dto: Record<string, unknown>) {
    const shipment = await this.runTenant(tenantId, async (db) => db.shipment.findFirst({
      where: { id, order: { tenantId } }
    }));
    if (!shipment) throw new NotFoundException('Shipment not found');

    return this.runTenant(tenantId, async (db) => db.shipment.update({
      where: { id },
      data: {
        ...(dto.carrier !== undefined && { carrier: dto.carrier }),
        ...(dto.trackingNo !== undefined && { trackingNo: dto.trackingNo }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.weight !== undefined && { weight: dto.weight ? new Decimal(dto.weight as string) : null }),
        ...(dto.dimensions !== undefined && {
          dimensions: dto.dimensions ? toPrismaJsonValue(dto.dimensions) : null,
        }),
        ...(dto.status === 'shipped' && !shipment.shippedAt && { shippedAt: new Date() }),
        ...(dto.status === 'delivered' && !shipment.deliveredAt && { deliveredAt: new Date() }),
      } as Record<string, unknown>,
    }));
  }

  async delete(tenantId: string, id: string) {
    const shipment = await this.runTenant(tenantId, async (db) => db.shipment.findFirst({
      where: { id, order: { tenantId } }
    }));
    if (!shipment) throw new NotFoundException('Shipment not found');

    return this.runTenant(tenantId, async (db) => db.shipment.delete({
      where: { id }
    }));
  }

  async bulkUpdate(tenantId: string, shipmentIds: string[], updates: Record<string, unknown>, _userId: string) {
    if (!shipmentIds || shipmentIds.length === 0) {
      throw new BadRequestException('No shipment IDs provided');
    }

    if (shipmentIds.length > 100) {
      throw new BadRequestException('Cannot update more than 100 shipments at once');
    }

    const results = await this.runTenant(tenantId, async (db) => {
      const updateData: Record<string, unknown> = {};
      
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.carrier !== undefined) updateData.carrier = updates.carrier;
      if (updates.trackingNo !== undefined) updateData.trackingNo = updates.trackingNo;
      if (updates.weight !== undefined) updateData.weight = updates.weight ? new Decimal(updates.weight as string) : null;
      if (updates.dimensions !== undefined) {
        updateData.dimensions = updates.dimensions
          ? toPrismaJsonValue(updates.dimensions)
          : null;
      }
      
      // Handle status-based timestamps
      if (updates.status === 'shipped') {
        updateData.shippedAt = new Date();
      }
      if (updates.status === 'delivered') {
        updateData.deliveredAt = new Date();
      }
      
      updateData.updatedAt = new Date();

      const result = await db.shipment.updateMany({
        where: {
          id: { in: shipmentIds },
          order: { tenantId },
        },
        data: updateData,
      });

      return result;
    });

    return {
      message: `Successfully updated ${results.count} shipments`,
      updatedCount: results.count,
      shipmentIds,
    };
  }

  async bulkDelete(tenantId: string, shipmentIds: string[], _userId: string) {
    if (!shipmentIds || shipmentIds.length === 0) {
      throw new BadRequestException('No shipment IDs provided');
    }

    if (shipmentIds.length > 100) {
      throw new BadRequestException('Cannot delete more than 100 shipments at once');
    }

    const results = await this.runTenant(tenantId, async (db) => {
      const result = await db.shipment.deleteMany({
        where: {
          id: { in: shipmentIds },
          order: { tenantId },
        },
      });

      return result;
    });

    return {
      message: `Successfully deleted ${results.count} shipments`,
      deletedCount: results.count,
      shipmentIds,
    };
  }

  async getRates(tenantId: string, orderId: string, payload: any) {
    const parcels = this.sanitizeParcels(payload?.parcels);

    const order = await this.runTenant(tenantId, (db) =>
      db.order.findUnique({ where: { id: orderId, tenantId } }),
    );
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const karrioPayload = await this._mapOrderToKarrioPayload(tenantId, order, parcels);
    return this.karrio.getRates(karrioPayload);
  }

  async createShipment(
    tenantId: string,
    orderId: string,
    payload: {
      parcels: any[];
      service: string;
      selected_rate_id?: string;
      rates?: any[];
    },
  ) {
    const parcels = this.sanitizeParcels(payload?.parcels);
    const service = typeof payload?.service === 'string' ? payload.service.trim() : '';
    if (!service) {
      throw new BadRequestException('Service is required to create a shipment');
    }

    const order = await this.runTenant(tenantId, (db) =>
      db.order.findUnique({ where: { id: orderId, tenantId } }),
    );
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const karrioPayload = await this._mapOrderToKarrioPayload(tenantId, order, parcels);
    (karrioPayload as any).service = service;
    (karrioPayload as any).label_type = 'PDF';

    const selectedRateId = payload?.selected_rate_id ? String(payload.selected_rate_id) : undefined;
    if (selectedRateId) {
      (karrioPayload as any).selected_rate_id = selectedRateId;
    } else if (Array.isArray(payload?.rates) && payload.rates.length > 0) {
      (karrioPayload as any).rates = payload.rates;
    } else {
      throw new BadRequestException('Either selected_rate_id or rates list is required for shipment creation');
    }

    const karrioShipment = await this.karrio.createShipment(karrioPayload);

    const primaryParcel = parcels[0];
    const weightDecimal =
      typeof primaryParcel?.weight?.value === 'number'
        ? new Decimal(primaryParcel.weight.value)
        : null;
    const dimensionValue = primaryParcel?.dimensions
      ? toPrismaJsonValue(primaryParcel.dimensions)
      : undefined;

    const carrierName =
      karrioShipment?.carrier_name ||
      karrioShipment?.carrier ||
      karrioShipment?.selected_rate?.carrier_name ||
      karrioShipment?.selected_rate?.carrier ||
      null;
    const trackingNumber = karrioShipment?.tracking_number
      ? String(karrioShipment.tracking_number)
      : karrioShipment?.trackingNo
        ? String(karrioShipment.trackingNo)
        : null;
    const labelUrl = typeof karrioShipment?.label_url === 'string' ? karrioShipment.label_url : null;
    const trackingUrl = typeof karrioShipment?.tracking_url === 'string' ? karrioShipment.tracking_url : null;
    const karrioShipmentId = karrioShipment?.id ? String(karrioShipment.id) : undefined;
    const normalizedStatus = typeof karrioShipment?.status === 'string' ? karrioShipment.status : 'created';
    const protocolUrl = this.extractProtocolUrl(karrioShipment);

    const timestampData: Record<string, Date> = {};
    if (['shipped', 'in_transit', 'out_for_delivery', 'delivered'].includes(normalizedStatus)) {
      timestampData.shippedAt = new Date();
    }
    if (normalizedStatus === 'delivered') {
      timestampData.deliveredAt = new Date();
    }

    return this.runTenant(tenantId, (db) =>
      db.shipment.create({
        data: {
          order: { connect: { id: orderId } },
          tenant: { connect: { id: tenantId } },
          ...(carrierName ? { carrier: carrierName } : {}),
          ...(trackingNumber ? { trackingNo: trackingNumber } : {}),
          status: normalizedStatus,
          ...(labelUrl ? { labelUrl } : {}),
          ...(trackingUrl ? { trackingUrl } : {}),
          ...(karrioShipmentId ? { karrioShipmentId } : {}),
          ...(protocolUrl ? { protocolUrl } : {}),
          ...(weightDecimal ? { weight: weightDecimal } : {}),
          ...(dimensionValue !== undefined ? { dimensions: dimensionValue } : {}),
          rate: toPrismaJsonValue(karrioShipment?.selected_rate ?? null),
          meta: toPrismaJsonValue(karrioShipment?.meta ?? null),
          ...timestampData,
        },
      }),
    );
  }

  async track(tenantId: string, carrier: string, trackingNo: string) {
    if (!carrier || !trackingNo) {
      throw new BadRequestException('Carrier and tracking number are required');
    }

    const normalizedCarrier = carrier.trim();
    const normalizedTracking = trackingNo.trim();
    if (!normalizedCarrier || !normalizedTracking) {
      throw new BadRequestException('Carrier and tracking number are required');
    }

    const scopedTenantId = tenantId && tenantId !== 'system' ? tenantId : null;
    if (scopedTenantId) {
      const shipmentExists = await this.runTenant(scopedTenantId, (db) =>
        db.shipment.findFirst({
          where: {
            carrier: normalizedCarrier,
            trackingNo: normalizedTracking,
          },
          select: { id: true },
        }),
      );

      if (!shipmentExists) {
        throw new NotFoundException('Shipment not found for tenant');
      }
    }

    return this.karrio.trackShipment(normalizedCarrier, normalizedTracking);
  }

  private async _mapOrderToKarrioPayload(tenantId: string, order: any, parcels: ParcelInput[]) {
    const shipper = {
      company_name: process.env.SHIPPING_ORIGIN_COMPANY_NAME || 'Your Company',
      address_line1: process.env.SHIPPING_ORIGIN_ADDRESS_LINE1 || '123 Main St',
      city: process.env.SHIPPING_ORIGIN_CITY || 'Istanbul',
      postal_code: process.env.SHIPPING_ORIGIN_POSTAL_CODE || '34000',
      country_code: (process.env.SHIPPING_ORIGIN_COUNTRY_CODE || 'TR').toUpperCase(),
      person_name: process.env.SHIPPING_ORIGIN_PERSON_NAME || 'John Doe',
      phone: process.env.SHIPPING_ORIGIN_PHONE || '+905551234567',
    };

    const shippingAddress = ((order as any)?.shippingAddress ?? {}) as Record<string, any>;
    const billingAddress = ((order as any)?.billingAddress ?? {}) as Record<string, any>;
    const destination = Object.keys(shippingAddress).length > 0 ? shippingAddress : billingAddress;

    const recipientFirstName =
      (destination?.firstName || destination?.first_name || '') as string;
    const recipientLastName =
      (destination?.lastName || destination?.last_name || '') as string;
    const personName = `${recipientFirstName} ${recipientLastName}`.trim();

    const metadata: Record<string, string> = {
      orderId: String(order.id),
      tenantId,
    };
    if (order.orderNumber) {
      metadata.orderNumber = String(order.orderNumber);
    }
    if (order.externalOrderNo) {
      metadata.externalOrderNo = String(order.externalOrderNo);
    }
    if (order.storeId) {
      metadata.storeId = String(order.storeId);
    }

    const countryCode = (destination?.country || destination?.countryCode || destination?.country_code || 'TR')
      .toString()
      .toUpperCase();

    return {
      shipper,
      recipient: {
        company_name: destination?.company || order.customerName || undefined,
        address_line1: destination?.addressLine1 || destination?.address1,
        address_line2: destination?.addressLine2 || destination?.address2,
        city: destination?.city,
        postal_code: destination?.postalCode || destination?.postcode || destination?.zip,
        country_code: countryCode,
        state_code: destination?.state || destination?.province || destination?.stateCode,
        person_name: personName || order.customerName || undefined,
        phone: destination?.phone || order.customerPhone || undefined,
        email: destination?.email || order.customerEmail || undefined,
      },
      parcels,
      reference: metadata.orderNumber || metadata.externalOrderNo || String(order.id),
      metadata,
    };
  }

  private sanitizeParcels(parcels: any[] | undefined): ParcelInput[] {
    if (!Array.isArray(parcels) || parcels.length === 0) {
      throw new BadRequestException('At least one parcel is required to request carrier rates');
    }

    return parcels.map((parcel, index) => {
      const weightValue = Number(parcel?.weight?.value);
      if (!Number.isFinite(weightValue) || weightValue <= 0) {
        throw new BadRequestException(`Parcel ${index + 1} must include a positive weight value`);
      }

      const rawDimensions = parcel?.dimensions;
      const length = Number(rawDimensions?.length);
      const width = Number(rawDimensions?.width);
      const height = Number(rawDimensions?.height);
      const dimensionsValid = [length, width, height].every(
        (value) => Number.isFinite(value) && value > 0,
      );

      if (!dimensionsValid) {
        throw new BadRequestException(`Parcel ${index + 1} must include positive dimensions`);
      }

      return {
        ...parcel,
        weight: {
          unit: parcel?.weight?.unit || 'KG',
          value: weightValue,
        },
        dimensions: {
          ...rawDimensions,
          unit: rawDimensions?.unit || 'CM',
          length,
          width,
          height,
        },
      } as ParcelInput;
    });
  }

  private extractProtocolUrl(shipment: any): string | null {
    const documents = shipment?.documents;
    if (Array.isArray(documents)) {
      const prioritized = documents.find((doc: any) => {
        if (!doc || typeof doc?.url !== 'string') {
          return false;
        }
        const type = typeof doc.type === 'string' ? doc.type.toLowerCase() : '';
        return ['commercial_invoice', 'shipment_details', 'protocol'].includes(type);
      });
      if (prioritized?.url) {
        return prioritized.url;
      }

      const firstWithUrl = documents.find((doc: any) => doc && typeof doc?.url === 'string');
      if (firstWithUrl?.url) {
        return firstWithUrl.url;
      }
    }

    if (shipment?.docs && typeof shipment.docs === 'object' && shipment.docs !== null) {
      const protocolUrl = (shipment.docs as Record<string, any>).protocol_url;
      if (typeof protocolUrl === 'string') {
        return protocolUrl;
      }
    }

    if (typeof shipment?.protocol_url === 'string') {
      return shipment.protocol_url;
    }

    return null;
  }
}