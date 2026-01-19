import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, initializeAuth, getReactNativePersistence, browserLocalPersistence } from 'firebase/auth';
import { Platform } from 'react-native';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBjNXS1XClboCoaNMx5eos4VxQ9PLhv4fo",
  authDomain: "vaadbait-e15ff.firebaseapp.com",
  projectId: "vaadbait-e15ff",
  storageBucket: "vaadbait-e15ff.firebasestorage.app",
  messagingSenderId: "800258828373",
  appId: "1:800258828373:web:4396db764beaaa9adc8cdc",
  measurementId: "G-XVQ3N95MPF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

// Initialize Auth with platform-specific persistence
let auth;
if (Platform.OS === 'web') {
  // For web, use browser local persistence
  auth = getAuth(app);
} else {
  // For React Native, use AsyncStorage persistence
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

export { auth };

export default app;
