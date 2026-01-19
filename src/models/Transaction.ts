// Transaction model - represents income or expense transactions
export interface Transaction {
  id?: number;
  account_id: number;
  category_id: number;
  type: 'income' | 'expense';
  amount: number;
  currency: string; // Default: 'ILS' (Israeli Shekel ₪)
  date: number; // Unix timestamp
  description: string;
  receipt_path?: string; // Path to receipt image
  is_recurring: boolean;
  recurring_frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  created_at?: number; // Unix timestamp
  updated_at?: number; // Unix timestamp
}

// Type for creating a new transaction (without auto-generated fields)
export type CreateTransactionInput = Omit<Transaction, 'id' | 'created_at' | 'updated_at'>;

// Type for updating a transaction
export type UpdateTransactionInput = Partial<Omit<Transaction, 'id' | 'created_at'>>;
