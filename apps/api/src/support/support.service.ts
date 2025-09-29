import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';
import { CreateSupportMessageDto } from './dto/create-support-message.dto';
import { SupportTicketQueryDto } from './dto/support-ticket-query.dto';

interface CurrentUser {
  id: string;
  role: string;
  tenantId: string;
}

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  private buildTenantFilter(tenantId: string): Prisma.SupportTicketWhereInput {
    return {
      OR: [
        { store: { customer: { tenantId } } },
        { customer: { tenantId } },
      ],
    };
  }

  private sanitizeTicket(ticket: any) {
    const { store, customer, ...rest } = ticket;

    return {
      ...rest,
      store: store
        ? {
            id: store.id,
            name: store.name,
          }
        : null,
      customer: customer
        ? {
            id: customer.id,
            email: customer.email,
            firstName: customer.firstName,
            lastName: customer.lastName,
          }
        : null,
    };
  }

  private sanitizeMessage(message: any, authorMap: Map<string, { id: string; name: string; role: string; email: string | null }>) {
    const authorInfo = authorMap.get(message.authorId) || {
      id: message.authorId,
      name: 'Unknown User',
      role: 'UNKNOWN',
      email: null,
    };

    return {
      id: message.id,
      ticketId: message.ticketId,
      authorId: message.authorId,
      message: message.message,
      isInternal: message.isInternal,
      createdAt: message.createdAt,
      author: authorInfo,
    };
  }

  private async ensureStoreAccess(storeId: string, tenantId: string, user: CurrentUser) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: {
        customer: {
          select: {
            id: true,
            tenantId: true,
          },
        },
      },
    });

    if (!store || store.customer.tenantId !== tenantId) {
      throw new BadRequestException('Store not found');
    }

    if (user.role === 'CUSTOMER' && store.customer.id !== user.id) {
      throw new ForbiddenException('You do not have access to this store');
    }

    return store;
  }

  private async ensureCustomerAccess(customerId: string, tenantId: string) {
    const customer = await this.prisma.user.findUnique({
      where: { id: customerId },
      select: { id: true, tenantId: true },
    });

    if (!customer || customer.tenantId !== tenantId) {
      throw new BadRequestException('Customer not found');
    }

    return customer;
  }

  private async ensureTicketAccess(id: string, tenantId: string, role: string, userId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            customer: {
              select: {
                id: true,
                tenantId: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            tenantId: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    const belongsToTenant =
      (ticket.store && ticket.store.customer?.tenantId === tenantId) ||
      (ticket.customer && ticket.customer.tenantId === tenantId);

    if (!belongsToTenant) {
      throw new NotFoundException('Support ticket not found');
    }

    if (role === 'CUSTOMER') {
      const ownsTicket = ticket.customerId === userId || ticket.store?.customer?.id === userId;
      if (!ownsTicket) {
        throw new ForbiddenException('You do not have access to this support ticket');
      }
    }

    return ticket;
  }

  async listTickets(tenantId: string, query: SupportTicketQueryDto, role: string, userId: string) {
    const safePage = Number.isFinite(Number(query.page)) && Number(query.page) > 0 ? Number(query.page) : 1;
    const safeLimit = Number.isFinite(Number(query.limit)) && Number(query.limit) > 0 ? Math.min(Number(query.limit), 100) : 20;
    const skip = (safePage - 1) * safeLimit;

    const filters: Prisma.SupportTicketWhereInput[] = [this.buildTenantFilter(tenantId)];

    if (role === 'CUSTOMER') {
      filters.push({
        OR: [
          { customerId: userId },
          { store: { customerId: userId } },
        ],
      });
    }

    if (query.storeId) {
      filters.push({ storeId: query.storeId });
    }

    if (query.status) {
      filters.push({ status: query.status });
    }

    if (query.priority) {
      filters.push({ priority: query.priority });
    }

    if (query.search) {
      const searchTerm = query.search.trim();
      if (searchTerm) {
        filters.push({
          OR: [
            { subject: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
            { description: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
          ],
        });
      }
    }

    const where: Prisma.SupportTicketWhereInput = filters.length > 1 ? { AND: filters } : filters[0];

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: safeLimit,
        include: {
          store: {
            select: {
              id: true,
              name: true,
              customer: {
                select: {
                  id: true,
                  tenantId: true,
                },
              },
            },
          },
          customer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              tenantId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      data: tickets.map((ticket) => this.sanitizeTicket(ticket)),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
      },
    };
  }

  async getTicket(tenantId: string, id: string, role: string, userId: string) {
    const ticket = await this.ensureTicketAccess(id, tenantId, role, userId);
    return this.sanitizeTicket(ticket);
  }

  async createTicket(tenantId: string, dto: CreateSupportTicketDto, user: CurrentUser) {
    if (dto.storeId) {
      await this.ensureStoreAccess(dto.storeId, tenantId, user);
    }

    let customerId = dto.customerId;

    if (!customerId && user.role === 'CUSTOMER') {
      customerId = user.id;
    }

    if (!customerId) {
      throw new BadRequestException('Customer is required for support tickets');
    }

    await this.ensureCustomerAccess(customerId, tenantId);

    const ticket = await this.prisma.supportTicket.create({
      data: {
        subject: dto.subject,
        description: dto.description,
        priority: dto.priority ?? 'normal',
        status: 'open',
        storeId: dto.storeId ?? null,
        customerId,
        assignedTo: null,
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            customer: {
              select: {
                id: true,
                tenantId: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            tenantId: true,
          },
        },
      },
    });

    return this.sanitizeTicket(ticket);
  }

  async updateTicket(tenantId: string, id: string, dto: UpdateSupportTicketDto, role: string, userId: string) {
    if (role !== 'ADMIN') {
      throw new ForbiddenException('Only administrators can update support tickets');
    }

    const ticket = await this.ensureTicketAccess(id, tenantId, role, userId);

    if (dto.assignedTo) {
      await this.ensureCustomerAccess(dto.assignedTo, tenantId);
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: dto.status ?? ticket.status,
        priority: dto.priority ?? ticket.priority,
        assignedTo: dto.assignedTo ?? ticket.assignedTo,
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            customer: {
              select: {
                id: true,
                tenantId: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            tenantId: true,
          },
        },
      },
    });

    return this.sanitizeTicket(updated);
  }

  async getMessages(tenantId: string, id: string, role: string, userId: string) {
    await this.ensureTicketAccess(id, tenantId, role, userId);

    const messages = await this.prisma.supportMessage.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: 'asc' },
    });

    const authorIds = Array.from(new Set(messages.map((message) => message.authorId)));
    let authors: Array<{ id: string; email: string | null; firstName: string | null; lastName: string | null; role: string }>; 

    if (authorIds.length > 0) {
      authors = await this.prisma.user.findMany({
        where: { id: { in: authorIds } },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });
    } else {
      authors = [];
    }

    const authorMap = new Map<string, { id: string; name: string; role: string; email: string | null }>();
    authors.forEach((author) => {
      const name = author.firstName || author.lastName ? `${author.firstName ?? ''} ${author.lastName ?? ''}`.trim() : author.email ?? 'User';
      authorMap.set(author.id, {
        id: author.id,
        name,
        role: author.role,
        email: author.email,
      });
    });

    return messages.map((message) => this.sanitizeMessage(message, authorMap));
  }

  async addMessage(tenantId: string, id: string, user: CurrentUser, dto: CreateSupportMessageDto) {
    await this.ensureTicketAccess(id, tenantId, user.role, user.id);

    const message = await this.prisma.supportMessage.create({
      data: {
        ticketId: id,
        authorId: user.id,
        message: dto.message,
        isInternal: dto.isInternal === true && user.role === 'ADMIN',
      },
    });

    const author = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    const authorName = author && (author.firstName || author.lastName)
      ? `${author.firstName ?? ''} ${author.lastName ?? ''}`.trim()
      : author?.email ?? 'User';

    const authorMap = new Map<string, { id: string; name: string; role: string; email: string | null }>([
      [
        user.id,
        {
          id: user.id,
          name: authorName,
          role: author?.role ?? user.role,
          email: author?.email ?? null,
        },
      ],
    ]);

    return this.sanitizeMessage(message, authorMap);
  }
}
