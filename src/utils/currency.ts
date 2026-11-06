/**
 * Japanese Yen Currency and Number Formatting Utilities
 * Strictly integer yen formatting with no floating-point fractions.
 */

const jpyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 0,
});

/**
 * Formats a number into Japanese Yen currency format, e.g. "¥50,000" or "-¥1,200"
 */
export function formatYen(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '¥0';
  }
  const rounded = Math.round(amount);
  return jpyFormatter.format(rounded);
}

/**
 * Formats a pure integer with comma separation, e.g. "50,000"
 */
export function formatNumber(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0';
  }
  return numberFormatter.format(Math.round(amount));
}

/**
 * Parses a string input into a clean non-negative integer yen value
 */
export function parseYenInput(value: string | number): number {
  if (typeof value === 'number') {
    return Math.max(0, Math.round(value));
  }
  if (!value) return 0;
  // Remove currency signs, commas, whitespace
  const sanitized = value.replace(/[¥￥,\s]/g, '');
  const parsed = parseInt(sanitized, 10);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}
