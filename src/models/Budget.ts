// Budget model - represents budget limits for categories
export interface Budget {
  id?: number;
  account_id: number;
  category_id: number;
  amount: number; // Budget limit amount
  period: 'monthly' | 'yearly';
  start_date: number; // Unix timestamp
}

// Type for creating a new budget
export type CreateBudgetInput = Omit<Budget, 'id'>;

// Type for updating a budget
export type UpdateBudgetInput = Partial<Omit<Budget, 'id'>>;
