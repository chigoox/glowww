# Stripe Setup

Set environment variables in your local env (e.g., .env.local):

- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
- STRIPE_SECRET_KEY=sk_test_xxx
- STRIPE_WEBHOOK_SECRET=whsec_xxx (optional until webhooks wired to Firestore)
- PRO_MONTHLY_PRICE_ID=price_xxx (optional if passing priceId directly)

Notes
- We create/find customers by email. For production, store stripeCustomerId in Firestore via the webhook (checkout.session.completed -> customer) for robust linkage.
- For in-app payment method updates we use SetupIntent + Payment Element and set default payment method for customer and active subscriptions.
- Use Stripe test cards (4242 4242 4242 4242, any future expiry, any CVC) in development.
