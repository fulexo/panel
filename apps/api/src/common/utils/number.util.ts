export const parseOptionalInt = (value: unknown): number | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return undefined;
    }
    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) {
      return undefined;
    }
    return parsed;
  }

  return undefined;
};

export const parseOptionalPositiveInt = (value: unknown): number | undefined => {
  const parsed = parseOptionalInt(value);
  if (parsed === undefined || parsed <= 0) {
    return undefined;
  }
  return parsed;
};

export const normalizePage = (value: unknown, defaultValue = 1): number => {
  const parsed = parseOptionalPositiveInt(value);
  return parsed ?? defaultValue;
};

export const normalizeLimit = (value: unknown, defaultValue = 50, maxValue = 200): number => {
  const parsed = parseOptionalPositiveInt(value);
  if (parsed === undefined) {
    return defaultValue;
  }
  return Math.min(parsed, maxValue);
};
