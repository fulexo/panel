"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { formatCurrency, formatNumber, CurrencyFormatOptions, NumberFormatOptions } from '@/lib/formatters';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  locale: string;
  rate: number; // Exchange rate from EUR
}

export interface CurrencyContextType {
  // Current currency
  currentCurrency: Currency;
  setCurrentCurrency: (currency: Currency) => void;
  
  // Available currencies
  availableCurrencies: Currency[];
  
  // Formatting functions
  formatCurrency: (amount: number | null | undefined, options?: CurrencyFormatOptions) => string;
  formatNumber: (value: number | null | undefined, options?: NumberFormatOptions) => string;
  
  // Conversion functions
  convertFromEUR: (amount: number) => number;
  convertToEUR: (amount: number) => number;
  
  // Loading state
  isLoading: boolean;
  error: string | null;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Default currencies with EUR as base
const DEFAULT_CURRENCIES: Currency[] = [
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    locale: 'en-US',
    rate: 1.0,
  },
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    locale: 'en-US',
    rate: 1.08, // Example rate
  },
  {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    locale: 'en-GB',
    rate: 0.85, // Example rate
  },
  {
    code: 'TRY',
    name: 'Turkish Lira',
    symbol: '₺',
    locale: 'tr-TR',
    rate: 33.5, // Example rate
  },
];

interface CurrencyProviderProps {
  children: ReactNode;
  defaultCurrency?: string;
}

export function CurrencyProvider({ children, defaultCurrency = 'EUR' }: CurrencyProviderProps) {
  const [currentCurrency, setCurrentCurrencyState] = useState<Currency>(() => {
    const found = DEFAULT_CURRENCIES.find(c => c.code === defaultCurrency);
    if (found) return found;
    const firstCurrency = DEFAULT_CURRENCIES[0];
    if (firstCurrency) return firstCurrency;
    // Fallback if DEFAULT_CURRENCIES is empty (shouldn't happen)
    return {
      code: 'EUR',
      name: 'Euro',
      symbol: '€',
      locale: 'en-US',
      rate: 1.0,
    };
  });
  const [availableCurrencies, setAvailableCurrencies] = useState<Currency[]>(DEFAULT_CURRENCIES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load exchange rates on mount
  useEffect(() => {
    loadExchangeRates();
  }, []);

  const loadExchangeRates = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real application, you would fetch from an API
      // For now, we'll use mock data
      const mockRates = {
        USD: 1.08,
        GBP: 0.85,
        TRY: 33.5,
        EUR: 1.0,
      };

      const updatedCurrencies = DEFAULT_CURRENCIES.map(currency => ({
        ...currency,
        rate: mockRates[currency.code as keyof typeof mockRates] || currency.rate,
      }));

      setAvailableCurrencies(updatedCurrencies);
      
      // Update current currency with new rate
      const updatedCurrentCurrency = updatedCurrencies.find(c => c.code === currentCurrency.code);
      if (updatedCurrentCurrency) {
        setCurrentCurrencyState(updatedCurrentCurrency);
      }
    } catch (err) {
      setError('Failed to load exchange rates');
      console.error('Currency rate loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const setCurrentCurrency = (currency: Currency) => {
    setCurrentCurrencyState(currency);
    // Store in localStorage for persistence
    localStorage.setItem('preferred-currency', currency.code);
  };

  // Load preferred currency from localStorage on mount
  useEffect(() => {
    const savedCurrency = localStorage.getItem('preferred-currency');
    if (savedCurrency) {
      const currency = availableCurrencies.find(c => c.code === savedCurrency);
      if (currency) {
        setCurrentCurrencyState(currency);
      }
    }
  }, [availableCurrencies]);

  // Currency formatting functions
  const formatCurrencyAmount = (amount: number | null | undefined, options?: CurrencyFormatOptions) => {
    const convertedAmount = amount ? convertFromEUR(amount) : 0;
    return formatCurrency(convertedAmount, {
      currency: currentCurrency.code,
      locale: currentCurrency.locale,
      ...options,
    });
  };

  const formatNumberAmount = (value: number | null | undefined, options?: NumberFormatOptions) => {
    return formatNumber(value, {
      locale: currentCurrency.locale,
      ...options,
    });
  };

  // Conversion functions
  const convertFromEUR = (amount: number): number => {
    return amount * currentCurrency.rate;
  };

  const convertToEUR = (amount: number): number => {
    return amount / currentCurrency.rate;
  };

  const value: CurrencyContextType = {
    currentCurrency,
    setCurrentCurrency,
    availableCurrencies,
    formatCurrency: formatCurrencyAmount,
    formatNumber: formatNumberAmount,
    convertFromEUR,
    convertToEUR,
    isLoading,
    error,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextType {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

export function useCurrencyOptional(): CurrencyContextType | undefined {
  return useContext(CurrencyContext);
}

// Hook for currency selection component
export function useCurrencySelector() {
  const { currentCurrency, availableCurrencies, setCurrentCurrency, isLoading } = useCurrency();
  
  return {
    currentCurrency,
    availableCurrencies,
    setCurrentCurrency,
    isLoading,
  };
}

// Hook for currency formatting
export function useCurrencyFormat() {
  const { formatCurrency, formatNumber, currentCurrency } = useCurrency();
  
  return {
    formatCurrency,
    formatNumber,
    currency: currentCurrency,
  };
}

export default CurrencyProvider;
