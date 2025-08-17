import { adminDb } from '@/lib/firebaseAdmin';

// Fixed window rate limiter (Firestore). Not production-perfect (no distributed atomicity), but adequate initial guard.
// keyParts: array of strings to compose key (e.g., [uid, 'refund'])
export async function rateLimit({ keyParts, limit = 60, windowMs = 5 * 60 * 1000 }) {
  if(!adminDb) return { ok:true, skipped:true };
  const key = keyParts.join(':');
  const ref = adminDb.collection('rate_limits').doc(key);
  const now = Date.now();
  const windowStart = now - windowMs;
  let allowed = true;
  let remaining = limit - 1;
  await adminDb.runTransaction(async (t)=>{
    const snap = await t.get(ref);
    if(!snap.exists){
      t.set(ref, { count:1, startedAt: now, windowMs });
      return;
    }
    const data = snap.data();
    if((data.startedAt || 0) < windowStart){
      t.set(ref, { count:1, startedAt: now, windowMs });
      remaining = limit - 1;
      return;
    }
    const count = (data.count || 0) + 1;
    if(count > limit){
      allowed = false;
      remaining = 0;
      return;
    }
    remaining = limit - count;
    t.update(ref, { count });
  });
  if(!allowed) return { error:{ code:'RATE_LIMITED', message:'Too many requests' }, limit, remaining:0, retryAfterMs: windowMs };
  return { ok:true, limit, remaining };
}
