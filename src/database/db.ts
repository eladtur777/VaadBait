// Database utilities - Not used since app uses Firebase Firestore
// This file is kept for potential future offline support

export const getDatabase = () => {
  console.log('Using Firebase Firestore - local database not initialized');
  return null;
};

export const closeDatabase = (): void => {
  // No-op - using Firebase
};
