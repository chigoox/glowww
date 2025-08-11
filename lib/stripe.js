/**
 * Stripe Payment Integration Templates
 * This file contains templates for Stripe payment processing
 * Replace with actual Stripe implementation when ready
 */

// Stripe pricing plans
export const PRICING_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    maxSites: 1,
    features: [
      '1 Website',
      'Unlimited pages',
      'Basic templates',
      'Glow subdomain (username.glow.com)',
      'Basic support'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
  // Stripe Price ID (set via env). If missing, we will use dynamic price_data.
  priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || null,
    maxSites: 5,
    features: [
      '5 Websites',
      'Unlimited pages',
      'Premium templates',
      'Custom domain support',
      'Advanced analytics',
      'Priority support',
      'Remove Glow branding'
    ]
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 19.99,
  // Stripe Price ID (set via env). If missing, we will use dynamic price_data.
  priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS || null,
    maxSites: 25,
    features: [
      '25 Websites',
      'Unlimited pages',
      'All premium features',
      'White-label solution',
      'Advanced e-commerce',
      'API access',
      'Dedicated support'
    ]
  }
};

/**
 * Create Stripe checkout session (TEMPLATE)
 */
export const createCheckoutSession = async (priceId, userId, successUrl, cancelUrl, email, priceData) => {
  try {
    // TODO: Replace with actual Stripe implementation
    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        priceData,
        userId,
        email,
        successUrl,
        cancelUrl
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to create checkout session');
    }

    const { sessionUrl } = data;
    return sessionUrl;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

/**
 * Create Stripe customer portal session (TEMPLATE)
 */
export const createPortalSession = async (customerId, returnUrl) => {
  try {
    // TODO: Replace with actual Stripe implementation
    const response = await fetch('/api/stripe/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId,
        returnUrl
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create portal session');
    }

    const { sessionUrl } = await response.json();
    return sessionUrl;
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
};

// Stripe Connect (Standard) helpers
export async function startStripeConnectOnboarding(userId, email, returnUrl) {
  const res = await fetch('/api/connect/stripe/oauth/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, email, returnUrl })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to start Stripe Connect');
  return data.url;
}

export async function getStripeConnectedAccount(userId) {
  const res = await fetch(`/api/connect/stripe/account?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) return { connected: false };
  return res.json();
}

export async function disconnectStripeAccount(userId) {
  const res = await fetch('/api/connect/stripe/disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to disconnect');
  return data;
}

/**
 * Webhook handler helpers (TEMPLATE)
 */
export const handleStripeWebhook = async (event) => {
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error handling webhook:', error);
    throw error;
  }
};

const handleCheckoutCompleted = async (session) => {
  // TODO: Update user plan in Firestore
  console.log('Checkout completed:', session);
};

const handleSubscriptionUpdated = async (subscription) => {
  // TODO: Update user subscription status
  console.log('Subscription updated:', subscription);
};

const handleSubscriptionDeleted = async (subscription) => {
  // TODO: Downgrade user to free plan
  console.log('Subscription deleted:', subscription);
};

const handlePaymentSucceeded = async (invoice) => {
  // TODO: Handle successful payment
  console.log('Payment succeeded:', invoice);
};

const handlePaymentFailed = async (invoice) => {
  // TODO: Handle failed payment
  console.log('Payment failed:', invoice);
};

/**
 * Create SetupIntent for in-app payment method update
 */
export const createSetupIntent = async (email, userId) => {
  const res = await fetch('/api/stripe/create-setup-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, userId })
  });
  if (!res.ok) throw new Error('Failed to create setup intent');
  return res.json(); // { clientSecret, customerId }
};

/**
 * Set default payment method for customer (and active subscriptions)
 */
export const setDefaultPaymentMethod = async (customerId, paymentMethodId) => {
  const res = await fetch('/api/stripe/set-default-payment-method', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId, paymentMethodId })
  });
  if (!res.ok) throw new Error('Failed to set default payment method');
  return res.json();
};

// Subscription management (in-app)
export const getSubscriptionStatus = async ({ email, customerId }) => {
  const params = new URLSearchParams();
  if (email) params.set('email', email);
  if (customerId) params.set('customerId', customerId);
  const res = await fetch(`/api/stripe/subscription?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch subscription');
  return res.json();
};

export const cancelSubscriptionAtPeriodEnd = async (subscriptionId) => {
  const res = await fetch('/api/stripe/subscription/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscriptionId })
  });
  if (!res.ok) throw new Error('Failed to cancel subscription');
  return res.json();
};

export const resumeSubscription = async (subscriptionId) => {
  const res = await fetch('/api/stripe/subscription/resume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscriptionId })
  });
  if (!res.ok) throw new Error('Failed to resume subscription');
  return res.json();
};

export const switchSubscriptionPlan = async (subscriptionId, newPriceId, proration_behavior = 'create_prorations') => {
  const res = await fetch('/api/stripe/subscription/switch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscriptionId, newPriceId, proration_behavior })
  });
  if (!res.ok) throw new Error('Failed to switch plan');
  return res.json();
};

// Connected account customers
export async function listConnectedCustomers(userId, { email, limit = 25, starting_after } = {}) {
  const params = new URLSearchParams();
  params.set('userId', userId);
  if (email) params.set('email', email);
  if (limit) params.set('limit', String(limit));
  if (starting_after) params.set('starting_after', starting_after);
  const res = await fetch(`/api/connect/stripe/customers/list?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to list customers');
  return res.json();
}

export async function createConnectedCustomer(userId, { name, email, phone, metadata } = {}) {
  const res = await fetch('/api/connect/stripe/customers/create', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, name, email, phone, metadata })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to create customer');
  return data;
}
