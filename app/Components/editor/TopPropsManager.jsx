'use client';

import React from 'react';
import { Tabs, Button, Input, Tag, Modal, Space, Tooltip, Select, Switch, Empty, Dropdown, Typography, theme, message } from 'antd';
import { GlobalOutlined, NodeIndexOutlined, ApartmentOutlined, AppstoreOutlined, ReloadOutlined, ThunderboltOutlined, ExpandOutlined, CompressOutlined, PlusOutlined, DeleteOutlined, FunctionOutlined, WarningOutlined } from '@ant-design/icons';
import { useEditor } from '@craftjs/core';
import { useUserProps } from '../utils/userprops/useUserProps';

/**
 * TopPropsManager
 * A wrapper modal providing three tabs:
 * - Component: shows the selected component's user props manager
 * - Page Globals: shows ROOT local (page) props
 * - Site Globals: shows global store props
 */
export default function TopPropsManager({ open, onClose }) {
  const { actions, query } = useEditor();
  const { selectedNodeId } = useEditor((state) => ({
    selectedNodeId: state.events.selected && state.events.selected.size > 0
      ? Array.from(state.events.selected)[0]
      : null
  }));

  // Build list of components that have user props (tree) with at least one child
  const componentsWithProps = React.useMemo(() => {
    try {
      const nodes = query.getNodes() || {};
      const items = Object.values(nodes).map(n => {
        const props = n.data?.props || {};
        const tree = props.userPropsTree;
        const hasAny = tree && tree.type === 'object' && tree.children && Object.keys(tree.children).length > 0;
        if (!hasAny) return null;
        const customDisplay = n.data?.custom?.displayName;
        const label = (typeof customDisplay === 'string' && customDisplay.trim()) ? customDisplay
          : props.label || props.name || props.title || n.data?.displayName || n.data?.name || 'Component';
        const count = Object.keys(tree.children || {}).length;
        // compute quick badges: alias count, global count, rw count
        let aliasCount = 0, globalCount = 0, rwCount = 0;
        const walk = (node) => {
          if (!node) return;
          const meta = node.meta || {};
          if (meta.aliasGlobalId) aliasCount++;
          if (meta.global) globalCount++;
          if (meta.access === 'rw') rwCount++;
          if (node.type === 'object') Object.values(node.children || {}).forEach(walk);
          else if (node.type === 'array') (node.items || []).forEach(walk);
        };
        try { walk(tree); } catch {/* ignore */}
        return { id: n.id, label: String(label), typeName: n.data?.displayName || n.data?.name || 'Component', count, aliasCount, globalCount, rwCount };
      }).filter(Boolean);
      // Sort by label
      items.sort((a,b)=> a.label.localeCompare(b.label));
      return items;
    } catch { return []; }
  }, [query, open]);

  const [selectedComponentId, setSelectedComponentId] = React.useState(null);
  const [filter, setFilter] = React.useState('');
  // Remove managerOpen/modal logic

  React.useEffect(() => {
    // Auto-select current node when opening or when selection changes
    const exists = componentsWithProps.some(it => it.id === selectedNodeId);
    if (exists) setSelectedComponentId(selectedNodeId);
    else if (componentsWithProps.length) setSelectedComponentId(componentsWithProps[0].id);
  }, [open, selectedNodeId, componentsWithProps]);

  const filtered = React.useMemo(() => {
    if (!filter) return componentsWithProps;
    const q = filter.toLowerCase();
    return componentsWithProps.filter(it => it.label.toLowerCase().includes(q) || (it.typeName || '').toLowerCase().includes(q));
  }, [componentsWithProps, filter]);

  const items = [
    {
      key: 'component',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <NodeIndexOutlined /> Component
        </span>
      ),
      children: (
        <div style={{ paddingTop: 8, display: 'grid', gridTemplateColumns: '280px 1fr', gap: 12, minHeight: 420 }}>
          {/* Left: components list */}
          <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 8 }}>
            <Input size="small" allowClear placeholder="Search components…" value={filter} onChange={(e)=>setFilter(e.target.value)} style={{ marginBottom: 8 }} />
            <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filtered.map(it => {
                const isSel = it.id === selectedComponentId;
                const isCurrent = it.id === selectedNodeId;
                return (
                  <Button key={it.id} size="small" type={isSel ? 'primary' : 'default'} onClick={()=>setSelectedComponentId(it.id)} style={{ justifyContent:'flex-start' }} block>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                      <AppstoreOutlined />
                      <span style={{ fontWeight: 600 }}>{it.label}</span>
                      <Tag style={{ marginLeft: 'auto' }}>{it.count}</Tag>
                      {it.globalCount > 0 && <Tag color="gold" title="Global props">G:{it.globalCount}</Tag>}
                      {it.aliasCount > 0 && <Tag color="geekblue" title="Aliases">A:{it.aliasCount}</Tag>}
                      {it.rwCount > 0 && <Tag color="green" title="Read/Write props">RW:{it.rwCount}</Tag>}
                      {isCurrent && <Tag color="blue" style={{ margin:0 }}>Selected</Tag>}
                    </span>
                  </Button>
                );
              })}
              {filtered.length === 0 && <div style={{ color:'#999', fontSize:12, padding: 8 }}>No components with user props</div>}
            </div>
          </div>
          {/* Right: compact tree distinct from style menu manager */}
          <div style={{ border: '1px solid #e5e5e5', borderRadius: 6, padding: 12, background:'#fff', minHeight: 420 }}>
            {selectedComponentId ? (
              <CompactPropsTree nodeId={selectedComponentId} viewerNodeId={selectedNodeId} />
            ) : (
              <div style={{ color:'#999', fontSize:12 }}>Select a component to view its props</div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'page',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ApartmentOutlined /> Page Globals
        </span>
      ),
      children: (
        <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'row', gap: 12, minHeight: 420 }}>
          <div style={{ flex: 1, border: '1px solid #e5e5e5', borderRadius: 6, padding: 12, background:'#fff', minHeight: 420 }}>
            <CompactPropsTree nodeId={'ROOT'} forceLocalRoot />
          </div>
        </div>
      )
    },
    {
      key: 'site',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <GlobalOutlined /> Site Globals
        </span>
      ),
      children: (
        <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'row', gap: 12, minHeight: 420 }}>
          <div style={{ flex: 1, border: '1px solid #e5e5e5', borderRadius: 6, padding: 12, background:'#fff', minHeight: 420 }}>
            <CompactPropsTree nodeId={'ROOT'} />
          </div>
        </div>
      )
    }
  ];

  if (!open) return null;
  return (
    <Modal
      title="Props Manager"
      open={open}
      onCancel={onClose}
      footer={null}
      width={980}
      bodyStyle={{ paddingTop: 8, paddingBottom: 8 }}
    >
      <Tabs defaultActiveKey="component" items={items} />
    </Modal>
  );
}

