/**
 * Currency Formatter Utility
 * Formats numbers into currency strings according to the active workspace currency.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'AU$',
  JPY: '¥',
  AED: 'AED ',
  SGD: 'SG$',
};

export const getCurrencySymbol = (currencyCode: string = 'INR'): string => {
  const code = (currencyCode || 'INR').toUpperCase();
  return CURRENCY_SYMBOLS[code] || `${code} `;
};

export const formatCurrency = (
  amount: number | string | null | undefined,
  currencyCode: string = 'INR',
  options: { decimals?: number } = {}
): string => {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  if (isNaN(num)) return `${getCurrencySymbol(currencyCode)}0.00`;

  const decimals = options.decimals ?? 2;
  const symbol = getCurrencySymbol(currencyCode);

  const formattedNum = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);

  return `${symbol}${formattedNum}`;
};
