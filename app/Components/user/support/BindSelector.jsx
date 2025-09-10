'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUserProps } from '../../utils/userprops/useUserProps';

/**
 * BindSelector
 * Reusable small binding widget for selecting a user prop path (local or global) to bind a component prop.
 * Props:
 * - nodeId: current component id (for local scope)
 * - binding: { path: string, scope: 'local' | 'global' } | null
 * - onChange: (binding|null) => void
 * - label: string (tooltip / aria label)
 * - disabled: boolean
 * - style: inline style overrides for the trigger button
 */
export const BindSelector = ({
  nodeId,
  binding,
  onChange,
  label = 'Bind to User Prop',
  disabled = false,
  style = {},
  variant = 'default', // 'default' | 'toolbar'
  showLabel = true,
}) => {
  // Pass nodeId so hook operates on the correct local scope (was omitted causing empty lists)
  const { listUserPropPaths, getNodeMeta } = useUserProps(nodeId);
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState(binding?.scope || 'local');
  const [search, setSearch] = useState('');
  const panelRef = useRef(null);
  const triggerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!panelRef.current || panelRef.current.contains(e.target) || triggerRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const paths = nodeId ? (listUserPropPaths({ leavesOnly: true }, scope === 'global' ? 'ROOT' : nodeId) || [])
    .filter(p => !search || p.path.toLowerCase().includes(search.toLowerCase())) : [];

  const handleSelect = useCallback((p) => {
    onChange({ path: p.path, scope });
    setOpen(false);
  }, [onChange, scope]);

  const currentDisplay = binding ? `${binding.scope === 'global' ? '🌐' : '📍'} ${binding.path}` : 'Not bound';

  const isToolbar = variant === 'toolbar';

  const ChainIcon = ({ size = 14, active }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={active ? '#ffffff' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 13.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5l-.9.9" />
      <path d="M13.5 10.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l.9-.9" />
    </svg>
  );

  const buttonBase = {
    height: isToolbar ? 32 : 30,
    minWidth: isToolbar ? 34 : undefined,
    padding: isToolbar ? '0 10px' : '6px 10px',
    fontSize: 11,
    lineHeight: 1,
    borderRadius: isToolbar ? 6 : 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: showLabel ? 6 : 0,
    border: isToolbar ? (binding ? '1px solid #5673ff' : '1px solid #d0d5dd') : '1px solid rgba(0,0,0,0.1)',
    background: binding
      ? (isToolbar ? 'linear-gradient(135deg,#2563eb,#3b82f6)' : 'linear-gradient(135deg,#1677ff,#4096ff)')
      : (isToolbar ? 'linear-gradient(135deg,#f5f7fa,#eef1f5)' : 'linear-gradient(135deg,#722ed1,#9254de)'),
    color: binding ? '#fff' : (isToolbar ? '#111' : '#fff'),
    position: 'relative',
    boxShadow: isToolbar
      ? (binding ? '0 2px 4px rgba(0,0,0,0.15)' : '0 1px 2px rgba(0,0,0,0.08)')
      : '0 2px 6px rgba(0,0,0,0.12)',
    backdropFilter: isToolbar ? 'blur(4px)' : undefined,
    WebkitBackdropFilter: isToolbar ? 'blur(4px)' : undefined,
    transition: 'background 120ms, box-shadow 120ms, border-color 120ms',
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        title={binding ? `${label}: ${binding.path}` : label}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{
          ...buttonBase,
          ...style,
        }}
      >
        <ChainIcon active={!!binding} />
        {showLabel && (
          <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
            {binding ? (isToolbar ? 'Bound' : 'BOUND') : (isToolbar ? 'Bind' : 'BIND')}
          </span>
        )}
        {binding && isToolbar && (
          <span style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 0 2px rgba(255,255,255,0.7)'
          }} />
        )}
      </button>
      {open && (
        <div
          ref={panelRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 900000,
            background: 'linear-gradient(145deg,#ffffff,#f6f8fa)',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: 14,
            width: 300,
            boxShadow: '0 8px 28px -4px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            fontSize: 12,
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)'
          }}
        >
          <div style={{ zIndex: 900001, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <strong style={{ fontSize: 12, letterSpacing: 0.3 }}>Bind Text</strong>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#666' }}
              aria-label="Close binding panel"
            >✕</button>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => setScope('local')}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: 6,
                border: scope === 'local' ? '1px solid #722ed1' : '1px solid #d0d5dd',
                background: scope === 'local' ? 'linear-gradient(135deg,#722ed1,#9254de)' : 'linear-gradient(135deg,#f5f7fa,#eef1f5)',
                color: scope === 'local' ? '#fff' : '#333',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 500
              }}
            >Local</button>
            <button
              type="button"
              onClick={() => setScope('global')}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: 6,
                border: scope === 'global' ? '1px solid #1677ff' : '1px solid #d0d5dd',
                background: scope === 'global' ? 'linear-gradient(135deg,#1677ff,#4096ff)' : 'linear-gradient(135deg,#f5f7fa,#eef1f5)',
                color: scope === 'global' ? '#fff' : '#333',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 500
              }}
            >Global</button>
          </div>
          <input
            type="text"
            placeholder="Search paths..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              fontSize: 12,
              borderRadius: 6,
              border: '1px solid #d0d5dd',
              background: '#fff'
            }}
          />
          <div style={{ maxHeight: 190, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 4, display: 'flex', flexDirection: 'column', gap: 2, background: '#fff' }}>
            {paths.length === 0 && (
              <div style={{ padding: 8, fontSize: 11, color: '#888' }}>
                {nodeId ? 'No user prop paths' : 'No node context'}
              </div>
            )}
            {paths.map(p => {
              const meta = getNodeMeta(p.path, scope === 'global' ? 'ROOT' : nodeId);
              const disabled = meta?.meta?.ref; // bound to component prop; skip
              return (
                <button
                  key={p.path}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && handleSelect(p)}
                  style={{
                    textAlign: 'left',
                    width: '100%',
                    padding: '6px 8px',
                    background: binding?.path === p.path && binding?.scope === scope ? 'linear-gradient(90deg,#6366f1,#8b5cf6)' : 'linear-gradient(135deg,#ffffff,#f8fafc)',
                    color: disabled ? '#aaa' : (binding?.path === p.path && binding?.scope === scope ? '#fff' : '#111'),
                    border: binding?.path === p.path && binding?.scope === scope ? '1px solid #6d28d9' : '1px solid #e2e8f0',
                    borderRadius: 6,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: 11,
                    fontWeight: binding?.path === p.path && binding?.scope === scope ? 600 : 400,
                    opacity: disabled ? 0.55 : 1,
                    transition: 'background 100ms, color 100ms'
                  }}
                  title={disabled ? 'This user prop is bound to a component prop and cannot be targeted.' : p.path}
                >{p.path}{scope === 'global' ? ' (global)' : ''}</button>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#666', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentDisplay}</span>
            {binding && (
              <button
                type="button"
                onClick={() => { onChange(null); setOpen(false); }}
                style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}
              >Unbind</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BindSelector;
