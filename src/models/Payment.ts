// Payment model - represents committee fee payments
export interface Payment {
  id?: number;
  resident_id: number;
  amount: number;
  due_date: number; // Unix timestamp
  paid_date?: number; // Unix timestamp (null if not paid)
  status: 'pending' | 'paid' | 'overdue';
  payment_method?: string; // e.g., "מזומן", "העברה בנקאית", "צ'ק"
  notes?: string;
}

// Type for creating a new payment
export type CreatePaymentInput = Omit<Payment, 'id'>;

// Type for updating a payment
export type UpdatePaymentInput = Partial<Omit<Payment, 'id'>>;
