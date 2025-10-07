"use client";

import { useCurrencySelector } from '@/contexts/CurrencyProvider';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CurrencySelectorProps {
  className?: string;
  variant?: 'default' | 'compact' | 'minimal';
  showFlag?: boolean;
}

export function CurrencySelector({ 
  className, 
  variant = 'default',
  showFlag = true 
}: CurrencySelectorProps) {
  const { 
    currentCurrency, 
    availableCurrencies, 
    setCurrentCurrency, 
    isLoading 
  } = useCurrencySelector();

  const handleCurrencyChange = (currencyCode: string) => {
    const currency = availableCurrencies.find(c => c.code === currencyCode);
    if (currency) {
      setCurrentCurrency(currency);
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'compact':
        return 'h-7 px-2 text-xs';
      case 'minimal':
        return 'h-6 px-1 text-xs border-0 shadow-none';
      default:
        return 'h-8 px-3';
    }
  };

  const getCurrencyFlag = (code: string) => {
    const flags: Record<string, string> = {
      'USD': '🇺🇸',
      'EUR': '🇪🇺',
      'GBP': '🇬🇧',
      'TRY': '🇹🇷',
      'JPY': '🇯🇵',
      'CAD': '🇨🇦',
      'AUD': '🇦🇺',
      'CHF': '🇨🇭',
      'CNY': '🇨🇳',
      'INR': '🇮🇳',
    };
    return flags[code] || '🌍';
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading currencies...</span>
      </div>
    );
  }

  return (
    <Select value={currentCurrency.code} onValueChange={handleCurrencyChange}>
      <SelectTrigger className={cn(
        'flex items-center gap-2 justify-between min-w-[120px]',
        getVariantClasses(),
        className
      )}>
        <div className="flex items-center gap-2">
          {showFlag && (
            <span className="text-sm">
              {getCurrencyFlag(currentCurrency.code)}
            </span>
          )}
          <SelectValue placeholder="Select currency" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {availableCurrencies.map((currency) => (
          <SelectItem key={currency.code} value={currency.code}>
            <div className="flex items-center gap-3">
              {showFlag && (
                <span className="text-lg">
                  {getCurrencyFlag(currency.code)}
                </span>
              )}
              <div className="flex flex-col">
                <span className="font-medium">{currency.code}</span>
                <span className="text-muted-foreground text-xs">
                  {currency.name}
                </span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}