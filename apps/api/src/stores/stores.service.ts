import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateStoreDto, UpdateStoreDto } from './dto/stores.dto';
import { WooCommerceService } from '../woocommerce/woo.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wooCommerceService: WooCommerceService,
  ) {}

  async findAll({ page, limit, search }: { page: number; limit: number; search?: string }, user?: any) {
    const safePage = Number.isFinite(Number(page)) && Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
    const skip = (safePage - 1) * safeLimit;
    
    // Build where clause based on user role
    const where: any = {};
    
    // Customer can only see their own stores
    if (user?.role === 'CUSTOMER') {
      where.customerId = user.id;
    }
    
    // Add search conditions
    if (search) {
      where.OR = [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { url: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { customer: { email: { contains: search, mode: Prisma.QueryMode.insensitive } } },
      ];
    }

    const [stores, total] = await Promise.all([
      this.prisma.store.findMany({
        where,
        skip,
        take: safeLimit,
        include: {
          customer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              orders: true,
              products: true,
              customers: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.store.count({ where }),
    ]);

    return {
      data: stores,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findOne(id: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            orders: true,
            products: true,
            customers: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return store;
  }

  async create(createStoreDto: CreateStoreDto) {
    // Check if customer exists
    const customer = await this.prisma.user.findUnique({
      where: { id: createStoreDto.customerId },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    // Check if customer already has a store
    const existingStore = await this.prisma.store.findFirst({
      where: { customerId: createStoreDto.customerId },
    });

    if (existingStore) {
      throw new BadRequestException('Customer already has a store');
    }

    // Test WooCommerce connection
    const connectionTest = await this.wooCommerceService.testConnection({
      url: createStoreDto.url,
      consumerKey: createStoreDto.consumerKey,
      consumerSecret: createStoreDto.consumerSecret,
    });

    if (!connectionTest.success) {
      throw new BadRequestException('WooCommerce connection failed');
    }

    const store = await this.prisma.store.create({
      data: {
        name: createStoreDto.name,
        url: createStoreDto.url,
        consumerKey: createStoreDto.consumerKey,
        consumerSecret: createStoreDto.consumerSecret,
        customerId: createStoreDto.customerId,
        status: 'connected',
        lastSyncAt: new Date(),
      },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return store;
  }

  async update(id: string, updateStoreDto: UpdateStoreDto) {
    const store = await this.findOne(id);

    // If updating connection details, test the connection
    if (updateStoreDto.url || updateStoreDto.consumerKey || updateStoreDto.consumerSecret) {
      const connectionTest = await this.wooCommerceService.testConnection({
        url: updateStoreDto.url || store.url,
        consumerKey: updateStoreDto.consumerKey || store.consumerKey,
        consumerSecret: updateStoreDto.consumerSecret || store.consumerSecret,
      });

      if (!connectionTest.success) {
        throw new BadRequestException('WooCommerce connection failed');
      }
    }

    const updatedStore = await this.prisma.store.update({
      where: { id },
      data: {
        ...updateStoreDto,
        status: 'connected',
        lastSyncAt: new Date(),
      },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return updatedStore;
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.store.delete({
      where: { id },
    });

    return { message: 'Store deleted successfully' };
  }

  async syncStore(id: string, tenantId: string) {
    const store = await this.findOne(id);

    if (store.status !== 'connected') {
      throw new BadRequestException('Store is not connected');
    }

    try {
      const syncResult = await this.wooCommerceService.syncStore(store, tenantId);
      
      await this.prisma.store.update({
        where: { id },
        data: {
          lastSyncAt: new Date(),
          syncStatus: 'success',
        },
      });

      return syncResult;
    } catch (error) {
      await this.prisma.store.update({
        where: { id },
        data: {
          syncStatus: 'error',
          lastError: (error as Error).message,
        },
      });

      throw new BadRequestException(`Sync failed: ${(error as Error).message}`);
    }
  }

  async testConnection(id: string) {
    const store = await this.findOne(id);

    const result = await this.wooCommerceService.testConnection({
      url: store.url,
      consumerKey: store.consumerKey,
      consumerSecret: store.consumerSecret,
    });

    // Update store status based on test result
    await this.prisma.store.update({
      where: { id },
      data: {
        status: result.success ? 'connected' : 'disconnected',
        lastError: result.success ? null : result.error,
      },
    });

    return result;
  }

  async getStoreStatus(id: string) {
    const store = await this.findOne(id);

    return {
      id: store.id,
      name: store.name,
      status: store.status,
      lastSyncAt: store.lastSyncAt,
      syncStatus: store.syncStatus,
      lastError: store.lastError,
      connectionTest: await this.testConnection(id),
    };
  }

  async findByCustomerId(customerId: string) {
    const store = await this.prisma.store.findFirst({
      where: { customerId },
      include: {
        _count: {
          select: {
            orders: true,
            products: true,
            customers: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException('Store not found for customer');
    }

    return store;
  }
}
