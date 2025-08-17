export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { computeTaxes, fabricateLineItemsFromSubtotal } from '@/lib/tax';
import { estimateSchema, validate } from '@/lib/validation';
import { requireAuth } from '@/lib/apiAuth';

// POST /api/cart/estimate
// Body supports backward-compatible fields:
// { subtotal, discountAmount, currency, totalWeight?, taxCodes?: string[], lineItems?: [{amount, quantity, taxCode}], shippingAddress?: {country, region, postalCode} }
// Returns: { shipping, tax, taxBreakdown, taxTotal, currency }
export async function POST(req) {
  try {
    const body = await req.json();
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if(authHeader){
      await requireAuth(req); // ignore result for optional auth
    }
    const val = validate(estimateSchema, body);
    if(val.error) return Response.json({ ok:false, ...val.error }, { status:400 });
    const {
      subtotal = 0,
      discountAmount = 0,
      currency = 'USD',
      totalWeight = 0,
      taxCodes = [],
      lineItems,
      shippingAddress = {},
    } = val.data || {};

    const net = Math.max(0, subtotal - discountAmount);
    // SHIPPING heuristic (unchanged logic)
    let shipping;
    if (net >= 50000) shipping = 0; // free over $500
    else {
      if (totalWeight <= 1000) shipping = 500; // <=1kg $5
      else if (totalWeight <= 5000) shipping = 1500; // <=5kg $15
      else shipping = 3000; // heavy $30
    }

    // Build line items for tax calculation
    let taxLineItems = Array.isArray(lineItems) ? lineItems : fabricateLineItemsFromSubtotal({ subtotal, discountAmount, taxCodes });
    // Normalize structure (ensure amount, quantity, taxCode)
    taxLineItems = taxLineItems.map(li => ({
      amount: typeof li.amount === 'number' ? li.amount : 0,
      quantity: typeof li.quantity === 'number' ? li.quantity : 1,
      taxCode: li.taxCode || 'default'
    }));

    const { taxTotal, breakdown } = computeTaxes({ lineItems: taxLineItems, address: shippingAddress });

    // Backward compatibility: keep 'tax' field
    return Response.json({ ok: true, shipping, tax: taxTotal, taxTotal, taxBreakdown: breakdown, currency });
  } catch (e) {
    return Response.json({ ok: false, error: e.message || 'Estimate failed' }, { status: 500 });
  }
}
