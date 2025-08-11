/* Client-side GA4 helper with fallback to server MP proxy */

const GA_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
let initialized = false;

function safeWindow() {
  return typeof window !== 'undefined' ? window : undefined;
}

function getClientId() {
  const w = safeWindow();
  try {
    if (!w) return `${Date.now()}.${Math.random().toString(36).slice(2)}`;
    const key = 'ga_client_id';
    let cid = w.localStorage.getItem(key);
    if (!cid) {
      cid = `${Date.now()}.${Math.random().toString(36).slice(2)}`;
      w.localStorage.setItem(key, cid);
    }
    return cid;
  } catch {
    return `${Date.now()}.${Math.random().toString(36).slice(2)}`;
  }
}

function setUserProperties(ctx) {
  const w = safeWindow();
  if (!w || !w.gtag) return false;
  try {
    w.gtag('set', 'user_properties', {
      site_id: ctx?.siteId || '(unknown)',
      site_name: ctx?.siteName || '(unknown)',
      username: ctx?.username || '(unknown)',
      user_uid: ctx?.userUid || '(unknown)'
    });
    return true;
  } catch {
    return false;
  }
}

export function init(ctx) {
  if (initialized) return;
  const w = safeWindow();
  if (!GA_ID || !w) return;
  w.dataLayer = w.dataLayer || [];
  // Prevent automatic page_view to avoid double-counting; we'll send explicitly
  try {
    if (w.gtag) {
      w.gtag('js', new Date());
      w.gtag('config', GA_ID, { send_page_view: false });
      setUserProperties(ctx);
      initialized = true;
    }
  } catch {
    // ignore
  }
}

async function fallback(eventName, params, ctx) {
  try {
    const w = safeWindow();
    const location = params?.page_location || (w ? w.location?.href : undefined);
    const referrer = params?.page_referrer || (w ? w.document?.referrer : undefined);
    const body = {
      eventName,
      params: { ...params, page_location: location, page_referrer: referrer },
      clientId: getClientId(),
      userProps: {
        site_id: ctx?.siteId,
        site_name: ctx?.siteName,
        username: ctx?.username,
        user_uid: ctx?.userUid
      }
    };
    const path = `/api/sites/${encodeURIComponent(ctx?.username || '')}/${encodeURIComponent(ctx?.siteName || '')}/analytics/collect`;
    await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch {
    // swallow
  }
}

export async function pageView(params = {}, ctx) {
  const w = safeWindow();
  const title = params.page_title || (w?.document?.title ?? undefined);
  const location = params.page_location || (w?.location?.href ?? undefined);
  const referrer = params.page_referrer || (w?.document?.referrer ?? undefined);
  const payload = { page_title: title, page_location: location, page_referrer: referrer };

  if (w && w.gtag && GA_ID) {
    setUserProperties(ctx);
    try {
      w.gtag('event', 'page_view', payload);
      return;
    } catch {}
  }
  await fallback('page_view', payload, ctx);
}

export async function viewItem(params = {}, ctx) {
  const w = safeWindow();
  const payload = {
    currency: params.currency || 'USD',
    value: params.value || undefined,
    items: [
      {
        item_id: params.item_id,
        item_name: params.item_name,
        item_category: params.item_category,
        price: params.price
      }
    ]
  };

  if (w && w.gtag && GA_ID) {
    setUserProperties(ctx);
    try {
      w.gtag('event', 'view_item', payload);
      return;
    } catch {}
  }
  await fallback('view_item', payload, ctx);
}

export async function track(eventName, params = {}, ctx) {
  const w = safeWindow();
  if (w && w.gtag && GA_ID) {
    setUserProperties(ctx);
    try {
      w.gtag('event', eventName, params);
      return;
    } catch {}
  }
  await fallback(eventName, params, ctx);
}
