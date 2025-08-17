import { db } from '@/lib/firebase';
import { requireAuth, enforceUserMatch } from '@/lib/apiAuth';
import { rateLimit } from '@/lib/rateLimit';
import { createOrderSchema, validate } from '@/lib/validation';
// (imports already declared above)

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/cart/create-order
// Body: { userId, items:[{productId, variantId, qty, price}], discounts?:[{code,type,amount}], currency, sellerUserId, siteId }
// Performs server validation & transactional stock decrement (optimistic reserve) then creates order.
// Enhancements:
//  - Normalizes line items (sku, name, weight, taxCode, options)
//  - Creates inventory reservations (increments product.reserved instead of decrementing stock)
//  - Adds lifecycleStatus separate from legacy status field (legacy status kept for UI backward compat)
//  - Writes initial statusHistory entry
import { doc, getDoc, setDoc, collection, addDoc, runTransaction } from '@/lib/firestoreDebug';
export async function POST(req) {
  try {
    const body = await req.json();
    const authRes = await requireAuth(req);
    if(authRes.error) return Response.json({ ok:false, ...authRes.error }, { status:401 });
    const { user } = authRes;
    const val = validate(createOrderSchema, body);
    if(val.error) return Response.json({ ok:false, ...val.error }, { status:400 });
    const { userId, items = [], discounts = [], currency = 'USD', sellerUserId, siteId } = val.data;
    const match = enforceUserMatch(user, userId);
    if(match.error) return Response.json({ ok:false, ...match.error }, { status:403 });
    const rl = await rateLimit({ keyParts: [user.uid, 'create_order'], limit: 30, windowMs: 60*1000 });
    if(rl.error) return Response.json({ ok:false, ...rl.error }, { status:429 });

    // Re-fetch products and prepare updates inside a transaction to avoid oversell.
    const result = await runTransaction(db, async (tx) => {
      const finalItems = [];
      const stockAdjustments = [];
      for (const raw of items) {
        const line = { ...raw };
        const prodRef = doc(db, 'products', line.productId);
        const prodSnap = await tx.get(prodRef);
        if(!prodSnap.exists()) continue;
        const prod = prodSnap.data();
        const baseStock = typeof prod.stock === 'number' ? prod.stock : (typeof prod.inventory === 'number' ? prod.inventory : null);
  const reserved = typeof prod.reserved === 'number' ? prod.reserved : 0;
  let variantReserved = 0;
        let variantData = null;
        let variantStock = null;
        if(line.variantId && Array.isArray(prod.variants)) {
          variantData = prod.variants.find(v => v.id === line.variantId || v.variantId === line.variantId);
          if(!variantData) continue;
          if(typeof variantData.stock === 'number') variantStock = variantData.stock;
          else if(typeof variantData.inventory === 'number') variantStock = variantData.inventory;
          if(typeof variantData.reserved === 'number') variantReserved = variantData.reserved;
        }
        let available = (variantData ? variantStock : baseStock);
        if(available !== null) {
          const effectiveReserved = variantData ? variantReserved : reserved;
          const effectiveAvailable = available - effectiveReserved;
          if(effectiveAvailable <= 0) continue;
          if(line.qty > effectiveAvailable) {
            stockAdjustments.push({ productId: line.productId, variantId: line.variantId || null, fromQty: line.qty, toQty: effectiveAvailable, reason:'stock_clamped' });
            line.qty = effectiveAvailable;
          }
          // increment reserved count (variant or product)
          if(variantData) {
            const updatedVariants = prod.variants.map(v => {
              if(v === variantData) return { ...v, reserved: (variantReserved + line.qty) };
              return v;
            });
            tx.set(prodRef, { variants: updatedVariants }, { merge:true });
          } else {
            const newReserved = reserved + line.qty;
            tx.set(prodRef, { reserved: newReserved }, { merge: true });
          }
        }
        // Normalize line item shape
        const sku = variantData?.sku || prod.sku || null;
        const weight = variantData?.weight || prod.weight || null; // expected grams
        const taxCode = variantData?.taxCode || prod.taxCode || null;
        const name = variantData?.name || prod.name || prod.title || 'Item';
        const options = variantData?.options || {};
        finalItems.push({ productId: line.productId, variantId: line.variantId || null, qty: line.qty, price: line.price, sku, name, weight, taxCode, options });
      }
      return { finalItems, stockAdjustments };
    });

  if(!result.finalItems.length) return Response.json({ ok:false, errorCode:'NO_AVAILABLE_ITEMS', message:'All items unavailable' }, { status:409 });

    // Pricing calculations
    const subtotal = result.finalItems.reduce((s,i)=> s + i.price * i.qty, 0);
    let discountAmount = 0;
    if(Array.isArray(discounts) && discounts.length) {
      discounts.forEach(d => {
        let amt = 0;
        if(d.type === 'Percent') amt = Math.round(subtotal * (d.amount/100));
        else amt = Math.round(d.amount * 100);
        const remaining = subtotal - discountAmount;
        if(remaining <= 0) return;
        discountAmount += Math.min(amt, remaining);
      });
    }
    const total = Math.max(subtotal - discountAmount, 0);

  const ordersCol = collection(db, 'users', userId, 'orders');
  const nowTs = Date.now();
  const orderDoc = await addDoc(ordersCol, {
      items: result.finalItems,
      discounts: Array.isArray(discounts)? discounts: [],
      discountAmount,
      subtotal,
      total,
      currency,
      status: 'pending', // legacy UI compatibility
      lifecycleStatus: 'pending_payment',
      createdAt: nowTs,
      reservedAt: nowTs,
      stockAdjustments: result.stockAdjustments,
      version: 1,
      sellerUserId,
      siteId: siteId || null,
      statusHistory: [ { from: null, to: 'pending_payment', at: nowTs } ]
    });

    // Secondary index for seller-centric queries
    try {
      const sellerOrdersCol = collection(db, 'sellers', sellerUserId, 'orders');
      await setDoc(doc(sellerOrdersCol, orderDoc.id), {
        userId,
        orderId: orderDoc.id,
        siteId: siteId || null,
        subtotal,
        total,
        currency,
        status: 'pending',
        createdAt: Date.now(),
        discountAmount
      }, { merge: true });
    } catch (idxErr) {
      // Index write failures shouldn't block primary order creation
      console.warn('seller order index write failed', idxErr);
    }
  return Response.json({ ok:true, orderId: orderDoc.id, subtotal, total, discountAmount, stockAdjustments: result.stockAdjustments, sellerUserId, siteId: siteId || null, lifecycleStatus: 'pending_payment' });
  } catch (e) {
    console.error('create-order error', e);
    return Response.json({ ok:false, errorCode:'CREATE_ORDER_FAILED', message: e.message || 'Order creation failed' }, { status:500 });
  }
}
