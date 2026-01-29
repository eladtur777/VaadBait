import { getDatabase } from '../db';
import { Account, CreateAccountInput, UpdateAccountInput } from '../../models';

// Account Repository - manages personal and committee accounts
export const AccountRepository = {
  // Create a new account
  create: (account: CreateAccountInput): number => {
    const db = getDatabase();
    const result = db.runSync(
      'INSERT INTO accounts (name, type) VALUES (?, ?)',
      [account.name, account.type]
    );
    return result.lastInsertRowId;
  },

  // Get account by ID
  findById: (id: number): Account | null => {
    const db = getDatabase();
    return db.getFirstSync<Account>(
      'SELECT * FROM accounts WHERE id = ?',
      [id]
    );
  },

  // Get all accounts
  findAll: (): Account[] => {
    const db = getDatabase();
    return db.getAllSync<Account>('SELECT * FROM accounts ORDER BY created_at DESC');
  },

  // Get accounts by type (personal or committee)
  findByType: (type: 'personal' | 'committee'): Account[] => {
    const db = getDatabase();
    return db.getAllSync<Account>(
      'SELECT * FROM accounts WHERE type = ? ORDER BY created_at DESC',
      [type]
    );
  },

  // Get the default personal account (first personal account)
  getDefaultPersonalAccount: (): Account | null => {
    const db = getDatabase();
    return db.getFirstSync<Account>(
      'SELECT * FROM accounts WHERE type = ? ORDER BY created_at ASC LIMIT 1',
      ['personal']
    );
  },

  // Update account
  update: (id: number, updates: UpdateAccountInput): void => {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.type !== undefined) {
      fields.push('type = ?');
      values.push(updates.type);
    }

    if (fields.length === 0) return;

    values.push(id);
    const sql = `UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`;
    db.runSync(sql, values);
  },

  // Delete account (this will cascade delete all related data)
  delete: (id: number): void => {
    const db = getDatabase();
    db.runSync('DELETE FROM accounts WHERE id = ?', [id]);
  },

  // Get account count
  getCount: (): number => {
    const db = getDatabase();
    const result = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM accounts'
    );
    return result?.count || 0;
  },
};
