'use client';
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { Input, Button, Empty, Divider, Space, Typography, Spin, Card } from 'antd';

const { Text } = Typography;

export default function CartDrawer({ open, onClose, config }) {
  const {
    items, updateQty, removeItem, reAddLineItem, subtotal, discountAmount, total, formatMoney,
  appliedCodes, applyCode, removeCode, loadingDiscounts, fetchDiscountCodes,
  crossSellItems, crossSellLoading, addItem, pendingNotice, acknowledgeNotice,
  lastValidation, shippingEstimate, taxEstimate, highlightLines, liveMessage, allowedProviders
  } = useCart();

  const [promoError, setPromoError] = useState(null);
  const [undoState, setUndoState] = useState(null); // { line, timeoutId }
  const codeRef = useRef();
  const side = config?.drawer?.side === 'left' ? 'left' : 'right';
  const widthDesktop = config?.drawer?.widthDesktop || 420;
  const showPromo = config?.content?.showPromo !== false;
  const showNotes = config?.content?.showNotes === true;
  const title = config?.content?.title || 'Your cart';
  const emptyTitle = config?.content?.emptyTitle || 'Your cart is empty';
  const emptySubtitle = config?.content?.emptySubtitle || 'Keep exploring to find something you love.';

  useEffect(() => { if (open) fetchDiscountCodes({}); }, [open, fetchDiscountCodes]);

  // Accessibility & focus management
  const previouslyFocused = useRef(null);
  const focusSentinelStart = useRef(null);
  const focusSentinelEnd = useRef(null);
  const panelRef = useRef(null);

  const focusFirstElement = useCallback(() => {
    if (!panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length) {
      focusable[0].focus();
    } else {
      panelRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement;
      // delay to next frame for smoother focus after animation
      requestAnimationFrame(() => focusFirstElement());
    } else if (!open && previouslyFocused.current) {
      try { previouslyFocused.current.focus(); } catch {}
    }
  }, [open, focusFirstElement]);

  // Basic focus trap looping
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); return; }
    if (e.key === 'Tab' && panelRef.current) {
      const focusable = Array.from(panelRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
        .filter(el => !el.hasAttribute('disabled'));
      if (!focusable.length) { e.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => handleKeyDown(e);
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [open, handleKeyDown]);
  const liveRegionRef = useRef(null);
  useEffect(() => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = `Cart total ${formatMoney(total)}`;
    }
  }, [total, formatMoney]);

  return (
    <div
      aria-hidden={!open}
      role={open ? 'dialog' : undefined}
      aria-modal={open || undefined}
      aria-label={title}
      style={{ position: 'fixed', inset: 0, zIndex: 5000, pointerEvents: open ? 'auto' : 'none' }}
    >
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: open ? 'rgba(0,0,0,0.35)' : 'transparent', transition: 'background .25s' }}
      />
      <aside
        ref={panelRef}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          [side]: 0,
          width: '100%',
          maxWidth: widthDesktop,
          background: config?.style?.bg || '#ffffff',
          color: config?.style?.text || '#222',
          boxShadow: shadowToCss(config?.style?.shadow),
          transform: open ? 'translateX(0)' : `translateX(${side === 'right' ? '100%' : '-100%'})`,
          transition: 'transform .33s cubic-bezier(.4,0,.2,1)',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: side === 'right' ? `1px solid ${config?.style?.border || '#f0f0f0'}` : 'none',
          borderRight: side === 'left' ? `1px solid ${config?.style?.border || '#f0f0f0'}` : 'none',
          borderRadius: config?.style?.radius || 0,
          outline: 'none'
        }}
        tabIndex={-1}
      >
        <span ref={focusSentinelStart} tabIndex={0} aria-hidden="true" style={{ position:'absolute', inset:0, width:0, height:0, overflow:'hidden' }} />
        <header style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${config?.style?.border || '#f0f0f0'}` }}>
          <Text strong style={{ fontSize: 16 }}>{title}</Text>
          <div style={{ marginLeft: 'auto', fontSize: 12 }}>{items.length} item{items.length !== 1 && 's'}</div>
          <button onClick={onClose} aria-label="Close cart" style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer' }}>×</button>
        </header>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {items.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <Empty description={null} />
              <h4 style={{ marginTop: 12 }}>{emptyTitle}</h4>
              <p style={{ fontSize: 12, color: '#666' }}>{emptySubtitle}</p>
              <Button type="default" onClick={onClose} style={{ marginTop: 12 }}>Continue shopping</Button>
            </div>
          )}
          {pendingNotice && (
            <div style={{ margin: '12px 16px 0', background:'#fffbe6', border:'1px solid #ffe58f', borderRadius:6, padding:'8px 10px', fontSize:11, color:'#8b5d00' }}>
              {pendingNotice.type === 'validation' && (
                <ValidationNotice data={pendingNotice.data} onClose={acknowledgeNotice} />
              )}
            </div>
          )}
          {items.length > 0 && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {items.map(it => {
                const key = `${it.productId}::${it.variantId||''}`;
                const highlighted = highlightLines && highlightLines.has && highlightLines.has(key);
                return (
                <li key={it.id} style={{ display: 'flex', gap: 12, padding: '14px 18px', borderBottom: '1px solid #f2f2f2', background: highlighted ? '#e6f7ff' : 'transparent', transition:'background .4s' }}>
                  <div style={{ width: 64, height: 64, borderRadius: config?.style?.thumbShape === 'square' ? 8 : '50%', overflow: 'hidden', background: '#fafafa' }}>
                    {it.image && <img src={it.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3 }}>{it.title}</div>
                    {it.variantId && <div style={{ fontSize: 11, color: '#888' }}>Variant: {it.variantId}</div>}
                    {typeof it.stock === 'number' && (
                      <div style={{ fontSize: 10, color: it.stock === 0 ? '#f5222d' : '#888', marginTop:4 }}>
                        {it.stock === 0 ? 'Out of stock (remove to continue)' : it.qty >= it.stock ? `Max available: ${it.stock}` : `${it.stock} left`}
                      </div>
                    )}
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', border: '1px solid #d9d9d9', borderRadius: 6, overflow: 'hidden' }}>
                        <button onClick={() => updateQty(it.id, it.qty - 1)} style={qtyBtnStyle} disabled={it.qty <= 1}>-</button>
                        <span style={{ padding: '0 10px', fontSize: 13 }}>{it.qty}</span>
                        <button onClick={() => updateQty(it.id, it.qty + 1)} style={{ ...qtyBtnStyle, opacity: typeof it.stock==='number' && it.qty >= it.stock ? .4 : 1, cursor: typeof it.stock==='number' && it.qty >= it.stock ? 'not-allowed' : 'pointer' }} disabled={typeof it.stock==='number' && it.qty >= it.stock}>+</button>
                      </div>
                      <button onClick={() => {
                        const line = items.find(l => l.id === it.id);
                        removeItem(it.id);
                        const timeoutId = setTimeout(()=> setUndoState(null), 6000);
                        setUndoState({ line, timeoutId });
                      }} style={{ background: 'transparent', border: 'none', fontSize: 11, color: '#f5222d', cursor: 'pointer' }}>Remove</button>
                      <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600 }}>{formatMoney(it.price * it.qty)}</div>
                    </div>
                  </div>
                </li>
              );})}
            </ul>
          )}
        </div>
  <footer style={{ padding: '16px 18px', borderTop: `1px solid ${config?.style?.border || '#f0f0f0'}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {config?.content?.crossSell !== false && (
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Text strong style={{ fontSize: 13 }}>You may also like</Text>
                {crossSellLoading && <Spin size="small" />}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, overflowX: 'auto' }}>
                {crossSellItems.length === 0 && !crossSellLoading && (
                  <div style={{ fontSize:11, color:'#888' }}>No suggestions</div>
                )}
                {crossSellItems.map(cs => (
                  <Card key={cs.id} size="small" style={{ minWidth: 140 }} bodyStyle={{ padding: 8 }}>
                    <div style={{ width: '100%', aspectRatio: '1/1', background: '#fafafa', borderRadius: 6, marginBottom: 6, overflow: 'hidden' }}>
                      {cs.image && <img src={cs.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.2, marginBottom: 4, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{cs.title}</div>
                    <Button size="small" type="dashed" block onClick={() => addItem({ id: cs.productId, name: cs.title, price: cs.price, images: [cs.image] }, { qty: 1, meta: cs.meta })}>Add</Button>
                  </Card>
                ))}
              </div>
              <Divider style={{ margin: '12px 0' }} />
            </div>
          )}
          {showPromo && (
            <div>
              {appliedCodes?.length ? (
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {appliedCodes.map(c => (
                    <div key={c.code} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, background:'#fafafa', padding:'4px 8px', borderRadius:6 }}>
                      <strong>{c.code}</strong>
                      <span style={{ fontSize:10, color:'#999' }}>{c.type === 'Percent' ? `${c.amount}%` : formatMoney(c.amount*100)}</span>
                      <button onClick={()=>removeCode(c.code)} style={{ ...linkBtn, marginLeft:'auto' }}>Remove</button>
                    </div>
                  ))}
                  <Space.Compact style={{ width: '100%', marginTop:4 }}>
                    <Input ref={codeRef} placeholder="Add code" size="small" disabled={loadingDiscounts} />
                    <Button size="small" type="primary" onClick={() => {
                      const v = codeRef.current?.input?.value?.trim();
                      if (!v) return;
                      const res = applyCode(v);
                      if(!res?.ok) {
                        setPromoError(res?.reason || 'Invalid code');
                        setTimeout(()=>setPromoError(null), 3500);
                      } else {
                        setPromoError(null); codeRef.current.input.value='';
                      }
                    }} disabled={loadingDiscounts}>Apply</Button>
                  </Space.Compact>
                </div>
              ) : (
                <Space.Compact style={{ width: '100%' }}>
                  <Input ref={codeRef} placeholder="Promo code" size="small" disabled={loadingDiscounts} />
                  <Button size="small" type="primary" onClick={() => {
                    const v = codeRef.current?.input?.value?.trim();
                    if (!v) return;
                    const res = applyCode(v);
                    if(!res?.ok) {
                      setPromoError(res?.reason || 'Invalid code');
                      setTimeout(()=>setPromoError(null), 3500);
                    } else {
                      setPromoError(null); codeRef.current.input.value='';
                    }
                  }} disabled={loadingDiscounts}>Apply</Button>
                </Space.Compact>
              )}
              {loadingDiscounts && <Spin size="small" style={{ marginTop: 4 }} />}
              {promoError && <div style={{ color:'#f5222d', fontSize:11, marginTop:4 }}>{promoError === 'not_found' ? 'Code not recognized' : promoError}</div>}
              {lastValidation?.rejected?.length > 0 && (
                <div style={{ marginTop:4, display:'flex', flexDirection:'column', gap:2 }}>
                  {lastValidation.rejected.map(r => (
                    <div key={r.code} style={{ fontSize:10, color:'#fa541c' }}>Code {r.code}: {mapRejectionReason(r.reason)}</div>
                  ))}
                </div>
              )}
            </div>
          )}
          {showNotes && <Input.TextArea rows={2} placeholder="Order notes" style={{ fontSize: 12 }} />}
          <Divider style={{ margin: '4px 0 8px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span>Subtotal</span><strong>{formatMoney(subtotal)}</strong>
          </div>
          {discountAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#52c41a' }}><span>Discount</span><span>-{formatMoney(discountAmount)}</span></div>}
          {typeof shippingEstimate === 'number' && <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}><span>Shipping</span><span>{shippingEstimate ? formatMoney(shippingEstimate) : 'Free'}</span></div>}
          {typeof taxEstimate === 'number' && <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}><span>Est. Tax</span><span>{formatMoney(taxEstimate)}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span>Total</span><strong>{formatMoney(total)}</strong>
          </div>
          <div style={{ fontSize: 10, color: '#888' }}>Taxes & shipping calculated at checkout.</div>
          {allowedProviders.stripe && <Button type="primary" block disabled={!items.length} onClick={config?.onCheckoutStripe}>Checkout (Stripe)</Button>}
          {allowedProviders.paypal && <Button block disabled={!items.length} onClick={config?.onCheckoutPaypal}>PayPal</Button>}
          {!allowedProviders.stripe && !allowedProviders.paypal && (
            <div style={{ fontSize:11, color:'#fa541c', textAlign:'center', marginBottom:4 }}>No payment method configured</div>
          )}
          <Button block onClick={onClose}>Continue shopping</Button>
        </footer>
        {undoState && (
          <div style={{ position:'fixed', bottom:16, left:'50%', transform:'translateX(-50%)', background:'#222', color:'#fff', padding:'8px 14px', borderRadius:20, display:'flex', alignItems:'center', gap:12, fontSize:12, zIndex:6000, boxShadow:'0 4px 12px rgba(0,0,0,.25)' }}>
            <span>Item removed</span>
            <button onClick={()=>{ if(undoState?.timeoutId) clearTimeout(undoState.timeoutId); reAddLineItem(undoState.line); setUndoState(null); }} style={{ background:'transparent', border:'none', color:'#1890ff', cursor:'pointer', fontSize:12 }}>Undo</button>
            <button onClick={()=>{ if(undoState?.timeoutId) clearTimeout(undoState.timeoutId); setUndoState(null); }} aria-label='Dismiss' style={{ background:'transparent', border:'none', color:'#999', cursor:'pointer', fontSize:14, lineHeight:1 }}>×</button>
          </div>
        )}
        <span ref={focusSentinelEnd} tabIndex={0} aria-hidden="true" style={{ position:'absolute', inset:0, width:0, height:0, overflow:'hidden' }} />
  <div ref={liveRegionRef} aria-live="polite" aria-atomic="true" style={{ position:'absolute', width:1, height:1, margin:-1, padding:0, overflow:'hidden', clip:'rect(0 0 0 0)', border:0 }}>{liveMessage}</div>
      </aside>
    </div>
  );
}

