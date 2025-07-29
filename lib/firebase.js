// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDf9TJ6HoeOeDyjCZJRBZhQupK5rCQiYA0",
  authDomain: "glow-editor.firebaseapp.com",
  projectId: "glow-editor",
  storageBucket: "glow-editor.firebasestorage.app",
  messagingSenderId: "288657872874",
  appId: "1:288657872874:web:20be5cb6e8b1dc1d480493",
  measurementId: "G-H0J75D49B9"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Storage and get a reference to the service
export const storage = getStorage(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

export default app;
