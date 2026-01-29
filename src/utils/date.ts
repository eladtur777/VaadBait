import { format, parse, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { he } from 'date-fns/locale';

/**
 * Format Unix timestamp to Hebrew date string
 * Example: 1704067200 => "1 בינואר 2024"
 */
export const formatDate = (timestamp: number, formatString: string = 'dd MMMM yyyy'): string => {
  return format(new Date(timestamp * 1000), formatString, { locale: he });
};

/**
 * Format date for display (short format)
 * Example: "01/01/2024"
 */
export const formatDateShort = (timestamp: number): string => {
  return format(new Date(timestamp * 1000), 'dd/MM/yyyy');
};

/**
 * Format date and time
 * Example: "01/01/2024 14:30"
 */
export const formatDateTime = (timestamp: number): string => {
  return format(new Date(timestamp * 1000), 'dd/MM/yyyy HH:mm');
};

/**
 * Format relative date (today, yesterday, date)
 */
export const formatRelativeDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'היום';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'אתמול';
  } else {
    return formatDateShort(timestamp);
  }
};

/**
 * Get current timestamp (Unix seconds)
 */
export const getCurrentTimestamp = (): number => {
  return Math.floor(Date.now() / 1000);
};

/**
 * Convert Date object to Unix timestamp
 */
export const dateToTimestamp = (date: Date): number => {
  return Math.floor(date.getTime() / 1000);
};

/**
 * Convert Unix timestamp to Date object
 */
export const timestampToDate = (timestamp: number): Date => {
  return new Date(timestamp * 1000);
};

/**
 * Get start of month timestamp
 */
export const getStartOfMonth = (date: Date = new Date()): number => {
  return dateToTimestamp(startOfMonth(date));
};

/**
 * Get end of month timestamp
 */
export const getEndOfMonth = (date: Date = new Date()): number => {
  return dateToTimestamp(endOfMonth(date));
};

/**
 * Get start of year timestamp
 */
export const getStartOfYear = (date: Date = new Date()): number => {
  return dateToTimestamp(startOfYear(date));
};

/**
 * Get end of year timestamp
 */
export const getEndOfYear = (date: Date = new Date()): number => {
  return dateToTimestamp(endOfYear(date));
};

/**
 * Get month name in Hebrew
 */
export const getMonthNameHebrew = (monthIndex: number): string => {
  const months = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];
  return months[monthIndex] || '';
};

/**
 * Get current month and year in Hebrew
 * Example: "ינואר 2024"
 */
export const getCurrentMonthYear = (): string => {
  const now = new Date();
  return `${getMonthNameHebrew(now.getMonth())} ${now.getFullYear()}`;
};

/**
 * Parse date string to timestamp
 */
export const parseDateString = (dateString: string, formatString: string = 'dd/MM/yyyy'): number => {
  const date = parse(dateString, formatString, new Date());
  return dateToTimestamp(date);
};

/**
 * Check if date is in the past
 */
export const isPastDate = (timestamp: number): boolean => {
  return timestamp < getCurrentTimestamp();
};

/**
 * Get days between two timestamps
 */
export const getDaysBetween = (start: number, end: number): number => {
  return Math.floor((end - start) / (24 * 60 * 60));
};
