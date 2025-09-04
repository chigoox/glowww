'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Input, Select, Space, Typography, Divider, Tag, Switch, Tooltip, Alert, Collapse } from 'antd';
import { PlusOutlined, DeleteOutlined, SettingOutlined, GlobalOutlined, EyeOutlined, EyeInvisibleOutlined, ReloadOutlined, FolderAddOutlined } from '@ant-design/icons';
import { useEditor } from '@craftjs/core';
import { useUserProps } from './useUserProps';

const { Title, Text } = Typography;

/**
 * UserPropsManager - Reusable component for managing user-defined properties
 * 
 * Props:
 * - visible: boolean - Whether modal is visible
 * - onClose: function - Called when modal closes
 * - nodeId: string - The node ID to manage props for ('ROOT' for global)
 * - title: string - Modal title (optional)
 */
export const UserPropsManager = ({
  visible,
  onClose,
  nodeId,
  title = "Manage User Properties"
}) => {
  const { query } = useEditor();
  const {
    getUserPropsTree,
    addObjectChild,
    pushArrayItem,
    setPrimitiveAtPath,
    deletePath,
    toggleGlobalFlag,
    getNodeMeta
  } = useUserProps(nodeId);

  const [treeVersion, setTreeVersion] = useState(0); // trigger re-render
  const [showGlobal, setShowGlobal] = useState(true);
  const [filterGlobalOnly, setFilterGlobalOnly] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState(new Set());
  const [newChildCache, setNewChildCache] = useState({}); // key: path -> { key, type, value }
  const [arrayNewItemCache, setArrayNewItemCache] = useState({}); // path -> { type, value }

  const refresh = () => setTreeVersion(v => v + 1);

  const tree = visible ? getUserPropsTree(nodeId) : null;

  // Determine if a node should be hidden by filter
  const isFilteredOut = useCallback((node, path) => {
    if (!filterGlobalOnly && showGlobal) return false;
    const meta = getNodeMeta(path);
    if (!meta) return false;
    if (filterGlobalOnly) return !meta.global;
    if (!showGlobal) return meta.global; // hide globals if showGlobal is false
    return false;
  }, [filterGlobalOnly, showGlobal, getNodeMeta]);

  const updateNewChildCache = (path, patch) => {
    setNewChildCache(prev => ({ ...prev, [path]: { ...(prev[path] || { type: 'string', key: '', value: '' }), ...patch } }));
  };
  const updateArrayNewItemCache = (path, patch) => {
    setArrayNewItemCache(prev => ({ ...prev, [path]: { ...(prev[path] || { type: 'string', value: '' }), ...patch } }));
  };

  const commitAddChild = (parentPath) => {
    const cfg = newChildCache[parentPath] || {};
    if (!cfg.key || !cfg.type) return;
    try {
      addObjectChild(parentPath, cfg.key, cfg.type, cfg.value, cfg.global);
      updateNewChildCache(parentPath, { key: '', value: '' });
      refresh();
    } catch (e) {
      /* eslint-disable no-console */ console.warn('Add child failed', e);
    }
  };

  const commitAddArrayItem = (arrayPath) => {
    const cfg = arrayNewItemCache[arrayPath] || {};
    if (!cfg.type) return;
    try {
      pushArrayItem(arrayPath, cfg.type, cfg.value, cfg.global);
      updateArrayNewItemCache(arrayPath, { value: '' });
      refresh();
    } catch (e) {
      console.warn('Add array item failed', e);
    }
  };

  const onPrimitiveChange = (path, type, raw) => {
    let val = raw;
    if (type === 'number') {
      const n = Number(raw); if (!Number.isNaN(n)) val = n; else return;
    } else if (type === 'boolean') {
      val = !!raw;
    }
    setPrimitiveAtPath(path, val, type);
    refresh();
  };

  const toggleExpand = (path) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  };

  const renderPrimitiveEditor = (path, node) => {
    if (node.type === 'boolean') {
      return <Switch checked={!!node.value} onChange={(v) => onPrimitiveChange(path, 'boolean', v)} size="small" />;
    }
    return (
      <Input
        size="small"
        value={node.value}
        onChange={(e) => onPrimitiveChange(path, node.type, e.target.value)}
        style={{ maxWidth: 180 }}
        placeholder={node.type}
      />
    );
  };

  const NodeBlock = ({ node, path, depth }) => {
    if (!node) return null;
    const isRoot = path === '';
    if (isRoot && node.type !== 'object') return null; // root must be object
    const parts = path.split('.').filter(Boolean);
    const label = isRoot ? 'root' : parts[parts.length - 1];
    const meta = getNodeMeta(path) || { global: false };
    if (!isRoot && isFilteredOut(node, path)) return null;

    const isContainer = node.type === 'object' || node.type === 'array';
    const expanded = expandedPaths.has(path) || isRoot;
    const indent = depth * 16;

    return (
      <div style={{ marginBottom: 6 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 8px',
            background: isRoot ? 'transparent' : '#fafafa',
            border: isRoot ? 'none' : '1px solid #e8e8e8',
            borderRadius: 6,
            marginLeft: indent
          }}
        >
          {isContainer && (
            <Button
              type="text"
              size="small"
              onClick={() => toggleExpand(path)}
              style={{ width: 24 }}
            >
              {expanded ? '-' : '+'}
            </Button>
          )}
          {!isContainer && <span style={{ width: 24 }} />}
          <Typography.Text strong>{label}</Typography.Text>
          <Tag color={node.type === 'string' ? 'blue' : node.type === 'number' ? 'green' : node.type === 'boolean' ? 'orange' : node.type === 'object' ? 'purple' : 'magenta'}>{node.type}</Tag>
          {meta.global && <Tag color="gold" icon={<GlobalOutlined />}>G</Tag>}
          {!isContainer && renderPrimitiveEditor(path, node)}
          {!isRoot && (
            <Tooltip title={meta.global ? 'Unset global' : 'Set global'}>
              <Button
                size="small"
                icon={meta.global ? <EyeInvisibleOutlined /> : <GlobalOutlined />}
                onClick={() => { toggleGlobalFlag(path, !meta.global); refresh(); }}
              />
            </Tooltip>
          )}
          {!isRoot && (
            <Tooltip title="Delete">
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => { deletePath(path); refresh(); }}
              />
            </Tooltip>
          )}
        </div>
        {isContainer && expanded && (
          <div style={{ marginTop: 4 }}>
            {node.type === 'object' && (
              <div style={{ marginLeft: indent + 16, marginBottom: 8 }}>
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    size="small"
                    placeholder="key"
                    style={{ width: '25%' }}
                    value={(newChildCache[path] || {}).key || ''}
                    onChange={(e) => updateNewChildCache(path, { key: e.target.value })}
                  />
                  <Select
                    size="small"
                    style={{ width: 110 }}
                    value={(newChildCache[path] || {}).type || 'string'}
                    onChange={(v) => updateNewChildCache(path, { type: v })}
                    options={['string','number','boolean','object','array'].map(t => ({ label: t, value: t }))}
                  />
                  {['string','number'].includes((newChildCache[path] || {}).type) && (
                    <Input
                      size="small"
                      placeholder="value"
                      value={(newChildCache[path] || {}).value || ''}
                      onChange={(e) => updateNewChildCache(path, { value: e.target.value })}
                    />
                  )}
                  <Tooltip title="Add child">
                    <Button
                      size="small"
                      type="primary"
                      icon={<FolderAddOutlined />}
                      onClick={() => commitAddChild(path)}
                      disabled={!((newChildCache[path] || {}).key)}
                    />
                  </Tooltip>
                </Space.Compact>
              </div>
            )}
            {node.type === 'array' && (
              <div style={{ marginLeft: indent + 16, marginBottom: 8 }}>
                <Space.Compact style={{ width: '100%' }}>
                  <Select
                    size="small"
                    style={{ width: 110 }}
                    value={(arrayNewItemCache[path] || {}).type || 'string'}
                    onChange={(v) => updateArrayNewItemCache(path, { type: v })}
                    options={['string','number','boolean','object','array'].map(t => ({ label: t, value: t }))}
                  />
                  {['string','number'].includes((arrayNewItemCache[path] || {}).type) && (
                    <Input
                      size="small"
                      placeholder="value"
                      value={(arrayNewItemCache[path] || {}).value || ''}
                      onChange={(e) => updateArrayNewItemCache(path, { value: e.target.value })}
                    />
                  )}
                  <Tooltip title="Push item">
                    <Button
                      size="small"
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => commitAddArrayItem(path)}
                    />
                  </Tooltip>
                </Space.Compact>
              </div>
            )}
            {/* Children */}
            {node.type === 'object' && Object.entries(node.children || {}).map(([k, child]) => (
              <NodeBlock key={k} node={child} path={path ? `${path}.${k}` : k} depth={depth + 1} />
            ))}
            {node.type === 'array' && (node.items || []).map((child, idx) => (
              <NodeBlock key={idx} node={child} path={`${path}.${idx}`} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Legacy flat props access retained for backward compatibility (display only)
  const legacyFlat = (() => {
    try {
      if (!nodeId) return {};
      const node = query.node(nodeId).get();
      return node.data.props.userProps || {};
    } catch { return {}; }
  })();

  // Parse value based on type
  const parseValue = (value, type) => {
    try {
      switch (type) {
        case 'string':
          return String(value);
        case 'number':
          return Number(value);
        case 'boolean':
          return Boolean(value);
        case 'object':
          return typeof value === 'string' ? JSON.parse(value) : value;
        case 'array':
          return typeof value === 'string' ? JSON.parse(value) : (Array.isArray(value) ? value : []);
        default:
          return value;
      }
    } catch (error) {
      return value;
    }
  };

  // Add new property
  const addProperty = () => {
    if (!newPropKey.trim()) return;

    const parsedValue = parseValue(newPropValue, newPropType);
    const updatedProps = {
      ...userProps,
      [newPropKey]: {
        value: parsedValue,
        type: newPropType,
        global: nodeId === 'ROOT' // Mark as global if adding to ROOT
      }
    };

    saveUserProps(updatedProps);
    
    // Reset form
    setNewPropKey('');
    setNewPropValue('');
    setNewPropType('string');
  };

  // Update property value
  const updateProperty = (key, newValue, newType = null) => {
    const propData = userProps[key] || {};
    const typeToUse = newType || propData.type || 'string';
    const parsedValue = parseValue(newValue, typeToUse);
    
    const updatedProps = {
      ...userProps,
      [key]: {
        ...propData,
        value: parsedValue,
        type: typeToUse
      }
    };

    saveUserProps(updatedProps);
  };

  // Delete property
  const deleteProperty = (key) => {
    const updatedProps = { ...userProps };
    delete updatedProps[key];
    saveUserProps(updatedProps);
  };

  // Toggle global status for property
  const toggleGlobalStatus = (key) => {
    const propData = userProps[key] || {};
    const updatedProps = {
      ...userProps,
      [key]: {
        ...propData,
        global: !propData.global
      }
    };
    saveUserProps(updatedProps);
  };

  // Render value input based on type
  const renderValueInput = (value, type, onChange) => {
    switch (type) {
      case 'boolean':
        return (
          <Switch 
            checked={Boolean(value)} 
            onChange={onChange}
          />
        );
      case 'number':
        return (
          <Input 
            type="number" 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter number"
          />
        );
      case 'object':
      case 'array':
        return (
          <Input.TextArea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter valid JSON ${type}`}
            rows={3}
          />
        );
      default:
        return (
          <Input 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter value"
          />
        );
    }
  };

  // Get filtered properties to show
  const getFilteredProperties = () => {
    const localProps = Object.entries(userProps);
    const globalProps = nodeId !== 'ROOT' ? Object.entries(getGlobalUserProps()) : [];
    
    let propsToShow = [];
    
    if (globalOnly) {
      // Show only global props
      propsToShow = globalProps.map(([key, data]) => [key, data, true]);
    } else {
      // Show local props
      propsToShow = localProps.map(([key, data]) => [key, data, false]);
      
      // Add global props if enabled
      if (showGlobal && nodeId !== 'ROOT') {
        propsToShow = propsToShow.concat(
          globalProps.map(([key, data]) => [key, data, true])
        );
      }
    }
    
    return propsToShow;
  };

  const isGlobal = nodeId === 'ROOT';

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SettingOutlined />
          <span>{title}</span>
          {isGlobal && <Tag color="gold" icon={<GlobalOutlined />}>Global</Tag>}
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>
      ]}
      styles={{
        body: { maxHeight: '70vh', overflowY: 'auto' }
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        {isGlobal ? (
          <Alert
            message="Global User Properties"
            description="These properties are available across all components in your project."
            type="info"
            icon={<GlobalOutlined />}
            showIcon
            style={{ marginBottom: '16px' }}
          />
        ) : (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Switch
                checked={showGlobal}
                onChange={setShowGlobal}
                size="small"
              />
              <Text>Show Global Props</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Switch
                checked={globalOnly}
                onChange={setGlobalOnly}
                size="small"
              />
              <Text>Global Only</Text>
            </div>
          </div>
        )}

        <Divider orientation="left">Nested User Props Tree</Divider>
        {!tree || !tree.children || Object.keys(tree.children).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#999' }}>
            <Typography.Text type="secondary">No user props yet. Add children to root.</Typography.Text>
            <div style={{ marginTop: 12 }}>
              <Button size="small" icon={<PlusOutlined />} onClick={() => {
                updateNewChildCache('', { key: 'example', type: 'string', value: 'Hello' });
                commitAddChild('');
              }}>Quick Add Example</Button>
            </div>
          </div>
        ) : null}
        {tree && <NodeBlock node={tree} path="" depth={0} />}

        <Collapse style={{ marginTop: 24 }} items={[{
          key: 'legacy',
          label: 'Legacy Flat Map (read-only)',
          children: (
            <pre style={{ maxHeight: 200, overflow: 'auto', background: '#f5f5f5', padding: 12, borderRadius: 6 }}>
              {JSON.stringify(legacyFlat, null, 2)}
            </pre>
          )
        }]} />
      </div>
    </Modal>
  );
};

export default UserPropsManager;
