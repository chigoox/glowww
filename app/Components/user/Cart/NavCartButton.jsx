'use client';
import React, { useMemo } from 'react';
import { Badge, Tooltip } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import { useCart } from '@/contexts/CartContext';

export default function NavCartButton({ onClick, config }) {
  const { items, subtotal, formatMoney } = useCart();
  const count = items.reduce((n, i) => n + i.qty, 0);
  const badgeMode = config?.trigger?.badgeMode || 'count';
  const showBadge = config?.trigger?.showBadge !== false;
  const radius = config?.style?.radius || 0;
  const accent = config?.style?.accent || 'var(--primary, #1890ff)';
  const iconSize = config?.trigger?.iconSize || 20;
  const showCount = badgeMode === 'count' && showBadge && count > 0;
  const showDot = badgeMode === 'dot' && showBadge && count > 0;
  const tooltip = useMemo(()=>`Cart • ${formatMoney(subtotal)}${count?` • ${count} item${count!==1?'s':''}`:''}`,[subtotal,count,formatMoney]);
  return (
    <Tooltip title={tooltip}> 
      <button
        aria-label={config?.ariaLabel || 'Open cart'}
        onClick={onClick}
        style={{
          position: 'relative',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 8px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 14,
          borderRadius: radius
        }}
      >
        <ShoppingCartOutlined style={{ fontSize: iconSize }} />
        {showDot && (
          <span style={{ position: 'absolute', top: 4, right: 6, width: 8, height: 8, borderRadius: '50%', background: accent }} />
        )}
        {showCount && (
          <Badge count={count} size="small" style={{ background: accent }} />
        )}
      </button>
    </Tooltip>
  );
}
