import { getDatabase } from '../db';
import { Payment, CreatePaymentInput, UpdatePaymentInput } from '../../models';

// Payment Repository - manages committee fee payments
export const PaymentRepository = {
  // Create a new payment record
  create: (payment: CreatePaymentInput): number => {
    const db = getDatabase();
    const result = db.runSync(
      `INSERT INTO payments (
        resident_id, amount, due_date, paid_date, status, payment_method, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        payment.resident_id,
        payment.amount,
        payment.due_date,
        payment.paid_date || null,
        payment.status,
        payment.payment_method || null,
        payment.notes || null,
      ]
    );
    return result.lastInsertRowId;
  },

  // Get payment by ID
  findById: (id: number): Payment | null => {
    const db = getDatabase();
    return db.getFirstSync<Payment>(
      'SELECT * FROM payments WHERE id = ?',
      [id]
    );
  },

  // Get all payments for a resident
  findByResidentId: (residentId: number): Payment[] => {
    const db = getDatabase();
    return db.getAllSync<Payment>(
      'SELECT * FROM payments WHERE resident_id = ? ORDER BY due_date DESC',
      [residentId]
    );
  },

  // Get payments by status
  findByStatus: (
    committeeAccountId: number,
    status: 'pending' | 'paid' | 'overdue'
  ): Array<Payment & { resident_name: string; apartment_number: string }> => {
    const db = getDatabase();
    return db.getAllSync<any>(
      `SELECT p.*, r.resident_name, r.apartment_number
       FROM payments p
       JOIN residents r ON p.resident_id = r.id
       WHERE r.committee_account_id = ? AND p.status = ?
       ORDER BY p.due_date DESC`,
      [committeeAccountId, status]
    );
  },

  // Get all payments for a committee account
  findByCommitteeAccountId: (
    committeeAccountId: number
  ): Array<Payment & { resident_name: string; apartment_number: string }> => {
    const db = getDatabase();
    return db.getAllSync<any>(
      `SELECT p.*, r.resident_name, r.apartment_number
       FROM payments p
       JOIN residents r ON p.resident_id = r.id
       WHERE r.committee_account_id = ?
       ORDER BY p.due_date DESC`,
      [committeeAccountId]
    );
  },

  // Get payments within a date range
  findByDateRange: (
    committeeAccountId: number,
    startDate: number,
    endDate: number
  ): Array<Payment & { resident_name: string; apartment_number: string }> => {
    const db = getDatabase();
    return db.getAllSync<any>(
      `SELECT p.*, r.resident_name, r.apartment_number
       FROM payments p
       JOIN residents r ON p.resident_id = r.id
       WHERE r.committee_account_id = ? AND p.due_date >= ? AND p.due_date <= ?
       ORDER BY p.due_date DESC`,
      [committeeAccountId, startDate, endDate]
    );
  },

  // Update payment
  update: (id: number, updates: UpdatePaymentInput): void => {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.amount !== undefined) {
      fields.push('amount = ?');
      values.push(updates.amount);
    }
    if (updates.due_date !== undefined) {
      fields.push('due_date = ?');
      values.push(updates.due_date);
    }
    if (updates.paid_date !== undefined) {
      fields.push('paid_date = ?');
      values.push(updates.paid_date);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.payment_method !== undefined) {
      fields.push('payment_method = ?');
      values.push(updates.payment_method);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }

    if (fields.length === 0) return;

    values.push(id);
    const sql = `UPDATE payments SET ${fields.join(', ')} WHERE id = ?`;
    db.runSync(sql, values);
  },

  // Mark payment as paid
  markAsPaid: (id: number, paidDate: number, paymentMethod?: string): void => {
    PaymentRepository.update(id, {
      status: 'paid',
      paid_date: paidDate,
      payment_method: paymentMethod,
    });
  },

  // Mark payment as overdue
  markAsOverdue: (id: number): void => {
    PaymentRepository.update(id, { status: 'overdue' });
  },

  // Delete payment
  delete: (id: number): void => {
    const db = getDatabase();
    db.runSync('DELETE FROM payments WHERE id = ?', [id]);
  },

  // Get total collected fees (paid payments)
  getTotalCollected: (
    committeeAccountId: number,
    startDate?: number,
    endDate?: number
  ): number => {
    const db = getDatabase();
    let sql = `
      SELECT SUM(p.amount) as total
      FROM payments p
      JOIN residents r ON p.resident_id = r.id
      WHERE r.committee_account_id = ? AND p.status = 'paid'
    `;
    const params: any[] = [committeeAccountId];

    if (startDate && endDate) {
      sql += ' AND p.paid_date >= ? AND p.paid_date <= ?';
      params.push(startDate, endDate);
    }

    const result = db.getFirstSync<{ total: number | null }>(sql, params);
    return result?.total || 0;
  },

  // Get total pending fees
  getTotalPending: (committeeAccountId: number): number => {
    const db = getDatabase();
    const result = db.getFirstSync<{ total: number | null }>(
      `SELECT SUM(p.amount) as total
       FROM payments p
       JOIN residents r ON p.resident_id = r.id
       WHERE r.committee_account_id = ? AND p.status = 'pending'`,
      [committeeAccountId]
    );
    return result?.total || 0;
  },

  // Get total overdue fees
  getTotalOverdue: (committeeAccountId: number): number => {
    const db = getDatabase();
    const result = db.getFirstSync<{ total: number | null }>(
      `SELECT SUM(p.amount) as total
       FROM payments p
       JOIN residents r ON p.resident_id = r.id
       WHERE r.committee_account_id = ? AND p.status = 'overdue'`,
      [committeeAccountId]
    );
    return result?.total || 0;
  },

  // Update overdue payments (mark pending payments past due date as overdue)
  updateOverduePayments: (): void => {
    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);
    db.runSync(
      `UPDATE payments SET status = 'overdue'
       WHERE status = 'pending' AND due_date < ?`,
      [now]
    );
  },

  // Create monthly payments for all active residents
  createMonthlyPayments: (
    committeeAccountId: number,
    dueDate: number
  ): void => {
    const db = getDatabase();
    const residents = db.getAllSync<any>(
      'SELECT id, monthly_fee FROM residents WHERE committee_account_id = ? AND is_active = 1',
      [committeeAccountId]
    );

    db.withTransactionSync(() => {
      residents.forEach((resident) => {
        db.runSync(
          `INSERT INTO payments (resident_id, amount, due_date, status)
           VALUES (?, ?, ?, 'pending')`,
          [resident.id, resident.monthly_fee, dueDate]
        );
      });
    });
  },
};
