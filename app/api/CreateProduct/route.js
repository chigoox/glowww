export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import admin from 'firebase-admin';
import { adminDb } from '@/lib/firebaseAdmin';
import Stripe from 'stripe';

export async function POST(request) {
  try {
    if (!adminDb) {
      return new Response(JSON.stringify({ error: 'Firebase Admin not configured' }), { status: 500 });
    }
    const { productData, UID } = await request.json();
    if (!productData || !UID) {
      return new Response(JSON.stringify({ error: 'Missing productData or UID' }), { status: 400 });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), { status: 500 });
    }
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });

    // Build Stripe product payload
    // Only allow public HTTP(S) URLs for Stripe product images
    const images = Array.isArray(productData.images)
      ? productData.images.filter(u => typeof u === 'string' && /^https?:\/\//i.test(u)).slice(0, 8)
      : [];
    const metadata = {
      userId: UID,
      category: productData?.metadata?.category || '',
      tags: productData?.metadata?.tags || '',
      hasVariants: String(!!productData?.hasVariants),
      sku: productData?.sku || '',
      barcode: productData?.barcode || '',
    };

    const stripeProduct = await stripe.products.create({
      name: productData.name || 'Untitled product',
      active: !!productData.active,
      description: productData.description || '',
      images,
      metadata,
    });

    const currency = (productData.currency || 'usd').toLowerCase();
    let stripeDefaultPriceId = undefined;

    // Create prices: single-price or per-variant
    if (productData.hasVariants && Array.isArray(productData.variants) && productData.variants.length) {
      const createdVariants = [];
      for (const v of productData.variants) {
        const unitAmount = Math.round(Number(v?.price || 0) * 100);
        if (!unitAmount || unitAmount < 1) continue;
        const vMeta = {
          ...metadata,
          variantId: v.id || '',
          title: v.title || '',
          options: JSON.stringify(v.options || []),
          sku: v.sku || '',
        };
        const price = await stripe.prices.create({
          product: stripeProduct.id,
          unit_amount: unitAmount,
          currency,
          nickname: v.title || undefined,
          active: v.active !== false,
          metadata: vMeta,
        });
        createdVariants.push({ ...v, stripePriceId: price.id });
      }
      productData.variants = createdVariants;
    } else {
      const unitAmount = Math.round(Number(productData?.metadata?.price || 0) * 100);
      if (unitAmount && unitAmount > 0) {
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
      }
    }

    const data = {
      ...productData,
      userId: UID,
      stripeProductId: stripeProduct.id,
      ...(stripeDefaultPriceId ? { stripeDefaultPriceId } : {}),
      created: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await adminDb.collection('products').add(data);
    return new Response(JSON.stringify({ success: true, id: docRef.id, stripeProductId: stripeProduct.id, stripeDefaultPriceId }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Create failed' }), { status: 500 });
  }
}
