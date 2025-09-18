import { User as PrismaUser } from '@prisma/client';

export class User implements PrismaUser {
  id!: string;
  tenantId!: string | null;
  email!: string;
  name!: string | null;
  firstName!: string | null;
  lastName!: string | null;
  passwordHash!: string;
  role!: string;
  twofaSecret!: string | null;
  twofaEnabled!: boolean;
  temp2faToken!: string | null;
  temp2faTokenExpires!: Date | null;
  lastLoginAt!: Date | null;
  failedAttempts!: number;
  lockedUntil!: Date | null;
  isActive!: boolean;
  notificationPreferences!: any;
  createdAt!: Date;
  updatedAt!: Date;
  stores?: Array<{ id: string; name: string; status: string }>;
  tenant?: { id: string; name: string; slug: string };
  sessions?: Array<{ id: string; token: string; createdAt: Date }>;
  auditLogs?: Array<{ id: string; action: string; createdAt: Date }>;
  requests?: Array<{ id: string; type: string; createdAt: Date }>;
  requestComments?: Array<{ id: string; content: string; createdAt: Date }>;
  supportTickets?: Array<{ id: string; subject: string; status: string }>;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}