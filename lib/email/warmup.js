// Warm-up / daily cap tracking
// Collection: emailDailyStats (id: domain_YYYYMMDD)
import { db } from '../firebaseAdmin';

const DEFAULT_CAP = 500; // fallback if age unknown
const CAP_TABLE = [
  { days: 1, cap: 50 },
  { days: 2, cap: 100 },
  { days: 3, cap: 250 },
  { days: 7, cap: 500 },
  { days: 14, cap: 1000 },
  { days: 30, cap: 5000 }
];

export function resolveCap(days = 30) {
  let cap = DEFAULT_CAP;
  for (const row of CAP_TABLE) {
    if (days >= row.days) cap = row.cap;
  }
  return cap;
}

async function incrementDaily(domain) {
  const id = `${domain}_${new Date().toISOString().slice(0,10).replace(/-/g,'')}`;
  const ref = db.collection('emailDailyStats').doc(id);
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : { domain, count: 0, date: new Date() };
    data.count = (data.count || 0) + 1;
    tx.set(ref, data);
  });
  const snap = await ref.get();
  return snap.data().count;
}

export async function checkWarmupCap({ domain, domainAgeDays = 30 }) {
  try {
    const cap = resolveCap(domainAgeDays);
    const count = await incrementDaily(domain);
    return { allowed: count <= cap, count, cap };
  } catch (e) {
    console.error('checkWarmupCap error (permissive allow)', e);
    return { allowed: true, error: e.message };
  }
}

// Read-only stats accessor (no increment) for UI display
export async function getWarmupStats({ domain, domainAgeDays = 30 }) {
  try {
    const cap = resolveCap(domainAgeDays);
    const id = `${domain}_${new Date().toISOString().slice(0,10).replace(/-/g,'')}`;
    const ref = db.collection('emailDailyStats').doc(id);
    const snap = await ref.get();
    const count = snap.exists ? (snap.data().count || 0) : 0;
    return { count, cap };
  } catch (e) {
    return { count:0, cap: resolveCap(domainAgeDays), error: e.message };
  }
}
