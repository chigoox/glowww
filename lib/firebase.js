// Firebase configuration and initialization
import { initializeApp, getApps, getApp } from 'firebase/app';
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


// Initialize (guard against re-init in Next.js dev / hot reload)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Storage and get a reference to the service
export const storage = getStorage(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Lightweight dev-only diagnostics to help detect multiple module copies causing
// Firestore type mismatches (e.g., Query vs DocumentReference errors when the
// prototype chain differs). Runs once per process.
if (process.env.NODE_ENV !== 'production') {
  try {
    // Dynamic import so tree-shaking in prod is unaffected.
    import('firebase/firestore').then(mod => {
      // Intentionally minimal logging; can be removed after debugging.
      // eslint-disable-next-line no-console
      console.info('[firebase] initialized. apps:', getApps().length, 'firestore keys:', Object.keys(mod).slice(0,6));
    }).catch(()=>{});
  } catch {}
}

export default app;
