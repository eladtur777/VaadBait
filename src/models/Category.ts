// Category model - represents transaction categories
export interface Category {
  id?: number;
  account_id?: number; // Null for default system categories
  name_he: string; // Hebrew name
  name_en: string; // English name
  type: 'income' | 'expense';
  icon: string; // Material icon name
  color: string; // Hex color code
  is_default: boolean; // System default category (cannot be deleted)
}

// Type for creating a new category
export type CreateCategoryInput = Omit<Category, 'id'>;

// Type for updating a category
export type UpdateCategoryInput = Partial<Omit<Category, 'id' | 'is_default'>>;
