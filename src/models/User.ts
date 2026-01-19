// User model - represents app users
export interface User {
  id?: number;
  name: string;
  role: 'personal' | 'committee_admin';
  created_at?: number; // Unix timestamp
}

// Type for creating a new user
export type CreateUserInput = Omit<User, 'id' | 'created_at'>;

// Type for updating a user
export type UpdateUserInput = Partial<Omit<User, 'id' | 'created_at'>>;
