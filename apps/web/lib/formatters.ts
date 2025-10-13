import { useCurrencyOptional } from '@/contexts/CurrencyProvider';

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
  const context = useCurrencyOptional();

  if (context) {
    return {
      formatCurrency: context.formatCurrency,
      formatNumber: context.formatNumber,
    };
  }

  return {
    formatCurrency,
    formatNumber,
  };
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
