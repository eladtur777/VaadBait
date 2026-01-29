import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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

// Initialize Firestore database
export const db = getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

export default app;
