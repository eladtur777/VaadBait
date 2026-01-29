// Account model - represents personal household or committee account
export interface Account {
  id?: number;
  name: string; // e.g., "משק הבית שלי", "ועד בית רחוב הרצל 15"
  type: 'personal' | 'committee';
  created_at?: number; // Unix timestamp
}

// Type for creating a new account
export type CreateAccountInput = Omit<Account, 'id' | 'created_at'>;

// Type for updating an account
export type UpdateAccountInput = Partial<Omit<Account, 'id' | 'created_at'>>;
