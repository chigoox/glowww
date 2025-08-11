// Firestore helpers for custom domains
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export const getDomainsForSite = async (userId, siteId) => {
  const domainsRef = collection(db, 'users', userId, 'sites', siteId, 'domains');
  const q = query(domainsRef);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addDomain = async (userId, siteId, domain, verificationToken) => {
  const docRef = doc(db, 'users', userId, 'sites', siteId, 'domains', domain);
  await setDoc(docRef, {
    domain,
    verificationToken,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { domain, verificationToken, status: 'pending' };
};

export const updateDomainStatus = async (userId, siteId, domain, status, lastError = null) => {
  const docRef = doc(db, 'users', userId, 'sites', siteId, 'domains', domain);
  await updateDoc(docRef, {
    status,
    lastError,
    updatedAt: serverTimestamp(),
  });
};

export const removeDomain = async (userId, siteId, domain) => {
  const docRef = doc(db, 'users', userId, 'sites', siteId, 'domains', domain);
  await deleteDoc(docRef);
};

export const getDomain = async (userId, siteId, domain) => {
  const docRef = doc(db, 'users', userId, 'sites', siteId, 'domains', domain);
  const snapshot = await getDoc(docRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};
