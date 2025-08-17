import { db } from '@/lib/firebase';
import { doc, runTransaction } from '@/lib/firestoreDebug';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/cart/sync
// Body: { userId, clientId, items:[{productId, variantId, qty, price, lineUpdatedAt}], removedKeys:[key], discounts:[{code,type,amount}], currency, baseVersion }
// Performs per-line timestamp merge & tombstone removal semantics in a transaction.
export async function POST(req) {
  try {
  const { userId, clientId, items = [], removedKeys = [], discounts = [], currency = 'USD', baseVersion } = await req.json();
    if(!userId || !clientId) return Response.json({ error:'Missing userId or clientId' }, { status:400 });
    if(!Array.isArray(items) || !Array.isArray(removedKeys)) return Response.json({ error:'Invalid payload' }, { status:400 });

    const cartRef = doc(db, 'users', userId, 'commerce', 'activeCart');

    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(cartRef).catch(()=>null);
      const now = Date.now();
      let data = snap?.exists() ? snap.data() : {};
      const version = (data.version || 0) + 1;
      const existingItems = Array.isArray(data.items) ? data.items : [];
      const existingMap = {}; existingItems.forEach(li => { const key = `${li.productId}::${li.variantId||''}`; existingMap[key] = li; });
      const tombstones = new Map((Array.isArray(data.removedLines)? data.removedLines: []).map(t => [t.key, t]));

      // Apply incoming removals (tombstones)
      removedKeys.forEach(key => {
        const existing = tombstones.get(key);
        const ts = now; // treat request time as removal time
        if(!existing || (existing && existing.removedAt < ts)) tombstones.set(key, { key, removedAt: ts });
      });

      // Merge lines
      items.forEach(line => {
        const key = `${line.productId}::${line.variantId||''}`;
        if(!line.lineUpdatedAt) line.lineUpdatedAt = now;
        const tomb = tombstones.get(key);
        if(tomb && tomb.removedAt >= line.lineUpdatedAt) return; // suppressed by newer removal
        const cur = existingMap[key];
        if(!cur || (line.lineUpdatedAt > (cur.lineUpdatedAt || 0))) {
          existingMap[key] = { productId: line.productId, variantId: line.variantId||null, qty: line.qty, price: line.price, lineUpdatedAt: line.lineUpdatedAt };
        }
      });

      // Remove any lines with tombstones newer than their update time
      tombstones.forEach((t, key) => {
        const cur = existingMap[key];
        if(cur && (!cur.lineUpdatedAt || t.removedAt >= cur.lineUpdatedAt)) delete existingMap[key];
      });

      const mergedItems = Object.values(existingMap);
      const removedLines = Array.from(tombstones.values()).slice(-200); // cap history

      const merged = {
        items: mergedItems,
        removedLines,
  discounts: Array.isArray(discounts) ? discounts : (Array.isArray(data.discounts)? data.discounts: []),
        currency: currency || data.currency || 'USD',
        updatedAt: now,
        lastActivityAt: now,
        recoverable: true,
        version,
        lastClientId: clientId
      };
      tx.set(cartRef, merged, { merge: true });
      return merged;
    });

    return Response.json({ ok:true, cart: result });
  } catch (e) {
    console.error('cart sync error', e);
    return Response.json({ error: e.message || 'Sync failed' }, { status:500 });
  }
}
