import { Prisma } from '@prisma/client';

export function toPrismaJsonValue(value: unknown): Prisma.InputJsonValue {
  if (value === null || value === undefined) {
    return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
  }
  return value as Prisma.InputJsonValue;
}

export function fromPrismaJsonValue<T = unknown>(value: Prisma.JsonValue): T {
  if (value === Prisma.JsonNull as unknown) {
    return null as T;
  }
  return value as T;
}