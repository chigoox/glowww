import Stripe from 'stripe';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
	try {
		const { email, customerId, returnUrl } = await req.json();
		if (!process.env.STRIPE_SECRET_KEY) {
			return Response.json({ error: 'Stripe not configured' }, { status: 500 });
		}
		if (!returnUrl) {
			return Response.json({ error: 'Missing returnUrl' }, { status: 400 });
		}

		const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

		let cid = customerId;
		if (!cid) {
			if (!email) return Response.json({ error: 'Missing email' }, { status: 400 });
			const customers = await stripe.customers.list({ email, limit: 1 });
			const customer = customers.data[0];
			if (!customer) return Response.json({ error: 'No customer found for email' }, { status: 404 });
			cid = customer.id;
		}

		const session = await stripe.billingPortal.sessions.create({
			customer: cid,
			return_url: returnUrl,
		});

		return Response.json({ sessionUrl: session.url });
	} catch (err) {
		console.error('create-portal-session error:', err);
		return Response.json({ error: 'Failed to create portal session' }, { status: 500 });
	}
}

