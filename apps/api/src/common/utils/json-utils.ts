import { InputJsonValue } from '@prisma/client/runtime/library';

/**
 * Converts a Record<string, unknown> to Prisma's InputJsonValue type
 */
export function toPrismaJson(value: Record<string, unknown> | null | undefined): InputJsonValue | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  return value as InputJsonValue;
}

/**
 * Converts any value to Prisma's InputJsonValue type
 */
export function toPrismaJsonValue(value: unknown): InputJsonValue | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  return value as InputJsonValue;
}