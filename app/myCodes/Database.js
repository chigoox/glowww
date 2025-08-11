// Minimal utilities to satisfy legacy admin components
'use client'
import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { db as DATABASE } from '../../lib/firebase';

export async function addToDoc(col, id, data) {
  await setDoc(doc(DATABASE, col, id), data, { merge: true });
}

export async function updateDatabaseItem(col, id, field, value) {
  await updateDoc(doc(DATABASE, col, id), { [field]: value });
}

// Observe a query and persist into setter
export async function useFetchDocsPresist(col, field, op, val, orderField, setter) {
  const q = query(
    collection(DATABASE, col),
    where(field, op, val),
    orderBy(orderField, 'desc')
  );
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setter(rows);
  });
}

export async function FetchTheseDocs() {
  // placeholder for compatibility
  return [];
}
