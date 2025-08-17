export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Placeholder creates a mock PayPal order id; future: integrate real PayPal SDK & partner fee routing.
export async function POST(req) {
  try {
  const { items = [], currency = 'USD', discounts = [], orderId, sellerUserId, siteId } = await req.json();
    if (!items.length) return Response.json({ error: 'No items' }, { status: 400 });
  if(!sellerUserId) return Response.json({ error: 'Missing sellerUserId' }, { status: 400 });
    const gross = items.reduce((s, i) => s + (i.unit_amount * i.qty), 0);
    let discountAmount = 0;
    discounts.forEach(d => {
      let amt = 0; if(d.type==='Percent') amt = Math.round(gross * (d.amount/100)); else amt = Math.round(d.amount * 100);
      const remaining = gross - discountAmount; if(remaining>0) discountAmount += Math.min(amt, remaining);
    });
    const total = Math.max(0, gross - discountAmount);
    const paypalOrderId = 'MOCK-PAYPAL-' + Date.now();
  return Response.json({ id: paypalOrderId, amount: total, currency, discountAmount, sourceOrderId: orderId, sellerUserId, siteId: siteId || null });
  } catch (e) {
    return Response.json({ error: e.message || 'Failed to create order' }, { status: 500 });
  }
}
