import { Prisma } from '@prisma/client';

export function toPrismaJsonValue(value: any): Prisma.InputJsonValue {
  if (value === null || value === undefined) {
    return Prisma.JsonNull;
  }
  return value as Prisma.InputJsonValue;
}

export function fromPrismaJsonValue<T = any>(value: Prisma.JsonValue): T {
  if (value === Prisma.JsonNull) {
    return null as T;
  }
  return value as T;
}