import { User as PrismaUser } from '@prisma/client';

export class User implements PrismaUser {
  id!: string;
  tenantId!: string | null;
  email!: string;
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
  stores?: any[];
  tenant?: any;
  sessions?: any[];
  auditLogs?: any[];
  requests?: any[];
  requestComments?: any[];
  supportTickets?: any[];

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}