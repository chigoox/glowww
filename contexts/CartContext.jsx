'use client';
import React, { createContext, useContext, useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
// TEMP: use debug wrapper to detect improper getDocs argument
import { doc, getDoc, collection, query, where, limit, getDocs as _getDocs, addDoc, serverTimestamp, onSnapshot } from '@/lib/firestoreDebug';

/**
 * CartContext: client-side cart state with persistence, discount codes, analytics, and cross-sell.
 * This first pass is client-only; server sync & inventory validation can be added later.
 */

const STORAGE_KEY = 'glow_cart_v1';
const STORAGE_VERSION = 1;

const CartContext = createContext(null);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};

// Utility price formatter (cents -> string)
const formatMoney = (cents, currency = 'USD') => {
  if (typeof cents !== 'number') return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
};

const safeParse = (raw) => { try { return JSON.parse(raw); } catch { return null; } };

export function CartProvider({ children }) {
  // Debug: confirm provider mounts exactly once per React root
  useEffect(()=>{ try { console.info('[CartProvider] mounted'); } catch {} return ()=>{ try { console.info('[CartProvider] unmounted'); } catch {} }; }, []);
  const [items, setItems] = useState([]); // line items { id, productId, variantId, qty, price, lineUpdatedAt }
  const clientIdRef = useRef(typeof window !== 'undefined' ? (localStorage.getItem('glow_cart_client_id') || (()=>{ const id='c_'+Math.random().toString(36).slice(2); try{ localStorage.setItem('glow_cart_client_id', id);}catch{} return id; })()) : 'server');
  const pendingRemovalsRef = useRef(new Set());
  const [lastValidation, setLastValidation] = useState(null); // stores full validation response
  const [highlightLines, setHighlightLines] = useState(new Set()); // transient highlight keys productId::variantId
  const [shippingEstimate, setShippingEstimate] = useState(null); // cents
  const [taxEstimate, setTaxEstimate] = useState(null); // cents
  const estimateTimerRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const [announceQueue, setAnnounceQueue] = useState([]); // accessibility messages
  const [allowedProviders, setAllowedProviders] = useState({ stripe:true, paypal:true });
  const [currency, setCurrency] = useState('USD');
  const [discountCodes, setDiscountCodes] = useState([]); // public codes
  const [privateCodes, setPrivateCodes] = useState([]);
  // Multiple applied discount codes (stacking handled server-side). Each: { code, type, amount, stackable?, nonStackingGroup? }
  const [appliedCodes, setAppliedCodes] = useState([]);
  const [loadingDiscounts, setLoadingDiscounts] = useState(false);
  const [userId, setUserId] = useState(null);
  const [siteScope, setSiteScope] = useState(null); // optional site id for site-level discounts
  const [sellerUserId, setSellerUserId] = useState(null); // owning seller (required for ecommerce)
  const [sellerConnected, setSellerConnected] = useState(undefined); // undefined = unknown, boolean once checked
  const analyticsBuffer = useRef([]);
  const flushTimer = useRef(null);
  const LOCAL_EVENTS_KEY = 'glow_cart_events_buffer_v1';

  // Load any locally buffered analytics events (unauthenticated/offline) on mount
  useEffect(()=>{ if(typeof window==='undefined') return; try { const raw=localStorage.getItem(LOCAL_EVENTS_KEY); if(raw){ const arr=JSON.parse(raw); if(Array.isArray(arr)) analyticsBuffer.current.push(...arr); localStorage.removeItem(LOCAL_EVENTS_KEY); } } catch{} },[]);

  // Load persisted
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = safeParse(raw);
    if (!data || data.version !== STORAGE_VERSION) return;
    setItems(Array.isArray(data.items) ? data.items : []);
  setAppliedCodes(Array.isArray(data.appliedCodes) ? data.appliedCodes : (data.appliedCode ? [data.appliedCode] : []));
    setCurrency(data.currency || 'USD');
  }, []);

  // Persist
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = { version: STORAGE_VERSION, items, appliedCodes, currency };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch {}
  }, [items, appliedCodes, currency]);

  // Auth watch (for discount fetch scope)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUserId(u?.uid || null));
    return () => unsub();
  }, []);

  const subtotal = useMemo(() => items.reduce((sum, it) => sum + it.price * it.qty, 0), [items]);

  const discountAmount = useMemo(() => {
    if (!appliedCodes.length) return 0;
    // Simple client-side optimistic sum (server authoritative); each fixed amount is currency units.
    let acc = 0;
    appliedCodes.forEach(c => {
      let thisAmt = 0;
      if (c.type === 'Percent') thisAmt = Math.round(subtotal * (c.amount / 100));
      else thisAmt = Math.round(c.amount * 100);
      const remaining = subtotal - acc;
      if (remaining <= 0) return;
      acc += Math.min(thisAmt, remaining);
    });
    return acc;
  }, [appliedCodes, subtotal]);

  const total = useMemo(() => Math.max(subtotal - discountAmount, 0), [subtotal, discountAmount]);

  // Flush analytics buffer to Firestore (if authed) else persist locally
  const flushAnalytics = useCallback(async () => {
    const events = analyticsBuffer.current.splice(0, analyticsBuffer.current.length);
    flushTimer.current = null;
    if(!events.length) return;
    try {
      if(!userId) {
        if(typeof window!=='undefined') {
          const existing = (()=>{ try { return JSON.parse(localStorage.getItem(LOCAL_EVENTS_KEY)||'[]'); } catch { return []; }})();
          localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify([...existing, ...events]));
        }
        return;
      }
      // Single batched document per flush
      const batchCol = collection(db, 'users', userId, 'cartEventBatches');
      await addDoc(batchCol, { events, count: events.length, createdAt: serverTimestamp(), version: 1 });
    } catch (e) {
      analyticsBuffer.current.unshift(...events); // requeue
    }
  }, [userId]);

  // Analytics emit (buffer & schedule flush)
  const emitEvent = useCallback((name, payload = {}) => {
    // Auto-enrich analytics payload with multi-tenant context
    const evt = { name, payload: { ...payload, sellerUserId: sellerUserId || null, siteId: siteScope || null }, ts: Date.now() };
    analyticsBuffer.current.push(evt);
    if(!flushTimer.current) {
      flushTimer.current = setTimeout(()=>{ flushAnalytics(); }, 2000);
    }
  }, [flushAnalytics, sellerUserId, siteScope]);

  // Flush when userId appears (e.g., login after buffering)
  useEffect(()=>{ if(userId && analyticsBuffer.current.length) flushAnalytics(); }, [userId, flushAnalytics]);

  // Item helpers
  const addItem = useCallback((product, options = {}) => {
    setItems(prev => {
      const idx = prev.findIndex(p => p.productId === product.id && p.variantId === (options.variantId || null));
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + (options.qty || 1), lineUpdatedAt: Date.now() };
        return next;
      }
      return [
        ...prev,
        {
          id: uuid(),
            productId: product.id,
          title: product.name || product.title || 'Untitled',
          variantId: options.variantId || null,
          options: options.options || {},
          image: (product.images && product.images[0]) || product.image || options.image || '',
          price: product.price, // expecting cents (ShopFlexBox maps to cents)
          qty: options.qty || 1,
          lineUpdatedAt: Date.now(),
          meta: options.meta || {}
        }
      ];
    });
    emitEvent('cart_add', { productId: product.id, variantId: options.variantId || null, qty: options.qty || 1 });
    try { window.dispatchEvent(new CustomEvent('glow_cart_item_added', { detail: { productId: product.id } })); } catch {}
  enqueueAnnounce(`Added ${product.name || product.title || 'item'} to cart`);
  }, [emitEvent]);

  const updateQty = useCallback((lineId, qty) => {
    setItems(prev => prev.map(it => {
      if(it.id !== lineId) return it;
      const nextQty = Math.max(1, qty);
      if(typeof it.stock === 'number' && it.stock >= 0) {
        return { ...it, qty: Math.min(nextQty, it.stock), lineUpdatedAt: Date.now() };
      }
      return { ...it, qty: nextQty, lineUpdatedAt: Date.now() };
    }));
    emitEvent('cart_update_quantity', { lineId, qty });
  enqueueAnnounce('Updated quantity');
  }, [emitEvent]);

  const removeItem = useCallback((lineId) => {
    setItems(prev => prev.filter(it => {
      if(it.id === lineId) {
        const key = `${it.productId}::${it.variantId||''}`;
        pendingRemovalsRef.current.add(key);
      }
      return it.id !== lineId;
    }));
    emitEvent('cart_remove', { lineId });
  enqueueAnnounce('Item removed');
  }, [emitEvent]);

  // Re-add a previously removed line item (Undo support). Generates a new line id.
  const reAddLineItem = useCallback((line) => {
    if(!line) return;
    addItem({ id: line.productId, name: line.title, price: line.price, images: line.image ? [line.image] : [] }, { qty: line.qty, variantId: line.variantId, meta: line.meta });
    emitEvent('cart_undo_remove', { productId: line.productId, variantId: line.variantId || null });
  enqueueAnnounce('Undo removal');
  }, [addItem, emitEvent]);

  const clearCart = useCallback(() => {
    setItems(prev => { prev.forEach(it => pendingRemovalsRef.current.add(`${it.productId}::${it.variantId||''}`)); return []; });
  setAppliedCodes([]); emitEvent('cart_clear');
  enqueueAnnounce('Cart cleared');
  }, [emitEvent]);

  // Discount code fetching (global + site) from Firestore collections used in AdminDiscount
  const fetchDiscountCodes = useCallback(async ({ scopeSiteId } = {}) => {
    if (!userId) return; // requires auth user
    setLoadingDiscounts(true);
    try {
      const globalRef = doc(db, 'users', userId, 'discounts', 'global');
      const globalSnap = await getDoc(globalRef).catch(() => null);
      let gCodes = globalSnap?.exists() ? globalSnap.data().discountCodes || [] : [];
      let pCodes = globalSnap?.exists() ? globalSnap.data().privateCodes || [] : [];

      if (scopeSiteId) {
        const siteRef = doc(db, 'users', userId, 'sites', scopeSiteId, 'discounts', 'codes');
        const siteSnap = await getDoc(siteRef).catch(() => null);
        if (siteSnap?.exists()) {
          gCodes = [...gCodes, ...(siteSnap.data().discountCodes || [])];
          pCodes = [...pCodes, ...(siteSnap.data().privateCodes || [])];
        }
      }

      // Deduplicate by code
      const dedupe = (arr) => Object.values(arr.reduce((acc, c) => { acc[c.code] = c; return acc; }, {}));
      setDiscountCodes(dedupe(gCodes));
      setPrivateCodes(dedupe(pCodes));
    } finally { setLoadingDiscounts(false); }
  }, [userId]);

  // Apply discount
  const applyCode = useCallback((codeInput) => {
    const all = [...discountCodes, ...privateCodes];
    const found = all.find(c => c.code.toLowerCase() === codeInput.toLowerCase());
    if (!found) return { ok: false, reason: 'not_found' };
    // Avoid duplicates
    if (appliedCodes.some(ac => ac.code.toLowerCase() === found.code.toLowerCase())) {
      return { ok: false, reason: 'duplicate' };
    }
    setAppliedCodes(prev => [...prev, found]);
    emitEvent('cart_apply_promo', { code: found.code, type: found.type });
  enqueueAnnounce(`Applied code ${found.code}`);
    return { ok: true, code: found };
  }, [discountCodes, privateCodes, appliedCodes, emitEvent]);

  const removeCode = useCallback((code) => {
    setAppliedCodes(prev => prev.filter(c => c.code !== code));
    emitEvent('cart_remove_promo', { code });
  enqueueAnnounce(`Removed code ${code}`);
  }, [emitEvent]);

  // Cross-sell: fetch related products from Firestore (same category) caching per category
  const [crossSellPool, setCrossSellPool] = useState({}); // { category: [products] }
  const [crossSellItems, setCrossSellItems] = useState([]);
  const [crossSellLoading, setCrossSellLoading] = useState(false);
  const crossSellAbort = useRef(null);

  // Wrap getDocs to catch improper usage (passing DocumentReference instead of Query) & log origin stack
  const safeGetDocs = useCallback(async (arg) => {
    const isDocLike = !!(arg && arg.type === 'document');
    const ctorName = arg?.constructor?.name;
    try {
      if (typeof window !== 'undefined') {
        const stack = new Error().stack?.split('\n').slice(1,6).join('\n');
        console.info('[Cart][safeGetDocs] call', { ctorName, isDocLike, keys: Object.keys(arg||{}).slice(0,6) });
        if(isDocLike) console.warn('[Cart][safeGetDocs] DocumentReference passed to getDocs candidate', arg);
        console.debug('[Cart][safeGetDocs] stack preview:\n'+stack);
      }
      return await _getDocs(arg);
    } catch (e) {
      console.error('[Cart][safeGetDocs] error', e);
      throw e;
    }
  }, []);

  const fetchCrossSell = useCallback(async (category) => {
    if(!category) return [];
    if(crossSellPool[category]) return crossSellPool[category];
    setCrossSellLoading(true);
    try {
      const qRef = query(collection(db, 'products'), where('metadata.category','==', category), limit(20));
      if (process.env.NODE_ENV !== 'production') console.info('[Cart] fetchCrossSell query constructed', { category, ctor: qRef?.constructor?.name });
      const snap = await safeGetDocs(qRef);
      const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCrossSellPool(prev => ({ ...prev, [category]: products }));
      return products;
    } catch {
      return [];
    } finally { setCrossSellLoading(false); }
  }, [crossSellPool]);

  // Helper to extract suggestion shape
  const mapProductToSuggestion = useCallback((p, fallbackCat) => ({
    id: p.id,
    productId: p.id,
    title: p.name || p.title || 'Product',
    image: Array.isArray(p.images) ? p.images[0] : (p.image || ''),
    price: Math.round(Number(p?.metadata?.price || 0) * 100) || (p.price || 0),
    meta: { category: p?.metadata?.category || fallbackCat }
  }), []);

  // Recompute cross-sell with category diversity
  useEffect(()=>{
    if(!items.length) { setCrossSellItems([]); return; }
    const categories = Array.from(new Set(items.map(i => i.meta?.category).filter(Boolean)));
    const inCartIds = new Set(items.map(i => i.productId));
    let active = true;

    // Single category: keep focused suggestions (last added category priority)
    if(categories.length <= 1) {
      const last = items[items.length - 1];
      const cat = last.meta?.category;
      if(!cat) { setCrossSellItems([]); return; }
      fetchCrossSell(cat).then(pool => {
        if(!active) return;
        const suggestions = pool.filter(p => !inCartIds.has(p.id))
          .slice(0, 6)
          .map(p => mapProductToSuggestion(p, cat));
        setCrossSellItems(suggestions);
      });
      return () => { active=false; };
    }

    // Multi-category diversity: fetch top categories (by frequency) then mix & shuffle
    const freq = categories.map(cat => ({
      cat,
      count: items.filter(i => i.meta?.category === cat).length
    })).sort((a,b)=> b.count - a.count);
    const targetCats = freq.slice(0, 4).map(f => f.cat); // limit categories to avoid many queries

    setCrossSellLoading(true);
    Promise.all(targetCats.map(c => fetchCrossSell(c)))
      .then(results => {
        if(!active) return;
        const combined = [];
        results.forEach((pool, idx) => {
          const cat = targetCats[idx];
          // Take up to 3 per category initially
            const perCat = pool.filter(p => !inCartIds.has(p.id)).slice(0,3);
          perCat.forEach(p => combined.push(mapProductToSuggestion(p, cat)));
        });
        // Shuffle combined (Fisher-Yates)
        for(let i=combined.length-1; i>0; i--) {
          const j = Math.floor(Math.random() * (i+1));
          [combined[i], combined[j]] = [combined[j], combined[i]];
        }
        setCrossSellItems(combined.slice(0,6));
      })
      .finally(()=>{ if(active) setCrossSellLoading(false); });

    return () => { active=false; };
  }, [items, fetchCrossSell, mapProductToSuggestion]);

  // Server validation helper
  const validateCart = useCallback(async ()=>{
    try {
      const payload = { userId, items: items.map(i => ({ productId: i.productId, variantId: i.variantId, qty: i.qty, price: i.price })), discounts: appliedCodes.map(c => ({ code: c.code })) };
      const res = await fetch('/api/cart/validate', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if(!res.ok || !data.ok) return { ok:false };
  setLastValidation(data);
  if(Array.isArray(data.rejected)) data.rejected.forEach(r => emitEvent('cart_promo_rejected', { code: r.code, reason: r.reason }));
  if(data.changed) emitEvent('cart_validate_changed', { removed: data.removedItemIds?.length || 0, adjustments: data.adjustments?.length || 0 });
      return data;
    } catch { return { ok:false }; }
  }, [items, appliedCodes, userId]);

  const [pendingNotice, setPendingNotice] = useState(null); // { type:'validation', data }

  const beginCheckoutStripe = useCallback(async ({ onUrl } = {}) => {
    emitEvent('cart_checkout_clicked', { provider: 'stripe', subtotal, total });
  const validation = await validateCart();
    if(!validation.ok) { emitEvent('cart_checkout_blocked', { provider:'stripe', reason:'validation_failed' }); return; }
  if(!sellerConnected) { emitEvent('cart_checkout_blocked', { provider:'stripe', reason:'seller_not_connected' }); return; }
    if(validation.changed) {
      if(Array.isArray(validation.adjustments)) {
        validation.adjustments.forEach(adj => emitEvent('cart_inventory_adjustment', { provider:'stripe', ...adj }));
      }
      setItems(validation.items.map(v => ({ id: uuid(), productId: v.productId, title: v.title, variantId: v.variantId, image: v.image, price: v.price, qty: v.qty, stock: typeof v.stock === 'number' ? v.stock : undefined, meta: {} })));
  if(Array.isArray(validation.discounts)) setAppliedCodes(validation.discounts);
  else if(appliedCodes.length) setAppliedCodes([]);
      setPendingNotice({ type:'validation', data: validation });
  // highlight changed lines
  const keys = new Set();
  validation.items.forEach(v => keys.add(`${v.productId}::${v.variantId||''}`));
  setHighlightLines(keys);
  setTimeout(()=> setHighlightLines(new Set()), 5000);
      emitEvent('cart_checkout_blocked', { provider:'stripe', reason:'validation_changed', removed: validation.removedItemIds, adjustments: validation.adjustments });
      return;
    }
    try {
  const orderRes = await fetch('/api/cart/create-order', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ userId, items: validation.items, discounts: appliedCodes.map(c => ({ code: c.code, type: c.type, amount: c.amount })), currency, sellerUserId: sellerUserId || userId, siteId: siteScope }) });
      const orderData = await orderRes.json();
      if(!orderRes.ok || !orderData.ok) throw new Error(orderData.error || 'Order creation failed');
      emitEvent('order_created', { provider:'stripe', orderId: orderData.orderId, total: orderData.total });
      const lineItems = validation.items.map(it => ({ name: it.title, amount: it.price, qty: it.qty }));
  const res = await fetch('/api/stripe/cart-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currency, items: lineItems, discounts: appliedCodes.map(c => ({ code: c.code, type: c.type, amount: c.amount })), meta: { orderId: orderData.orderId }, sellerUserId: sellerUserId || userId, siteId: siteScope }) });
      const data = await res.json();
      if (res.ok && data.url) { if (onUrl) onUrl(data.url); else window.location.href = data.url; }
      else throw new Error(data.error || 'Stripe checkout failed');
    } catch (e) {
      console.error(e); emitEvent('cart_checkout_error', { provider: 'stripe', message: e.message });
    }
  }, [items, currency, appliedCodes, subtotal, total, emitEvent, validateCart, userId]);

  const beginCheckoutPaypal = useCallback(async () => {
    emitEvent('cart_checkout_clicked', { provider: 'paypal', subtotal, total });
  const validation = await validateCart();
    if(!validation.ok) { emitEvent('cart_checkout_blocked', { provider:'paypal', reason:'validation_failed' }); return; }
  if(!sellerConnected) { emitEvent('cart_checkout_blocked', { provider:'paypal', reason:'seller_not_connected' }); return; }
    if(validation.changed) {
      if(Array.isArray(validation.adjustments)) {
        validation.adjustments.forEach(adj => emitEvent('cart_inventory_adjustment', { provider:'paypal', ...adj }));
      }
      setItems(validation.items.map(v => ({ id: uuid(), productId: v.productId, title: v.title, variantId: v.variantId, image: v.image, price: v.price, qty: v.qty, stock: typeof v.stock === 'number' ? v.stock : undefined, meta: {} })));
  if(Array.isArray(validation.discounts)) setAppliedCodes(validation.discounts); else if(appliedCodes.length) setAppliedCodes([]);
      setPendingNotice({ type:'validation', data: validation });
  const keys = new Set();
  validation.items.forEach(v => keys.add(`${v.productId}::${v.variantId||''}`));
  setHighlightLines(keys);
  setTimeout(()=> setHighlightLines(new Set()), 5000);
      emitEvent('cart_checkout_blocked', { provider:'paypal', reason:'validation_changed', removed: validation.removedItemIds, adjustments: validation.adjustments });
      return;
    }
    try {
      // Create internal order first (transactional stock decrement already done in stripe path)
  const orderRes = await fetch('/api/cart/create-order', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ userId, items: validation.items, discounts: appliedCodes.map(c => ({ code: c.code, type: c.type, amount: c.amount })), currency, sellerUserId: sellerUserId || userId, siteId: siteScope }) });
      const orderData = await orderRes.json();
      if(!orderRes.ok || !orderData.ok) throw new Error(orderData.error || 'Order creation failed');
      emitEvent('order_created', { provider:'paypal', orderId: orderData.orderId, total: orderData.total });
      const src = validation.items; // authoritative
  const res = await fetch('/api/paypal/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: orderData.orderId, items: src.map(i => ({ name: i.title, unit_amount: i.price, qty: i.qty })), discounts: appliedCodes.map(c => ({ code: c.code, type: c.type, amount: c.amount })), currency, sellerUserId: sellerUserId || userId, siteId: siteScope }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'PayPal order failed');
      console.log('PayPal order stub created', data);
    } catch (e) {
      console.error(e); emitEvent('cart_checkout_error', { provider: 'paypal', message: e.message });
    }
  }, [items, appliedCodes, currency, subtotal, total, emitEvent, validateCart]);

  // Shipping & tax estimate (debounced on cart or discounts change)
  useEffect(()=>{
    if(estimateTimerRef.current) clearTimeout(estimateTimerRef.current);
    if(!items.length) { setShippingEstimate(0); setTaxEstimate(0); return; }
    estimateTimerRef.current = setTimeout(async ()=>{
      try {
  const totalWeight = items.reduce((w,i)=> w + (typeof i.weight==='number'? (i.weight * i.qty):0), 0);
  const taxCodes = Array.from(new Set(items.map(i=> i.taxCode).filter(Boolean)));
  const res = await fetch('/api/cart/estimate', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ subtotal, discountAmount, currency, totalWeight, taxCodes }) });
        const data = await res.json();
        if(res.ok && data.ok) {
          setShippingEstimate(data.shipping || 0);
          setTaxEstimate(data.tax || 0);
          emitEvent('cart_estimate_updated', { shipping: data.shipping, tax: data.tax });
        }
      } catch {}
    }, 600);
    return ()=>{ if(estimateTimerRef.current) clearTimeout(estimateTimerRef.current); };
  }, [items, subtotal, discountAmount, appliedCodes, currency, emitEvent]);

  // Abandoned cart heartbeat (every 60s while items exist)
  useEffect(()=>{
    if(heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    if(!items.length) return;
    heartbeatTimerRef.current = setInterval(()=>{
      fetch('/api/cart/heartbeat', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ userId }) }).catch(()=>{});
      emitEvent('cart_abandoned_heartbeat', { itemCount: items.length });
    }, 60000);
    return ()=> { if(heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current); };
  }, [items, userId, emitEvent]);

  // Load payment provider settings for current site scope (only if seller connected)
  useEffect(()=>{
    if(!userId || !siteScope) return;
    if(sellerConnected === false) { setAllowedProviders({ stripe:false, paypal:false }); return; }
    const siteRef = doc(db, 'users', userId, 'sites', siteScope);
    getDoc(siteRef).then(snap => {
      if(snap.exists()) {
        const data = snap.data();
        if(data.paymentProviders && typeof data.paymentProviders==='object') {
          setAllowedProviders({ stripe: data.paymentProviders.stripe !== false, paypal: data.paymentProviders.paypal !== false });
        } else {
          setAllowedProviders({ stripe:false, paypal:false });
        }
      } else {
        setAllowedProviders({ stripe:false, paypal:false });
      }
    }).catch(()=>{ setAllowedProviders({ stripe:false, paypal:false }); });
  }, [userId, siteScope, sellerConnected]);

  // Check seller Stripe connection when sellerUserId changes
  useEffect(()=>{
    if(!sellerUserId) { setSellerConnected(false); setAllowedProviders({ stripe:false, paypal:false }); return; }
    let cancelled=false;
    (async()=>{
      try {
        const res = await fetch(`/api/connect/stripe/account?userId=${encodeURIComponent(sellerUserId)}`);
        const json = await res.json();
        if(cancelled) return;
        if(res.ok && json.connected) {
          setSellerConnected(true);
        } else {
          setSellerConnected(false); setAllowedProviders({ stripe:false, paypal:false });
        }
      } catch { if(!cancelled){ setSellerConnected(false); setAllowedProviders({ stripe:false, paypal:false }); } }
    })();
    return ()=>{ cancelled=true; };
  }, [sellerUserId]);

  // Accessibility announcement helper
  const enqueueAnnounce = useCallback((msg) => {
    setAnnounceQueue(q => [...q.slice(-5), msg]);
  }, []);

  // Provide merged announcement string (last message takes precedence)
  const liveMessage = useMemo(()=> announceQueue.slice(-1)[0] || '', [announceQueue]);

  // Load persisted cart config (for components needing defaults before NavBar loads)
  const [persistedConfig, setPersistedConfig] = useState(null);
  useEffect(()=>{ if(typeof window==='undefined') return; try { const raw = localStorage.getItem('glow_cart_config_v1'); if(raw) setPersistedConfig(JSON.parse(raw)); } catch{} },[]);
  // Guest -> Auth merge state
  const mergedUserRef = useRef(null);
  useEffect(()=>{ if(!userId) mergedUserRef.current = null; }, [userId]);

  // Guest → Auth merge effect: when user logs in, pull server cart, merge quantities, push merged
  useEffect(()=>{
    if(!userId) return; // only when logged in
    if(mergedUserRef.current === userId) return; // already merged for this user
    let cancelled = false;
    (async () => {
      try {
        const cartRef = doc(db, 'users', userId, 'commerce', 'activeCart');
        const snap = await getDoc(cartRef).catch(()=>null);
        const serverItems = snap?.exists() && Array.isArray(snap.data().items) ? snap.data().items : [];
        if(cancelled) return;
        if(!serverItems.length && !items.length) { mergedUserRef.current = userId; return; }
        // Duplication guard: if server and local carts are structurally identical (same lines & qty),
        // treat this as a reload rather than a guest->auth merge to avoid doubling quantities.
        if(serverItems.length && items.length) {
          const same = serverItems.length === items.length && serverItems.every(si => {
            const li = items.find(it => it.productId === si.productId && (it.variantId||null) === (si.variantId||null));
            return !!li && li.qty === si.qty;
          });
          if(same) {
            const normalized = serverItems.map(si => ({ id: uuid(), productId: si.productId, variantId: si.variantId||null, title: (items.find(i=>i.productId===si.productId && (i.variantId||null)===(si.variantId||null))?.title) || 'Item', image: (items.find(i=>i.productId===si.productId && (i.variantId||null)===(si.variantId||null))?.image) || '', price: si.price, qty: si.qty, lineUpdatedAt: si.lineUpdatedAt || Date.now(), meta: (items.find(i=>i.productId===si.productId && (i.variantId||null)===(si.variantId||null))?.meta) || {} }));
            setItems(normalized);
            mergedUserRef.current = userId;
            emitEvent('cart_merge_skipped_duplicate', { lineCount: normalized.length });
            return;
          }
        }
        // Build maps
        const now = Date.now();
        const map = {};
        serverItems.forEach(si => { const key = `${si.productId}::${si.variantId||''}`; map[key] = { productId: si.productId, variantId: si.variantId||null, qty: si.qty, price: si.price, lineUpdatedAt: si.lineUpdatedAt || now }; });
        items.forEach(li => { const key = `${li.productId}::${li.variantId||''}`; if(map[key]) { map[key].qty += li.qty; map[key].lineUpdatedAt = now; } else { map[key] = { productId: li.productId, variantId: li.variantId||null, qty: li.qty, price: li.price, lineUpdatedAt: li.lineUpdatedAt || now }; } });
        const merged = Object.values(map).map(m => ({ id: uuid(), productId: m.productId, variantId: m.variantId, title: (items.find(i=>i.productId===m.productId && i.variantId===m.variantId)?.title) || 'Item', image: (items.find(i=>i.productId===m.productId && i.variantId===m.variantId)?.image) || '', price: m.price, qty: m.qty, lineUpdatedAt: m.lineUpdatedAt, meta: (items.find(i=>i.productId===m.productId && i.variantId===m.variantId)?.meta) || {} }));
        setItems(merged);
        mergedUserRef.current = userId;
        emitEvent('cart_merged_guest_to_user', { serverCount: serverItems.length, guestCount: items.length, mergedCount: merged.length });
        // Immediate sync push
  const payload = { userId, clientId: clientIdRef.current, items: merged.map(i => ({ productId: i.productId, variantId: i.variantId, qty: i.qty, price: i.price, lineUpdatedAt: i.lineUpdatedAt })), removedKeys: [], discounts: appliedCodes.map(c => ({ code: c.code, type: c.type, amount: c.amount })), currency, baseVersion: snap?.data()?.version || 0 };
        fetch('/api/cart/sync', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) }).catch(()=>{});
      } catch (e) { console.error('guest->auth merge failed', e); }
    })();
    return ()=> { cancelled = true; };
  }, [userId, items, appliedCodes, currency, emitEvent]);
  // Real-time cart subscription & sync
  const lastServerVersionRef = useRef(0);
  const suppressEchoRef = useRef(false);

  useEffect(()=>{
    if(!userId) return;
    const ref = doc(db, 'users', userId, 'commerce', 'activeCart');
    const unsub = onSnapshot(ref, snap => {
      if(!snap.exists()) return;
      const data = snap.data();
      if(data.lastClientId === clientIdRef.current && suppressEchoRef.current) { suppressEchoRef.current = false; return; }
      if(typeof data.version === 'number' && data.version <= lastServerVersionRef.current) return;
      lastServerVersionRef.current = data.version || lastServerVersionRef.current;
      const serverItems = Array.isArray(data.items) ? data.items : [];
      setItems(prev => serverItems.map(si => {
        const existing = prev.find(p => p.productId === si.productId && p.variantId === si.variantId);
        return existing ? { ...existing, qty: si.qty, price: si.price, lineUpdatedAt: si.lineUpdatedAt || existing.lineUpdatedAt } : { id: uuid(), productId: si.productId, variantId: si.variantId, title: existing?.title || 'Item', image: existing?.image || '', price: si.price, qty: si.qty, lineUpdatedAt: si.lineUpdatedAt || Date.now(), meta: existing?.meta || {} };
      }));
  if(Array.isArray(data.discounts)) setAppliedCodes(data.discounts);
  if(Array.isArray(data.discounts)) setAppliedCodes(data.discounts);
  if(data.updatedAt) {/* potential future: compare timestamps */}
    });
    return ()=> unsub();
  }, [userId]);

  useEffect(()=>{
    if(!userId) return;
    const handle = setTimeout(()=>{
      const removalKeys = Array.from(pendingRemovalsRef.current);
      pendingRemovalsRef.current.clear();
      const payload = {
        userId,
        clientId: clientIdRef.current,
        items: items.map(i => ({ productId: i.productId, variantId: i.variantId, qty: i.qty, price: i.price, lineUpdatedAt: i.lineUpdatedAt || Date.now() })),
        removedKeys: removalKeys,
  discounts: appliedCodes.map(c => ({ code: c.code, type: c.type, amount: c.amount })),
        currency,
        baseVersion: lastServerVersionRef.current
      };
      suppressEchoRef.current = true;
      fetch('/api/cart/sync', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
        .then(r=>r.json())
        .then(data => { if(data?.ok && data.cart?.version) { lastServerVersionRef.current = data.cart.version; emitEvent('cart_synced', { itemCount: items.length, version: data.cart.version }); } })
        .catch(()=>{});
    }, 700);
    return ()=> clearTimeout(handle);
  }, [items, appliedCodes, currency, userId, emitEvent]);

  const value = {
    items, addItem, updateQty, removeItem, reAddLineItem, clearCart,
    subtotal, discountAmount, total, formatMoney,
  discountCodes, appliedCodes, applyCode, removeCode, fetchDiscountCodes, loadingDiscounts,
    crossSellItems, crossSellLoading, beginCheckoutStripe, beginCheckoutPaypal, validateCart,
    currency, setCurrency, setSiteScope,
    pendingNotice, acknowledgeNotice: () => setPendingNotice(null),
  config: persistedConfig,
  lastValidation,
  shippingEstimate, taxEstimate,
  highlightLines,
  liveMessage,
  allowedProviders,
  setSiteScope,
  setSellerUserId,
  sellerConnected
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
