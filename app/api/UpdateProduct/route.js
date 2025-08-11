export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { adminDb } from '@/lib/firebaseAdmin';
import Stripe from 'stripe';

export async function POST(request) {
  try {
    if (!adminDb) {
      return new Response(JSON.stringify({ error: 'Firebase Admin not configured' }), { status: 500 });
    }
    const { productData } = await request.json();
    const id = productData?.id;
    if (!productData || !id) {
      return new Response(JSON.stringify({ error: 'Missing productData.id' }), { status: 400 });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), { status: 500 });
    }
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });

    // Fetch current Firestore doc to know existing Stripe IDs
    const docSnap = await adminDb.collection('products').doc(id).get();
    if (!docSnap.exists) {
      return new Response(JSON.stringify({ error: 'Product not found' }), { status: 404 });
    }
    const existing = docSnap.data() || {};
    const stripeProductId = existing.stripeProductId;

    // Upsert Stripe product
    let stripeProduct = null;
    // Only allow public HTTP(S) URLs for Stripe product images
    const images = Array.isArray(productData.images)
      ? productData.images.filter(u => typeof u === 'string' && /^https?:\/\//i.test(u)).slice(0, 8)
      : [];
    const metadata = {
      userId: existing.userId || productData.userId || '',
      category: productData?.metadata?.category || '',
      tags: productData?.metadata?.tags || '',
      hasVariants: String(!!productData?.hasVariants),
      sku: productData?.sku || '',
      barcode: productData?.barcode || '',
    };
    if (stripeProductId) {
      stripeProduct = await stripe.products.update(stripeProductId, {
        name: productData.name || 'Untitled product',
        active: !!productData.active,
        description: productData.description || '',
        images,
        metadata,
      });
    } else {
      stripeProduct = await stripe.products.create({
        name: productData.name || 'Untitled product',
        active: !!productData.active,
        description: productData.description || '',
        images,
        metadata,
      });
      productData.stripeProductId = stripeProduct.id;
    }

    const currency = (productData.currency || existing.currency || 'usd').toLowerCase();
    let stripeDefaultPriceId = existing.stripeDefaultPriceId;

    // Price/variant sync
    if (productData.hasVariants && Array.isArray(productData.variants)) {
      const nextVariants = [];
      for (const v of productData.variants) {
        const unitAmount = Math.round(Number(v?.price || 0) * 100);
        if (!unitAmount || unitAmount < 1) continue;
        if (v.stripePriceId) {
          // Get existing price to see if amount changed (Stripe prices immutable)
          let needsNew = true;
          try {
            const current = await stripe.prices.retrieve(v.stripePriceId);
            if (current && current.unit_amount === unitAmount && current.currency === currency) {
              needsNew = false;
            }
          } catch {}
          if (needsNew) {
            const price = await stripe.prices.create({
              product: stripeProduct.id,
              unit_amount: unitAmount,
              currency,
              nickname: v.title || undefined,
              active: v.active !== false,
              metadata: {
                ...metadata,
                variantId: v.id || '',
                title: v.title || '',
                options: JSON.stringify(v.options || []),
                sku: v.sku || '',
              }
            });
            v.stripePriceId = price.id;
          }
        } else {
          const price = await stripe.prices.create({
            product: stripeProduct.id,
            unit_amount: unitAmount,
            currency,
            nickname: v.title || undefined,
            active: v.active !== false,
            metadata: {
              ...metadata,
              variantId: v.id || '',
              title: v.title || '',
              options: JSON.stringify(v.options || []),
              sku: v.sku || '',
            }
          });
          v.stripePriceId = price.id;
        }
        nextVariants.push(v);
      }
      productData.variants = nextVariants;
      // No default_price for variant-mode
      stripeDefaultPriceId = undefined;
    } else {
      // Single price
      const unitAmount = Math.round(Number(productData?.metadata?.price || 0) * 100);
      if (unitAmount && unitAmount > 0) {
        let needsNew = true;
        if (stripeDefaultPriceId) {
          try {
            const current = await stripe.prices.retrieve(stripeDefaultPriceId);
            if (current && current.unit_amount === unitAmount && current.currency === currency) {
              needsNew = false;
            }
          } catch {}
        }
        if (needsNew) {
          const price = await stripe.prices.create({
            product: stripeProduct.id,
            unit_amount: unitAmount,
            currency,
            nickname: productData?.name || undefined,
            active: productData?.active !== false,
            metadata,
          });
          stripeDefaultPriceId = price.id;
          await stripe.products.update(stripeProduct.id, { default_price: stripeDefaultPriceId });
          productData.stripeDefaultPriceId = stripeDefaultPriceId;
        }
      }
    }

    await adminDb.collection('products').doc(id).set({
      ...productData,
      stripeProductId: stripeProduct.id,
      ...(stripeDefaultPriceId ? { stripeDefaultPriceId } : {}),
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return new Response(JSON.stringify({ success: true, id, stripeProductId: stripeProduct.id, stripeDefaultPriceId }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Update failed' }), { status: 500 });
  }
}
