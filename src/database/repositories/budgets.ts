import { getDatabase } from '../db';
import { Budget, CreateBudgetInput, UpdateBudgetInput } from '../../models';

// Budget Repository - manages budgets for categories
export const BudgetRepository = {
  // Create a new budget
  create: (budget: CreateBudgetInput): number => {
    const db = getDatabase();
    const result = db.runSync(
      `INSERT INTO budgets (account_id, category_id, amount, period, start_date)
       VALUES (?, ?, ?, ?, ?)`,
      [budget.account_id, budget.category_id, budget.amount, budget.period, budget.start_date]
    );
    return result.lastInsertRowId;
  },

  // Get budget by ID
  findById: (id: number): Budget | null => {
    const db = getDatabase();
    return db.getFirstSync<Budget>(
      'SELECT * FROM budgets WHERE id = ?',
      [id]
    );
  },

  // Get all budgets for an account
  findByAccountId: (accountId: number): Budget[] => {
    const db = getDatabase();
    return db.getAllSync<Budget>(
      'SELECT * FROM budgets WHERE account_id = ?',
      [accountId]
    );
  },

  // Get budget for a specific category and period
  findByCategoryAndPeriod: (
    accountId: number,
    categoryId: number,
    period: 'monthly' | 'yearly'
  ): Budget | null => {
    const db = getDatabase();
    return db.getFirstSync<Budget>(
      'SELECT * FROM budgets WHERE account_id = ? AND category_id = ? AND period = ?',
      [accountId, categoryId, period]
    );
  },

  // Get monthly budgets
  findMonthlyBudgets: (accountId: number): Budget[] => {
    const db = getDatabase();
    return db.getAllSync<Budget>(
      'SELECT * FROM budgets WHERE account_id = ? AND period = ?',
      [accountId, 'monthly']
    );
  },

  // Get yearly budgets
  findYearlyBudgets: (accountId: number): Budget[] => {
    const db = getDatabase();
    return db.getAllSync<Budget>(
      'SELECT * FROM budgets WHERE account_id = ? AND period = ?',
      [accountId, 'yearly']
    );
  },

  // Update budget
  update: (id: number, updates: UpdateBudgetInput): void => {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.amount !== undefined) {
      fields.push('amount = ?');
      values.push(updates.amount);
    }
    if (updates.period !== undefined) {
      fields.push('period = ?');
      values.push(updates.period);
    }
    if (updates.start_date !== undefined) {
      fields.push('start_date = ?');
      values.push(updates.start_date);
    }

    if (fields.length === 0) return;

    values.push(id);
    const sql = `UPDATE budgets SET ${fields.join(', ')} WHERE id = ?`;
    db.runSync(sql, values);
  },

  // Delete budget
  delete: (id: number): void => {
    const db = getDatabase();
    db.runSync('DELETE FROM budgets WHERE id = ?', [id]);
  },

  // Upsert budget (insert or update if exists)
  upsert: (budget: CreateBudgetInput): number => {
    const existing = BudgetRepository.findByCategoryAndPeriod(
      budget.account_id,
      budget.category_id,
      budget.period
    );

    if (existing) {
      BudgetRepository.update(existing.id!, {
        amount: budget.amount,
        start_date: budget.start_date,
      });
      return existing.id!;
    } else {
      return BudgetRepository.create(budget);
    }
  },

  // Get budget with spending info
  getBudgetWithSpending: (
    accountId: number,
    categoryId: number,
    period: 'monthly' | 'yearly',
    startDate: number,
    endDate: number
  ): {
    budget: Budget | null;
    spent: number;
    remaining: number;
    percentage: number;
  } => {
    const db = getDatabase();

    const budget = BudgetRepository.findByCategoryAndPeriod(accountId, categoryId, period);

    const result = db.getFirstSync<{ total: number | null }>(
      `SELECT SUM(amount) as total FROM transactions
       WHERE account_id = ? AND category_id = ? AND type = 'expense'
       AND date >= ? AND date <= ?`,
      [accountId, categoryId, startDate, endDate]
    );

    const spent = result?.total || 0;
    const budgetAmount = budget?.amount || 0;
    const remaining = budgetAmount - spent;
    const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

    return {
      budget,
      spent,
      remaining,
      percentage,
    };
  },
};
