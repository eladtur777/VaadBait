import { z } from 'zod';

// Validation schemas using Zod (similar to Python's Pydantic)

/**
 * Email validation
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Phone number validation (Israeli format)
 * Accepts: 0501234567, 050-1234567, 050-123-4567, +972501234567
 */
export const isValidIsraeliPhone = (phone: string): boolean => {
  // Remove spaces and dashes
  const cleaned = phone.replace(/[\s-]/g, '');

  // Israeli mobile: 05X-XXXXXXX
  // Israeli landline: 0X-XXXXXXX or 0XX-XXXXXXX
  const israeliRegex = /^(\+972|0)([2-9]\d{7,8})$/;

  return israeliRegex.test(cleaned);
};

/**
 * Amount validation (must be positive number)
 */
export const isValidAmount = (amount: number | string): boolean => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(num) && isFinite(num) && num > 0;
};

/**
 * Transaction validation schema
 */
export const transactionSchema = z.object({
  account_id: z.number().int().positive(),
  category_id: z.number().int().positive(),
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('הסכום חייב להיות חיובי'),
  currency: z.string().default('ILS'),
  date: z.number().int(),
  description: z.string().optional(),
  receipt_path: z.string().optional(),
  is_recurring: z.boolean().default(false),
  recurring_frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
});

/**
 * Category validation schema
 */
export const categorySchema = z.object({
  name_he: z.string().min(1, 'שם הקטגוריה בעברית הוא שדה חובה'),
  name_en: z.string().min(1, 'Category name in English is required'),
  type: z.enum(['income', 'expense']),
  icon: z.string().min(1),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'צבע לא תקין'),
  account_id: z.number().int().positive().optional(),
  is_default: z.boolean().default(false),
});

/**
 * Resident validation schema
 */
export const residentSchema = z.object({
  committee_account_id: z.number().int().positive(),
  apartment_number: z.string().min(1, 'מספר דירה הוא שדה חובה'),
  resident_name: z.string().min(1, 'שם הדייר הוא שדה חובה'),
  phone: z.string().optional().refine(
    (val) => !val || isValidIsraeliPhone(val),
    'מספר טלפון לא תקין'
  ),
  email: z.string().optional().refine(
    (val) => !val || isValidEmail(val),
    'כתובת אימייל לא תקינה'
  ),
  monthly_fee: z.number().nonnegative('דמי ועד חודשי חייבים להיות 0 או יותר'),
  join_date: z.number().int(),
  is_active: z.boolean().default(true),
});

/**
 * Payment validation schema
 */
export const paymentSchema = z.object({
  resident_id: z.number().int().positive(),
  amount: z.number().positive('הסכום חייב להיות חיובי'),
  due_date: z.number().int(),
  paid_date: z.number().int().optional(),
  status: z.enum(['pending', 'paid', 'overdue']),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Budget validation schema
 */
export const budgetSchema = z.object({
  account_id: z.number().int().positive(),
  category_id: z.number().int().positive(),
  amount: z.number().positive('סכום התקציב חייב להיות חיובי'),
  period: z.enum(['monthly', 'yearly']),
  start_date: z.number().int(),
});

/**
 * Account validation schema
 */
export const accountSchema = z.object({
  name: z.string().min(1, 'שם החשבון הוא שדה חובה'),
  type: z.enum(['personal', 'committee']),
});

/**
 * Validate and parse data using a schema
 */
export const validateData = <T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: string[];
} => {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => err.message);
      return { success: false, errors };
    }
    return { success: false, errors: ['שגיאת אימות'] };
  }
};
