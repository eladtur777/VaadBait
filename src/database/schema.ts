import { getDatabase } from './db';
import { defaultCategories } from '../constants/defaultCategories';

// Create all database tables
// This is similar to Python's CREATE TABLE statements
export const createTables = (): void => {
  const db = getDatabase();

  // Enable foreign keys
  db.execSync('PRAGMA foreign_keys = ON;');

  // Users table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('personal', 'committee_admin')),
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `);

  // Accounts table (personal or committee accounts)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('personal', 'committee')),
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `);

  // Categories table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER,
      name_he TEXT NOT NULL,
      name_en TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
    );
  `);

  // Transactions table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount REAL NOT NULL CHECK(amount > 0),
      currency TEXT NOT NULL DEFAULT 'ILS',
      date INTEGER NOT NULL,
      description TEXT,
      receipt_path TEXT,
      is_recurring INTEGER NOT NULL DEFAULT 0,
      recurring_frequency TEXT CHECK(recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT
    );
  `);

  // Create index for faster queries
  db.execSync(`
    CREATE INDEX IF NOT EXISTS idx_transactions_account_date
    ON transactions(account_id, date DESC);
  `);

  db.execSync(`
    CREATE INDEX IF NOT EXISTS idx_transactions_category
    ON transactions(category_id);
  `);

  // Budgets table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      period TEXT NOT NULL CHECK(period IN ('monthly', 'yearly')),
      start_date INTEGER NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE,
      UNIQUE(account_id, category_id, period)
    );
  `);

  // Residents table (for committee accounts)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS residents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      committee_account_id INTEGER NOT NULL,
      apartment_number TEXT NOT NULL,
      resident_name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      monthly_fee REAL NOT NULL CHECK(monthly_fee >= 0),
      join_date INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (committee_account_id) REFERENCES accounts (id) ON DELETE CASCADE,
      UNIQUE(committee_account_id, apartment_number)
    );
  `);

  // Payments table (committee fee payments)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resident_id INTEGER NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      due_date INTEGER NOT NULL,
      paid_date INTEGER,
      status TEXT NOT NULL CHECK(status IN ('pending', 'paid', 'overdue')),
      payment_method TEXT,
      notes TEXT,
      FOREIGN KEY (resident_id) REFERENCES residents (id) ON DELETE CASCADE
    );
  `);

  // Create index for payment queries
  db.execSync(`
    CREATE INDEX IF NOT EXISTS idx_payments_resident_status
    ON payments(resident_id, status);
  `);

  // Charging stations table (for car charging management)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS charging_stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      committee_account_id INTEGER NOT NULL,
      resident_id INTEGER NOT NULL,
      meter_id TEXT NOT NULL,
      location TEXT,
      cost_per_kwh REAL NOT NULL CHECK(cost_per_kwh > 0),
      installed_date INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      FOREIGN KEY (committee_account_id) REFERENCES accounts (id) ON DELETE CASCADE,
      FOREIGN KEY (resident_id) REFERENCES residents (id) ON DELETE CASCADE,
      UNIQUE(committee_account_id, meter_id)
    );
  `);

  // Charging station meter readings table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS charging_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      station_id INTEGER NOT NULL,
      reading_date INTEGER NOT NULL,
      previous_reading REAL NOT NULL DEFAULT 0,
      current_reading REAL NOT NULL CHECK(current_reading >= 0),
      kwh_used REAL NOT NULL CHECK(kwh_used >= 0),
      cost_per_kwh REAL NOT NULL CHECK(cost_per_kwh > 0),
      total_cost REAL NOT NULL CHECK(total_cost >= 0),
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (station_id) REFERENCES charging_stations (id) ON DELETE CASCADE
    );
  `);

  // Create index for charging readings
  db.execSync(`
    CREATE INDEX IF NOT EXISTS idx_charging_readings_station_date
    ON charging_readings(station_id, reading_date DESC);
  `);

  // Charging station payments table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS charging_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reading_id INTEGER NOT NULL,
      resident_id INTEGER NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      due_date INTEGER NOT NULL,
      paid_date INTEGER,
      status TEXT NOT NULL CHECK(status IN ('pending', 'paid', 'overdue')),
      payment_method TEXT,
      notes TEXT,
      FOREIGN KEY (reading_id) REFERENCES charging_readings (id) ON DELETE CASCADE,
      FOREIGN KEY (resident_id) REFERENCES residents (id) ON DELETE CASCADE
    );
  `);

  // Create index for charging payments
  db.execSync(`
    CREATE INDEX IF NOT EXISTS idx_charging_payments_resident_status
    ON charging_payments(resident_id, status);
  `);

  console.log('✅ Database tables created successfully');
};

// Initialize database with default data
// Note: Now using Firebase - SQLite is kept for offline backup only
export const initializeDatabase = (): void => {
  try {
    // Skip SQLite initialization - using Firebase Firestore instead
    console.log('✅ Using Firebase Firestore database');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

// Insert default categories and a default personal account
const insertDefaultData = (): void => {
  const db = getDatabase();

  // Check if we already have data
  const accountCount = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM accounts'
  );

  if (accountCount && accountCount.count > 0) {
    console.log('✅ Database already has data, skipping default data insertion');
    return;
  }

  db.withTransactionSync(() => {
    // Insert default personal account
    db.runSync(
      'INSERT INTO accounts (name, type) VALUES (?, ?)',
      ['משק הבית שלי', 'personal']
    );

    // Insert default categories (they are global, not tied to any account)
    defaultCategories.forEach((category) => {
      db.runSync(
        `INSERT INTO categories (name_he, name_en, type, icon, color, is_default)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          category.name_he,
          category.name_en,
          category.type,
          category.icon,
          category.color,
          category.is_default ? 1 : 0,
        ]
      );
    });
  });

  console.log('✅ Default data inserted successfully');
};

// Drop all tables (for development/testing)
export const dropAllTables = (): void => {
  const db = getDatabase();
  db.execSync('PRAGMA foreign_keys = OFF;');
  db.execSync('DROP TABLE IF EXISTS charging_payments;');
  db.execSync('DROP TABLE IF EXISTS charging_readings;');
  db.execSync('DROP TABLE IF EXISTS charging_stations;');
  db.execSync('DROP TABLE IF EXISTS payments;');
  db.execSync('DROP TABLE IF EXISTS residents;');
  db.execSync('DROP TABLE IF EXISTS budgets;');
  db.execSync('DROP TABLE IF EXISTS transactions;');
  db.execSync('DROP TABLE IF EXISTS categories;');
  db.execSync('DROP TABLE IF EXISTS accounts;');
  db.execSync('DROP TABLE IF EXISTS users;');
  db.execSync('PRAGMA foreign_keys = ON;');
  console.log('✅ All tables dropped');
};

// Reset database (drop and recreate)
export const resetDatabase = (): void => {
  dropAllTables();
  initializeDatabase();
  console.log('✅ Database reset complete');
};
