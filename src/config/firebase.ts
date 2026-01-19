import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Initialize Auth with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export default app;
