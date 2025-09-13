'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Input, InputNumber, Select, Space, Typography, Tag, Switch, Tooltip, Alert, Collapse, Badge, Popconfirm, Tabs, Segmented, Empty, Popover, Dropdown, theme, message, Card } from 'antd';
import { PlusOutlined, DeleteOutlined, SettingOutlined, GlobalOutlined, EyeOutlined, EyeInvisibleOutlined, ReloadOutlined, FunctionOutlined, UndoOutlined, RedoOutlined, ThunderboltOutlined, WarningOutlined, BarsOutlined, ArrowUpOutlined, ArrowDownOutlined, FilterOutlined, ClearOutlined, ExpandOutlined, CompressOutlined, CheckSquareOutlined, AppstoreOutlined, FontColorsOutlined, FieldNumberOutlined, CheckCircleOutlined, EditOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { t } from './userprops.messages';
import UserPropDetailDrawer from './components/UserPropDetailDrawer';
import { useEditor } from '@craftjs/core';
import { useUserProps } from './useUserProps';
import * as userPropTemplates from './userPropTemplates';
import UserPropsTelemetryPanel from '../../userprops/UserPropsTelemetryPanel';

const { Title, Text } = Typography;

// Isolated editors to keep caret stable during parent re-renders
const StringEditor = React.memo(function StringEditor({ value: external, onCommit, placeholder, disabled }) {
  const [val, setVal] = React.useState(external ?? '');
  const editingRef = React.useRef(false);
  React.useEffect(() => {
    if (!editingRef.current && external !== val) setVal(external ?? '');
  }, [external, val]);
  return (
    <Input
      size="small"
      value={val}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => { editingRef.current = true; setVal(e.target.value); }}
      onBlur={() => { editingRef.current = false; onCommit(val); }}
      onPressEnter={() => { editingRef.current = false; onCommit(val); }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      style={{ maxWidth: 200 }}
    />
  );
});

const NumberEditor = React.memo(function NumberEditor({ value: externalNum, onCommit, disabled }) {
  const [val, setVal] = React.useState(externalNum ?? null);
  const editingRef = React.useRef(false);
  React.useEffect(() => {
    if (!editingRef.current && externalNum !== val) setVal(externalNum ?? null);
  }, [externalNum, val]);
  const commit = () => { editingRef.current = false; onCommit(val); };
  return (
    <InputNumber
      size="small"
      value={val}
      disabled={disabled}
      onChange={(v) => { editingRef.current = true; setVal(v); }}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); e.stopPropagation(); }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{ maxWidth: 160 }}
      placeholder="0"
      controls
    />
  );
});

const AddObjectChildRow = React.memo(function AddObjectChildRow({ indent, onAdd }) {
  const [k, setK] = React.useState('');
  const [type, setType] = React.useState('string');
  const [val, setVal] = React.useState('');
  const commit = () => { if (!k) return; onAdd(k, type, val); setK(''); setVal(''); };
  return (
    <div style={{ marginLeft: indent + 16, marginBottom: 8 }}>
      <Space.Compact style={{ width: '100%' }}>
        <Input size="middle" placeholder="key" style={{ flex: '0 0 40%' }} value={k}
               onChange={(e) => setK(e.target.value)}
               onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}
               allowClear />
        <Select size="middle" style={{ width: 140 }} value={type}
                onChange={(v) => setType(v)}
                options={['string','number','boolean','object','array'].map(t => ({ label: t, value: t }))
                }
                onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} />
        {['string','number'].includes(type) && (
          <Input size="middle" placeholder="value" style={{ flex: 1 }} value={val}
                 onChange={(e) => setVal(e.target.value)}
                 onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}
                 allowClear />
        )}
        <Tooltip title="Add child"><Button size="middle" type="primary" icon={<PlusOutlined />} onClick={(e) => { e.stopPropagation(); commit(); }} disabled={!k} /></Tooltip>
      </Space.Compact>
    </div>
  );
});

const AddArrayItemRow = React.memo(function AddArrayItemRow({ indent, onPush }) {
  const [type, setType] = React.useState('string');
  const [val, setVal] = React.useState('');
  const commit = () => { onPush(type, val); setVal(''); };
  return (
    <div style={{ marginLeft: indent + 16, marginBottom: 8 }}>
      <Space.Compact style={{ width: '100%' }}>
        <Select size="middle" style={{ width: 140 }} value={type}
                onChange={(v) => setType(v)}
                options={['string','number','boolean','object','array'].map(t => ({ label: t, value: t }))
                }
                onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} />
        {['string','number'].includes(type) && (
          <Input size="middle" placeholder="value" style={{ flex: 1 }} value={val}
                 onChange={(e) => setVal(e.target.value)}
                 onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}
                 allowClear />
        )}
        <Tooltip title="Push item"><Button size="middle" type="primary" icon={<PlusOutlined />} onClick={(e) => { e.stopPropagation(); commit(); }} /></Tooltip>
      </Space.Compact>
    </div>
  );
});

/**
 * UserPropsManager - Reusable component for managing user-defined properties
 * 
 * Props:
 * - visible: boolean - Whether modal is visible
 * - onClose: function - Called when modal closes
 * - nodeId: string - The node ID to manage props for ('ROOT' for global)
 */
