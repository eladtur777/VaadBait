import { getDatabase } from '../db';
import { Transaction, CreateTransactionInput, UpdateTransactionInput } from '../../models';

// Transaction Repository - handles all database operations for transactions
// Similar to Python's Data Access Layer or ORM

export const TransactionRepository = {
  // Create a new transaction
  create: (transaction: CreateTransactionInput): number => {
    const db = getDatabase();
    const result = db.runSync(
      `INSERT INTO transactions (
        account_id, category_id, type, amount, currency, date,
        description, receipt_path, is_recurring, recurring_frequency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.account_id,
        transaction.category_id,
        transaction.type,
        transaction.amount,
        transaction.currency,
        transaction.date,
        transaction.description || null,
        transaction.receipt_path || null,
        transaction.is_recurring ? 1 : 0,
        transaction.recurring_frequency || null,
      ]
    );
    return result.lastInsertRowId;
  },

  // Get transaction by ID
  findById: (id: number): Transaction | null => {
    const db = getDatabase();
    const row = db.getFirstSync<any>(
      'SELECT * FROM transactions WHERE id = ?',
      [id]
    );
    if (!row) return null;
    return {
      ...row,
      is_recurring: row.is_recurring === 1,
    };
  },

  // Get all transactions for an account
  findByAccountId: (accountId: number, limit?: number): Transaction[] => {
    const db = getDatabase();
    const sql = limit
      ? 'SELECT * FROM transactions WHERE account_id = ? ORDER BY date DESC, created_at DESC LIMIT ?'
      : 'SELECT * FROM transactions WHERE account_id = ? ORDER BY date DESC, created_at DESC';
    const params = limit ? [accountId, limit] : [accountId];
    const rows = db.getAllSync<any>(sql, params);
    return rows.map(row => ({
      ...row,
      is_recurring: row.is_recurring === 1,
    }));
  },

  // Get transactions by type (income or expense)
  findByType: (accountId: number, type: 'income' | 'expense'): Transaction[] => {
    const db = getDatabase();
    const rows = db.getAllSync<any>(
      'SELECT * FROM transactions WHERE account_id = ? AND type = ? ORDER BY date DESC',
      [accountId, type]
    );
    return rows.map(row => ({
      ...row,
      is_recurring: row.is_recurring === 1,
    }));
  },

  // Get transactions by category
  findByCategoryId: (categoryId: number): Transaction[] => {
    const db = getDatabase();
    const rows = db.getAllSync<any>(
      'SELECT * FROM transactions WHERE category_id = ? ORDER BY date DESC',
      [categoryId]
    );
    return rows.map(row => ({
      ...row,
      is_recurring: row.is_recurring === 1,
    }));
  },

  // Get transactions within a date range
  findByDateRange: (
    accountId: number,
    startDate: number,
    endDate: number
  ): Transaction[] => {
    const db = getDatabase();
    const rows = db.getAllSync<any>(
      `SELECT * FROM transactions
       WHERE account_id = ? AND date >= ? AND date <= ?
       ORDER BY date DESC`,
      [accountId, startDate, endDate]
    );
    return rows.map(row => ({
      ...row,
      is_recurring: row.is_recurring === 1,
    }));
  },

  // Update transaction
  update: (id: number, updates: UpdateTransactionInput): void => {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    // Build dynamic update query based on provided fields
    if (updates.category_id !== undefined) {
      fields.push('category_id = ?');
      values.push(updates.category_id);
    }
    if (updates.type !== undefined) {
      fields.push('type = ?');
      values.push(updates.type);
    }
    if (updates.amount !== undefined) {
      fields.push('amount = ?');
      values.push(updates.amount);
    }
    if (updates.currency !== undefined) {
      fields.push('currency = ?');
      values.push(updates.currency);
    }
    if (updates.date !== undefined) {
      fields.push('date = ?');
      values.push(updates.date);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.receipt_path !== undefined) {
      fields.push('receipt_path = ?');
      values.push(updates.receipt_path);
    }
    if (updates.is_recurring !== undefined) {
      fields.push('is_recurring = ?');
      values.push(updates.is_recurring ? 1 : 0);
    }
    if (updates.recurring_frequency !== undefined) {
      fields.push('recurring_frequency = ?');
      values.push(updates.recurring_frequency);
    }

    // Always update the updated_at timestamp
    fields.push('updated_at = strftime(\'%s\', \'now\')');

    if (fields.length === 1) return; // Only updated_at changed, but still execute

    values.push(id);
    const sql = `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`;
    db.runSync(sql, values);
  },

  // Delete transaction
  delete: (id: number): void => {
    const db = getDatabase();
    db.runSync('DELETE FROM transactions WHERE id = ?', [id]);
  },

  // Get total income for an account
  getTotalIncome: (accountId: number, startDate?: number, endDate?: number): number => {
    const db = getDatabase();
    let sql = 'SELECT SUM(amount) as total FROM transactions WHERE account_id = ? AND type = ?';
    const params: any[] = [accountId, 'income'];

    if (startDate && endDate) {
      sql += ' AND date >= ? AND date <= ?';
      params.push(startDate, endDate);
    }

    const result = db.getFirstSync<{ total: number | null }>(sql, params);
    return result?.total || 0;
  },

  // Get total expenses for an account
  getTotalExpenses: (accountId: number, startDate?: number, endDate?: number): number => {
    const db = getDatabase();
    let sql = 'SELECT SUM(amount) as total FROM transactions WHERE account_id = ? AND type = ?';
    const params: any[] = [accountId, 'expense'];

    if (startDate && endDate) {
      sql += ' AND date >= ? AND date <= ?';
      params.push(startDate, endDate);
    }

    const result = db.getFirstSync<{ total: number | null }>(sql, params);
    return result?.total || 0;
  },

  // Get balance (income - expenses)
  getBalance: (accountId: number, startDate?: number, endDate?: number): number => {
    const income = TransactionRepository.getTotalIncome(accountId, startDate, endDate);
    const expenses = TransactionRepository.getTotalExpenses(accountId, startDate, endDate);
    return income - expenses;
  },

  // Get category breakdown (for reports)
  getCategoryBreakdown: (
    accountId: number,
    type: 'income' | 'expense',
    startDate?: number,
    endDate?: number
  ): Array<{ category_id: number; category_name: string; total: number }> => {
    const db = getDatabase();
    let sql = `
      SELECT
        t.category_id,
        c.name_he as category_name,
        SUM(t.amount) as total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.account_id = ? AND t.type = ?
    `;
    const params: any[] = [accountId, type];

    if (startDate && endDate) {
      sql += ' AND t.date >= ? AND t.date <= ?';
      params.push(startDate, endDate);
    }

    sql += ' GROUP BY t.category_id, c.name_he ORDER BY total DESC';

    return db.getAllSync<any>(sql, params);
  },
};
