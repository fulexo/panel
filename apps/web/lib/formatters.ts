export interface CurrencyFormatOptions {
  locale?: string;
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export interface NumberFormatOptions {
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Standart para formatlayıcı; amount değeri undefined/null ise 0 olarak yorumlar.
 */
export function formatCurrency(
  amount: number | null | undefined,
  {
    locale = "en-US",
    currency = "EUR",
    minimumFractionDigits,
    maximumFractionDigits,
  }: CurrencyFormatOptions = {}
) {
  const value = typeof amount === "number" ? amount : 0;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    ...(minimumFractionDigits !== undefined ? { minimumFractionDigits } : {}),
    ...(maximumFractionDigits !== undefined ? { maximumFractionDigits } : {}),
  }).format(value);
}

// Hook-based formatter that uses CurrencyProvider when available
export function useCurrencyFormatter() {
  try {
    // Try to import and use CurrencyProvider
    const { useCurrency } = require('@/contexts/CurrencyProvider');
    const { formatCurrency: contextFormatCurrency, formatNumber: contextFormatNumber } = useCurrency();
    return {
      formatCurrency: contextFormatCurrency,
      formatNumber: contextFormatNumber,
    };
  } catch {
    // Fallback to static formatters
    return {
      formatCurrency,
      formatNumber,
    };
  }
}

export function formatNumber(
  value: number | null | undefined,
  { locale = "en-US", minimumFractionDigits, maximumFractionDigits }: NumberFormatOptions = {}
) {
  const amount = typeof value === "number" ? value : 0;

  return new Intl.NumberFormat(locale, {
    ...(minimumFractionDigits !== undefined ? { minimumFractionDigits } : {}),
    ...(maximumFractionDigits !== undefined ? { maximumFractionDigits } : {}),
  }).format(amount);
}
