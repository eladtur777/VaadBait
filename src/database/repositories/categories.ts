import { getDatabase } from '../db';
import { Category, CreateCategoryInput, UpdateCategoryInput } from '../../models';

// Category Repository
export const CategoryRepository = {
  // Create a new category
  create: (category: CreateCategoryInput): number => {
    const db = getDatabase();
    const result = db.runSync(
      `INSERT INTO categories (
        account_id, name_he, name_en, type, icon, color, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        category.account_id || null,
        category.name_he,
        category.name_en,
        category.type,
        category.icon,
        category.color,
        category.is_default ? 1 : 0,
      ]
    );
    return result.lastInsertRowId;
  },

  // Get category by ID
  findById: (id: number): Category | null => {
    const db = getDatabase();
    const row = db.getFirstSync<any>(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );
    if (!row) return null;
    return {
      ...row,
      account_id: row.account_id || undefined,
      is_default: row.is_default === 1,
    };
  },

  // Get all categories
  findAll: (): Category[] => {
    const db = getDatabase();
    const rows = db.getAllSync<any>('SELECT * FROM categories ORDER BY type, name_he');
    return rows.map(row => ({
      ...row,
      account_id: row.account_id || undefined,
      is_default: row.is_default === 1,
    }));
  },

  // Get categories by type (income or expense)
  findByType: (type: 'income' | 'expense'): Category[] => {
    const db = getDatabase();
    const rows = db.getAllSync<any>(
      'SELECT * FROM categories WHERE type = ? ORDER BY name_he',
      [type]
    );
    return rows.map(row => ({
      ...row,
      account_id: row.account_id || undefined,
      is_default: row.is_default === 1,
    }));
  },

  // Get categories for a specific account (including global categories)
  findByAccountId: (accountId: number): Category[] => {
    const db = getDatabase();
    const rows = db.getAllSync<any>(
      'SELECT * FROM categories WHERE account_id IS NULL OR account_id = ? ORDER BY type, name_he',
      [accountId]
    );
    return rows.map(row => ({
      ...row,
      account_id: row.account_id || undefined,
      is_default: row.is_default === 1,
    }));
  },

  // Get only default system categories
  findDefaults: (): Category[] => {
    const db = getDatabase();
    const rows = db.getAllSync<any>(
      'SELECT * FROM categories WHERE is_default = 1 ORDER BY type, name_he'
    );
    return rows.map(row => ({
      ...row,
      account_id: row.account_id || undefined,
      is_default: true,
    }));
  },

  // Update category
  update: (id: number, updates: UpdateCategoryInput): void => {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name_he !== undefined) {
      fields.push('name_he = ?');
      values.push(updates.name_he);
    }
    if (updates.name_en !== undefined) {
      fields.push('name_en = ?');
      values.push(updates.name_en);
    }
    if (updates.type !== undefined) {
      fields.push('type = ?');
      values.push(updates.type);
    }
    if (updates.icon !== undefined) {
      fields.push('icon = ?');
      values.push(updates.icon);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }

    if (fields.length === 0) return;

    values.push(id);
    const sql = `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`;
    db.runSync(sql, values);
  },

  // Delete category (only if not default and no transactions using it)
  delete: (id: number): boolean => {
    const db = getDatabase();

    // Check if it's a default category
    const category = CategoryRepository.findById(id);
    if (!category) return false;
    if (category.is_default) {
      throw new Error('Cannot delete default category');
    }

    // Check if any transactions use this category
    const transactionCount = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?',
      [id]
    );

    if (transactionCount && transactionCount.count > 0) {
      throw new Error('Cannot delete category that has transactions');
    }

    db.runSync('DELETE FROM categories WHERE id = ?', [id]);
    return true;
  },

  // Check if category name already exists
  existsByName: (nameHe: string, accountId?: number): boolean => {
    const db = getDatabase();
    const result = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM categories WHERE name_he = ? AND (account_id IS NULL OR account_id = ?)',
      [nameHe, accountId || null]
    );
    return result ? result.count > 0 : false;
  },
};