const qtyBtnStyle = { background: 'transparent', border: 'none', fontSize: 16, width: 30, cursor: 'pointer' };
const linkBtn = { background: 'transparent', border: 'none', color: '#f5222d', cursor: 'pointer', fontSize: 11, padding: 0 };

function ValidationNotice({ data, onClose }) {
  if(!data) return null;
  const removed = data.removedItemIds || [];
  const adjustments = data.adjustments || [];
  const stockClamps = adjustments.filter(a => a.reason==='stock_clamped');
  const outOfStock = adjustments.filter(a => a.reason==='out_of_stock');
  const variantMissing = adjustments.filter(a => a.reason==='variant_not_found');
  const lines = [];
  if(removed.length) lines.push(`${removed.length} item${removed.length>1?'s':''} removed`);
  if(stockClamps.length) lines.push(`${stockClamps.length} item${stockClamps.length>1?'s':''} qty reduced`);
  if(outOfStock.length) lines.push(`${outOfStock.length} out of stock`);
  if(variantMissing.length) lines.push(`${variantMissing.length} variant missing`);
  if(!lines.length) lines.push('Cart updated to current availability');
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
      <span style={{ lineHeight:1.4 }}>{lines.join(' • ')}</span>
      <button onClick={onClose} aria-label='Dismiss inventory notice' style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:12, marginLeft:'auto' }}>×</button>
    </div>
  );
}

function mapRejectionReason(reason) {
  switch(reason) {
    case 'not_found': return 'not found';
    case 'duplicate': return 'duplicate';
    case 'min_spend': return 'min spend not met';
    case 'exclusion_product': return 'product exclusion';
    case 'exclusion_category': return 'category exclusion';
    case 'non_stackable': return 'cannot stack';
    case 'no_remaining': return 'no remaining amount';
    case 'zero_value': return 'no value';
    default: return reason;
  }
}

// Shadow mapping helper
function shadowToCss(token) {
  switch (token) {
    case 'none': return 'none';
    case 'sm': return '0 2px 6px rgba(0,0,0,.08)';
    case 'md': return '0 4px 18px rgba(0,0,0,.12)';
    case 'lg': default: return '0 8px 32px rgba(0,0,0,.15)';
  }
}
