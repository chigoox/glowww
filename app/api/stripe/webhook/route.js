import Stripe from 'stripe';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
	const secret = process.env.STRIPE_WEBHOOK_SECRET;
	const stripeKey = process.env.STRIPE_SECRET_KEY;
	if (!stripeKey) {
		return new Response('Stripe not configured', { status: 500 });
	}

	const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });

	let event;
	try {
		const rawBody = await req.text();
		const signature = req.headers.get('stripe-signature');
		if (!secret || !signature) {
			return new Response('Missing webhook secret or signature', { status: 400 });
		}
		event = stripe.webhooks.constructEvent(rawBody, signature, secret);
	} catch (err) {
		console.error('Webhook signature verification failed.', err);
		return new Response('Webhook Error', { status: 400 });
	}

	try {
		switch (event.type) {
			case 'checkout.session.expired': {
				const session = event.data.object;
				const orderId = session.metadata?.orderId;
				const userId = session.metadata?.userId;
				if(orderId && userId) {
					const orderRef = adminDb.collection('users').doc(userId).collection('orders').doc(orderId);
					await adminDb.runTransaction(async (t)=>{
						const snap = await t.get(orderRef);
						if(!snap.exists) return;
						const data = snap.data();
						if(data.lifecycleStatus !== 'pending_payment') return;
						const items = Array.isArray(data.items)? data.items: [];
						for(const line of items){
							const prodRef = adminDb.collection('products').doc(line.productId);
							const prodSnap = await t.get(prodRef);
							if(!prodSnap.exists) continue;
							const prod = prodSnap.data();
							if(line.variantId && Array.isArray(prod.variants)) {
								const variants = prod.variants.map(v => {
									if(v.id === line.variantId || v.variantId === line.variantId){
										const reserved = typeof v.reserved==='number'? v.reserved:0;
										return { ...v, reserved: Math.max(0, reserved - line.qty) };
									}
									return v;
								});
								t.update(prodRef, { variants });
							} else {
								const reserved = typeof prod.reserved==='number'? prod.reserved:0;
								t.update(prodRef, { reserved: Math.max(0, reserved - line.qty) });
							}
						}
						const history = Array.isArray(data.statusHistory)? [...data.statusHistory]:[];
						history.push({ from: data.lifecycleStatus, to: 'expired', at: Date.now(), note: 'checkout_session_expired' });
						t.update(orderRef, { lifecycleStatus:'expired', status:'expired', expiredAt: new Date(), statusHistory: history.slice(-200) });
					});
				}
				break;
			}
			case 'checkout.session.completed': {
				const session = event.data.object;
				const userId = session.metadata?.userId;
				const sellerUserId = session.metadata?.sellerUserId || session.metadata?.seller || null;
				const siteId = session.metadata?.siteId || null;
				const customerId = session.customer;
				const orderId = session.metadata?.orderId;
				if (userId) {
					if (orderId) {
						const orderRef = adminDb.collection('users').doc(userId).collection('orders').doc(orderId);
						await adminDb.runTransaction(async (t) => {
							const snap = await t.get(orderRef);
							if(!snap.exists) return;
							const data = snap.data();
							const history = Array.isArray(data.statusHistory) ? [...data.statusHistory] : [];
							if(data.lifecycleStatus !== 'paid') {
								history.push({ from: data.lifecycleStatus || 'pending_payment', to: 'paid', at: Date.now(), note: 'checkout.session.completed' });
							}
							t.update(orderRef, {
								status: 'paid',
								lifecycleStatus: 'paid',
								paidAt: new Date(),
								sellerUserId: sellerUserId || null,
								siteId: siteId || null,
								stripe: { checkoutSessionId: session.id, paymentIntent: session.payment_intent || null },
								statusHistory: history.slice(-200)
							});
						});
						if (sellerUserId) {
							await adminDb.collection('sellers').doc(sellerUserId).collection('orders').doc(orderId).set({
								status: 'paid',
								paidAt: new Date(),
								userId,
								orderId,
								siteId: siteId || null,
								stripe: { checkoutSessionId: session.id, paymentIntent: session.payment_intent || null }
							}, { merge: true });
						}
					} else {
						await adminDb.collection('users').doc(userId).set({
							subscriptionTier: 'pro',
							stripe: { customerId },
							subscriptionStatus: 'active',
							lastCheckoutCompletedAt: new Date(),
						}, { merge: true });
					}
				}
				break;
			}
			case 'customer.subscription.updated':
			case 'customer.subscription.created':
				case 'customer.subscription.deleted':
					{
						const sub = event.data.object;
						const customerId = sub.customer;
						// Find user by stripe.customerId (simple query pattern)
						// Firestore doesn't support direct queries here without an index; we store by userId only in this template.
						// If metadata.userId is set on subscription, prefer it:
						const userId = sub.metadata?.userId;
						let tier = 'free';
						if (event.type !== 'customer.subscription.deleted') {
							tier = 'pro';
						}
						if (userId) {
							await adminDb.collection('users').doc(userId).set({
								subscriptionTier: tier,
								stripe: { customerId, subscriptionId: sub.id },
								subscriptionStatus: sub.status,
								cancelAtPeriodEnd: sub.cancel_at_period_end,
								currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
								lastSubscriptionEventAt: new Date(),
							}, { merge: true });
						}
					}
				break;
			case 'charge.refunded': {
				const charge = event.data.object;
				const orderId = charge.metadata?.orderId;
				const userId = charge.metadata?.userId;
				const sellerUserId = charge.metadata?.sellerUserId || null;
				if(orderId && userId) {
					await adminDb.collection('users').doc(userId).collection('orders').doc(orderId).set({ status:'refunded', refundedAt: new Date() }, { merge:true });
					if (sellerUserId) {
						await adminDb.collection('sellers').doc(sellerUserId).collection('orders').doc(orderId).set({ status:'refunded', refundedAt: new Date() }, { merge:true });
					}
				}
				break;
			}
			case 'payment_intent.payment_failed': {
				const intent = event.data.object;
				const orderId = intent.metadata?.orderId;
				const userId = intent.metadata?.userId;
				const sellerUserId = intent.metadata?.sellerUserId || null;
				if(orderId && userId) {
					const orderRef = adminDb.collection('users').doc(userId).collection('orders').doc(orderId);
					await adminDb.runTransaction(async (t)=>{
						const snap = await t.get(orderRef);
						if(!snap.exists) return;
						const data = snap.data();
						const items = Array.isArray(data.items)? data.items: [];
						for(const line of items){
							const prodRef = adminDb.collection('products').doc(line.productId);
							const prodSnap = await t.get(prodRef);
							if(!prodSnap.exists) continue;
							const prod = prodSnap.data();
							if(line.variantId && Array.isArray(prod.variants)) {
								const variants = prod.variants.map(v => {
									if(v.id === line.variantId || v.variantId === line.variantId) {
										const reserved = typeof v.reserved==='number'? v.reserved:0;
										return { ...v, reserved: Math.max(0, reserved - line.qty) };
									}
									return v;
								});
								t.update(prodRef, { variants });
							} else {
								const reserved = typeof prod.reserved==='number'? prod.reserved:0;
								t.update(prodRef, { reserved: Math.max(0, reserved - line.qty) });
							}
						}
						t.update(orderRef, { status:'payment_failed', lifecycleStatus:'payment_failed', updatedAt: new Date() });
					});
					if (sellerUserId) {
						await adminDb.collection('sellers').doc(sellerUserId).collection('orders').doc(orderId).set({ status:'payment_failed', updatedAt: new Date() }, { merge:true });
					}
				}
				break;
			}
			default:
				break;
		}
	} catch (err) {
		console.error('Webhook handler error:', err);
		return new Response('Handler error', { status: 500 });
	}

	return new Response('OK', { status: 200 });
}

export async function GET() {
	return new Response('Stripe webhook endpoint', { status: 200 });
}

