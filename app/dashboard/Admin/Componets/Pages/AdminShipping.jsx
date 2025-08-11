"use client";
import React, { useEffect, useState } from 'react';
import { Input, Button, Alert } from 'antd';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AdminShipping({ ownerData }) {
  const userId = ownerData?.uid;
  const [token, setToken] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      const ref = doc(db, 'users', userId);
      const snap = await getDoc(ref);
      const data = snap.exists() ? snap.data() : null;
      const t = data?.shippingShippoToken || '';
      setToken(t);
      setStatus(t ? { type: 'success', msg: 'Custom Shippo token saved. Your own carrier accounts will be used.' } : { type: 'warning', msg: 'No custom Shippo token. Platform token will be used and a $1 fee will apply.' });
    };
    load();
  }, [userId]);

  const save = async () => {
    try {
      if (!userId) return;
      setLoading(true);
      const ref = doc(db, 'users', userId);
      await setDoc(ref, { shippingShippoToken: token || null }, { merge: true });
      setStatus(token ? { type: 'success', msg: 'Saved. Your own carrier accounts will be used.' } : { type: 'warning', msg: 'Removed token. Platform token will be used and a $1 fee will apply.' });
    } catch (e) {
      setStatus({ type: 'error', msg: e.message || 'Failed to save' });
    } finally {
      setLoading(false);
    }
  };

  const testToken = async () => {
    try {
      if (!token) { setStatus({ type: 'warning', msg: 'Enter a token first' }); return; }
      setLoading(true);
      const res = await fetch('/api/shipping/test-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Test failed');
      setStatus({ type: 'success', msg: 'Token works. Carrier accounts accessible.' });
    } catch (e) {
      setStatus({ type: 'error', msg: e.message || 'Token test failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='p-4 space-y-4'>
      <div className='text-sm text-gray-700'>
        Connect your own Shippo account to use your carriers (FedEx, UPS, USPS, etc.). If no token is set, the platform account is used and a $1 fee applies per label.
      </div>
      {status && (
        <Alert type={status.type} message={status.msg} showIcon />
      )}
      <div className='max-w-xl space-y-2'>
        <label className='block text-sm font-medium text-gray-700'>Shippo API Token</label>
        <Input.Password value={token} onChange={e=>setToken(e.target.value)} placeholder='shippo_live_xxx or shippo_test_xxx' visibilityToggle />
        <div className='flex gap-2'>
          <Button type='primary' onClick={save} loading={loading}>Save</Button>
          <Button onClick={testToken} loading={loading}>Test</Button>
        </div>
      </div>
    </div>
  );
}
