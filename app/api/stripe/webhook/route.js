import Stripe from 'stripe';
import { adminDb } from '@/lib/firebaseAdmin';

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
			case 'checkout.session.completed':
					{
						const session = event.data.object;
						const userId = session.metadata?.userId;
						const customerId = session.customer;
						if (userId) {
							await adminDb.collection('users').doc(userId).set({
								subscriptionTier: 'pro',
								stripe: { customerId },
								subscriptionStatus: 'active',
								lastCheckoutCompletedAt: new Date(),
							}, { merge: true });
						}
					}
				break;
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
			case 'invoice.payment_failed':
			case 'invoice.payment_succeeded':
				// Optional: handle payment status
				break;
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

