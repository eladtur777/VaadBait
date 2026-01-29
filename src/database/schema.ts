import { Platform } from 'react-native';

// Initialize database with default data
// Note: Now using Firebase - SQLite is not needed
export const initializeDatabase = (): void => {
  try {
    // Skip SQLite initialization - using Firebase Firestore instead
    console.log('✅ Using Firebase Firestore database');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

// Reset database (no-op since we use Firebase)
export const resetDatabase = (): void => {
  console.log('✅ Using Firebase Firestore - no local database to reset');
};
