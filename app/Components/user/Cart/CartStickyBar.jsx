'use client';
import React from 'react';
import { useCart } from '@/contexts/CartContext';
import { Button } from 'antd';

export default function CartStickyBar({ openDrawer }) {
  const { subtotal, items, formatMoney } = useCart();
  if (!items.length) return null;
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 4999, padding: '8px 12px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(6px)', boxShadow: '0 -2px 8px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 13, flex: 1 }}>View cart • {formatMoney(subtotal)}</div>
      <Button size="small" type="primary" onClick={openDrawer}>Open</Button>
    </div>
  );
}
