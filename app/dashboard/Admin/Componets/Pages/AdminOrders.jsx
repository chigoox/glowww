import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Tag, Select, DatePicker, InputNumber, Input, message } from 'antd';
import { Search as SearchIcon, X } from 'lucide-react';
import { collection, onSnapshot, orderBy, query, where, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { listRates, purchaseLabel, validateAddress } from '@/lib/shipping';
import { autocompleteAddresses, addressDetails } from '@/lib/places';

export const AdminOrders = ({ OWNER }) => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  // Filters/sorting/pagination
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all'); // all | paid | unpaid | pending | refunded
  const [sort, setSort] = useState('newest');  // newest | oldest | amount-asc | amount-desc | customer-asc | customer-desc
  const [dateRange, setDateRange] = useState(null); // [startDayjs, endDayjs]
  const [amountMin, setAmountMin] = useState(); // dollars
  const [amountMax, setAmountMax] = useState(); // dollars
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  // Fulfillment
  const [fulfillOpen, setFulfillOpen] = useState(false);
  const [fulfillOrder, setFulfillOrder] = useState(null);

  // Helpers
  const toMillis = (ts) => {
    if (!ts) return Date.now();
    if (typeof ts === 'number') return ts;
    if (ts?.toMillis) return ts.toMillis();
    if (ts?.seconds) return ts.seconds * 1000 + (ts.nanoseconds || 0) / 1e6;
    return Date.now();
  };

  const formatMoney = (amount, currency = 'USD', inCents = true) => {
    const val = inCents ? (Number(amount || 0) / 100) : Number(amount || 0);
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(val);
    } catch {
      return `$${val.toFixed(2)}`;
    }
  };

  // Normalize items from various legacy/current shapes into a consistent list
  const getLineItems = (order) => {
    const raw = Array.isArray(order?.items)
      ? order.items
      : Array.isArray(order?.line_items)
        ? order.line_items
        : Array.isArray(order?.lineItems)
          ? order.lineItems
          : Array.isArray(order?.data)
            ? order.data
            : [];

    const currency = (order?.currency || order?.customer?.currency || 'USD').toUpperCase();

    return raw.map((it, idx) => {
      // Try a variety of fields for name, qty, unit price, totals, and image
      const name = it?.name || it?.description || it?.product?.name || `Item ${idx + 1}`;
      const quantity = Number(it?.quantity || it?.qty || 1);
      const unit = it?.unit_amount ?? it?.price?.unit_amount ?? it?.amount_unit ?? it?.price ?? 0; // cents if Stripe-like
      const lineTotal = it?.amount_total ?? it?.amount_subtotal ?? (unit * quantity);
      const cur = (it?.currency || it?.price?.currency || currency || 'USD').toUpperCase();
      const image = it?.image || it?.images?.[0] || it?.product?.images?.[0] || it?.product_image || null;
      const productId = it?.productId || it?.metadata?.productId || it?.product?.id || null;
      const variant = it?.metadata?.variant || it?.variant || undefined;
      return {
        id: it?.id || `${idx}`,
        name,
        quantity,
        unit_amount: Number(unit) || 0,
        amount_total: Number(lineTotal) || 0,
        currency: cur,
        image,
        productId,
        variant,
      };
    });
  };

  useEffect(() => {
    if (!OWNER?.uid) return;
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', OWNER.uid),
      orderBy('createdAt', 'desc')
    );
    const off = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(rows);
    });
    return () => off();
  }, [OWNER?.uid]);

  const open = (order) => { setSelectedOrder(order); setIsModalOpen(true); };
  const close = () => { setIsModalOpen(false); setSelectedOrder(null); };
  const openFulfill = (order) => { setFulfillOrder(order); setFulfillOpen(true); };
  const closeFulfill = () => { setFulfillOpen(false); setFulfillOrder(null); };

  const normalized = useMemo(() => {
    return orders.map(o => {
      const items = getLineItems(o);
      const itemCount = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
      const createdMs = toMillis(o?.createdAt || o?.created || o?.timestamp);
      const amountTotal = Number(
        o?.amount_total ?? o?.total ?? items.reduce((sum, i) => sum + (i.amount_total || 0), 0)
      );
      const currency = (o?.currency || items[0]?.currency || 'USD').toUpperCase();
      const status = o?.status || o?.payment_status || 'pending';
      const customerEmail = o?.customer?.email || o?.customer_email || o?.email || 'Guest';
      return { ...o, createdMs, items, itemCount, amountTotal, currency, status, customerEmail };
    });
  }, [orders]);

  const filtered = useMemo(() => {
    let rows = [...normalized];
    // Status
    if (status !== 'all') rows = rows.filter(r => (r.status || '').toLowerCase() === status);
    // Date range
    if (Array.isArray(dateRange) && dateRange[0] && dateRange[1]) {
      const start = dateRange[0].valueOf();
      const end = dateRange[1].endOf ? dateRange[1].endOf('day').valueOf() : dateRange[1].valueOf();
      rows = rows.filter(r => r.createdMs >= start && r.createdMs <= end);
    }
    // Amount range (inputs in dollars → compare in cents)
    rows = rows.filter(r => {
      if (typeof amountMin === 'number' && r.amountTotal < Math.round(amountMin * 100)) return false;
      if (typeof amountMax === 'number' && r.amountTotal > Math.round(amountMax * 100)) return false;
      return true;
    });
    // Search by id/email/product name
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(r => {
        const hitId = (r.id || '').toLowerCase().includes(q);
        const hitEmail = (r.customerEmail || '').toLowerCase().includes(q);
        const hitItem = r.items?.some(it => (it.name || '').toLowerCase().includes(q));
        return hitId || hitEmail || hitItem;
      });
    }
    // Sort
    rows.sort((a, b) => {
      switch (sort) {
        case 'oldest': return a.createdMs - b.createdMs;
        case 'amount-asc': return a.amountTotal - b.amountTotal;
        case 'amount-desc': return b.amountTotal - a.amountTotal;
        case 'customer-asc': return (a.customerEmail || '').localeCompare(b.customerEmail || '');
        case 'customer-desc': return (b.customerEmail || '').localeCompare(a.customerEmail || '');
        case 'newest':
        default: return b.createdMs - a.createdMs;
      }
    });
    return rows;
  }, [normalized, status, dateRange, amountMin, amountMax, search, sort]);

  // Pagination
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageRows = filtered.slice(startIdx, endIdx);

  return (
    <div className="m-auto h-full overflow-hidden overflow-y-auto w-full p-2">
      {/* Toolbar */}
      <div className='mb-3 flex flex-wrap items-center gap-2 justify-between'>
        <div className='relative w-64'>
          <SearchIcon size={16} className='absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none' />
          <input
            type='text'
            value={search}
            onChange={(e)=> setSearch(e.target.value)}
            onKeyDown={(e)=> { if (e.key === 'Escape') setSearch('') }}
            placeholder='Search orders (id, email, product)…'
            aria-label='Search orders'
            className='w-full h-8 pl-8 pr-8 rounded-md bg-white border border-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition'
          />
          {search && (
            <button type='button' aria-label='Clear search' onClick={()=> setSearch('')} className='absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 inline-flex items-center justify-center rounded hover:bg-gray-100 text-gray-500'>
              <X size={14} />
            </button>
          )}
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Select
            size='small'
            value={status}
            onChange={(v)=> { setStatus(v); setPage(1); }}
            options={[
              { label: 'All status', value: 'all' },
              { label: 'Paid', value: 'paid' },
              { label: 'Unpaid', value: 'unpaid' },
              { label: 'Pending', value: 'pending' },
              { label: 'Refunded', value: 'refunded' },
            ]}
            className='w-32'
          />
          <DatePicker.RangePicker
            size='small'
            value={dateRange}
            onChange={(v)=> { setDateRange(v); setPage(1); }}
            className='[&_.ant-picker-input>input]:text-xs'
          />
          <div className='flex items-center gap-1 text-gray-600'>
            <span className='text-xs'>Amount $</span>
            <InputNumber size='small' min={0} step={1} placeholder='min' value={amountMin} onChange={setAmountMin} className='w-24 [&_.ant-input-number-input]:text-xs' />
            <span className='text-xs'>–</span>
            <InputNumber size='small' min={0} step={1} placeholder='max' value={amountMax} onChange={setAmountMax} className='w-24 [&_.ant-input-number-input]:text-xs' />
          </div>
          <Select
            size='small'
            value={sort}
            onChange={(v)=> { setSort(v); setPage(1); }}
            options={[
              { label: 'Newest', value: 'newest' },
              { label: 'Oldest', value: 'oldest' },
              { label: 'Amount low→high', value: 'amount-asc' },
              { label: 'Amount high→low', value: 'amount-desc' },
              { label: 'Customer A–Z', value: 'customer-asc' },
              { label: 'Customer Z–A', value: 'customer-desc' },
            ]}
            className='w-44'
          />
          <button
            type='button'
            onClick={() => { setSearch(''); setStatus('all'); setSort('newest'); setDateRange(null); setAmountMin(); setAmountMax(); setPage(1); }}
            className='h-7 px-3 rounded-md text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
            aria-label='Clear all filters'
          >
            Clear
          </button>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
        {pageRows.map(o => {
          const color = o.status === 'paid' ? 'green' : o.status === 'refunded' ? 'volcano' : o.status === 'unpaid' ? 'orange' : 'blue';
          const itemsPreview = o.items.slice(0, 3);
          return (
            <button key={o.id} onClick={() => open(o)} className='text-left bg-white p-4 rounded border hover:shadow-sm'>
              <div className='flex items-center justify-between'>
                <span className='font-semibold'>Order #{o.id.slice(-6)}</span>
                <Tag color={color}>{o.status}</Tag>
              </div>
              <div className='text-xs text-gray-500 mt-1'>
                {new Date(o.createdMs).toLocaleString()}
              </div>
              <div className='text-sm text-gray-700 mt-1'>{o.customerEmail}</div>

              {o.items.length > 0 && (
                <div className='mt-3'>
                  <div className='flex -space-x-2'>
                    {itemsPreview.map((it, idx) => (
                      <div key={idx} className='w-9 h-9 rounded-full ring-1 ring-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center'>
                        {it.image ? (
                          <img src={it.image} alt={it.name} className='w-full h-full object-cover' />
                        ) : (
                          <span className='text-[10px] px-1 text-gray-500'>No image</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className='mt-2 text-xs text-gray-600'>
                    {itemsPreview.map((it) => `${it.name} ×${it.quantity}`).join(' · ')}
                    {o.items.length > itemsPreview.length && ` · +${o.items.length - itemsPreview.length} more`}
                  </div>

                  {/* Pagination footer */}
                  <div className='mt-3 flex items-center justify-between text-xs text-gray-600'>
                    <div>
                      {total > 0 ? (
                        <span>Showing {Math.min(total, startIdx + 1)}–{Math.min(total, endIdx)} of {total}</span>
                      ) : (
                        <span>Showing 0 of 0</span>
                      )}
                    </div>
                    <div className='flex items-center gap-2'>
                      <Select
                        size='small'
                        value={pageSize}
                        onChange={(v)=> { setPageSize(v); setPage(1); }}
                        options={[12, 24, 48, 96].map(n => ({ label: `${n}/page`, value: n }))}
                        className='w-28'
                      />
                      <button type='button' onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className='h-7 px-3 rounded-md bg-white enabled:hover:bg-gray-50 disabled:opacity-40 border border-gray-200'>Prev</button>
                      <span className='min-w-[3.5rem] text-center'>{currentPage} / {totalPages}</span>
                      <button type='button' onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className='h-7 px-3 rounded-md bg-white enabled:hover:bg-gray-50 disabled:opacity-40 border border-gray-200'>Next</button>
                    </div>
                  </div>
                </div>
              )}

              <div className='text-sm mt-3'>
                <span className='text-gray-600'>Items:</span> <span className='font-medium'>{o.itemCount}</span>
              </div>
              <div className='text-sm mt-1'>
                <span className='text-gray-600'>Total:</span> <span className='font-semibold'>{formatMoney(o.amountTotal, o.currency, true)}</span>
              </div>
              <div className='mt-3'>
                <button
                  type='button'
                  className='h-8 px-3 rounded-md bg-blue-600 text-white hover:bg-blue-700'
                  onClick={() => { setIsModalOpen(false); openFulfill(o); }}
                >
                  Fulfill / Buy Label
                </button>
              </div>
            </button>
          )
        })}
      </div>

      <Modal open={isModalOpen} onCancel={close} onOk={close} title={`Order Details`}>
        {selectedOrder && (
          <div className='space-y-3'>
            {/* Summary */}
            <div className='text-sm text-gray-700'>
              <div><span className='text-gray-500'>Order ID:</span> {selectedOrder.id}</div>
              <div><span className='text-gray-500'>Status:</span> {selectedOrder.status || selectedOrder.payment_status || 'pending'}</div>
              <div><span className='text-gray-500'>Customer:</span> {selectedOrder?.customer?.email || selectedOrder?.customer_email || selectedOrder?.email || 'Guest'}</div>
              <div><span className='text-gray-500'>Placed:</span> {new Date(toMillis(selectedOrder.createdAt || selectedOrder.created)).toLocaleString()}</div>
            </div>

            {/* Items */}
            <div>
              <div className='font-medium mb-2'>Items</div>
              <div className='space-y-2 max-h-[40vh] overflow-y-auto pr-1'>
                {getLineItems(selectedOrder).map((it, idx) => (
                  <div key={idx} className='flex items-center gap-3'>
                    <div className='w-12 h-12 rounded border overflow-hidden bg-gray-100 flex items-center justify-center'>
                      {it.image ? (
                        <img src={it.image} alt={it.name} className='w-full h-full object-cover' />
                      ) : (
                        <span className='text-[10px] px-1 text-gray-500'>No image</span>
                      )}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='text-sm font-medium truncate'>
                        <button
                          type='button'
                          className='hover:underline text-blue-600'
                          onClick={() => {
                            try { localStorage.setItem('admin.product.openId', it.productId || ''); } catch {}
                            const sp = new URLSearchParams(window.location.search);
                            sp.set('tab', 'ecommerce'); // ensure Admin tab
                            window.history.replaceState({}, '', `${window.location.pathname}?${sp.toString()}`);
                            // Now navigate within Admin to Products via query (handled by Admin.jsx effect)
                            const url = `/dashboard?tab=ecommerce&adminMenu=Products&productId=${encodeURIComponent(it.productId || '')}`;
                            window.location.href = url;
                          }}
                          disabled={!it.productId}
                          title={it.productId ? 'Open product' : 'No product link'}
                        >
                          {it.name}
                        </button>
                      </div>
                      {it.variant && <div className='text-xs text-gray-500 truncate'>Variant: {it.variant}</div>}
                      <div className='text-xs text-gray-600'>Qty: {it.quantity}</div>
                    </div>
                    <div className='text-right'>
                      <div className='text-sm font-medium'>{formatMoney(it.unit_amount, it.currency, true)}</div>
                      <div className='text-xs text-gray-500'>{formatMoney(it.amount_total, it.currency, true)} total</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Raw JSON for debugging */}
            <details className='mt-2'>
              <summary className='text-xs text-gray-500 cursor-pointer'>Raw JSON</summary>
              <pre className='text-xs bg-gray-50 p-3 rounded max-h-[30vh] overflow-y-auto'>
                {JSON.stringify(selectedOrder, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </Modal>

      {/* Fulfill Modal */}
      <FulfillModal
        open={fulfillOpen}
        onClose={closeFulfill}
        order={fulfillOrder}
        userId={OWNER?.uid}
      />
    </div>
  );
};

// Simple Fulfillment modal: collect addresses + parcel, get rates, purchase label
const FulfillModal = ({ open, onClose, order, userId }) => {
  const [loadingRates, setLoadingRates] = useState(false);
  const [rates, setRates] = useState([]);
  const [shipmentId, setShipmentId] = useState(null);
  const [selectedRateId, setSelectedRateId] = useState('');
  const [buying, setBuying] = useState(false);
  const [result, setResult] = useState(null);

  // Basic address/parcels inputs; prefill minimal info if present (fallbacks)
  const [from, setFrom] = useState({
    name: '',
    company: '',
    street1: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    phone: '',
    email: ''
  });
  const [to, setTo] = useState({
    name: order?.customer?.name || '',
    company: '',
    street1: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    phone: order?.customer?.phone || '',
    email: order?.customer?.email || order?.customer_email || order?.email || ''
  });
  const [parcel, setParcel] = useState({
    length: '', width: '', height: '', distance_unit: 'in',
    weight: '', mass_unit: 'lb'
  });

  // Autocomplete state
  const [fromPred, setFromPred] = useState([]);
  const [toPred, setToPred] = useState([]);
  const [fromToken, setFromToken] = useState(() => (typeof crypto !== 'undefined' && crypto?.randomUUID?.()) || Math.random().toString(36).slice(2));
  const [toToken, setToToken] = useState(() => (typeof crypto !== 'undefined' && crypto?.randomUUID?.()) || Math.random().toString(36).slice(2));
  const [typingFrom, setTypingFrom] = useState(false);
  const [typingTo, setTypingTo] = useState(false);
  const fromDebRef = React.useRef(null);
  const toDebRef = React.useRef(null);

  // Pull default From from user profile
  useEffect(() => {
    const loadDefaultFrom = async () => {
      try {
        if (!open || !userId) return;
        const userRef = doc(db, 'users', userId);
        const snap = await getDoc(userRef);
        const data = snap.exists() ? snap.data() : null;
        const def = data?.shippingDefaultFrom;
        if (def) {
          setFrom(prev => ({
            ...prev,
            name: prev.name || def.name || '',
            company: prev.company || def.company || '',
            street1: prev.street1 || def.street1 || '',
            city: prev.city || def.city || '',
            state: prev.state || def.state || '',
            zip: prev.zip || def.zip || '',
            country: prev.country || def.country || 'US',
            phone: prev.phone || def.phone || '',
            email: prev.email || def.email || ''
          }));
        }
      } catch {}
    };
    loadDefaultFrom();
  }, [open, userId]);

  // Prefill To from common order fields
  useEffect(() => {
    if (!open || !order) return;
    const addrCandidates = [];
    if (order.shipping?.address) addrCandidates.push({ name: order.shipping?.name, phone: order.shipping?.phone, email: order?.customer?.email, ...order.shipping.address });
    if (order.shippingAddress) addrCandidates.push(order.shippingAddress);
    if (order.shipping_address) addrCandidates.push(order.shipping_address);
    if (order.customer_details?.address) addrCandidates.push({ name: order.customer_details?.name, email: order.customer_details?.email, ...order.customer_details.address });
    if (order.customer?.address) addrCandidates.push({ name: order.customer?.name, phone: order.customer?.phone, email: order.customer?.email, ...order.customer.address });

    const pick = addrCandidates.find(a => a && (a.line1 || a.street1 || a.address1));
    if (pick) {
      const street1 = pick.street1 || pick.line1 || pick.address1 || '';
      const city = pick.city || pick.locality || '';
      const state = pick.state || pick.region || pick.province || '';
      const zip = pick.zip || pick.postal_code || pick.postalCode || '';
      const country = (pick.country || '').toString().toUpperCase() || 'US';
      const name = pick.name || order?.customer?.name || '';
      const phone = pick.phone || order?.customer?.phone || '';
      const email = pick.email || order?.customer?.email || order?.customer_email || order?.email || '';
      setTo(prev => ({
        ...prev,
        name: prev.name || name,
        street1: prev.street1 || street1,
        city: prev.city || city,
        state: prev.state || state,
        zip: prev.zip || zip,
        country: prev.country || country,
        phone: prev.phone || phone,
        email: prev.email || email,
      }));
    }
  }, [open, order]);

  const reset = () => {
    setLoadingRates(false); setRates([]); setShipmentId(null); setSelectedRateId(''); setBuying(false); setResult(null);
  };

  const fetchRates = async () => {
    try {
      // Basic validation
      if (!from.street1 || !from.city || !from.state || !from.zip) { message.error('Enter From address'); return; }
      if (!to.street1 || !to.city || !to.state || !to.zip) { message.error('Enter To address'); return; }
      if (!parcel.length || !parcel.width || !parcel.height || !parcel.weight) { message.error('Enter parcel size and weight'); return; }
      setLoadingRates(true);
      const payload = {
        address_from: from,
        address_to: to,
        parcels: [{
          length: Number(parcel.length),
          width: Number(parcel.width),
          height: Number(parcel.height),
          distance_unit: parcel.distance_unit,
          weight: Number(parcel.weight),
          mass_unit: parcel.mass_unit,
        }],
        async: false,
        userId,
      };
      const { shipmentId, rates } = await listRates(payload);
      rates.sort((a, b) => Number(a?.amount || 0) - Number(b?.amount || 0));
      setShipmentId(shipmentId);
      setRates(rates);
      if (rates[0]?.object_id) setSelectedRateId(rates[0].object_id);
    } catch (e) {
      message.error(e.message || 'Failed to get rates');
    } finally {
      setLoadingRates(false);
    }
  };

  const buy = async () => {
    if (!selectedRateId) { message.error('Select a rate'); return; }
    try {
      setBuying(true);
  const res = await purchaseLabel({ rate_id: selectedRateId, label_file_type: 'PDF', async: false, userId });
      setResult(res);
      message.success('Label purchased');
    } catch (e) {
      message.error(e.message || 'Failed to purchase label');
    } finally {
      setBuying(false);
    }
  };

  // Autocomplete handlers
  const handleAutocomplete = async (which, value) => {
    try {
      if (!value || value.length < 3) {
        which === 'from' ? setFromPred([]) : setToPred([]);
        return;
      }
      const predictions = await autocompleteAddresses({ input: value, sessiontoken: which === 'from' ? fromToken : toToken, country: (which === 'from' ? from.country : to.country) || 'US' });
      which === 'from' ? setFromPred(predictions) : setToPred(predictions);
    } catch {}
  };

  const selectPrediction = async (which, pred) => {
    try {
      const details = await addressDetails({ place_id: pred.place_id, sessiontoken: which === 'from' ? fromToken : toToken });
      if (which === 'from') {
        setFrom({ ...from, street1: details.street1, city: details.city, state: details.state, zip: details.zip, country: details.country });
        setFromPred([]);
      } else {
        setTo({ ...to, street1: details.street1, city: details.city, state: details.state, zip: details.zip, country: details.country });
        setToPred([]);
      }
    } catch {}
  };

  const validateAddr = async (which) => {
    try {
      const a = which === 'from' ? from : to;
      const res = await validateAddress(a);
      const valid = res?.validation_results?.is_valid;
      if (valid) {
        const addr = res?.validation_results?.address || {};
        const corrected = {
          ...a,
          street1: addr.street1 || a.street1,
          city: addr.city || a.city,
          state: addr.state || a.state,
          zip: addr.zip || a.zip,
          country: addr.country || a.country,
        };
        which === 'from' ? setFrom(corrected) : setTo(corrected);
        message.success(`${which === 'from' ? 'From' : 'To'} address validated`);
      } else {
        message.warning('Address could not be fully validated');
      }
    } catch (e) {
      message.error(e.message || 'Validation failed');
    }
  };

  return (
    <Modal open={open} onCancel={() => { reset(); onClose?.(); }} footer={null} title="Fulfill Order">
      {!order ? (
        <div className='text-sm text-gray-500'>No order selected</div>
      ) : (
        <div className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <div className='font-medium mb-2'>From address</div>
              <div className='grid grid-cols-2 gap-2'>
                <Input size='small' placeholder='Name' value={from.name} onChange={e=>setFrom({ ...from, name: e.target.value })} />
                <Input size='small' placeholder='Company' value={from.company} onChange={e=>setFrom({ ...from, company: e.target.value })} />
                <div className='col-span-2 relative'>
                  <Input size='small' placeholder='Street' value={from.street1} onChange={(e)=>{ const v=e.target.value; setFrom({ ...from, street1:v }); setTypingFrom(true); if (fromDebRef.current) clearTimeout(fromDebRef.current); fromDebRef.current = setTimeout(()=> handleAutocomplete('from', v), 250); }} onBlur={()=> setTimeout(()=>{ setTypingFrom(false); },150)} />
                  {fromPred.length>0 && typingFrom && (
                    <div className='absolute z-10 mt-1 w-full max-h-48 overflow-auto bg-white border border-gray-200 rounded shadow-sm'>
                      {fromPred.map(p => (
                        <button key={p.place_id} type='button' className='w-full text-left px-3 py-2 hover:bg-gray-50' onMouseDown={(e)=> e.preventDefault()} onClick={()=> selectPrediction('from', p)}>
                          {p.description}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Input size='small' placeholder='City' value={from.city} onChange={e=>setFrom({ ...from, city: e.target.value })} />
                <Input size='small' placeholder='State' value={from.state} onChange={e=>setFrom({ ...from, state: e.target.value })} />
                <Input size='small' placeholder='ZIP' value={from.zip} onChange={e=>setFrom({ ...from, zip: e.target.value })} />
                <Input size='small' placeholder='Country' value={from.country} onChange={e=>setFrom({ ...from, country: e.target.value })} />
                <Input size='small' placeholder='Phone' value={from.phone} onChange={e=>setFrom({ ...from, phone: e.target.value })} />
                <Input size='small' placeholder='Email' value={from.email} onChange={e=>setFrom({ ...from, email: e.target.value })} />
                  <div className='col-span-2'>
                    <button type='button' onClick={()=> validateAddr('from')} className='h-7 px-3 rounded-md bg-white border border-gray-200 hover:bg-gray-50'>Validate From</button>
                  </div>
              </div>
            </div>
            <div>
              <div className='font-medium mb-2'>To address</div>
              <div className='grid grid-cols-2 gap-2'>
                <Input size='small' placeholder='Name' value={to.name} onChange={e=>setTo({ ...to, name: e.target.value })} />
                <Input size='small' placeholder='Company' value={to.company} onChange={e=>setTo({ ...to, company: e.target.value })} />
                <div className='col-span-2 relative'>
                  <Input size='small' placeholder='Street' value={to.street1} onChange={(e)=>{ const v=e.target.value; setTo({ ...to, street1:v }); setTypingTo(true); if (toDebRef.current) clearTimeout(toDebRef.current); toDebRef.current = setTimeout(()=> handleAutocomplete('to', v), 250); }} onBlur={()=> setTimeout(()=>{ setTypingTo(false); },150)} />
                  {toPred.length>0 && typingTo && (
                    <div className='absolute z-10 mt-1 w-full max-h-48 overflow-auto bg-white border border-gray-200 rounded shadow-sm'>
                      {toPred.map(p => (
                        <button key={p.place_id} type='button' className='w-full text-left px-3 py-2 hover:bg-gray-50' onMouseDown={(e)=> e.preventDefault()} onClick={()=> selectPrediction('to', p)}>
                          {p.description}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Input size='small' placeholder='City' value={to.city} onChange={e=>setTo({ ...to, city: e.target.value })} />
                <Input size='small' placeholder='State' value={to.state} onChange={e=>setTo({ ...to, state: e.target.value })} />
                <Input size='small' placeholder='ZIP' value={to.zip} onChange={e=>setTo({ ...to, zip: e.target.value })} />
                <Input size='small' placeholder='Country' value={to.country} onChange={e=>setTo({ ...to, country: e.target.value })} />
                <Input size='small' placeholder='Phone' value={to.phone} onChange={e=>setTo({ ...to, phone: e.target.value })} />
                <Input size='small' placeholder='Email' value={to.email} onChange={e=>setTo({ ...to, email: e.target.value })} />
                  <div className='col-span-2'>
                    <button type='button' onClick={()=> validateAddr('to')} className='h-7 px-3 rounded-md bg-white border border-gray-200 hover:bg-gray-50'>Validate To</button>
                  </div>
              </div>
            </div>
          </div>
          <div>
            <div className='font-medium mb-2'>Parcel</div>
            <div className='grid grid-cols-6 gap-2 items-center'>
              <InputNumber size='small' placeholder='L' value={parcel.length} onChange={v=>setParcel({ ...parcel, length: v })} className='col-span-1' />
              <InputNumber size='small' placeholder='W' value={parcel.width} onChange={v=>setParcel({ ...parcel, width: v })} className='col-span-1' />
              <InputNumber size='small' placeholder='H' value={parcel.height} onChange={v=>setParcel({ ...parcel, height: v })} className='col-span-1' />
              <Select size='small' value={parcel.distance_unit} onChange={v=>setParcel({ ...parcel, distance_unit: v })} options={[{value:'in',label:'in'},{value:'cm',label:'cm'}]} className='col-span-1' />
              <InputNumber size='small' placeholder='Weight' value={parcel.weight} onChange={v=>setParcel({ ...parcel, weight: v })} className='col-span-1' />
              <Select size='small' value={parcel.mass_unit} onChange={v=>setParcel({ ...parcel, mass_unit: v })} options={[{value:'lb',label:'lb'},{value:'oz',label:'oz'},{value:'kg',label:'kg'},{value:'g',label:'g'}]} className='col-span-1' />
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <button type='button' disabled={loadingRates} onClick={fetchRates} className='h-8 px-3 rounded-md bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50'>
              {loadingRates ? 'Fetching rates…' : 'Get rates'}
            </button>
            <button type='button' onClick={async ()=>{
              try {
                if (!userId) { message.warning('Sign in to save default From'); return; }
                const userRef = doc(db, 'users', userId);
                await setDoc(userRef, { shippingDefaultFrom: from }, { merge: true });
                message.success('Saved default From address');
              } catch (e) { message.error(e.message || 'Failed to save'); }
            }} className='h-8 px-3 rounded-md bg-white border border-gray-200 hover:bg-gray-50'>Save default From</button>
          </div>

          {rates.length > 0 && (
            <div className='space-y-2'>
              <div className='text-sm text-gray-600'>Select a rate</div>
              <div className='grid gap-2'>
                {rates.map(r => (
                  <label key={r.object_id} className='flex items-center justify-between p-2 border rounded hover:bg-gray-50'>
                    <div className='flex items-center gap-3'>
                      <input type='radio' name='rate' checked={selectedRateId === r.object_id} onChange={()=> setSelectedRateId(r.object_id)} />
                      <div className='text-sm'>
                        <div className='font-medium'>{r.provider} • {r.servicelevel?.name || r.servicelevel?.token}</div>
                        <div className='text-gray-500 text-xs'>ETA: {r?.estimated_days ? `${r.estimated_days} days` : '—'} • {r?.attributes?.join(', ') || ''}</div>
                      </div>
                    </div>
                    <div className='text-sm font-semibold'>${Number(r.amount || 0).toFixed(2)}</div>
                  </label>
                ))}
              </div>
              <div>
                <button type='button' disabled={!selectedRateId || buying} onClick={buy} className='h-8 px-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'>
                  {buying ? 'Purchasing…' : 'Buy label'}
                </button>
              </div>
            </div>
          )}

          {result && (
            <div className='p-3 rounded border bg-green-50 border-green-200 text-sm'>
              <div className='font-medium text-green-800 mb-1'>Label purchased</div>
              <div>Tracking: <a className='text-blue-600 hover:underline' href={result.trackingUrl} target='_blank' rel='noreferrer'>{result.trackingNumber}</a></div>
              <div>Label: <a className='text-blue-600 hover:underline' href={result.labelUrl} target='_blank' rel='noreferrer'>Download</a></div>
            </div>
          )}

          <div className='flex items-center justify-end gap-2 pt-2'>
            <button type='button' onClick={() => { reset(); onClose?.(); }} className='h-8 px-3 rounded-md bg-white border border-gray-200 hover:bg-gray-50'>Close</button>
          </div>
        </div>
      )}
    </Modal>
  );
};
