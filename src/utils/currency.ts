// Currency formatting utilities for Israeli Shekel (₪)

/**
 * Format number as currency (Israeli Shekel)
 * Example: 1234.56 => "₪1,234.56"
 */
export const formatCurrency = (amount: number, showSymbol: boolean = true): string => {
  const formatted = new Intl.NumberFormat('he-IL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return showSymbol ? `₪${formatted}` : formatted;
};

/**
 * Format number as currency without decimals
 * Example: 1234.56 => "₪1,235"
 */
export const formatCurrencyInt = (amount: number, showSymbol: boolean = true): string => {
  const rounded = Math.round(amount);
  const formatted = new Intl.NumberFormat('he-IL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded);

  return showSymbol ? `₪${formatted}` : formatted;
};

/**
 * Parse currency string to number
 * Example: "₪1,234.56" => 1234.56
 */
export const parseCurrency = (value: string): number => {
  // Remove currency symbol and commas
  const cleaned = value.replace(/[₪,]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Validate currency amount
 */
export const isValidAmount = (amount: number): boolean => {
  return !isNaN(amount) && isFinite(amount) && amount >= 0;
};

/**
 * Format amount with sign for income/expense
 * Example: (1000, 'income') => "+₪1,000.00"
 * Example: (1000, 'expense') => "-₪1,000.00"
 */
export const formatAmountWithSign = (
  amount: number,
  type: 'income' | 'expense'
): string => {
  const sign = type === 'income' ? '+' : '-';
  return `${sign}${formatCurrency(amount)}`;
};

/**
 * Get currency symbol
 */
export const getCurrencySymbol = (currency: string = 'ILS'): string => {
  const symbols: Record<string, string> = {
    ILS: '₪',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };
  return symbols[currency] || currency;
};
