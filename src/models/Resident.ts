// Resident model - represents committee residents
export interface Resident {
  id?: number;
  committee_account_id: number;
  apartment_number: string; // e.g., "דירה 5", "קומה 2 דירה 3"
  resident_name: string;
  phone?: string;
  email?: string;
  monthly_fee: number; // Monthly committee fee amount
  join_date: number; // Unix timestamp
  is_active: boolean; // Active resident or moved out
}

// Type for creating a new resident
export type CreateResidentInput = Omit<Resident, 'id'>;

// Type for updating a resident
export type UpdateResidentInput = Partial<Omit<Resident, 'id'>>;
