"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useUserProps } from '../../utils/userprops/useUserProps';

/**
 * Clean rebuilt BindSelector component.
 */
export const BindSelector = ({
  nodeId,
  binding,
  onChange,
  label = 'Bind to User Prop',
  disabled = false,
  style = {},
  variant = 'default',
  showLabel = true,
  usePortal = true,
}) => {
  const {
    listUserPropPaths,
    getNodeMeta,
    listSiteGlobalPropPaths,
    createGlobalPrimitive,
    promoteLocalToGlobal,
    ensureGlobalLoaded,
    renameGlobalPath,
    deleteGlobalPath,
    syncAliasesNow,
  globalVersion,
  } = useUserProps(nodeId);

  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState(binding?.scope || 'local');
  const [search, setSearch] = useState('');
  const [globalPaths, setGlobalPaths] = useState([]);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [newGlobalPath, setNewGlobalPath] = useState('');
  const [newGlobalType, setNewGlobalType] = useState('string');
  const [newGlobalValue, setNewGlobalValue] = useState('');
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [promoting, setPromoting] = useState(false);
  const [promoteFlash, setPromoteFlash] = useState(false);

  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 300 });

  const computePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = 300;
    // Position relative to viewport using fixed coordinates; clamp within viewport
    const viewportW = window.innerWidth || document.documentElement.clientWidth || 1024;
    const viewportH = window.innerHeight || document.documentElement.clientHeight || 768;
    let left = rect.left + rect.width - width; // right-align to trigger
    let top = rect.bottom + 6;
    // clamp
    left = Math.max(8, Math.min(left, viewportW - width - 8));
    top = Math.max(8, Math.min(top, viewportH - 8 - 260)); // leave some space for panel height
    setPanelPos({ top, left, width });
  };

  // Debug: log open state transitions
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[BindSelector] open state changed =>', open);
  }, [open]);

  const refreshGlobalPaths = useCallback(async () => {
    try {
      await ensureGlobalLoaded();
      const list = await listSiteGlobalPropPaths({ leavesOnly: true });
      setGlobalPaths(list || []);
    } catch (e) { console.warn('[BindSelector] load global paths failed', e); }
  }, [ensureGlobalLoaded, listSiteGlobalPropPaths]);

  useEffect(() => { if (open && scope === 'global') { setLoadingGlobal(true); refreshGlobalPaths().finally(() => setLoadingGlobal(false)); } }, [open, scope, refreshGlobalPaths, globalVersion]);

  useEffect(() => {
    if (!open) return;
    computePosition();
  // schedule a second measurement after layout settles (fonts, etc.)
  const t = setTimeout(() => computePosition(), 30);
    const down = (e) => {
      if (panelRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const relayout = () => computePosition();
    // Use pointerdown to fire earlier than other handlers and avoid focus/blur races
    document.addEventListener('pointerdown', down, true);
    window.addEventListener('resize', relayout);
    window.addEventListener('scroll', relayout, true);
    return () => { document.removeEventListener('pointerdown', down, true); window.removeEventListener('resize', relayout); window.removeEventListener('scroll', relayout, true); };
  }, [open]);

  const localPaths = nodeId ? (listUserPropPaths({ leavesOnly: true }, nodeId) || []) : [];
  const activePaths = scope === 'global' ? globalPaths : localPaths;
  const filteredPaths = activePaths.filter(p => !search || p.path.toLowerCase().includes(search.toLowerCase()));

  const handleSelect = useCallback((p) => { onChange({ path: p.path, scope }); setOpen(false); }, [onChange, scope]);

  const handleCreateGlobal = async () => {
    if (!newGlobalPath) return;
    try {
      let val = newGlobalValue;
      if (newGlobalType === 'number') val = Number(newGlobalValue || 0);
      if (newGlobalType === 'boolean') val = ['true', '1', 'yes', 'on'].includes(String(newGlobalValue).toLowerCase());
      await createGlobalPrimitive(newGlobalPath, newGlobalType, val);
      setNewGlobalPath(''); setNewGlobalValue('');
      refreshGlobalPaths();
    } catch (e) { console.warn('[BindSelector] createGlobalPrimitive failed', e); }
  };

  const startRename = (p) => { setRenaming(p.path); setRenameValue(p.path); };
  const cancelRename = () => { setRenaming(null); setRenameValue(''); };
  const saveRename = async (oldPath) => {
    if (!renameValue || renameValue === oldPath) { cancelRename(); return; }
    try {
      await renameGlobalPath(oldPath, renameValue);
      await refreshGlobalPaths();
      if (binding?.scope === 'global' && binding.path === oldPath) onChange({ path: renameValue, scope: 'global' });
    } catch (e) { console.warn('[BindSelector] rename failed', e); }
    cancelRename();
  };
  const deletePath = async (p) => {
    if (!window.confirm(`Delete global prop ${p.path}? This will break aliases referencing it.`)) return;
    try { await deleteGlobalPath(p.path); await refreshGlobalPaths(); if (binding?.scope === 'global' && binding.path === p.path) onChange(null); } catch (e) { console.warn('[BindSelector] delete failed', e); }
  };
  const promote = async () => {
    if (!binding?.path || binding.scope !== 'local') return; setPromoting(true);
    try {
      const loaded = await ensureGlobalLoaded(); if (!loaded) throw new Error('Global store not loaded');
      const res = await promoteLocalToGlobal(binding.path, binding.path);
      if (res?.globalPath) { onChange({ path: res.globalPath, scope: 'global' }); setScope('global'); await refreshGlobalPaths(); setPromoteFlash(true); setTimeout(() => setPromoteFlash(false), 1600); }
      else console.warn('[BindSelector] Promotion returned no globalPath');
    } catch (e) { console.warn('[BindSelector] Promote failed', e); }
    setPromoting(false);
  };

  const currentDisplay = binding ? `${binding.scope === 'global' ? '🌐' : '📍'} ${binding.path}` : 'Not bound';
  const isToolbar = variant === 'toolbar';
  const ChainIcon = ({ size = 14, active }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={active ? '#ffffff' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 13.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5l-.9.9" /><path d="M13.5 10.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l.9-.9" /></svg>
  );
  const buttonBase = { height: isToolbar ? 32 : 30, minWidth: isToolbar ? 34 : undefined, padding: isToolbar ? '0 10px' : '6px 10px', fontSize: 11, lineHeight: 1, borderRadius: isToolbar ? 6 : 8, cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: showLabel ? 6 : 0, border: isToolbar ? (binding ? '1px solid #5673ff' : '1px solid #d0d5dd') : '1px solid rgba(0,0,0,0.1)', background: binding ? (isToolbar ? 'linear-gradient(135deg,#2563eb,#3b82f6)' : 'linear-gradient(135deg,#1677ff,#4096ff)') : (isToolbar ? 'linear-gradient(135deg,#f5f7fa,#eef1f5)' : 'linear-gradient(135deg,#722ed1,#9254de)'), color: binding ? '#fff' : (isToolbar ? '#111' : '#fff'), position: 'relative', boxShadow: isToolbar ? (binding ? '0 2px 4px rgba(0,0,0,0.15)' : '0 1px 2px rgba(0,0,0,0.08)') : '0 2px 6px rgba(0,0,0,0.12)', backdropFilter: isToolbar ? 'blur(4px)' : undefined, WebkitBackdropFilter: isToolbar ? 'blur(4px)' : undefined, transition: 'background 120ms, box-shadow 120ms, border-color 120ms' };

  const panelContent = (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <strong style={{ fontSize: 12, letterSpacing: 0.3 }}>Bind Text</strong>
        <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#666' }} aria-label="Close binding panel">✕</button>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" onClick={() => setScope('local')} style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: scope === 'local' ? '1px solid #722ed1' : '1px solid #d0d5dd', background: scope === 'local' ? 'linear-gradient(135deg,#722ed1,#9254de)' : 'linear-gradient(135deg,#f5f7fa,#eef1f5)', color: scope === 'local' ? '#fff' : '#333', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>Local</button>
        <button type="button" onClick={() => setScope('global')} style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: scope === 'global' ? '1px solid #1677ff' : '1px solid #d0d5dd', background: scope === 'global' ? 'linear-gradient(135deg,#1677ff,#4096ff)' : 'linear-gradient(135deg,#f5f7fa,#eef1f5)', color: scope === 'global' ? '#fff' : '#333', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>Global</button>
      </div>
      <input type="text" placeholder="Search paths..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '6px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #d0d5dd', background: '#fff' }} />
      {scope === 'global' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="text" placeholder="new.global.path" value={newGlobalPath} onChange={(e) => setNewGlobalPath(e.target.value)} style={{ flex: 1, padding: '6px 8px', fontSize: 11, border: '1px solid #d0d5dd', borderRadius: 6 }} />
            <select value={newGlobalType} onChange={(e) => setNewGlobalType(e.target.value)} style={{ padding: '6px 4px', fontSize: 11, border: '1px solid #d0d5dd', borderRadius: 6 }}><option value="string">string</option><option value="number">number</option><option value="boolean">boolean</option></select>
          </div>
          {['string', 'number', 'boolean'].includes(newGlobalType) && (<input type="text" placeholder={`${newGlobalType} value`} value={newGlobalValue} onChange={(e) => setNewGlobalValue(e.target.value)} style={{ padding: '6px 8px', fontSize: 11, border: '1px solid #d0d5dd', borderRadius: 6 }} />)}
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={handleCreateGlobal} disabled={!newGlobalPath} style={{ flex: 1, padding: '6px 8px', fontSize: 11, border: '1px solid #1677ff', background: 'linear-gradient(135deg,#1677ff,#4096ff)', color: '#fff', borderRadius: 6, cursor: 'pointer' }}>Create Global</button>
            <button type="button" onClick={() => { syncAliasesNow(); refreshGlobalPaths(); }} style={{ padding: '6px 8px', fontSize: 11, border: '1px solid #6366f1', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', borderRadius: 6, cursor: 'pointer' }}>Sync Aliases</button>
          </div>
        </div>
      )}
      <div style={{ maxHeight: 190, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 4, display: 'flex', flexDirection: 'column', gap: 2, background: '#fff' }}>
        {loadingGlobal && scope === 'global' && <div style={{ padding: 8, fontSize: 11 }}>Loading global...</div>}
        {!loadingGlobal && filteredPaths.length === 0 && (<div style={{ padding: 8, fontSize: 11, color: '#888' }}>{scope === 'global' ? 'No global props yet' : (nodeId ? 'No user prop paths' : 'No node context')}</div>)}
        {filteredPaths.map(p => {
          const meta = scope === 'global' ? null : getNodeMeta(p.path, nodeId);
          const disabledMeta = meta?.meta?.ref;
          const selected = binding?.path === p.path && binding?.scope === scope;
          return (
            <div key={p.path} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button type="button" disabled={disabledMeta} onClick={() => !disabledMeta && handleSelect(p)} style={{ flex: 1, textAlign: 'left', padding: '6px 8px', background: selected ? 'linear-gradient(90deg,#6366f1,#8b5cf6)' : 'linear-gradient(135deg,#ffffff,#f8fafc)', color: disabledMeta ? '#aaa' : (selected ? '#fff' : '#111'), border: selected ? '1px solid #6d28d9' : '1px solid #e2e8f0', borderRadius: 6, cursor: disabledMeta ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: selected ? 600 : 400, opacity: disabledMeta ? 0.55 : 1, transition: 'background 100ms, color 100ms' }} title={disabledMeta ? 'This user prop is bound to a component prop and cannot be targeted.' : p.path}>
                {renaming === p.path ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                    <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} style={{ flex: 1, fontSize: 11, padding: '2px 4px' }} />
                    <button type="button" style={{ fontSize: 10, padding: '2px 4px', border: '1px solid #10b981', background: '#10b981', color: '#fff', borderRadius: 4, cursor: 'pointer' }} onClick={async (e) => { e.stopPropagation(); await saveRename(p.path); }}>Save</button>
                    <button type="button" style={{ fontSize: 10, padding: '2px 4px', border: '1px solid #ef4444', background: '#ef4444', color: '#fff', borderRadius: 4, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); cancelRename(); }}>X</button>
                  </div>
                ) : (<>{p.path}{scope === 'global' ? ' (global)' : ''}</>)}
              </button>
              {scope === 'global' && renaming !== p.path && (<button type="button" aria-label="Rename" style={{ padding: '4px 6px', fontSize: 10, border: '1px solid #d0d5dd', background: '#fff', borderRadius: 6, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); startRename(p); }}>✎</button>)}
              {scope === 'global' && (<button type="button" aria-label="Delete" style={{ padding: '4px 6px', fontSize: 10, border: '1px solid #f87171', background: '#fee2e2', color: '#b91c1c', borderRadius: 6, cursor: 'pointer' }} onClick={async (e) => { e.stopPropagation(); await deletePath(p); }}>🗑</button>)}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#666', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentDisplay}</span>
        {binding && (<button type="button" onClick={() => { onChange(null); setOpen(false); }} style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>Unbind</button>)}
      </div>
      {scope === 'local' && binding && (<div style={{ display: 'flex', gap: 6 }}><button type="button" style={{ flex: 1, padding: '6px 8px', fontSize: 11, background: promoting ? 'linear-gradient(135deg,#1e3a8a,#1d4ed8)' : 'linear-gradient(135deg,#2563eb,#3b82f6)', color: '#fff', border: '1px solid #3b82f6', borderRadius: 6, cursor: promoting ? 'wait' : 'pointer', position: 'relative' }} disabled={promoting} onClick={promote}>{promoteFlash ? 'Promoted!' : (promoting ? 'Promoting...' : 'Promote to Global')}</button></div>)}
    </>
  );

  const panel = (
    <div
      ref={panelRef}
      data-bind-selector-panel="true"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
  // Use fixed so coordinates are viewport-based and unaffected by transforms
  position: 'fixed',
  top: panelPos.top,
  left: panelPos.left,
  right: undefined,
        // Use very high z-index to ensure it displays above editor overlays and modals
        zIndex: 2147483647,
        background: 'linear-gradient(145deg,#ffffff,#f6f8fa)',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
  padding: 14,
  width: panelPos.width,
        maxWidth: 360,
        boxShadow: '0 8px 28px -4px rgba(0,0,0,0.18)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        fontSize: 12,
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)'
      }}
    >{panelContent}</div>
  );

  // Fallback if position hasn't been computed (e.g., parent hidden during first open)
  const needsFixedFallback = open && usePortal && panelPos.top === 0 && panelPos.left === 0;
  const fixedFallback = needsFixedFallback ? (
    <div
      data-bind-selector-fallback="true"
      style={{ position: 'fixed', top: 72, right: 40, zIndex: 900001, background: '#fffbe6', border: '1px solid #facc15', padding: 10, borderRadius: 12, width: 320, boxShadow: '0 6px 20px rgba(0,0,0,0.18)', fontSize: 11 }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
        <span>BindSelector Debug</span>
        <button type="button" onClick={() => setOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 14 }}>✕</button>
      </div>
      <div style={{ marginBottom: 6, color: '#92400e', lineHeight: 1.3 }}>Portal position unresolved (top/left == 0). Showing fallback to ensure accessibility.</div>
      <div style={{ border: '1px dashed #facc15', borderRadius: 8, padding: 6, background: '#fffbeb', maxHeight: 260, overflow: 'auto' }}>{panelContent}</div>
    </div>
  ) : null;

  // Render debug (low overhead)
  try { console.log('[BindSelector] render', { open, scope, panelPos, needsFixedFallback, binding }); } catch {}
  if (typeof window !== 'undefined') {
    window.__BIND_SELECTOR_DEBUG__ = {
      forceOpen: () => setOpen(true),
      forceClose: () => setOpen(false),
      panelPos,
    };
  }

  return (
  <div style={{ position: 'relative', display: 'inline-flex' }} data-bind-selector-wrapper="true">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onPointerDown={(e) => {
          // prevent Craft selection blur/race; toggle early in capture phase
          e.preventDefault();
          e.stopPropagation();
          setOpen(o => !o);
        }}
        title={binding ? `${label}: ${binding.path}` : label}
        aria-haspopup="dialog"
        aria-expanded={open}
    data-open={open ? 'true' : 'false'}
        style={{ ...buttonBase, ...style }}
      >
        <ChainIcon active={!!binding} />
        {showLabel && (<span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{binding ? (isToolbar ? 'Bound' : 'BOUND') : (isToolbar ? 'Bind' : 'BIND')}</span>)}
        {binding && isToolbar && (<span style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 2px rgba(255,255,255,0.7)' }} />)}
      </button>
      {open && (() => {
        // Always portal to body to avoid clipping/transform issues
        const target = typeof document !== 'undefined' ? document.body : null;
        if (target) return createPortal(<>{panel}{fixedFallback}</>, target);
        return <>{panel}{fixedFallback}</>;
      })()}
    </div>
  );
};

export default BindSelector;
