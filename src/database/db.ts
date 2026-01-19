import * as SQLite from 'expo-sqlite';

// Database name
const DB_NAME = 'financial_manager.db';

// Open/create the database
// In Python, this is similar to: conn = sqlite3.connect('financial_manager.db')
export const openDatabase = (): SQLite.SQLiteDatabase => {
  const db = SQLite.openDatabaseSync(DB_NAME);
  return db;
};

// Get database instance
let dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!dbInstance) {
    dbInstance = openDatabase();
  }
  return dbInstance;
};

// Close database connection
export const closeDatabase = (): void => {
  if (dbInstance) {
    dbInstance.closeSync();
    dbInstance = null;
  }
};

// Execute a SQL query
// Similar to Python: cursor.execute(sql, params)
export const executeSql = async (
  sql: string,
  params: any[] = []
): Promise<SQLite.SQLiteRunResult> => {
  const db = getDatabase();
  return db.runSync(sql, params);
};

// Execute a SQL query and return all results
// Similar to Python: cursor.fetchall()
export const queryAll = <T = any>(
  sql: string,
  params: any[] = []
): T[] => {
  const db = getDatabase();
  return db.getAllSync<T>(sql, params);
};

// Execute a SQL query and return first result
// Similar to Python: cursor.fetchone()
export const queryOne = <T = any>(
  sql: string,
  params: any[] = []
): T | null => {
  const db = getDatabase();
  return db.getFirstSync<T>(sql, params);
};

// Execute multiple SQL statements in a transaction
// Similar to Python: with conn: cursor.execute(...); cursor.execute(...)
export const executeTransaction = (queries: Array<{ sql: string; params?: any[] }>): void => {
  const db = getDatabase();
  db.withTransactionSync(() => {
    queries.forEach(({ sql, params = [] }) => {
      db.runSync(sql, params);
    });
  });
};
