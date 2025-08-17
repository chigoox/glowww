// Minimal passthrough module — re-export Firestore SDK symbols directly.
// This file previously contained a debug wrapper that logged improper getDocs usage.
// Removing the wrapper restores the SDK functions without side-effects.
import * as fs from 'firebase/firestore';
export * from 'firebase/firestore';

// Re-export a small set of commonly used helpers to maintain compatibility with imports.
export const getDocs = fs.getDocs;
export const getDoc = fs.getDoc;
export const doc = fs.doc;
export const collection = fs.collection;
export const query = fs.query;
export const where = fs.where;
export const limit = fs.limit;
export const addDoc = fs.addDoc;
export const serverTimestamp = fs.serverTimestamp;
export const onSnapshot = fs.onSnapshot;

export function patchFirestoreModule(mod) {
  mod.getDocs = fs.getDocs; // restore original implementation
  return mod;
}
