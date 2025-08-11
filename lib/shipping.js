// Client helpers for our Shippo-backed shipping API routes

export async function listRates(payload) {
  const res = await fetch('/api/shipping/rates', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to get rates');
  return data; // { shipmentId, rates: [] }
}

export async function purchaseLabel({ rate_id, label_file_type = 'PDF', async = false, userId }) {
  const res = await fetch('/api/shipping/labels', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rate_id, label_file_type, async, userId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to purchase label');
  return data; // { transactionId, trackingNumber, trackingUrl, labelUrl, ... }
}

export async function voidLabel({ transaction_id, userId }) {
  const res = await fetch('/api/shipping/labels/void', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ transaction_id, userId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to void label');
  return data;
}

export async function getTracking({ carrier, tracking_number, userId }) {
  const params = new URLSearchParams({ carrier, tracking_number });
  if (userId) params.set('userId', userId);
  const res = await fetch(`/api/shipping/tracking?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to get tracking');
  return data;
}

export async function validateAddress(address) {
  const res = await fetch('/api/shipping/address/validate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(address)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to validate address');
  return data;
}
