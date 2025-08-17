export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { adminDb } from '@/lib/firebaseAdmin';

/**
 * POST /api/cart/validate
 * Body: { userId, items: [{ productId, variantId, qty, price? }], discounts: [{ code }] }
 * Discount rule shape (stored): { code, type: 'Percent'|'Fixed', amount, stackable?:boolean, minSpend?:number, excludeProducts?:string[], excludeCategories?:string[], maxUsesPerOrder?:number, nonStackingGroup?:string }
 * Returns: { ok, items, subtotal, discounts: appliedList, discountAmount, total, changed, removedItemIds, adjustments, rejected: [{code, reason}] }
 */
export async function POST(req) {
  try {
    if (!adminDb) return new Response(JSON.stringify({ ok:false, error: 'Admin not configured' }), { status: 500 });
    const body = await req.json().catch(()=>null);
    if (!body || !Array.isArray(body.items)) return new Response(JSON.stringify({ ok:false, error: 'Invalid payload' }), { status: 400 });
  const { userId, items, discount, discounts } = body;

    // Fetch products in parallel
    const productIds = [...new Set(items.map(i => i.productId).filter(Boolean))];
    const snapshots = await Promise.all(productIds.map(async id => {
      try { return await adminDb.collection('products').doc(id).get(); } catch { return null; }
    }));
    const productMap = {};
    snapshots.forEach((snap, idx) => { if (snap && snap.exists) productMap[productIds[idx]] = { id: productIds[idx], ...snap.data() }; });

  const validatedItems = [];
  const removedItemIds = [];
  const adjustments = [];

    for (const line of items) {
      const prod = productMap[line.productId];
      if (!prod) { removedItemIds.push(line.productId); adjustments.push({ productId: line.productId, reason:'not_found' }); continue; }
      let priceCents = 0;
      let title = prod.name || prod.title || 'Product';
      let image = Array.isArray(prod.images) ? prod.images[0] : (prod.image || '');
      // Determine stock (product-level or variant-level) if available; if absent assume unlimited
      let stockAvailable = typeof prod.stock === 'number' ? prod.stock : (typeof prod.inventory === 'number' ? prod.inventory : null);
      if (prod.hasVariants && line.variantId && Array.isArray(prod.variants)) {
        const variant = prod.variants.find(v => v.id === line.variantId || v.variantId === line.variantId);
        if (!variant) { removedItemIds.push(line.productId); adjustments.push({ productId: line.productId, variantId: line.variantId, reason:'variant_not_found' }); continue; }
        // variant.price assumed in currency units; convert
        const vPrice = parseFloat(variant.price || variant.metadata?.price || 0);
        priceCents = Math.round(vPrice * 100);
        title = variant.title ? `${title} - ${variant.title}` : title;
        if (typeof variant.stock === 'number') stockAvailable = variant.stock;
        else if (typeof variant.inventory === 'number') stockAvailable = variant.inventory;
      } else {
        // single price product: metadata.price or price
        const baseUnit = parseFloat(prod?.metadata?.price ?? prod.price ?? 0);
        // If baseUnit already looks like cents (>=10000) but metadata.price empty, treat as cents
        if (baseUnit > 0 && baseUnit < 10000) priceCents = Math.round(baseUnit * 100); else priceCents = Math.round(baseUnit);
      }
      if (!priceCents || priceCents < 0) { removedItemIds.push(line.productId); continue; }
      let requestedQty = Math.max(1, parseInt(line.qty || 1, 10));
      if (stockAvailable !== null) {
        if (stockAvailable <= 0) {
          removedItemIds.push(line.productId);
          adjustments.push({ productId: line.productId, variantId: line.variantId || null, fromQty: requestedQty, toQty: 0, reason:'out_of_stock' });
          continue;
        }
        if (requestedQty > stockAvailable) {
          adjustments.push({ productId: line.productId, variantId: line.variantId || null, fromQty: requestedQty, toQty: stockAvailable, reason:'stock_clamped' });
          requestedQty = stockAvailable;
        }
      }
      validatedItems.push({ productId: line.productId, variantId: line.variantId || null, qty: requestedQty, price: priceCents, title, image, stock: stockAvailable });
    }

    const subtotal = validatedItems.reduce((s, it) => s + it.price * it.qty, 0);

    // Advanced discount validation (multi-code)
    let appliedDiscounts = [];
    let discountAmount = 0;
    const rejected = [];
    if (userId && (Array.isArray(discounts) || discount?.code)) {
      try {
        const globalRef = await adminDb.collection('users').doc(userId).collection('discounts').doc('global').get();
        let codes = [];
        if (globalRef.exists) {
          const data = globalRef.data();
          codes = [ ...(data.discountCodes||[]), ...(data.privateCodes||[]) ];
        }
        const requestedCodes = (discount?.code ? [discount] : []).concat(Array.isArray(discounts)? discounts: []);
        // Deduplicate preserving order
        const seen = new Set();
        const ordered = [];
        requestedCodes.forEach(c => { if(c?.code && !seen.has(c.code.toLowerCase())) { seen.add(c.code.toLowerCase()); ordered.push(c); } });
        const applicableSubtotalBase = subtotal;
        for(const req of ordered) {
          const found = codes.find(c => c.code?.toLowerCase() === req.code.toLowerCase());
          if(!found) { rejected.push({ code: req.code, reason:'not_found' }); continue; }
          // Min spend
            if(found.minSpend && applicableSubtotalBase < Math.round(found.minSpend * 100)) { rejected.push({ code: found.code, reason:'min_spend' }); continue; }
          // Exclusions: if any cart item matches excluded product/category, skip (simple rule: entire cart must be free of excluded targets)
          if(Array.isArray(found.excludeProducts) && found.excludeProducts.length) {
            const hit = validatedItems.some(it => found.excludeProducts.includes(it.productId));
            if(hit) { rejected.push({ code: found.code, reason:'exclusion_product' }); continue; }
          }
          if(Array.isArray(found.excludeCategories) && found.excludeCategories.length) {
            const hit = validatedItems.some(it => found.excludeCategories.includes(it.meta?.category));
            if(hit) { rejected.push({ code: found.code, reason:'exclusion_category' }); continue; }
          }
          // Non-stackable group: if already applied a code with same nonStackingGroup or found.stackable === false and we already have any, reject
          if(appliedDiscounts.length) {
            const conflict = appliedDiscounts.some(a => (!found.stackable && a.stackable === false) || (found.nonStackingGroup && a.nonStackingGroup && a.nonStackingGroup === found.nonStackingGroup) || (!found.stackable));
            if(conflict) { rejected.push({ code: found.code, reason:'non_stackable' }); continue; }
          }
          // Compute code amount independent, then add
          let thisAmount = 0;
          if(found.type === 'Percent') thisAmount = Math.round(subtotal * (found.amount / 100)); else thisAmount = Math.round(found.amount * 100);
          // Cap so we never exceed subtotal
          const remaining = subtotal - discountAmount;
          if(remaining <= 0) { rejected.push({ code: found.code, reason:'no_remaining' }); continue; }
          thisAmount = Math.min(thisAmount, remaining);
          if(thisAmount <= 0) { rejected.push({ code: found.code, reason:'zero_value' }); continue; }
          appliedDiscounts.push({ code: found.code, type: found.type, amount: found.amount, stackable: found.stackable !== false, nonStackingGroup: found.nonStackingGroup || null });
          discountAmount += thisAmount;
        }
      } catch {}
    }
    const total = Math.max(0, subtotal - discountAmount);

    // Determine if changed (price or removal or discount invalidated)
  let changed = removedItemIds.length > 0 || adjustments.length > 0;
    if (!changed) {
      // Compare original vs validated price
      for (const original of items) {
        const validated = validatedItems.find(v => v.productId === original.productId && (v.variantId || null) === (original.variantId || null));
        if (!validated) { changed = true; break; }
        if (validated.price !== original.price) { changed = true; break; }
      }
    if ((discount?.code || (Array.isArray(discounts)&&discounts.length)) && !appliedDiscounts.length) changed = true;
    }
  return new Response(JSON.stringify({ ok:true, items: validatedItems, subtotal, discounts: appliedDiscounts, discountAmount, total, changed, removedItemIds, adjustments, rejected }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error: e.message || 'Validation failed' }), { status: 500 });
  }
}