// --- Compact Props Tree (distinct layout) ---
function CompactPropsTree({ nodeId, forceLocalRoot = false, viewerNodeId = null }) {
  const { token } = theme.useToken();
  const hook = useUserProps(nodeId);
  const {
    getUserPropsTree,
    getGlobalTree,
  globalVersion,
    addObjectChild,
    pushArrayItem,
    setPrimitiveAtPath,
    setPrimitiveSmartAtPath,
    deletePath,
    toggleGlobalFlag,
    getNodeMeta,
    bindUserPropToProp,
    unbindUserPropPath,
    syncBoundUserProps,
    promoteLocalToGlobal,
    ensureGlobalLoaded,
    detachAlias,
    createGlobalPrimitive,
  createAliasToGlobalPath,
  syncAliasesNow,
    renameGlobalPath,
    deleteGlobalPath,
    evaluateAll,
    getGlobalValue,
  } = hook;
  const isGlobal = nodeId === 'ROOT' && !forceLocalRoot;
  // Access globalVersion so this component re-renders on remote global updates
  // eslint-disable-next-line no-unused-expressions
  globalVersion;
  const tree = isGlobal ? getGlobalTree() : getUserPropsTree(nodeId);

  // When viewing Site Globals, proactively ensure the global store is loaded
  const [globalReady, setGlobalReady] = React.useState(!isGlobal);
  React.useEffect(() => {
    let mounted = true;
    if (isGlobal) {
      (async () => {
        try {
          const ok = await ensureGlobalLoaded();
          if (mounted) setGlobalReady(!!ok);
          // trigger a refresh so tree re-computes after load
          refresh();
        } catch {
          if (mounted) setGlobalReady(false);
        }
      })();
    } else {
      setGlobalReady(true);
    }
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGlobal]);

  const [expanded, setExpanded] = React.useState(new Set(['']));
  const [filterMode, setFilterMode] = React.useState('all'); // all|hideGlobal|globalOnly
  const [adding, setAdding] = React.useState({}); // per-path add rows
  const refreshKey = React.useReducer(x=>x+1,0)[1];
  const refresh = () => refreshKey();

  const isHiddenByFilter = (path) => {
    if (filterMode === 'all') return false;
    const meta = getNodeMeta(path);
    const g = !!(meta && meta.meta && meta.meta.global);
    if (filterMode === 'hideGlobal') return g;
    if (filterMode === 'globalOnly') return !g;
    return false;
  };

  const toggle = (p) => setExpanded(prev => { const n = new Set(prev); if (n.has(p)) n.delete(p); else n.add(p); return n; });
  const expandAll = () => {
    const all = new Set();
    const walk = (n, p) => { all.add(p); if (!n) return; if (n.type === 'object') Object.entries(n.children||{}).forEach(([k,c])=> walk(c, p? p+'.'+k : k)); else if (n.type === 'array') (n.items||[]).forEach((c,i)=> walk(c, p? p+'.'+i : String(i))); };
    walk(tree, ''); setExpanded(all);
  };
  const collapseAll = () => setExpanded(new Set(['']));

  const typeTagColor = (t) => t==='string'? 'blue' : t==='number'? 'green' : t==='boolean'? 'orange' : t==='object'? 'purple' : 'magenta';

  // Inline add rows for object and array containers
  function ImmediateAddObjectRow({ path, onAdd }) {
    const [keyName, setKeyName] = React.useState('');
    const [type, setType] = React.useState('string');
    const [strVal, setStrVal] = React.useState('');
    const [numVal, setNumVal] = React.useState(0);
    const [boolVal, setBoolVal] = React.useState(false);

    const reset = () => { setKeyName(''); setType('string'); setStrVal(''); setNumVal(0); setBoolVal(false); };
  const doAdd = async () => {
      const k = (keyName || '').trim();
      if (!k) { message.warning('Key is required'); return; }
      let initial;
      if (type === 'string') initial = strVal;
      else if (type === 'number') initial = Number(numVal);
      else if (type === 'boolean') initial = !!boolVal;
      else initial = undefined; // object/array have no initial primitive value
      try {
    const r = onAdd && onAdd(k, type, initial);
        if (r && typeof r.then === 'function') await r;
        reset();
      } catch {
        message.error('Failed to add key');
      }
    };

    return (
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 8px', marginLeft: 16 }}>
        <Input size="small" placeholder="key" value={keyName} onChange={(e)=>setKeyName(e.target.value)} style={{ width: 160 }} />
        <Select
          size="small"
          value={type}
          onChange={(v)=>{ setType(v); }}
          style={{ width: 120 }}
          options={[
            { label:'string', value:'string' },
            { label:'number', value:'number' },
            { label:'boolean', value:'boolean' },
            { label:'object', value:'object' },
            { label:'array', value:'array' }
          ]}
        />
        {type === 'string' && (
          <Input size="small" placeholder="value" value={strVal} onChange={(e)=>setStrVal(e.target.value)} style={{ width: 180 }} />
        )}
        {type === 'number' && (
          <Input size="small" type="number" value={String(numVal)} onChange={(e)=>setNumVal(e.target.value)} style={{ width: 120 }} />
        )}
        {type === 'boolean' && (
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Switch size="small" checked={boolVal} onChange={setBoolVal} />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{boolVal ? 'true' : 'false'}</Typography.Text>
          </div>
        )}
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={doAdd}>Add</Button>
      </div>
    );
  }

  function ImmediateAddArrayRow({ path, onPush }) {
    const [type, setType] = React.useState('string');
    const [strVal, setStrVal] = React.useState('');
    const [numVal, setNumVal] = React.useState(0);
    const [boolVal, setBoolVal] = React.useState(false);

    const reset = () => { setType('string'); setStrVal(''); setNumVal(0); setBoolVal(false); };
    const doPush = async () => {
      let initial;
      if (type === 'string') initial = strVal;
      else if (type === 'number') initial = Number(numVal);
      else if (type === 'boolean') initial = !!boolVal;
      else initial = undefined;
      try {
        const r = onPush && onPush(type, initial);
        if (r && typeof r.then === 'function') await r;
        reset();
      } catch { message.error('Failed to push item'); }
    };

    return (
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 8px', marginLeft: 16 }}>
        <Select
          size="small"
          value={type}
          onChange={(v)=>{ setType(v); }}
          style={{ width: 120 }}
          options={[
            { label:'string', value:'string' },
            { label:'number', value:'number' },
            { label:'boolean', value:'boolean' },
            { label:'object', value:'object' },
            { label:'array', value:'array' }
          ]}
        />
        {type === 'string' && (
          <Input size="small" placeholder="value" value={strVal} onChange={(e)=>setStrVal(e.target.value)} style={{ width: 180 }} />
        )}
        {type === 'number' && (
          <Input size="small" type="number" value={String(numVal)} onChange={(e)=>setNumVal(e.target.value)} style={{ width: 120 }} />
        )}
        {type === 'boolean' && (
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Switch size="small" checked={boolVal} onChange={setBoolVal} />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{boolVal ? 'true' : 'false'}</Typography.Text>
          </div>
        )}
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={doPush}>Push</Button>
      </div>
    );
  }

  const PrimitiveEditor = ({ path, node }) => {
    const [text, setText] = React.useState(node.type==='string' ? (node.value ?? '') : String(node.value ?? ''));
    React.useEffect(()=>{ setText(node.type==='string' ? (node.value ?? '') : String(node.value ?? '')); }, [node.value, node.type]);
    if (node.type === 'boolean') return (
      <Switch size="small" checked={!!node.value} onChange={async (v)=>{ if(isGlobal) { const r=createGlobalPrimitive(path,'boolean',!!v); if (r && typeof r.then === 'function') await r; } else { const r=setPrimitiveAtPath(path, !!v, 'boolean'); if (r && typeof r.then === 'function') await r; } refresh(); }} />
    );
    if (node.type === 'number') return (
      <Input size="small" type="number" value={text} onChange={(e)=>setText(e.target.value)} onBlur={async ()=>{ const n=Number(text); if(!Number.isNaN(n)) { if(isGlobal) { const r=createGlobalPrimitive(path,'number',n); if (r && typeof r.then === 'function') await r; } else { const r=setPrimitiveAtPath(path,n,'number'); if (r && typeof r.then === 'function') await r; } refresh(); } }} style={{ width: 120 }} />
    );
    return (
  <Input size="small" value={text} onChange={(e)=>setText(e.target.value)} onBlur={async ()=>{ if(isGlobal) { const r=createGlobalPrimitive(path,'string',text); if (r && typeof r.then === 'function') await r; } else { const r=setPrimitiveAtPath(path,text,'string'); if (r && typeof r.then === 'function') await r; } refresh(); }} style={{ minWidth: 160, maxWidth: 260 }} />
    );
  };

  const BindMenu = ({ path }) => {
    const { query } = useEditor();
    const items = React.useMemo(()=>{
      try {
        const all = query.getNodes() || {};
        const entries = Object.values(all).map(n=>{
          const props = n.data?.props || {};
          const keys = Object.keys(props).filter(k => ['string','number','boolean'].includes(typeof props[k]));
          const label = n.data?.custom?.displayName || n.data?.displayName || n.data?.name || 'Component';
          return { id:n.id, label, keys, props };
        }).filter(e=>e.keys.length>0).sort((a,b)=>a.label.localeCompare(b.label));
        if (!entries.length) return [{ key:'empty', label:'No bindable props', disabled:true }];
        return entries.map(e=>({ key:'grp::'+e.id, label:(<span><AppstoreOutlined /> {e.label}</span>), children: e.keys.map(k=>({ key:`bind::${e.id}::${k}`, label:(<span style={{ display:'flex', justifyContent:'space-between', gap:8 }}><span>{k}</span><Tag style={{margin:0}}>{typeof e.props[k]}</Tag></span>) })) }));
      } catch { return [{ key:'empty', label:'No bindable props', disabled:true }]; }
  },[query]);
    const onClick = async ({ key }) => {
      if (!key.startsWith('bind::')) return;
      const [, id, prop] = key.split('::');
      try { const r1 = bindUserPropToProp(path, id, prop); if (r1 && typeof r1.then === 'function') await r1; const r2 = syncBoundUserProps(); if (r2 && typeof r2.then === 'function') await r2; message.success('Bound'); refresh(); } catch { message.error('Bind failed'); }
    };
    return (
      <Dropdown trigger={["click"]} menu={{ items, onClick }} getPopupContainer={() => document.body}>
        <Button size="small">Bind</Button>
      </Dropdown>
    );
  };

  const Row = ({ node, path, depth }) => {
    if (!node) return null;
    const isRoot = path === '';
  const label = isRoot ? 'root' : path.split('.').pop();
    if (!isRoot && isHiddenByFilter(path)) return null;
    const isContainer = node.type==='object' || node.type==='array';
    const open = expanded.has(path);
  const meta = getNodeMeta(path) || {};
    const isAlias = !!(meta.meta?.aliasGlobalId || meta.meta?.aliasGlobalPath);
    // For alias nodes, fetch live global value for display (read-only hint)
    const aliasPath = meta.meta?.aliasGlobalPath;
    const liveAliasValue = (!isContainer && aliasPath) ? getGlobalValue(aliasPath) : undefined;
    return (
      <div style={{ marginBottom: 6 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px', background: isRoot?'transparent':'#fafafa', border: isRoot?'none':'1px solid #eee', borderRadius:6, marginLeft: depth*16 }}>
          {isContainer ? <Button size="small" type="text" onClick={()=>toggle(path)} style={{ width: 22 }}>{open?'-':'+'}</Button> : <span style={{ width: 22 }} />}
          <Typography.Text strong style={{ whiteSpace: 'nowrap' }}>{label}</Typography.Text>
          <Tag color={typeTagColor(node.type)} style={{ margin:0 }}>{node.type}</Tag>
          {meta.meta?.global && <Tag color="gold" style={{ margin:0 }} icon={<GlobalOutlined />}>G</Tag>}
          {isAlias && (
            <Tooltip title={`Alias to Site Globals${aliasPath ? `: ${aliasPath}` : ''}. Edit in Site Globals.`}>
              <Tag color="geekblue" style={{ margin:0 }}>Alias</Tag>
            </Tooltip>
          )}
          {meta.meta?.expression && <Tooltip title="Computed"><FunctionOutlined style={{ color:'#1677ff' }} /></Tooltip>}
          {!isContainer && (
            <>
              {isAlias ? (
                node.type === 'boolean' ? (
                  <Switch size="small" checked={!!(liveAliasValue ?? node.value)} disabled />
                ) : (
                  <Input size="small" value={String(liveAliasValue ?? node.value ?? '')} disabled style={{ minWidth: 160, maxWidth: 260 }} />
                )
              ) : (
                <PrimitiveEditor path={path} node={node} />
              )}
              {!meta.meta?.ref && !meta.meta?.aliasGlobalId && <BindMenu path={path} />}
              {meta.meta?.ref && <Button size="small" type="primary" onClick={async ()=>{ const r = unbindUserPropPath(path); if (r && typeof r.then === 'function') await r; refresh(); }}>Bound</Button>}
            </>
          )}
          <span style={{ flex:1 }} />
          {!isRoot && !isGlobal && (
            <Tooltip title="Delete"><Button danger size="small" icon={<DeleteOutlined />} onClick={async ()=>{ const r = deletePath(path); if (r && typeof r.then === 'function') await r; refresh(); }} /></Tooltip>
          )}
          {!isRoot && isGlobal && (
            <Tooltip title="Rename"><Button size="small" onClick={async()=>{ const base = label; const next = window.prompt('Rename key', base); if(!next || next===base) return; try { await renameGlobalPath(path, next); refresh(); } catch { message.error('Rename failed'); } }}>
              Rename
            </Button></Tooltip>
          )}
          {!isRoot && isGlobal && (
            <Tooltip title="Demote (remove from Site Globals)"><Button danger size="small" onClick={async()=>{ const ok = window.confirm(`Demote global ${path}?`); if(!ok) return; try { await deleteGlobalPath(path); refresh(); } catch { message.error('Demote failed'); } }}>Demote</Button></Tooltip>
          )}
          {!isRoot && !meta.meta?.aliasGlobalId && (
            <Tooltip title="Promote to Global"><Button size="small" onClick={async()=>{ const ok = await ensureGlobalLoaded(); if(!ok) { message.warning('Global store unavailable'); return; } try { await promoteLocalToGlobal(path, path); refresh(); } catch { message.error('Promote failed'); } }}>Global</Button></Tooltip>
          )}
          {!isRoot && meta.meta?.aliasGlobalId && (
            <Tooltip title="Detach alias"><Button size="small" onClick={async ()=>{ const r = detachAlias(path); if (r && typeof r.then === 'function') await r; refresh(); }}>Detach</Button></Tooltip>
          )}
        </div>
        {isContainer && open && (
          <div style={{ marginTop: 4 }}>
            {node.type==='object' && (
              <ImmediateAddObjectRow
                path={path}
                onAdd={async (k, type, val) => {
                  const full = path ? `${path}.${k}` : k;
                  try {
                    if (isGlobal) {
                      if (type === 'object' || type === 'array') {
                        // Create locally then promote to global, then clean up local alias
                        await addObjectChild(path, k, type, undefined);
                        await promoteLocalToGlobal(full, full);
                        await deletePath(full);
                      } else {
                        // Primitive: write directly to global store
                        await createGlobalPrimitive(full, type, val);
                      }
                    } else {
                      await addObjectChild(path, k, type, val);
                    }
                  } catch (e) { message.error('Add failed'); }
                  refresh();
                }}
              />
            )}
            {node.type==='array' && (
              <ImmediateAddArrayRow
                path={path}
                onPush={async (type, val) => {
                  try {
                    if (isGlobal) {
                      // Global array push: alias the global array into local, push, promote back, then clean local
                      await createAliasToGlobalPath(path, path);
                      await syncAliasesNow();
                      await pushArrayItem(path, type, val);
                      await promoteLocalToGlobal(path, path);
                      await deletePath(path);
                    } else {
                      await pushArrayItem(path, type, val);
                    }
                  } catch (e) { message.error('Push failed'); }
                  refresh();
                }}
              />
            )}
            {node.type==='object' && Object.entries(node.children||{}).map(([k, c])=> (
              <Row key={k} node={c} path={path? path+'.'+k : k} depth={depth+1} />
            ))}
            {node.type==='array' && (node.items||[]).map((c,i)=> (
              <Row key={i} node={c} path={path? path+'.'+i : String(i)} depth={depth+1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!tree) {
    if (isGlobal && !globalReady) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span>
              Connecting to Site Globals…<br />
              Tip: provide currentUserId/currentSiteId on ROOT, or dev fallback will be used.
            </span>
          }
        />
      );
    }
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No user props" />;
  }
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom: 8 }}>
        <Space size={8} wrap>
          <Select size="small" value={filterMode} onChange={setFilterMode} style={{ width: 140 }} options={[{label:'All', value:'all'}, {label:'Hide Global', value:'hideGlobal'}, {label:'Global Only', value:'globalOnly'}]} />
          <Button size="small" icon={<ReloadOutlined />} onClick={()=>{ syncBoundUserProps(); refresh(); }}>Sync Bound</Button>
          <Button size="small" type="primary" icon={<ThunderboltOutlined />} onClick={()=>{ evaluateAll(); refresh(); }}>Re-evaluate</Button>
        </Space>
        <Space size={8}>
          <Button size="small" icon={<ExpandOutlined />} onClick={expandAll}>Expand all</Button>
          <Button size="small" icon={<CompressOutlined />} onClick={collapseAll}>Collapse all</Button>
        </Space>
      </div>
      <Row node={tree} path="" depth={0} />
    </div>
  );
}
