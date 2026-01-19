import { getDatabase } from '../db';
import { Resident, CreateResidentInput, UpdateResidentInput } from '../../models';

// Resident Repository - manages committee residents
export const ResidentRepository = {
  // Create a new resident
  create: (resident: CreateResidentInput): number => {
    const db = getDatabase();
    const result = db.runSync(
      `INSERT INTO residents (
        committee_account_id, apartment_number, resident_name,
        phone, email, monthly_fee, join_date, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        resident.committee_account_id,
        resident.apartment_number,
        resident.resident_name,
        resident.phone || null,
        resident.email || null,
        resident.monthly_fee,
        resident.join_date,
        resident.is_active ? 1 : 0,
      ]
    );
    return result.lastInsertRowId;
  },

  // Get resident by ID
  findById: (id: number): Resident | null => {
    const db = getDatabase();
    const row = db.getFirstSync<any>(
      'SELECT * FROM residents WHERE id = ?',
      [id]
    );
    if (!row) return null;
    return {
      ...row,
      is_active: row.is_active === 1,
    };
  },

  // Get all residents for a committee account
  findByCommitteeId: (committeeAccountId: number): Resident[] => {
    const db = getDatabase();
    const rows = db.getAllSync<any>(
      'SELECT * FROM residents WHERE committee_account_id = ? ORDER BY apartment_number',
      [committeeAccountId]
    );
    return rows.map(row => ({
      ...row,
      is_active: row.is_active === 1,
    }));
  },

  // Get only active residents
  findActiveByCommitteeId: (committeeAccountId: number): Resident[] => {
    const db = getDatabase();
    const rows = db.getAllSync<any>(
      'SELECT * FROM residents WHERE committee_account_id = ? AND is_active = 1 ORDER BY apartment_number',
      [committeeAccountId]
    );
    return rows.map(row => ({
      ...row,
      is_active: true,
    }));
  },

  // Get resident by apartment number
  findByApartmentNumber: (committeeAccountId: number, apartmentNumber: string): Resident | null => {
    const db = getDatabase();
    const row = db.getFirstSync<any>(
      'SELECT * FROM residents WHERE committee_account_id = ? AND apartment_number = ?',
      [committeeAccountId, apartmentNumber]
    );
    if (!row) return null;
    return {
      ...row,
      is_active: row.is_active === 1,
    };
  },

  // Update resident
  update: (id: number, updates: UpdateResidentInput): void => {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.apartment_number !== undefined) {
      fields.push('apartment_number = ?');
      values.push(updates.apartment_number);
    }
    if (updates.resident_name !== undefined) {
      fields.push('resident_name = ?');
      values.push(updates.resident_name);
    }
    if (updates.phone !== undefined) {
      fields.push('phone = ?');
      values.push(updates.phone);
    }
    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.monthly_fee !== undefined) {
      fields.push('monthly_fee = ?');
      values.push(updates.monthly_fee);
    }
    if (updates.join_date !== undefined) {
      fields.push('join_date = ?');
      values.push(updates.join_date);
    }
    if (updates.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.is_active ? 1 : 0);
    }

    if (fields.length === 0) return;

    values.push(id);
    const sql = `UPDATE residents SET ${fields.join(', ')} WHERE id = ?`;
    db.runSync(sql, values);
  },

  // Delete resident
  delete: (id: number): void => {
    const db = getDatabase();
    db.runSync('DELETE FROM residents WHERE id = ?', [id]);
  },

  // Deactivate resident (mark as not active without deleting)
  deactivate: (id: number): void => {
    ResidentRepository.update(id, { is_active: false });
  },

  // Reactivate resident
  reactivate: (id: number): void => {
    ResidentRepository.update(id, { is_active: true });
  },

  // Get total residents count
  getCount: (committeeAccountId: number, activeOnly: boolean = false): number => {
    const db = getDatabase();
    const sql = activeOnly
      ? 'SELECT COUNT(*) as count FROM residents WHERE committee_account_id = ? AND is_active = 1'
      : 'SELECT COUNT(*) as count FROM residents WHERE committee_account_id = ?';
    const result = db.getFirstSync<{ count: number }>(sql, [committeeAccountId]);
    return result?.count || 0;
  },

  // Get total monthly fees (for active residents)
  getTotalMonthlyFees: (committeeAccountId: number): number => {
    const db = getDatabase();
    const result = db.getFirstSync<{ total: number | null }>(
      'SELECT SUM(monthly_fee) as total FROM residents WHERE committee_account_id = ? AND is_active = 1',
      [committeeAccountId]
    );
    return result?.total || 0;
  },

  // Search residents by name
  searchByName: (committeeAccountId: number, searchTerm: string): Resident[] => {
    const db = getDatabase();
    const rows = db.getAllSync<any>(
      `SELECT * FROM residents
       WHERE committee_account_id = ? AND resident_name LIKE ?
       ORDER BY apartment_number`,
      [committeeAccountId, `%${searchTerm}%`]
    );
    return rows.map(row => ({
      ...row,
      is_active: row.is_active === 1,
    }));
  },
};
