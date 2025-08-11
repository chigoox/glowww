export async function startPaypalOnboarding(userId, email, returnUrl) {
  const res = await fetch('/api/connect/paypal/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, email, returnUrl })
  });
  if (!res.ok) throw new Error('Failed to start PayPal');
  const data = await res.json();
  return data.url;
}

export async function getPaypalStatus(userId) {
  const res = await fetch(`/api/connect/paypal/status?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) return { connected: false };
  return res.json();
}
