/**
 * Utility functions for formatting numbers consistently across the application
 */

/**
 * Format number with commas for thousands and specific decimal places
 * @param num - Number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string with commas and decimals
 */
export function formatNumber(num: number, decimals: number = 1): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Format currency with commas and 2 decimal places
 * @param num - Number to format as currency
 * @returns Formatted string with $ symbol, commas and 2 decimals
 */
export function formatCurrency(num: number): string {
  return `$${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Format weight in kilograms with 1 decimal place
 * @param num - Number to format as weight
 * @returns Formatted string with commas and 1 decimal
 */
export function formatWeight(num: number): string {
  return formatNumber(num, 1);
}

/**
 * Format count/quantity with no decimals
 * @param num - Number to format as count
 * @returns Formatted string with commas and no decimals
 */
export function formatCount(num: number): string {
  return formatNumber(num, 0);
}

/**
 * Format percentage with 1 decimal place
 * @param num - Number to format as percentage (already as percentage, not decimal)
 * @returns Formatted string with % symbol
 */
export function formatPercentage(num: number): string {
  return `${formatNumber(num, 1)}%`;
}