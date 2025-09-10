'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Input, InputNumber, Select, Space, Typography, Tag, Switch, Tooltip, Alert, Collapse, Badge, Popconfirm, Tabs, Segmented, Empty, Popover, Dropdown, theme, message } from 'antd';
import { PlusOutlined, DeleteOutlined, SettingOutlined, GlobalOutlined, EyeOutlined, EyeInvisibleOutlined, ReloadOutlined, FunctionOutlined, UndoOutlined, RedoOutlined, ThunderboltOutlined, WarningOutlined, BarsOutlined, ArrowUpOutlined, ArrowDownOutlined, FilterOutlined, ClearOutlined, ExpandOutlined, CompressOutlined, CheckSquareOutlined, AppstoreOutlined, FontColorsOutlined, FieldNumberOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { t } from './userprops.messages';
import UserPropDetailDrawer from './components/UserPropDetailDrawer';
import { useEditor } from '@craftjs/core';
import { useUserProps } from './useUserProps';
import * as userPropTemplates from './userPropTemplates';
import UserPropsTelemetryPanel from '../../userprops/UserPropsTelemetryPanel';

const { Title, Text } = Typography;

// Isolated editors to keep caret stable during parent re-renders
const StringEditor = React.memo(function StringEditor({ value: external, onCommit, placeholder }) {
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

const NumberEditor = React.memo(function NumberEditor({ value: externalNum, onCommit }) {
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
export const UserPropsManager = ({ visible, onClose, nodeId, title = t('userprops.title') }) => {
  const { token } = theme.useToken();
  // --- Hook integration ---
  const { query } = useEditor();
  const hook = useUserProps(nodeId);
  const { getUserPropsTree, addObjectChild, pushArrayItem, setPrimitiveAtPath, setPrimitiveSmartAtPath, deletePath, toggleGlobalFlag, getNodeMeta, bindUserPropToProp, unbindUserPropPath, syncBoundUserProps } = hook;
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
  const isGlobal = nodeId === 'ROOT';
  const [editBuffer, setEditBuffer] = useState({}); // { [path]: { type, value } }

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
  const tree = visible ? getUserPropsTree(nodeId) : null;
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

    const onClick = ({ key }) => {
      if (!key || !key.startsWith('bind::')) return;
      const [, sourceNodeId, propName] = key.split('::');
      try {
        bindUserPropToProp(targetPath, sourceNodeId, propName);
        syncBoundUserProps();
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

  const commitAddChild = (parentPath) => {
    const cfg = newChildCache[parentPath] || {};
    if (!cfg.key || !cfg.type) return;
    try { addObjectChild(parentPath, cfg.key, cfg.type, cfg.value, cfg.global); updateNewChildCache(parentPath, { key: '', value: '' }); refresh(); } catch (e) { console.warn('Add child failed', e); }
  };
  const commitAddArrayItem = (arrayPath) => {
    const cfg = arrayNewItemCache[arrayPath] || {};
    try { pushArrayItem(arrayPath, cfg.type, cfg.value, cfg.global); updateArrayNewItemCache(arrayPath, { value: '' }); refresh(); } catch (e) { console.warn('Add array item failed', e); }
  };

  const onPrimitiveChange = (path, type, raw) => {
    if (type === 'boolean') {
      setPrimitiveAtPath(path, !!raw, 'boolean');
    } else if (type === 'number') {
      if (raw === null || raw === '' || typeof raw === 'undefined') {
        setPrimitiveAtPath(path, '', 'number');
      } else {
        const n = Number(raw);
        if (!Number.isNaN(n)) setPrimitiveAtPath(path, n, 'number');
      }
    } else {
      setPrimitiveAtPath(path, raw, 'string');
    }
    scheduleRefresh();
  };
  const onPrimitiveTypeSwitch = (path, currentNode, newType) => {
    if (!currentNode) return; let raw = currentNode.value; if (typeof raw === 'object') raw = JSON.stringify(raw);
    try {
      setPrimitiveSmartAtPath(path, raw, { explicitType: newType, respectExistingType: false });
      setEditBuffer(prev => { const n = { ...prev }; delete n[path]; return n; });
      refresh();
    } catch { /* ignore */ }
  };
  const toggleExpand = (path) => setExpandedPaths(prev => { const next = new Set(prev); if (next.has(path)) next.delete(path); else next.add(path); return next; });

  const renderPrimitiveEditor = (path, node) => {
    const typeSwitcher = (
      <Select size="small" value={node.type} onChange={(t) => onPrimitiveTypeSwitch(path, node, t)} style={{ width: 90 }} options={['string', 'number', 'boolean'].map(t => ({ label: t, value: t }))} />
    );
    if (node.type === 'boolean') {
      return (
        <Space size={4}>
          {typeSwitcher}
          <Switch checked={!!node.value} onChange={(v) => onPrimitiveChange(path, 'boolean', v)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} size="small" />
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
          <Typography.Text strong style={highlightPath === path ? { outline: `2px solid ${token.colorPrimary}`, outlineOffset: 2, padding: '0 2px', borderRadius: 4 } : {}}>{label}</Typography.Text>
          <Tag color={node.type === 'string' ? 'blue' : node.type === 'number' ? 'green' : node.type === 'boolean' ? 'orange' : node.type === 'object' ? 'purple' : 'magenta'}>{node.type}</Tag>
          {meta.global && <Tag color="gold" icon={<GlobalOutlined />}>G</Tag>}
          {node.meta?.expression && <Tooltip title="Computed"><FunctionOutlined style={{ fontSize: 12, color: '#1677ff' }} /></Tooltip>}
          {node.meta?.expressionError && <Tooltip title={node.meta.expressionError}><WarningOutlined style={{ fontSize: 12, color: '#faad14' }} /></Tooltip>}
          {Array.isArray(node.meta?.watchers) && node.meta.watchers.length > 0 && <Tooltip title={`${node.meta.watchers.length} ${t('userprops.watchers.count')}`}><EyeOutlined style={{ fontSize: 12, color: '#52c41a' }} /></Tooltip>}
          {validationErrors[path] && <Tooltip title={validationErrors[path].join('\n')}><Badge count={validationErrors[path].length} size="small" style={{ background: '#ff4d4f' }} /></Tooltip>}
          {!isContainer && renderPrimitiveEditor(path, node)}
          {!isRoot && (
            <Tooltip title={meta.global ? 'Unset global' : 'Set global'}>
              <Button size="small" icon={meta.global ? <EyeInvisibleOutlined /> : <GlobalOutlined />} onClick={() => { toggleGlobalFlag(path, !meta.global); refresh(); }} />
            </Tooltip>
          )}
          {!isRoot && (
            node.meta?.ref ? (
              <Tooltip title="Unbind from component prop">
                <Button size="small" type="primary" onClick={() => { unbindUserPropPath(path); refresh(); }}>Bound</Button>
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
          {!isRoot && (
            <Tooltip title="Delete">
              <Button danger size="small" icon={<DeleteOutlined />} onClick={() => { deletePath(path); refresh(); }} />
            </Tooltip>
          )}
        </div>
        {!virtual && isContainer && expanded && (
          <div style={{ marginTop: 4 }}>
            {node.type === 'object' && (
              <AddObjectChildRow
                indent={indent}
                onAdd={(k, type, val) => { updateNewChildCache(path, { key: k, type, value: val }); commitAddChild(path); }}
              />
            )}
            {node.type === 'array' && (
              <AddArrayItemRow
                indent={indent}
                onPush={(type, val) => { updateArrayNewItemCache(path, { type, value: val }); commitAddArrayItem(path); }}
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
          <Tooltip title={t('userprops.undo')}><Button size="small" aria-label={t('userprops.undo')} icon={<UndoOutlined />} onClick={() => { undoUserProps(); refresh(); }} /></Tooltip>
          <Tooltip title={t('userprops.redo')}><Button size="small" aria-label={t('userprops.redo')} icon={<RedoOutlined />} onClick={() => { redoUserProps(); refresh(); }} /></Tooltip>
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
          <Button size="small" onClick={() => { selectedPaths.forEach(p => { toggleGlobalFlag(p, true); }); refresh(); }}>Set Global</Button>
          <Button size="small" onClick={() => { selectedPaths.forEach(p => { toggleGlobalFlag(p, false); }); refresh(); }}>Unset Global</Button>
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