export const UserPropsManager = ({ visible, onClose, nodeId, title = t('userprops.title'), forceLocalRoot = false, viewerNodeId = null, inline = false, simple = false, fitModal = false }) => {
  const { token } = theme.useToken();
  // --- Hook integration ---
  const { query } = useEditor();
  const hook = useUserProps(nodeId);
  const { getUserPropsTree, getGlobalTree, addObjectChild, pushArrayItem, setPrimitiveAtPath, setPrimitiveSmartAtPath, deletePath, toggleGlobalFlag, getNodeMeta, bindUserPropToProp, unbindUserPropPath, syncBoundUserProps, promoteLocalToGlobal, createAliasToGlobalPath, listSiteGlobalPropPaths, ensureGlobalLoaded, syncAliasesNow, renameGlobalPath, deleteGlobalPath, undoGlobalUserProps, redoGlobalUserProps, countAliasesReferencing, detachAlias, createGlobalPrimitive, updateNodeMeta } = hook;
  const { undoUserProps, redoUserProps, evaluateAll } = hook;
  const { applyExpressionTemplate, applyWatcherTemplate, bulkApplyExpressionTemplate, reorderArray } = hook;
  const expressionTemplates = React.useMemo(()=> userPropTemplates.listExpressionTemplates(), []);

  // --- Local UI state ---
  const [treeVersion, setTreeVersion] = useState(0);
  const [showGlobal, setShowGlobal] = useState(true);
  const [filterGlobalOnly, setFilterGlobalOnly] = useState(false);
  // Track which paths are expanded (including root '')
  const [expandedPaths, setExpandedPaths] = useState(new Set(['']));
  const [newChildCache, setNewChildCache] = useState({});
  const [arrayNewItemCache, setArrayNewItemCache] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState([]);
  const [promotingMap, setPromotingMap] = useState({});
  const [namespaceFilter, setNamespaceFilter] = useState([]);
  const [errorsOnly, setErrorsOnly] = useState(false);
  // Inline bind dropdown (no drawer)
  const [detailPath, setDetailPath] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [selectedPaths, setSelectedPaths] = useState(new Set());
  const [highlightPath, setHighlightPath] = useState(null);
  const [useVirtual, setUseVirtual] = useState(false);
  const [activeTab, setActiveTab] = useState('tree'); // templates tab removed after migration
  const [bulkTplOpen, setBulkTplOpen] = useState(false);
  const isGlobal = nodeId === 'ROOT' && !forceLocalRoot;
  const [editBuffer, setEditBuffer] = useState({}); // { [path]: { type, value } }
  const [renamingPath, setRenamingPath] = useState(null);
  const [renameInput, setRenameInput] = useState('');
  const [flashRenamedAt, setFlashRenamedAt] = useState(0);
  React.useEffect(()=>{
    const id = setInterval(()=>{ /* trigger re-render for fading effect */ if(flashRenamedAt) setTreeVersion(v=>v); }, 1000);
    return ()=>clearInterval(id);
  },[flashRenamedAt]);

  // Debounced refresh to avoid caret jumps on rapid typing
  const refreshDebounceRef = React.useRef(null);
  const scheduleRefresh = React.useCallback(() => {
    if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
    refreshDebounceRef.current = setTimeout(() => {
      setTreeVersion(v => v + 1);
    }, 200);
  }, []);
  const refresh = () => setTreeVersion(v => v + 1);
  const selectionToggle = (p, additive = false) => {
    setSelectedPaths(prev => {
      const next = new Set(additive ? prev : prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
  };
  const clearSelection = () => setSelectedPaths(new Set());

  // --- Data ---
  // For nodeId === 'ROOT':
  // - Default: show Site Globals (actual global store tree)
  // - When forceLocalRoot is true: show the ROOT node's local userPropsTree (Page Globals)
  const tree = (inline || visible)
    ? ((nodeId === 'ROOT' && !forceLocalRoot) ? getGlobalTree() : getUserPropsTree(nodeId))
    : null;
  const namespaceOptions = React.useMemo(() => {
    if (!tree) return [];
    const set = new Set();
    const visit = (n) => {
      if (!n) return;
      if (n.meta?.namespace) set.add(n.meta.namespace);
      if (n.type === 'object') Object.values(n.children || {}).forEach(visit);
      else if (n.type === 'array') (n.items || []).forEach(visit);
    };
    visit(tree);
    return Array.from(set).sort().map(ns => ({ label: ns, value: ns }));
  }, [tree, treeVersion]);

  useEffect(() => {
    if (!visible) return;
    try { const node = query.node(nodeId).get(); setValidationErrors(node.data.props.userPropsValidationErrors || {}); } catch { /* ignore */ }
  }, [visible, treeVersion, query, nodeId]);

  const isFilteredOut = useCallback((node, path) => {
    if (!filterGlobalOnly && showGlobal) return false;
    const meta = getNodeMeta(path);
    if (!meta) return false;
    if (filterGlobalOnly) return !meta.global;
    if (!showGlobal && meta.global) return true;
    return false;
  }, [filterGlobalOnly, showGlobal, getNodeMeta]);

  const updateNewChildCache = (path, patch) => setNewChildCache(prev => ({ ...prev, [path]: { ...(prev[path] || { type: 'string', key: '', value: '' }), ...patch } }));
  const updateArrayNewItemCache = (path, patch) => setArrayNewItemCache(prev => ({ ...prev, [path]: { ...(prev[path] || { type: 'string', value: '' }), ...patch } }));

  // --- Bind dropdown helpers ---
  const typeBadge = (t, val) => {
    const color = t === 'string' ? 'blue' : t === 'number' ? 'green' : t === 'boolean' ? 'orange' : 'default';
    const Icon = t === 'string' ? FontColorsOutlined : t === 'number' ? FieldNumberOutlined : t === 'boolean' ? CheckCircleOutlined : AppstoreOutlined;
    return (
      <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
        <Tag color={color} style={{ margin:0, lineHeight: '16px', height: 18 }}>
          <Icon style={{ fontSize:12 }} />
        </Tag>
        <Typography.Text style={{ fontSize:12, opacity:0.8 }}>{t}</Typography.Text>
      </span>
    );
  };

  const previewShort = (v) => {
    try {
      if (v === undefined) return 'undefined';
      if (v === null) return 'null';
      if (typeof v === 'string') return v.length > 28 ? `'${v.slice(0, 28)}…'` : `'${v}'`;
      if (typeof v === 'number' || typeof v === 'boolean') return String(v);
      const s = JSON.stringify(v);
      return s.length > 28 ? s.slice(0, 28) + '…' : s;
    } catch { return '[val]'; }
  };

  const buildBindMenuForPath = useCallback((targetPath) => {
    // Build Dropdown menu with components as parents and props as children
    let items = [];
    try {
      const all = query.getNodes() || {};
      const entries = Object.values(all)
        .map(n => {
          const propsObj = n.data?.props || {};
          const customDisplay = n.data?.custom?.displayName;
          const nick = (typeof customDisplay === 'string' && customDisplay.trim()) ? customDisplay
                     : (typeof propsObj.label === 'string' && propsObj.label.trim()) ? propsObj.label
                     : (typeof propsObj.name === 'string' && propsObj.name.trim()) ? propsObj.name
                     : (typeof propsObj.title === 'string' && propsObj.title.trim()) ? propsObj.title
                     : undefined;
          const typeName = n.data?.displayName || n.data?.name || 'Component';
          const compLabel = nick || typeName;
          const childProps = Object.keys(propsObj).filter(k => (['string','number','boolean'].includes(typeof propsObj[k])));
          return { id: n.id, compLabel, typeName, props: propsObj, childProps };
        })
        .filter(x => x.childProps.length > 0)
        .sort((a,b)=> a.compLabel.localeCompare(b.compLabel));
      items = entries.map(entry => ({
        key: `comp::${entry.id}`,
        icon: <AppstoreOutlined />,
        label: (
          <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
            <Typography.Text strong>{entry.compLabel}</Typography.Text>
            <Tag style={{ margin:0 }}>#{entry.typeName}</Tag>
            <Tag style={{ margin:0 }}>{entry.childProps.length}</Tag>
          </span>
        ),
        children: entry.childProps.map(k => {
          const v = entry.props[k];
          const t = typeof v;
          return {
            key: `bind::${entry.id}::${k}`,
            label: (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, minWidth: 280 }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontWeight:500 }}>{k}</span>
                  {typeBadge(t, v)}
                </span>
                <Typography.Text type="secondary" style={{ fontSize:12 }}>{previewShort(v)}</Typography.Text>
              </div>
            )
          };
        })
      }));

      if (items.length === 0) {
        items.push({ key: 'empty', label: <Typography.Text type="secondary">No bindable component props found</Typography.Text>, disabled: true });
      }
    } catch {/* ignore */}

  const onClick = async ({ key }) => {
      if (!key || !key.startsWith('bind::')) return;
      const [, sourceNodeId, propName] = key.split('::');
      try {
    const r1 = bindUserPropToProp(targetPath, sourceNodeId, propName);
    if (r1 && typeof r1.then === 'function') await r1;
    const r2 = syncBoundUserProps();
    if (r2 && typeof r2.then === 'function') await r2;
        refresh();
        message.success('Bound to ' + sourceNodeId + '.' + propName);
      } catch (e) {
        message.error('Failed to bind');
      }
    };
    return { items, onClick, triggerSubMenuAction: 'hover' };
  }, [query, bindUserPropToProp, syncBoundUserProps]);

  const BindDropdown = ({ path }) => {
    const menuConfig = buildBindMenuForPath(path);
    const [open, setOpen] = React.useState(false);
    // Toggle a body-scoped class only while open to scope global submenu fixes
    React.useEffect(() => {
      const cls = 'bind-dropdown-active';
      if (open) document.body.classList.add(cls); else document.body.classList.remove(cls);
      return () => document.body.classList.remove(cls);
    }, [open]);
    return (
      <Dropdown
  trigger={["click"]}
  placement="bottomLeft"
  arrow
  destroyPopupOnHide
  overlayClassName="bind-dropdown"
  menu={{ ...menuConfig, subMenuOpenDelay: 0.05, subMenuCloseDelay: 0.1 }}
  // Render to body to avoid any clipping from modal body scroll containers
  getPopupContainer={() => document.body}
        onOpenChange={setOpen}
      >
        <Button size="small">Bind</Button>
      </Dropdown>
    );
  };

  const commitAddChild = async (parentPath, cfgOverride = null) => {
    const cfg = cfgOverride || newChildCache[parentPath] || {};
    if (!cfg.key || !cfg.type) return;
    try {
      const res = addObjectChild(parentPath, cfg.key, cfg.type, cfg.value, cfg.global);
      if (res && typeof res.then === 'function') {
        await res;
      }
      const createdPath = parentPath ? `${parentPath}.${cfg.key}` : cfg.key;
      // Default ownership & access
      try { updateNodeMeta(createdPath, { ownerNodeId: nodeId, access: 'ro' }); } catch {/* ignore */}
      updateNewChildCache(parentPath, { key: '', value: '' });
      refresh();
    } catch (e) { console.warn('Add child failed', e); }
  };
  const commitAddArrayItem = async (arrayPath, cfgOverride = null) => {
    const cfg = cfgOverride || arrayNewItemCache[arrayPath] || {};
    try {
      const idxOrPromise = pushArrayItem(arrayPath, cfg.type, cfg.value, cfg.global);
      let idx = idxOrPromise;
      if (idxOrPromise && typeof idxOrPromise.then === 'function') {
        idx = await idxOrPromise;
      }
      const createdPath = `${arrayPath}.${idx}`;
      try { updateNodeMeta(createdPath, { ownerNodeId: nodeId, access: 'ro' }); } catch {/* ignore */}
      updateArrayNewItemCache(arrayPath, { value: '' });
      refresh();
    } catch (e) { console.warn('Add array item failed', e); }
  };

  const onPrimitiveChange = (path, type, raw) => {
    if (type === 'boolean') {
      if (isGlobal) {
        try { createGlobalPrimitive(path, 'boolean', !!raw); } catch {/* ignore */}
      } else setPrimitiveAtPath(path, !!raw, 'boolean');
    } else if (type === 'number') {
      if (raw === null || raw === '' || typeof raw === 'undefined') {
        if (isGlobal) { try { createGlobalPrimitive(path, 'number', 0); } catch {/* ignore */} }
        else setPrimitiveAtPath(path, '', 'number');
      } else {
        const n = Number(raw);
        if (!Number.isNaN(n)) {
          if (isGlobal) { try { createGlobalPrimitive(path, 'number', n); } catch {/* ignore */} }
          else setPrimitiveAtPath(path, n, 'number');
        }
      }
    } else {
      if (isGlobal) { try { createGlobalPrimitive(path, 'string', raw); } catch {/* ignore */} }
      else setPrimitiveAtPath(path, raw, 'string');
    }
    scheduleRefresh();
  };
  const onPrimitiveTypeSwitch = async (path, currentNode, newType) => {
    if (!currentNode) return; let raw = currentNode.value; if (typeof raw === 'object') raw = JSON.stringify(raw);
    try {
      const maybe = setPrimitiveSmartAtPath(path, raw, { explicitType: newType, respectExistingType: false });
      if (maybe && typeof maybe.then === 'function') {
        await maybe;
      }
      setEditBuffer(prev => { const n = { ...prev }; delete n[path]; return n; });
      refresh();
    } catch { /* ignore */ }
  };
  const toggleExpand = (path) => setExpandedPaths(prev => { const next = new Set(prev); if (next.has(path)) next.delete(path); else next.add(path); return next; });

  const renderPrimitiveEditor = (path, node) => {
    // Access control: disable edits if viewing another component's props and access is read-only
    let disableEdit = false;
    try {
      const metaInfo = getNodeMeta(path);
      const explicitOwnerId = metaInfo?.meta?.ownerNodeId;
      const access = metaInfo?.meta?.access || 'ro';
      const isComponentScope = !isGlobal && !forceLocalRoot;
      const viewer = viewerNodeId || nodeId; // who is attempting edit
      const effectiveOwner = explicitOwnerId || nodeId; // default owner is the component whose tree this is
      if (isComponentScope && viewer && effectiveOwner && viewer !== effectiveOwner && access !== 'rw') disableEdit = true;
    } catch {/* ignore */}
    const typeSwitcher = (
      <Select size="small" value={node.type} onChange={(t) => onPrimitiveTypeSwitch(path, node, t)} style={{ width: 90 }} options={['string', 'number', 'boolean'].map(t => ({ label: t, value: t }))} disabled={disableEdit} />
    );
    if (node.type === 'boolean') {
      return (
        <Space size={4}>
          {typeSwitcher}
          <Switch checked={!!node.value} onChange={(v) => onPrimitiveChange(path, 'boolean', v)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} size="small" disabled={disableEdit} />
        </Space>
      );
    }
    if (node.type === 'number') {
      return (
        <Space size={4}>
          {typeSwitcher}
          <NumberEditor
            value={(node.value === '' || node.value === null || typeof node.value === 'undefined') ? null : Number(node.value)}
            onCommit={(v) => {
              if (v === null || v === '' || typeof v === 'undefined') setPrimitiveAtPath(path, '', 'number');
              else if (!Number.isNaN(Number(v))) setPrimitiveAtPath(path, Number(v), 'number');
              scheduleRefresh();
            }}
            disabled={disableEdit}
          />
        </Space>
      );
    }
    return (
      <Space size={4}>
        {typeSwitcher}
        <StringEditor
          value={node.value ?? ''}
          placeholder={node.type}
          onCommit={(v) => { setPrimitiveAtPath(path, v, 'string'); scheduleRefresh(); }}
          disabled={disableEdit}
        />
      </Space>
    );
  };

  const NodeBlock = ({ node, path, depth, virtual = false, rowIndex = 0 }) => {
    if (!node) return null;
    const isRoot = path === '';
    if (isRoot && node.type !== 'object') return null;
    const parts = path.split('.').filter(Boolean);
    const label = isRoot ? 'root' : parts[parts.length - 1];
    const meta = getNodeMeta(path) || { global: false };
    if (!isRoot && isFilteredOut(node, path)) return null;
    const isContainer = node.type === 'object' || node.type === 'array';
    if (searchQuery && !path.toLowerCase().includes(searchQuery.toLowerCase()) && label !== 'root') return null;
    if (typeFilter.length && !typeFilter.includes(node.type)) return null;
    const expanded = expandedPaths.has(path);
    const indent = depth * 16;
    const baseRowStyle = {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '4px 8px',
      background: isRoot ? 'transparent' : token.colorFillTertiary,
      border: isRoot ? 'none' : `1px solid ${token.colorBorderSecondary}`,
      borderRadius: virtual ? 0 : 6,
      marginLeft: indent,
      minHeight: 40,
      position: 'relative'
    };
    if (virtual && !isRoot) {
      baseRowStyle.background = rowIndex % 2 === 0 ? token.colorFillTertiary : token.colorFillSecondary;
      baseRowStyle.borderRadius = 0;
      baseRowStyle.marginLeft = indent + 4;
      baseRowStyle.border = 'none';
      baseRowStyle.padding = '4px 6px';
    }
    // Access control for destructive actions when in component scope
    let disableForeignDestructive = false;
    try {
      const metaInfo = getNodeMeta(path);
      const explicitOwnerId = metaInfo?.meta?.ownerNodeId;
      const access = metaInfo?.meta?.access || 'ro';
      const isComponentScope = !isGlobal && !forceLocalRoot;
      const viewer = viewerNodeId || nodeId;
      const effectiveOwner = explicitOwnerId || nodeId;
      if (isComponentScope && viewer && effectiveOwner && viewer !== effectiveOwner && access !== 'rw') disableForeignDestructive = true;
    } catch {/* ignore */}

    return (
      <div style={{ marginBottom: virtual ? 0 : 6 }}>
        <div
          style={baseRowStyle}
          onDoubleClick={(e) => {
            const interactive = e.target.closest && e.target.closest('button, input, textarea, select, .ant-input, .ant-input-number, .ant-switch');
            if (interactive || (e.target.getAttribute && e.target.getAttribute('role') === 'spinbutton') || e.target.type === 'checkbox') return;
            if (!isRoot) { setDetailPath(path); setDetailOpen(true); }
          }}
          role={!isRoot ? 'button' : undefined}
          tabIndex={!isRoot ? 0 : undefined}
        >
          <input type="checkbox" style={{ marginRight: 4 }} checked={selectedPaths.has(path)} onChange={(e) => selectionToggle(path, e.shiftKey)} />
          {isContainer ? (
            <Button type="text" size="small" onClick={() => toggleExpand(path)} style={{ width: 24 }}>{expanded ? '-' : '+'}</Button>
          ) : <span style={{ width: 24 }} />}
          {renamingPath === path ? (
            <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
              <Input size="small" value={renameInput} autoFocus style={{ width:140 }} onChange={(e)=>setRenameInput(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter'){ if(renameInput && renameInput!==label){ renameGlobalPath(path, renameInput).then(()=>{ setRenamingPath(null); refresh(); }).catch(()=> message.error('Rename failed')); } else { setRenamingPath(null);} } if(e.key==='Escape'){ setRenamingPath(null);} e.stopPropagation(); }} />
              <Button size="small" type="primary" onClick={(e)=>{ e.stopPropagation(); if(renameInput && renameInput!==label){ renameGlobalPath(path, renameInput).then(()=>{ setRenamingPath(null); refresh(); }).catch(()=> message.error('Rename failed')); } else { setRenamingPath(null);} }}>Save</Button>
              <Button size="small" onClick={(e)=>{ e.stopPropagation(); setRenamingPath(null); }}>Cancel</Button>
            </span>
          ) : (
            <Typography.Text strong style={(() => { const base = (highlightPath === path ? { outline: `2px solid ${token.colorPrimary}`, outlineOffset: 2, padding: '0 2px', borderRadius: 4 } : {}); const metaNode = node.meta||{}; if(metaNode.lastRenamedAt && Date.now()-metaNode.lastRenamedAt < 5000){ base.background = 'rgba(250,204,21,0.35)'; base.borderRadius = 4; } if(metaNode.detachedDueToDelete && Date.now()-metaNode.detachedDueToDelete < 8000){ base.background = 'rgba(248,113,113,0.35)'; base.borderRadius = 4; } if(metaNode.detachedManually && Date.now()-metaNode.detachedManually < 5000){ base.background = 'rgba(96,165,250,0.35)'; base.borderRadius = 4; } return base; })()}>{label}</Typography.Text>
          )}
          <Tag color={node.type === 'string' ? 'blue' : node.type === 'number' ? 'green' : node.type === 'boolean' ? 'orange' : node.type === 'object' ? 'purple' : 'magenta'}>{node.type}</Tag>
          {/* Access control (component scope): default read-only, can switch to read/write */}
          {!isRoot && !isGlobal && (
            <Tooltip title="Access">
              <Select
                size="small"
                value={(node.meta && node.meta.access) || 'ro'}
                style={{ width: 92 }}
                onChange={(v) => { updateNodeMeta(path, { access: v, ownerNodeId: (node.meta && node.meta.ownerNodeId) || nodeId }); refresh(); }}
                options={[{ label: 'Read-only', value: 'ro' }, { label: 'Read/Write', value: 'rw' }]} />
            </Tooltip>
          )}
          {meta.global && <Tag color="gold" icon={<GlobalOutlined />}>G</Tag>}
          {node.meta?.aliasGlobalId && <Tag color="geekblue">Alias</Tag>}
          {node.meta?.expression && <Tooltip title="Computed"><FunctionOutlined style={{ fontSize: 12, color: '#1677ff' }} /></Tooltip>}
          {node.meta?.expressionError && <Tooltip title={node.meta.expressionError}><WarningOutlined style={{ fontSize: 12, color: '#faad14' }} /></Tooltip>}
          {Array.isArray(node.meta?.watchers) && node.meta.watchers.length > 0 && <Tooltip title={`${node.meta.watchers.length} ${t('userprops.watchers.count')}`}><EyeOutlined style={{ fontSize: 12, color: '#52c41a' }} /></Tooltip>}
          {validationErrors[path] && <Tooltip title={validationErrors[path].join('\n')}><Badge count={validationErrors[path].length} size="small" style={{ background: '#ff4d4f' }} /></Tooltip>}
          {!isContainer && renderPrimitiveEditor(path, node)}
          {!isRoot && !node.meta?.aliasGlobalId && (
            <Tooltip title="Promote to Global (creates site-wide value and converts this to alias)">
              <Button size="small" icon={<GlobalOutlined />} onClick={async ()=>{
                if(promotingMap[path]) return;
                setPromotingMap(m=>({...m,[path]:true}));
                const start = Date.now();
                try {
                  const loaded = await ensureGlobalLoaded();
                  if(!loaded){
                    message.warning('Global store unavailable (missing user/site id)');
                    console.warn('[UserProps] ensureGlobalLoaded returned false. root props missing currentUserId/currentSiteId?');
                    setPromotingMap(m=>{ const c={...m}; delete c[path]; return c; });
                    return;                    
                  }
                  console.log('[UserProps] Promoting path', path);
                  const beforeMeta = JSON.parse(JSON.stringify(node.meta||{}));
                  const res = await promoteLocalToGlobal(path, path);
                  const ms = Date.now()-start;
                  // Re-fetch meta after potential mutation
                  const afterMeta = node.meta || {};
                  if(res && res.globalPath && afterMeta.aliasGlobalId){
                    message.success(`Promoted: ${res.globalPath} (${ms}ms)`);
                  } else if(res && res.globalPath && !afterMeta.aliasGlobalId){
                    message.warning('Global created but alias not applied – applying fallback');
                    try { toggleGlobalFlag(path, true); } catch {/* ignore */}
                  } else if(!res){
                    message.warning('Promotion returned no result; retrying fallback');
                    try { toggleGlobalFlag(path, true); } catch {/* ignore */}
                  }
                  // Final verification
                  if(!(node.meta && node.meta.aliasGlobalId)){
                    console.warn('[UserProps] Promotion fallback did not set alias meta for', path, { beforeMeta, afterMeta });
                  }
                  refresh();
                } catch(e){
                  console.error('[UserProps] Promote failed', e);
                  message.error('Promote failed: '+ (e?.message||'unknown'));
                } finally {
                  setPromotingMap(m=>{ const c={...m}; delete c[path]; return c; });
                  setTreeVersion(v=>v+1);
                }
              }} disabled={!!promotingMap[path]} />
            </Tooltip>
          )}
          {!isRoot && node.meta?.aliasGlobalId && (
            <Tooltip title="Alias of global path; use Detach to localize">
              <Button size="small" icon={<GlobalOutlined />} disabled />
            </Tooltip>
          )}
          {!isRoot && node.meta?.aliasGlobalId && (
            <Space size={4}>
              <Tooltip title="Alias synced from global">
                <Button size="small" onClick={async ()=>{ const res = syncAliasesNow(); if (res && typeof res.then === 'function') await res; refresh(); }}>Sync</Button>
              </Tooltip>
              <Tooltip title="Detach alias (make local copy)">
                <Button size="small" onClick={async ()=>{ const res = detachAlias(path); if (res && typeof res.then === 'function') await res; refresh(); }}>Detach</Button>
              </Tooltip>
            </Space>
          )}
          {!isRoot && (
            node.meta?.ref ? (
              <Tooltip title="Unbind from component prop">
                <Button size="small" type="primary" onClick={async () => { const r = unbindUserPropPath(path); if (r && typeof r.then === 'function') await r; refresh(); }}>Bound</Button>
              </Tooltip>
            ) : (
              isContainer ? (
                <Tooltip title="Cannot bind object/array nodes; only primitive user props (string/number/boolean) are bindable.">
                  <Button size="small" disabled>Bind</Button>
                </Tooltip>
              ) : (
                <BindDropdown path={path} />
              )
            )
          )}
          {!isRoot && !isGlobal && (
            <Tooltip title={disableForeignDestructive ? 'Read-only (owner set this component as RO)' : 'Delete'}>
              <Button danger size="small" icon={<DeleteOutlined />} disabled={disableForeignDestructive} onClick={async () => { if(disableForeignDestructive) return; try { const res = deletePath(path); if (res && typeof res.then === 'function') await res; } finally { refresh(); } }} />
            </Tooltip>
          )}
          {!isRoot && isGlobal && renamingPath !== path && (
            <Tooltip title={disableForeignDestructive ? 'Read-only (owner set this component as RO)' : 'Rename Global'}>
              <Button size="small" icon={<EditOutlined />} disabled={disableForeignDestructive} onClick={(e)=>{ if(disableForeignDestructive) return; e.stopPropagation(); setRenamingPath(path); setRenameInput(label); }} />
            </Tooltip>
          )}
          {!isRoot && isGlobal && (
            <Tooltip title={disableForeignDestructive ? 'Read-only (owner set this component as RO)' : 'Demote (remove from Site Globals; aliases will detach)'}>
              <Button danger size="small" icon={<DeleteOutlined />} disabled={disableForeignDestructive} onClick={async (e)=>{ if(disableForeignDestructive) return; e.stopPropagation(); try { const metaNode = node.meta||{}; const globalId = metaNode.globalId; let aliasCount = 0; try { aliasCount = countAliasesReferencing(globalId, getUserPropsTree(nodeId)); } catch {} const msg = aliasCount>0 ? `Demote global property ${path}? ${aliasCount} alias(es) will detach and stop updating. Continue?` : `Demote global property ${path}?`; if(!window.confirm(msg)) return; const res = deleteGlobalPath(path); if (res && typeof res.then === 'function') await res; refresh(); } catch(err){ message.error('Demote failed'); } }} />
            </Tooltip>
          )}
        </div>
        {!virtual && isContainer && expanded && (
          <div style={{ marginTop: 4 }}>
            {node.type === 'object' && (
              <AddObjectChildRow
                indent={indent}
                onAdd={(k, type, val) => { commitAddChild(path, { key: k, type, value: val }); }}
              />
            )}
            {node.type === 'array' && (
              <AddArrayItemRow
                indent={indent}
                onPush={(type, val) => { commitAddArrayItem(path, { type, value: val }); }}
              />
            )}
            {node.type === 'object' && Object.entries(node.children || {}).map(([k, child]) => <NodeBlock key={k} node={child} path={path ? `${path}.${k}` : k} depth={depth + 1} />)}
            {node.type === 'array' && (node.items || []).map((child, idx) => {
              const canUp = idx > 0; const canDown = idx < (node.items.length - 1);
              return (
                <div key={idx} style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: -32, top: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Tooltip title={t('userprops.reorder.up')}><Button size="small" icon={<ArrowUpOutlined />} disabled={!canUp} aria-label={t('userprops.reorder.up')} onClick={() => { reorderArray(path, idx, idx - 1); refresh(); }} /></Tooltip>
                    <Tooltip title={t('userprops.reorder.down')}><Button size="small" icon={<ArrowDownOutlined />} disabled={!canDown} aria-label={t('userprops.reorder.down')} onClick={() => { reorderArray(path, idx, idx + 1); refresh(); }} /></Tooltip>
                  </div>
                  <NodeBlock node={child} path={`${path}.${idx}`} depth={depth + 1} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // --- Virtualization ---
  const flatList = React.useMemo(() => {
    if (!tree) return [];
    const rows = [];
    function visit(node, path, depth) {
      if (!node) return;
      const isRoot = path === '';
      const parts = path.split('.').filter(Boolean);
      const label = isRoot ? 'root' : parts[parts.length - 1];
      if (!isRoot) {
        if (searchQuery && !path.toLowerCase().includes(searchQuery.toLowerCase()) && label !== 'root') return;
        if (typeFilter.length && !typeFilter.includes(node.type)) return;
        if (namespaceFilter.length && !(node.meta && namespaceFilter.includes(node.meta.namespace))) return;
        const meta = getNodeMeta(path);
        if (meta && ((filterGlobalOnly && !meta.global) || (!showGlobal && meta.global))) return;
        if (errorsOnly) {
          const hasErr = !!(validationErrors[path]) || !!(meta && meta.meta && meta.meta.expressionError);
          if (!hasErr) return;
        }
      }
      rows.push({ node, path, depth });
      const expanded = expandedPaths.has(path) || path === '';
      const isContainer = node.type === 'object' || node.type === 'array';
      if (isContainer && expanded) {
        if (node.type === 'object') Object.entries(node.children || {}).forEach(([k, c]) => visit(c, path ? path + '.' + k : k, depth + 1));
        else (node.items || []).forEach((c, i) => visit(c, path ? path + '.' + i : String(i), depth + 1));
      }
    }
    visit(tree, '', 0);
    return rows;
  }, [tree, expandedPaths, searchQuery, typeFilter, namespaceFilter, filterGlobalOnly, showGlobal, errorsOnly, treeVersion, getNodeMeta, validationErrors]);
  const ITEM_HEIGHT = 48;
  const [scrollTop, setScrollTop] = useState(0);
  const onScrollList = (e) => setScrollTop(e.currentTarget.scrollTop);
  const visibleCount = 12;
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - 2);
  const endIndex = Math.min(flatList.length, startIndex + visibleCount + 4);
  const slice = useVirtual ? flatList.slice(startIndex, endIndex) : flatList;

  // --- Expression Errors Aggregation ---
  const expressionErrors = React.useMemo(() => {
    if (!tree) return [];
    const errs = [];
    function walk(n, p) {
      if (!n) return;
      if (n.meta?.expressionError) errs.push({ path: p, msg: n.meta.expressionError });
      if (n.type === 'object') Object.entries(n.children || {}).forEach(([k, c]) => walk(c, p ? p + '.' + k : k));
      else if (n.type === 'array') (n.items || []).forEach((c, i) => walk(c, p ? p + '.' + i : String(i)));
    }
    walk(tree, '');
    return errs;
  }, [tree, treeVersion]);

  const renderTreeTab = () => (
    <div style={{ marginBottom: 24 }}>
      {isGlobal ? (
        <Alert message="Global User Properties" description="These properties are available across all components in your project." type="info" icon={<GlobalOutlined />} showIcon style={{ marginBottom: 16 }} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, position: 'sticky', top: 0, zIndex: 2, background: token.colorBgContainer, padding: '4px 0' }}>
          <Space size={8} wrap>
            <Segmented
              size="small"
              options={[
                { label: 'All', value: 'all' },
                { label: 'Hide Global', value: 'hideGlobal' },
                { label: 'Global Only', value: 'globalOnly' },
              ]}
              value={filterGlobalOnly ? 'globalOnly' : (showGlobal ? 'all' : 'hideGlobal')}
              onChange={(v) => {
                if (v === 'all') { setShowGlobal(true); setFilterGlobalOnly(false); }
                else if (v === 'hideGlobal') { setShowGlobal(false); setFilterGlobalOnly(false); }
                else { setShowGlobal(true); setFilterGlobalOnly(true); }
              }}
            />
            <Tooltip title="Show only rows with errors (validation or expression)"><Switch size="small" checked={errorsOnly} onChange={setErrorsOnly} /> </Tooltip>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Filters</Typography.Text>
          </Space>
          <Space size={8} wrap>
            <Button size="small" icon={<ExpandOutlined />} onClick={() => { const all = new Set(); function walk(n,p){ if(!n) return; all.add(p); if(n.type==='object') Object.entries(n.children||{}).forEach(([k,c])=>walk(c,p? p+'.'+k : k)); else if(n.type==='array')(n.items||[]).forEach((c,i)=>walk(c,p? p+'.'+i : String(i))); } walk(tree,''); setExpandedPaths(all); }}>Expand all</Button>
            <Button size="small" icon={<CompressOutlined />} onClick={() => setExpandedPaths(new Set())}>Collapse all</Button>
          </Space>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <Space wrap>
          <Button size="small" aria-label={t('userprops.sync')} onClick={() => { syncBoundUserProps(); refresh(); }} icon={<ReloadOutlined />}>{t('userprops.sync')}</Button>
          <Button type="primary" size="small" aria-label={t('userprops.evaluate')} onClick={() => { evaluateAll(); refresh(); }} icon={<ThunderboltOutlined />}>{t('userprops.evaluate')}</Button>
          <Tooltip title={isGlobal ? 'Global Undo' : t('userprops.undo')}><Button size="small" aria-label={isGlobal ? 'Global Undo' : t('userprops.undo')} icon={<UndoOutlined />} onClick={() => { const wasGlobal = isGlobal; if(wasGlobal){ const ok = undoGlobalUserProps(); if(ok) message.open({ key:'userprops-undo', type:'info', duration:4, content:<span style={{display:'flex',alignItems:'center',gap:8}}>Undid {wasGlobal?'global':'local'} change <Button size="small" onClick={()=>{ redoGlobalUserProps(); refresh(); message.destroy('userprops-undo'); }}>Redo</Button></span> }); } else { undoUserProps(); message.open({ key:'userprops-undo', type:'info', duration:4, content:<span style={{display:'flex',alignItems:'center',gap:8}}>Undid local change <Button size="small" onClick={()=>{ redoUserProps(); refresh(); message.destroy('userprops-undo'); }}>Redo</Button></span> }); } refresh(); }} /></Tooltip>
          <Tooltip title={isGlobal ? 'Global Redo' : t('userprops.redo')}><Button size="small" aria-label={isGlobal ? 'Global Redo' : t('userprops.redo')} icon={<RedoOutlined />} onClick={() => { const wasGlobal = isGlobal; if(wasGlobal){ const ok = redoGlobalUserProps(); if(ok) message.open({ key:'userprops-redo', type:'info', duration:4, content:<span style={{display:'flex',alignItems:'center',gap:8}}>Redid global change <Button size="small" onClick={()=>{ undoGlobalUserProps(); refresh(); message.destroy('userprops-redo'); }}>Undo</Button></span> }); } else { redoUserProps(); message.open({ key:'userprops-redo', type:'info', duration:4, content:<span style={{display:'flex',alignItems:'center',gap:8}}>Redid local change <Button size="small" onClick={()=>{ undoUserProps(); refresh(); message.destroy('userprops-redo'); }}>Undo</Button></span> }); } refresh(); }} /></Tooltip>
          <Popover placement="bottom" trigger={['hover','click']} content={<div style={{fontSize:11, maxWidth:240, lineHeight:1.4}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}><span style={{background:'rgba(250,204,21,0.6)',width:14,height:14,borderRadius:3,display:'inline-block'}} /> Renamed alias (recent)</div>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}><span style={{background:'rgba(248,113,113,0.6)',width:14,height:14,borderRadius:3,display:'inline-block'}} /> Detached (source deleted)</div>
            <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{background:'rgba(96,165,250,0.6)',width:14,height:14,borderRadius:3,display:'inline-block'}} /> Manually detached alias</div>
          </div>}>
            <Button size="small" icon={<InfoCircleOutlined />} aria-label="Legend" />
          </Popover>
        </Space>
        <MetricsBar nodeId={nodeId} query={query} refreshTrigger={treeVersion} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <Input allowClear prefix={<FilterOutlined />} placeholder={t('userprops.filter.search.placeholder')} size="small" style={{ width: 240 }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} aria-label={t('userprops.filter.search.placeholder')} />
        <Select mode="multiple" size="small" placeholder={t('userprops.filter.type')} value={typeFilter} onChange={setTypeFilter} style={{ minWidth: 220 }} options={['string', 'number', 'boolean', 'object', 'array'].map(t => ({ label: t, value: t }))} />
        <Select mode="multiple" size="small" placeholder={t('userprops.filter.namespace')} value={namespaceFilter} onChange={setNamespaceFilter} style={{ minWidth: 200 }} options={namespaceOptions} allowClear />
        <Tooltip title={useVirtual ? t('userprops.virtualization.disable') : t('userprops.virtualization.enable')}><Button size="small" aria-label={useVirtual ? t('userprops.virtualization.disable') : t('userprops.virtualization.enable')} icon={<BarsOutlined />} type={useVirtual ? 'primary' : 'default'} onClick={() => setUseVirtual(v => !v)} /></Tooltip>
        {(searchQuery || typeFilter.length || namespaceFilter.length || errorsOnly || filterGlobalOnly || !showGlobal) && (
          <Tooltip title="Reset all filters"><Button size="small" icon={<ClearOutlined />} onClick={() => { setSearchQuery(''); setTypeFilter([]); setNamespaceFilter([]); setErrorsOnly(false); setFilterGlobalOnly(false); setShowGlobal(true); }} /></Tooltip>
        )}
      </div>
      {!tree || !tree.children || Object.keys(tree.children).length === 0 ? (
        <Empty description={<span>No user props yet</span>} image={Empty.PRESENTED_IMAGE_SIMPLE}>
          <Button size="small" icon={<PlusOutlined />} onClick={() => { updateNewChildCache('', { key: 'example', type: 'string', value: 'Hello' }); commitAddChild(''); }}>Add example property</Button>
        </Empty>
      ) : null}
      {tree && (
        useVirtual ? (
          <div style={{ position: 'relative', maxHeight: '65vh', overflowY: 'auto', border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8 }} onScroll={onScrollList}>
            <div style={{ height: flatList.length * ITEM_HEIGHT, position: 'relative' }}>
              {slice.map((row, idx) => (
                <div key={row.path || 'root'} style={{ position: 'absolute', top: ((startIndex + idx) * ITEM_HEIGHT), left: 0, right: 0 }}>
                  <NodeBlock node={row.node} path={row.path} depth={row.depth} virtual rowIndex={startIndex + idx} />
                </div>
              ))}
            </div>
          </div>
        ) : <NodeBlock node={tree} path="" depth={0} />
      )}
      <div style={{ position: 'sticky', bottom: 0, background: token.colorBgContainer, padding: '8px 4px', borderTop: `1px solid ${token.colorBorderSecondary}`, marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography.Text strong>Bulk ({selectedPaths.size})</Typography.Text>
        <Tooltip title="Select all in current view"><Button size="small" icon={<CheckSquareOutlined />} onClick={() => { const next = new Set(selectedPaths); (useVirtual ? slice : flatList).forEach(r => { if (r.path) next.add(r.path); }); setSelectedPaths(next); }} /></Tooltip>
        {selectedPaths.size > 0 && <>
          <Popover
            title={<span style={{fontSize:12}}>Expression Templates</span>}
            trigger="click"
            open={bulkTplOpen}
            onOpenChange={setBulkTplOpen}
            content={<div style={{ maxHeight:300, overflow:'auto', width:300 }}>
              {expressionTemplates.map(tpl => (
                <div key={tpl.key || tpl.name} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'4px 0', borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ flex:1 }}>
                    <Typography.Text style={{ fontSize:12 }} strong>{tpl.name}</Typography.Text>
                    <div style={{ fontSize:11, opacity:0.7 }}>{tpl.description}</div>
                  </div>
                  <Button size="small" type="primary" onClick={() => { bulkApplyExpressionTemplate(Array.from(selectedPaths), tpl.key || tpl.name, tpl.params || {}); setBulkTplOpen(false); refresh(); }}>Apply</Button>
                </div>
              ))}
              {expressionTemplates.length===0 && <Typography.Text type="secondary" style={{fontSize:12}}>No templates</Typography.Text>}
              <Typography.Text style={{ fontSize:11, display:'block', marginTop:6 }} type="secondary">Applies to selected primitive paths only.</Typography.Text>
            </div>}
          >
            <Button size="small">Templates</Button>
          </Popover>
          <Button size="small" onClick={async () => { for (const p of selectedPaths) { try { await promoteLocalToGlobal(p, p); } catch {/* ignore */} } refresh(); }}>Set Global</Button>
          <Button size="small" onClick={async () => { for (const p of selectedPaths) { const meta = getNodeMeta(p); try { if (meta?.meta?.aliasGlobalId) { const r = detachAlias(p); if (r && typeof r.then === 'function') await r; } else { const r2 = toggleGlobalFlag(p, false); if (r2 && typeof r2.then === 'function') await r2; } } catch {/* ignore */} } refresh(); }}>Unset Global</Button>
          <Popconfirm title="Clear all expressions on selected?" okText="Yes" onConfirm={() => { selectedPaths.forEach(p => { const meta = getNodeMeta(p); if (meta?.meta?.expression) { hook.clearExpression(p); } }); refresh(); }}><Button size="small">Clear Expressions</Button></Popconfirm>
          <Popconfirm title="Clear all validation rules on selected?" okText="Yes" onConfirm={() => { selectedPaths.forEach(p => { hook.clearValidation(p); }); refresh(); }}><Button size="small">Clear Validation</Button></Popconfirm>
          <Button size="small" onClick={clearSelection}>Clear Selection</Button>
        </>}
        <span aria-live="polite" style={{ position: 'absolute', left: -9999, top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>Selected {selectedPaths.size} items</span>
      </div>
      <Collapse style={{ marginTop: 24 }} items={[(expressionErrors.length ? { key: 'exprErrors', label: `Expression Errors (${expressionErrors.length})`, children: (<div className="space-y-1">{expressionErrors.map(er => (<div key={er.path} style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Tag color="warning"><WarningOutlined /></Tag><Typography.Text code style={{ cursor: 'pointer' }} onClick={() => { setDetailPath(er.path); setDetailOpen(true); }}>{er.path}</Typography.Text><Typography.Text type="danger" style={{ fontSize: 12 }}>{er.msg}</Typography.Text></div>))}</div>) } : null)].filter(Boolean)} />
    </div>
  );

  const renderTelemetryTab = () => (
    <div style={{ height: 520 }}>
      <UserPropsTelemetryPanel />
    </div>
  );

  // Inline panel rendering (no modal)
  if (inline) {
    return (
      <>
        {simple ? (
          <div style={{ padding: fitModal ? 0 : undefined }}>
            {renderTreeTab()}
          </div>
        ) : (
          <Card bordered={false} bodyStyle={{ padding: fitModal ? 0 : 0 }} styles={{ body: { background: token.colorBgContainer } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <SettingOutlined />
              <span style={{ fontWeight: 600 }}>{title}</span>
              {isGlobal && <Tag color="gold" icon={<GlobalOutlined />}>Global</Tag>}
            </div>
            <Tabs activeKey={activeTab} onChange={setActiveTab} size="small" style={{ marginBottom: 12 }} items={[{ key: 'tree', label: t('userprops.tab.tree') }, { key: 'telemetry', label: t('userprops.tab.telemetry') }]} />
            {activeTab === 'tree' && renderTreeTab()}
            {activeTab === 'telemetry' && renderTelemetryTab()}
          </Card>
        )}
        <UserPropDetailDrawer
          open={detailOpen}
          path={detailPath}
          onClose={() => { setDetailOpen(false); setDetailPath(null); }}
          hookApis={hook}
          nodeMeta={detailPath ? getNodeMeta(detailPath) : null}
          validationErrors={validationErrors}
          onDependencyClick={(dep) => {
            setHighlightPath(dep);
            const parts = dep.split('.'); let current = ''; parts.forEach(part => { current = current ? current + '.' + part : part; setExpandedPaths(prev => new Set(prev).add(current)); });
            setTimeout(() => { setHighlightPath(null); }, 3000);
          }}
          onRequestPathChange={(p) => { if (!p) return; setDetailPath(p); setDetailOpen(true); setHighlightPath(p); setTimeout(() => setHighlightPath(null), 2500); const parts = p.split('.'); let cur = ''; parts.forEach(part => { cur = cur ? cur + '.' + part : part; setExpandedPaths(prev => new Set(prev).add(cur)); }); }}
        />
      </>
    );
  }

  // Default modal rendering (legacy)
  return (
    <>
      <Modal
        title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><SettingOutlined /><span>{title}</span>{isGlobal && <Tag color="gold" icon={<GlobalOutlined />}>Global</Tag>}</div>}
        open={visible}
        onCancel={onClose}
        width={920}
        footer={[<Button key="close" onClick={onClose}>Close</Button>]}
        styles={{ body: { maxHeight: '80vh', overflowY: 'auto', background: token.colorBgContainer } }}
        destroyOnClose
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} size="small" style={{ marginBottom: 12 }} items={[{ key: 'tree', label: t('userprops.tab.tree') }, { key: 'telemetry', label: t('userprops.tab.telemetry') }]} />
        {activeTab === 'tree' && renderTreeTab()}
        {activeTab === 'telemetry' && renderTelemetryTab()}
        <style jsx global>{`
          /* Ensure bind dropdown content fits viewport and scrolls */
          .bind-dropdown .ant-dropdown-menu {
            max-height: 65vh;
            overflow-y: auto;
            min-width: 340px;
          }
          /* Submenu popup scrolling when opened inside modal */
          :where(.ant-modal-root) .ant-dropdown-menu-submenu-popup {
            max-height: 65vh;
            overflow-y: auto;
          }
          /* Force very tall submenus to stay within viewport and scroll (scoped while open) */
          .bind-dropdown-active .ant-dropdown-menu-submenu-popup {
            position: fixed !important;
            top: 8px !important;
            bottom: 8px !important;
            overflow-y: auto !important;
            max-height: none !important;
            z-index: 1050;
          }
          .bind-dropdown-active .ant-dropdown-menu-submenu-popup .ant-dropdown-menu {
            max-height: none;
            min-width: 320px;
          }
        `}</style>
      </Modal>
      <UserPropDetailDrawer
        open={detailOpen}
        path={detailPath}
        onClose={() => { setDetailOpen(false); setDetailPath(null); }}
        hookApis={hook}
        nodeMeta={detailPath ? getNodeMeta(detailPath) : null}
        validationErrors={validationErrors}
        onDependencyClick={(dep) => {
          setHighlightPath(dep);
          const parts = dep.split('.'); let current = ''; parts.forEach(part => { current = current ? current + '.' + part : part; setExpandedPaths(prev => new Set(prev).add(current)); });
          setTimeout(() => { setHighlightPath(null); }, 3000);
        }}
        onRequestPathChange={(p) => { if (!p) return; setDetailPath(p); setDetailOpen(true); setHighlightPath(p); setTimeout(() => setHighlightPath(null), 2500); const parts = p.split('.'); let cur = ''; parts.forEach(part => { cur = cur ? cur + '.' + part : part; setExpandedPaths(prev => new Set(prev).add(cur)); }); }}
      />
    </>
  );
};

export default UserPropsManager;

function MetricsBar({ nodeId, query, refreshTrigger }) {
  const [metrics, setMetrics] = React.useState(null);
  React.useEffect(()=>{
    try {
      const node = query.node(nodeId).get();
      setMetrics(node.data.props.userPropsLastMetrics || null);
    } catch { setMetrics(null); }
  }, [query, nodeId, refreshTrigger]);
  if (!metrics) return <Typography.Text type="secondary" style={{fontSize:12}}>{t('userprops.metrics.none')}</Typography.Text>;
  return (
    <Tooltip title={`Evaluation took ${metrics.tookMs}ms`}>
      <div style={{fontSize:12, background:'#f5f5f5', padding:'2px 6px', borderRadius:4, display:'flex', gap:8}}>
        <span>⏱ {metrics.tookMs}ms</span>
        <span>{t('userprops.metrics.expressions.short')} {metrics.expressionEvaluations}</span>
        <span>{t('userprops.metrics.watchers.short')} {metrics.watchersTriggered}</span>
      </div>
    </Tooltip>
  );
}
