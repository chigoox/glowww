import Stripe from 'stripe';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
	try {
		const { priceId, priceData, userId, email, successUrl, cancelUrl } = await req.json();
		if (!process.env.STRIPE_SECRET_KEY) {
			return Response.json({ error: 'Stripe not configured' }, { status: 500 });
		}
		if ((!priceId && !priceData) || !successUrl || !cancelUrl) {
			return Response.json({ error: 'Missing parameters' }, { status: 400 });
		}

		const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

		// Find or create customer
		let customerId;
		if (email) {
			const customers = await stripe.customers.list({ email, limit: 1 });
			let customer = customers.data[0];
			if (!customer) {
				customer = await stripe.customers.create({ email, metadata: userId ? { userId } : undefined });
			}
			customerId = customer.id;
		}

		const lineItem = priceId
			? { price: priceId, quantity: 1 }
			: {
				price_data: {
					currency: priceData?.currency || 'usd',
					product_data: { name: priceData?.productName || 'Subscription' },
					unit_amount: priceData?.unit_amount,
					recurring: { interval: priceData?.interval || 'month' },
				},
				quantity: 1,
			};

		if (!priceId) {
			if (!priceData?.unit_amount || priceData.unit_amount < 50) {
				return Response.json({ error: 'Invalid amount' }, { status: 400 });
			}
		}

		const session = await stripe.checkout.sessions.create({
			mode: 'subscription',
			line_items: [lineItem],
			success_url: successUrl,
			cancel_url: cancelUrl,
			customer: customerId,
			allow_promotion_codes: true,
			metadata: userId ? { userId } : undefined,
		});

		return Response.json({ sessionUrl: session.url });
	} catch (err) {
		console.error('create-checkout-session error:', err?.message || err);
		return Response.json({ error: err?.message || 'Failed to create checkout session' }, { status: 500 });
	}
}

