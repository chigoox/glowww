"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { Button, message, Alert, Spin } from 'antd';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * PaymentProvidersSettings
 * Reusable settings block for enabling/disabling site payment providers.
 * Props:
 *  - userId: string (required)
 *  - siteId: string (required)
 *  - className?: string
 *  - style?: React.CSSProperties
 *  - onSaved?: (providers)=>void
 *  - initial?: { stripe?: boolean; paypal?: boolean }
 */
export default function PaymentProvidersSettings({ userId, siteId, className='', style, onSaved, initial }) {
  const [state, setState] = useState(initial || { stripe: true, paypal: true });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msgApi, ctx] = message.useMessage();
  const [acctChecking, setAcctChecking] = useState(false);
  const [connectedAcct, setConnectedAcct] = useState(null); // { connected, accountId }

  // Load current providers
  useEffect(()=>{
    let cancelled=false;
    (async ()=>{
      if(!userId || !siteId) return;
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'users', userId, 'sites', siteId));
        if(!cancelled && snap.exists()) {
          const data = snap.data();
          if(data.paymentProviders && typeof data.paymentProviders==='object') {
            setState({ stripe: data.paymentProviders.stripe !== false, paypal: data.paymentProviders.paypal !== false });
          }
        }
      } catch {/* ignore */} finally { if(!cancelled) setLoading(false); }
    })();
    return ()=>{ cancelled=true; };
  }, [userId, siteId]);

  // Check Stripe connected account (required to enable providers)
  useEffect(()=>{
    if(!userId) { setConnectedAcct(null); return; }
    let cancelled=false; setAcctChecking(true);
    (async()=>{
      try {
        const res = await fetch(`/api/connect/stripe/account?userId=${encodeURIComponent(userId)}`);
        const json = await res.json();
        if(cancelled) return;
        if(res.ok) setConnectedAcct(json); else setConnectedAcct({ connected:false });
      } catch { if(!cancelled) setConnectedAcct({ connected:false }); }
      finally { if(!cancelled) setAcctChecking(false); }
    })();
    return ()=>{ cancelled=true; };
  }, [userId]);

  const save = useCallback(async ()=>{
    if(!userId || !siteId) { msgApi.error('Missing site context'); return; }
    if(!connectedAcct?.connected) { msgApi.error('Connect Stripe account first'); return; }
    if(!state.stripe && !state.paypal) { msgApi.error('Enable at least one provider'); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', userId, 'sites', siteId), { paymentProviders: state, updatedAt: new Date() });
      msgApi.success('Payment providers saved');
      onSaved && onSaved(state);
    } catch (e) {
      msgApi.error('Save failed');
    } finally { setSaving(false); }
  }, [userId, siteId, state, onSaved, msgApi, connectedAcct]);

  return (
    <div className={className} style={style}>
      {ctx}
      <h2 className="text-lg font-medium mb-2">Payment Providers</h2>
      <p className="text-xs text-gray-500 mb-3">Enable checkout methods (at least one required).</p>
      {acctChecking && (
        <div className="mb-3 flex items-center gap-2 text-xs text-gray-500"><Spin size="small" /> Checking Stripe connection...</div>
      )}
      {!acctChecking && (!connectedAcct || !connectedAcct.connected) && (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message="Stripe account not connected"
          description={<div className="text-xs">Connect your Stripe account first to use ecommerce. Go to the Connect/Payments section to finish onboarding.</div>}
        />
      )}
      <div className="flex flex-wrap gap-4 items-center">
        {['stripe','paypal'].map(key => (
          <label key={key} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm">
            <input
              type="checkbox"
              disabled={loading || saving || !connectedAcct?.connected}
              checked={state[key]}
              onChange={e => setState(ps => ({ ...ps, [key]: e.target.checked }))}
            />
            <span className="font-medium capitalize">{key}</span>
          </label>
        ))}
        <Button size="small" type="primary" loading={saving||loading} disabled={!connectedAcct?.connected} onClick={save}>Save</Button>
      </div>
    </div>
  );
}
