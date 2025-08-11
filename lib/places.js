// Client wrappers for our server-side Google Places proxy

export async function autocompleteAddresses({ input, sessiontoken, country }) {
  const params = new URLSearchParams();
  params.set('input', input);
  if (sessiontoken) params.set('sessiontoken', sessiontoken);
  if (country) params.set('country', country);
  const res = await fetch(`/api/places/autocomplete?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Autocomplete failed');
  return data.predictions || [];
}

export async function addressDetails({ place_id, sessiontoken }) {
  const params = new URLSearchParams();
  params.set('place_id', place_id);
  if (sessiontoken) params.set('sessiontoken', sessiontoken);
  const res = await fetch(`/api/places/details?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Details failed');
  return data; // { street1, city, state, zip, country, formatted, location }
}
