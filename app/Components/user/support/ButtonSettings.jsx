'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Modal, 
  Tabs, 
  Input, 
  Select, 
  Switch, 
  Button, 
  Space, 
  Typography, 
  ColorPicker, 
  InputNumber,
  Card,
  Divider,
  AutoComplete,
  Alert,
  Tooltip,
  Row,
  Col,
  Cascader,
  Form,
  Segmented,
  theme
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  SearchOutlined,
  CodeOutlined,
  LinkOutlined,
  ControlOutlined,
  BgColorsOutlined
} from '@ant-design/icons';
import * as AntdIcons from '@ant-design/icons';
import { useEditor } from '@craftjs/core';
import dynamic from 'next/dynamic';
import { getAllComponentsWithProps } from './PropExtractor';
import { useUserProps } from '../../utils/userprops/useUserProps';
import BindSelector from './BindSelector';

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react'),
  { 
    ssr: false,
    loading: () => <div style={{ height: '300px', border: '1px solid #d9d9d9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading editor...</div>
  }
);

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

// Get all available Antd icons
const getAntdIcons = () => {
  return Object.keys(AntdIcons).filter(key => 
    key.endsWith('Outlined') || 
    key.endsWith('Filled') || 
    key.endsWith('TwoTone')
  ).sort();
};

const ButtonSettings = ({ 
  visible, 
  onClose, 
  nodeId, 
  currentProps,
  onPropsChange 
}) => {
  const { query, actions } = useEditor();
  const { listUserPropPaths, getNodeMeta, getUserPropsTree, getGlobalTree, ensureGlobalLoaded, createGlobalPrimitive } = useUserProps();
  const { token } = theme.useToken();
  
  // Helper: choose the correct root tree for Local/Page/Site
  const getScopedRoot = React.useCallback((scopeKey) => {
    try {
      if (!scopeKey) return null;
      if (scopeKey === '__SITE__') return getGlobalTree();
      if (scopeKey === '__PAGE__') return getUserPropsTree('ROOT');
      return getUserPropsTree(scopeKey);
    } catch { return null; }
  }, [getUserPropsTree, getGlobalTree]);

  // Helper: find node at dot path in a user-props style tree
  const findNodeAtPath = React.useCallback((root, path) => {
    if (!root || !path) return null;
    const parts = path.split('.').filter(Boolean);
    let cur = root;
    for (const p of parts) {
      if (!cur) return null;
      if (cur.type === 'object') {
        cur = (cur.children || {})[p];
      } else if (cur.type === 'array') {
        const idx = Number(p);
        const items = cur.items || [];
        cur = Number.isNaN(idx) ? null : items[idx];
      } else {
        return null;
      }
    }
    return cur || null;
  }, []);
  
  // Local state for settings
  const [activeTab, setActiveTab] = useState('appearance');
  const [iconSearch, setIconSearch] = useState('');
  const [availableComponents, setAvailableComponents] = useState([]);
  const [selectedControl, setSelectedControl] = useState(null);
  const [editingControlIndex, setEditingControlIndex] = useState(-1);
  const [controlsLocal, setControlsLocal] = useState(() => currentProps.controls || []);

  // Keep local controls in sync when props change or modal opens
  useEffect(() => {
    setControlsLocal(currentProps.controls || []);
  }, [currentProps.controls, visible]);

  // Get all available components for control targeting
  useEffect(() => {
    if (query) {
      const components = getAllComponentsWithProps(query, nodeId);
      setAvailableComponents(components);
    }
  }, [query, nodeId, visible]);

  // Get filtered icons based on search
  const filteredIcons = useMemo(() => {
    const icons = getAntdIcons();
    if (!iconSearch) return icons.slice(0, 100); // Show first 100 by default
    return icons.filter(icon => 
      icon.toLowerCase().includes(iconSearch.toLowerCase())
    ).slice(0, 50);
  }, [iconSearch]);

  // Update props helper
  // Debounced updates to avoid focus loss on every keystroke
  const debouncedTimers = useRef({});
  const updateProp = (propName, value, opts = { debounce: false }) => {
    const doSet = () => {
      if (onPropsChange) {
        onPropsChange({ [propName]: value });
      } else if (actions) {
        actions.setProp(nodeId, (props) => {
          props[propName] = value;
        });
      }
    };
    if (opts.debounce) {
      clearTimeout(debouncedTimers.current[propName]);
      debouncedTimers.current[propName] = setTimeout(doSet, 250);
    } else {
      doSet();
    }
  };

  // Control management
  const addControl = () => {
    const newControl = {
      id: Date.now().toString(),
      targetComponent: '',
  targetProp: '',
  targetCategory: 'component', // 'component' | 'userProps'
  targetUserNodeId: '', // component id or 'ROOT'
  targetUserPropPath: '',
      trigger: 'click',
      isToggle: false,
      values: [''],
      toggleValues: ['', ''],
      loop: false
    };
    const updatedControls = [...(controlsLocal || []), newControl];
    setControlsLocal(updatedControls);
    updateProp('controls', updatedControls);
    setEditingControlIndex(updatedControls.length - 1);
  };

  const updateControl = (index, field, value) => {
    const updatedControls = [...(controlsLocal || [])];
    updatedControls[index] = { ...updatedControls[index], [field]: value };
    
    // If changing to toggle, ensure we have at least 2 toggle values
    if (field === 'isToggle' && value && updatedControls[index].toggleValues.length < 2) {
      updatedControls[index].toggleValues = ['', ''];
    }
    setControlsLocal(updatedControls);
    updateProp('controls', updatedControls);
  };

  const removeControl = (index) => {
    const updatedControls = (controlsLocal || []).filter((_, i) => i !== index);
    setControlsLocal(updatedControls);
    updateProp('controls', updatedControls);
    if (editingControlIndex === index) {
      setEditingControlIndex(-1);
    }
  };

  // Get properties for selected component
  const getComponentProperties = (componentType) => {
    const component = availableComponents.find(c => c.type === componentType);
    const props = component?.extractedProps || {};
    
    return props;
  };

  // Render property input based on type
  const renderPropertyInput = (control, valueIndex = null) => {
  const category = control.targetCategory || 'component';
  if (category === 'component' && !control.targetComponent) return null;

    let property = null;
    if (category === 'component') {
      if (!control.targetProp) return null;
      const component = availableComponents.find(c => c.id === control.targetComponent);
      if (!component) return null;
      const properties = getComponentProperties(component.type);
      property = properties[control.targetProp];
      if (!property) return null;
    } else if (category === 'userProps') {
      const scopeKey = control.targetUserNodeId || nodeId;
      if (!scopeKey || !control.targetUserPropPath) return null;
      const root = getScopedRoot(scopeKey);
      const n = findNodeAtPath(root, control.targetUserPropPath);
      if (!n) return null;
      const typeMap = { string: 'text', number: 'number', boolean: 'boolean', object: 'object', array: 'array' };
      property = { type: typeMap[n.type] || 'text', label: control.targetUserPropPath };
    }

    const isToggleValue = valueIndex !== null;
    const value = isToggleValue ? 
      control.toggleValues[valueIndex] : 
      control.values[0];

    const onChange = (newValue) => {
      if (isToggleValue) {
        const newToggleValues = [...control.toggleValues];
        newToggleValues[valueIndex] = newValue;
        updateControl(control.index, 'toggleValues', newToggleValues);
      } else {
        updateControl(control.index, 'values', [newValue]);
      }
    };

    switch (property.type) {
      case 'color':
        return (
          <ColorPicker
            value={value}
            onChange={(color) => onChange(color.toHexString())}
            showText
          />
        );
      case 'number':
        return (
          <InputNumber
            value={
              typeof value === 'number'
                ? value
                : (value === '' || value === null || value === undefined
                    ? undefined
                    : (Number.isNaN(Number(value)) ? undefined : Number(value)))
            }
            onChange={(num) => onChange(num)}
            style={{ width: '100%' }}
          />
        );
      case 'select':
        return (
          <Select
            value={value}
            onChange={(v) => onChange(v)}
            style={{ width: '100%' }}
          >
            {property.options.map(option => (
              <Option key={option} value={option}>{option}</Option>
            ))}
          </Select>
        );
      case 'boolean':
        return (
          <Switch
            checked={value === 'true' || value === true}
            onChange={(checked) => onChange(Boolean(checked))}
          />
        );
      case 'array':
        if (property.arrayType === 'slides') {
          return (
            <div>
              <Text strong>Slides (JSON Array)</Text>
              <Input.TextArea
                value={Array.isArray(value) ? JSON.stringify(value, null, 2) : value}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    if (Array.isArray(parsed)) {
                      onChange(parsed);
                    } else {
                      onChange(e.target.value); // Keep as string if not valid array
                    }
                  } catch {
                    onChange(e.target.value); // Keep as string if invalid JSON
                  }
                }}
                rows={4}
                placeholder='[{"type": "image", "src": "url", "alt": "description"}]'
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Enter JSON array of slide objects with type, src, and alt properties
              </Text>
            </div>
          );
        }
        return (
          <Input.TextArea
            value={Array.isArray(value) ? JSON.stringify(value, null, 2) : value}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange(parsed);
              } catch {
                onChange(e.target.value);
              }
            }}
            rows={3}
            placeholder={`Enter ${property.label.toLowerCase()} as JSON array`}
          />
        );
      case 'object':
        if (property.objectType === 'styles') {
          return (
            <div>
              <Text strong>{property.label} (JSON Object)</Text>
              <Input.TextArea
                value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    if (typeof parsed === 'object' && parsed !== null) {
                      onChange(parsed);
                    } else {
                      onChange(e.target.value);
                    }
                  } catch {
                    onChange(e.target.value);
                  }
                }}
                rows={6}
                placeholder='{"objectFit": "cover", "borderRadius": 4}'
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Enter JSON object with style properties
              </Text>
            </div>
          );
        }
        return (
          <Input.TextArea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange(parsed);
              } catch {
                onChange(e.target.value);
              }
            }}
            rows={4}
            placeholder={`Enter ${property.label.toLowerCase()} as JSON object`}
          />
        );
      default:
        return (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${property.label.toLowerCase()}`}
          />
        );
    }
  };

  // Tab content components
  const AppearanceTab = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card title="Text & Icon" size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:8, alignItems:'end' }}>
            <div>
              <Text strong>Button Text</Text>
              <Input
                value={currentProps.text || ''}
                onChange={(e) => updateProp('text', e.target.value, { debounce: true })}
                placeholder="Enter button text"
                style={{ marginTop: 4 }}
              />
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', paddingTop: 22 }}>
              <BindSelector
                nodeId={nodeId}
                variant="toolbar"
                showLabel={false}
                label="Bind Text"
                binding={(() => {
                  const path = currentProps.textBindingPath || '';
                  const scope = currentProps.textBindingScope || 'local';
                  if (!path) return null;
                  return { path, scope };
                })()}
                onChange={(b) => {
                  updateProp('textBindingPath', b?.path || '');
                  updateProp('textBindingScope', b?.scope || 'local');
                }}
              />
            </div>
          </div>

          <div>
            <Space>
              <Switch
                checked={currentProps.showIcon}
                onChange={(value) => updateProp('showIcon', value)}
              />
              <Text strong>Show Icon</Text>
            </Space>
          </div>

          {currentProps.showIcon && (
            <>
              <div>
                <Text strong>Icon Search</Text>
                <Input
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                  placeholder="Search icons..."
                  prefix={<SearchOutlined />}
                  style={{ marginTop: 4 }}
                />
              </div>

              <div>
                <Text strong>Selected Icon: {currentProps.iconName}</Text>
                <div style={{ 
                  maxHeight: '200px', 
                  overflowY: 'auto', 
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  padding: '8px',
                  marginTop: '4px'
                }}>
                  <Row gutter={[8, 8]}>
                    {filteredIcons.map(iconName => {
                      const IconComponent = AntdIcons[iconName];
                      return (
                        <Col span={6} key={iconName}>
                          <Tooltip title={iconName}>
                            <Button
                              size="small"
                              icon={<IconComponent />}
                              onClick={() => updateProp('iconName', iconName)}
                              type={currentProps.iconName === iconName ? 'primary' : 'default'}
                              style={{ width: '100%' }}
                            />
                          </Tooltip>
                        </Col>
                      );
                    })}
                  </Row>
                </div>
              </div>

              <div>
                <Text strong>Icon Position</Text>
                <Select
                  value={currentProps.iconPosition}
                  onChange={(value) => updateProp('iconPosition', value)}
                  style={{ width: '100%', marginTop: 4 }}
                >
                  <Option value="before">Before Text</Option>
                  <Option value="after">After Text</Option>
                </Select>
              </div>
            </>
          )}
        </Space>
      </Card>
    </Space>
  );

  // Build cascader options for user props tree (objects/arrays drill down to primitives)
  const buildCascaderOptions = (root, basePath = '') => {
    if (!root || root.type !== 'object') return [];
    const options = [];
    const entries = Object.entries(root.children || {});
    for (const [key, node] of entries) {
      const path = basePath ? `${basePath}.${key}` : key;
      if (node.type === 'object') {
        options.push({
          value: path,
          label: `${key} (object)`,
          selectable: false,
          children: buildCascaderOptions(node, path)
        });
      } else if (node.type === 'array') {
        const children = (node.items || []).map((child, idx) => {
          const cPath = `${path}.${idx}`;
          if (child.type === 'object') {
            return { value: cPath, label: `[${idx}] (object)`, selectable: false, children: buildCascaderOptions(child, cPath) };
          } else if (child.type === 'array') {
            // Nested arrays: one level preview, deeper handled recursively
            const grand = (child.items || []).map((g, gi) => {
              const gPath = `${cPath}.${gi}`;
              const isLeaf = !['object','array'].includes(g.type);
              return { value: gPath, label: `[${gi}] (${g.type})`, isLeaf, disabled: !isLeaf };
            });
            return { value: cPath, label: `[${idx}] (array)`, selectable: false, children: grand };
          } else {
            return { value: cPath, label: `[${idx}] (${child.type})`, isLeaf: true };
          }
        });
        options.push({ value: path, label: `${key} (array)`, selectable: false, children });
      } else {
        options.push({ value: path, label: `${key} (${node.type})`, isLeaf: true });
      }
    }
    return options;
  };

  const ControlsTab = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card 
        title={<span style={{ fontWeight: 600 }}>Component Controls</span>} 
        size="small"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={addControl}
            size="middle"
          >
            Add Control
          </Button>
        }
        styles={{ body: { padding: 16 } }}
        style={{
          borderRadius: token.borderRadiusLG,
          background: token.colorBgElevated,
          boxShadow: token.boxShadowSecondary,
          border: `1px solid ${token.colorBorderSecondary}`
        }}
      >
    {(!controlsLocal || controlsLocal.length === 0) ? (
          <Text type="secondary">No controls added yet. Click "Add Control" to get started.</Text>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
      {controlsLocal.map((control, index) => (
              <Card
                key={control.id}
                size="small"
                title={<span style={{ fontWeight: 600 }}>{`Control ${index + 1}`}</span>}
                extra={
                  <Button
                    danger
                    size="middle"
                    icon={<DeleteOutlined />}
                    onClick={() => removeControl(index)}
                  />
                }
                style={{ 
                  borderRadius: token.borderRadiusLG,
                  background: token.colorBgContainer,
                  border: `1px solid ${editingControlIndex === index ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
                  boxShadow: token.boxShadowTertiary
                }}
              >
                <Form layout="vertical" size="middle" style={{ width: '100%' }}>
                  {/* 1) What to control */}
                  <Form.Item label={<Text strong>Control Type</Text>}>
                    <div
                      style={{ position: 'relative', zIndex: 3, pointerEvents: 'auto' }}
                      onMouseDown={(e) => { e.stopPropagation(); }}
                      onClick={(e) => { e.stopPropagation(); }}
                      onKeyDown={(e) => { e.stopPropagation(); }}
                    >
                    <Segmented
                      options={[
                        { label: 'Component Props', value: 'component' },
                        { label: 'User Props', value: 'userProps' }
                      ]}
                      value={control.targetCategory || 'component'}
                      onChange={(value) => {
                        try { console.debug('[ButtonSettings] Control Type change', { index, from: control.targetCategory, to: value }); } catch {}
                        const patch = value === 'component'
                          ? { targetCategory: value, targetProp: '', targetUserNodeId: '', targetUserPropPath: '' }
                          : { targetCategory: value, targetProp: '', targetUserNodeId: nodeId, targetUserPropPath: '' };
                        const updated = { ...control, ...patch };
                        const updatedControls = [...(controlsLocal || [])];
                        updatedControls[index] = updated;
                        setControlsLocal(updatedControls);
                        // Defer persist slightly to prevent parent re-render swallowing local state update
                        setTimeout(() => updateProp('controls', updatedControls), 0);
                      }}
                      size="middle"
                      style={{ pointerEvents: 'auto', userSelect: 'none' }}
                      onMouseDown={(e) => { e.stopPropagation(); }}
                      onClick={(e) => { e.stopPropagation(); }}
                      onKeyDown={(e) => { e.stopPropagation(); }}
                    />
                    </div>
                  </Form.Item>

                  {(control.targetCategory || 'component') === 'component' ? (
                    <>
                      <Form.Item label={<Text strong>Target Component</Text>}>
                        <Select
                          value={control.targetComponent}
                          onChange={(value) => updateControl(index, 'targetComponent', value)}
                          placeholder="Select component"
                          style={{ width: '100%' }}
                          options={availableComponents.map(comp => ({ value: comp.id, label: `${comp.name} (${comp.type})` }))}
                        />
                      </Form.Item>
                      <Form.Item label={<Text strong>Property to Control</Text>}>
                        <Select
                          value={control.targetProp}
                          onChange={(value) => updateControl(index, 'targetProp', value)}
                          placeholder="Select property"
                          disabled={!control.targetComponent}
                          style={{ width: '100%' }}
                          options={(() => {
                            if (!control.targetComponent) return [];
                            const component = availableComponents.find(c => c.id === control.targetComponent);
                            if (!component) return [];
                            const properties = getComponentProperties(component.type);
                            return Object.entries(properties).map(([key, prop]) => ({ value: key, label: prop.label }));
                          })()}
                        />
                      </Form.Item>
                    </>
                  ) : (
                    <>
                      <Form.Item label={<Text strong>User Prop Scope</Text>}>
                        <div
                          style={{ position: 'relative', zIndex: 3, pointerEvents: 'auto' }}
                          onMouseDown={(e) => { e.stopPropagation(); }}
                          onClick={(e) => { e.stopPropagation(); }}
                          onKeyDown={(e) => { e.stopPropagation(); }}
                        >
                        <Segmented
                          size="middle"
                          value={(() => {
                            if (control.targetUserNodeId === '__SITE__') return '__SITE__';
                            if (control.targetUserNodeId === '__PAGE__') return '__PAGE__';
                            return '__LOCAL__';
                          })()}
                          onChange={(val) => {
                            if (val === '__LOCAL__') updateControl(index, 'targetUserNodeId', nodeId);
                            else updateControl(index, 'targetUserNodeId', val);
                          }}
                          options={[
                            { label: 'Local', value: '__LOCAL__' },
                            { label: 'Page', value: '__PAGE__' },
                            { label: 'Site', value: '__SITE__' }
                          ]}
                          style={{ pointerEvents: 'auto', userSelect: 'none' }}
                          onMouseDown={(e) => { e.stopPropagation(); }}
                          onClick={(e) => { e.stopPropagation(); }}
                          onKeyDown={(e) => { e.stopPropagation(); }}
                        />
                        </div>
                        {(control.targetUserNodeId) === '__SITE__' && (
                          <div style={{ marginTop: 8 }}>
                            <Button
                              onClick={async () => {
                                try {
                                  const ok = await ensureGlobalLoaded();
                                  if (!ok) return;
                                  const path = window.prompt('Create Site Global at path (e.g. marketing.hero.title):');
                                  if (!path) return;
                                  const type = window.prompt('Type (string|number|boolean):', 'string');
                                  if (!type) return;
                                  let v = '';
                                  if (type === 'string') v = window.prompt('Initial value:', '') ?? '';
                                  else if (type === 'number') v = Number(window.prompt('Initial value (number):', '0') ?? 0);
                                  else if (type === 'boolean') v = (window.prompt('Initial value (true/false):', 'true') ?? 'true') === 'true';
                                  await createGlobalPrimitive(path, type, v);
                                  updateControl(index, 'targetUserPropPath', path);
                                } catch (e) {}
                              }}
                            >New Global</Button>
                          </div>
                        )}
                      </Form.Item>

                      <Form.Item label={<Text strong>User Prop Path</Text>}>
                        {(() => {
                          const scopeKey = control.targetUserNodeId || nodeId;
                          let root = null;
                          if (scopeKey === '__SITE__') {
                            root = getGlobalTree();
                          } else if (scopeKey === '__PAGE__') {
                            root = getUserPropsTree('ROOT');
                          } else if (scopeKey) {
                            root = getUserPropsTree(scopeKey);
                          }
                          const options = root ? buildCascaderOptions(root) : [];
                          return (
                            <Cascader
                              options={options}
                              placeholder="Drill down to a primitive"
                              changeOnSelect={false}
                              onChange={(vals) => {
                                const sel = Array.isArray(vals) && vals.length ? vals.join('.') : '';
                                updateControl(index, 'targetUserPropPath', sel);
                              }}
                              value={control.targetUserPropPath ? control.targetUserPropPath.split('.') : []}
                              showSearch
                              style={{ width: '100%' }}
                            />
                          );
                        })()}
                        {(control.targetUserPropPath && (control.targetUserNodeId || control.targetComponent)) && (
                          (() => {
                            const scopeKey = control.targetUserNodeId || nodeId;
                            const root = getScopedRoot(scopeKey);
                            const n = findNodeAtPath(root, control.targetUserPropPath);
                            return n ? (
                              <div style={{ marginTop: 4 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Type: {n.type}</Text>
                              </div>
                            ) : null;
                          })()
                        )}
                      </Form.Item>
                    </>
                  )}

                  {/* Removed duplicate legacy block for User Prop Path (now handled above) */}

                  <Form.Item label={<Text strong>Trigger</Text>}>
                    <Select
                      value={control.trigger}
                      onChange={(value) => updateControl(index, 'trigger', value)}
                      options={[
                        { value: 'click', label: 'Click' },
                        { value: 'hover', label: 'Hover' },
                        { value: 'focus', label: 'Focus' }
                      ]}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  <Form.Item>
                    <Space>
                      <Switch
                        checked={control.isToggle}
                        onChange={(value) => updateControl(index, 'isToggle', value)}
                      />
                      <Text strong>Toggle Mode</Text>
                    </Space>
                  </Form.Item>

                  {(() => {
                    const isUserProps = (control.targetCategory || 'component') === 'userProps';
                    const hasUserPath = !!control.targetUserPropPath;
                    if (isUserProps && !hasUserPath) {
                      return (
                        <Alert
                          type="info"
                          showIcon
                          message="Select a User Prop Path to configure values"
                          style={{ marginTop: 8 }}
                        />
                      );
                    }
                    return control.isToggle ? (
                      <>
                        <div>
                          <Text strong>Number of Toggle Values</Text>
                          <InputNumber
                            min={2}
                            max={10}
                            value={control.toggleValues.length}
                            onChange={(count) => {
                              const newValues = [...control.toggleValues];
                              while (newValues.length < count) newValues.push('');
                              while (newValues.length > count) newValues.pop();
                              updateControl(index, 'toggleValues', newValues);
                            }}
                            style={{ width: '100%', marginTop: 4 }}
                          />
                        </div>

                        <Space direction="vertical" style={{ width: '100%' }}>
                          {control.toggleValues.map((value, valueIndex) => (
                            <div key={valueIndex}>
                              <Text strong>Value {valueIndex + 1}:</Text>
                              <div style={{ marginTop: 4 }}>
                                {renderPropertyInput({ ...control, index }, valueIndex)}
                              </div>
                            </div>
                          ))}
                        </Space>

                        <div>
                          <Space>
                            <Switch
                              checked={control.loop}
                              onChange={(value) => updateControl(index, 'loop', value)}
                            />
                            <Text strong>Loop back to first value</Text>
                          </Space>
                        </div>
                      </>
                    ) : (
                      <div>
                        <Text strong>Value:</Text>
                        <div style={{ marginTop: 4 }}>
                          {renderPropertyInput({ ...control, index })}
                        </div>
                      </div>
                    );
                  })()}
                </Form>
              </Card>
            ))}
          </Space>
        )}
      </Card>
    </Space>
  );

  const NavigationTab = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card title="Navigation Settings" size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>Navigation Type</Text>
            <Select
              value={currentProps.navigationType}
              onChange={(value) => updateProp('navigationType', value)}
              style={{ width: '100%', marginTop: 4 }}
            >
              <Option value="none">None</Option>
              <Option value="external">External URL</Option>
              <Option value="internal">Internal Page</Option>
              <Option value="scroll">Scroll to Element</Option>
            </Select>
          </div>

          {currentProps.navigationType === 'external' && (
            <div>
              <Text strong>External URL</Text>
              <Input
                value={currentProps.navigationUrl}
                onChange={(e) => updateProp('navigationUrl', e.target.value, { debounce: true })}
                placeholder="https://example.com"
                style={{ marginTop: 4 }}
              />
            </div>
          )}

          {currentProps.navigationType === 'internal' && (
            <div>
              <Text strong>Internal Page Path</Text>
              <Input
                value={currentProps.navigationPage}
                onChange={(e) => updateProp('navigationPage', e.target.value, { debounce: true })}
                placeholder="/about"
                style={{ marginTop: 4 }}
              />
            </div>
          )}

          {currentProps.navigationType === 'scroll' && (
            <div>
              <Text strong>Element ID to Scroll To</Text>
              <Input
                value={currentProps.scrollTarget}
                onChange={(e) => updateProp('scrollTarget', e.target.value, { debounce: true })}
                placeholder="section-id"
                style={{ marginTop: 4 }}
              />
            </div>
          )}

          {(currentProps.navigationType === 'external' || currentProps.navigationType === 'internal') && (
            <div>
              <Space>
                <Switch
                  checked={currentProps.openInNewTab}
                  onChange={(value) => updateProp('openInNewTab', value)}
                />
                <Text strong>Open in new tab</Text>
              </Space>
            </div>
          )}
        </Space>
      </Card>
    </Space>
  );

  const ScriptTab = () => {
    const [useSimpleEditor, setUseSimpleEditor] = useState(false);
    
    return (
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card title="Custom Script" size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="secondary">
              Write custom JavaScript code that will execute when the button is clicked.
              Available variables: element (button DOM element), nodeId, actions (Craft.js actions), query (Craft.js query)
            </Text>
            
            {!useSimpleEditor ? (
              <div style={{ border: '1px solid #d9d9d9', borderRadius: '6px', overflow: 'hidden' }}>
                <MonacoEditor
                  height="300px"
                  language="javascript"
                  value={currentProps.customScript || ''}
                  onChange={(value) => updateProp('customScript', value || '')}
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollbar: {
                      alwaysConsumeMouseWheel: false
                    },
                    automaticLayout: true
                  }}
                  theme="vs"
                  onMount={() => setUseSimpleEditor(false)}
                  onError={() => setUseSimpleEditor(true)}
                />
              </div>
            ) : (
              <TextArea
                value={currentProps.customScript || ''}
                onChange={(e) => updateProp('customScript', e.target.value)}
                placeholder="// Write your JavaScript code here..."
                rows={10}
                style={{ fontFamily: 'monospace', fontSize: '14px' }}
              />
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Example: console.log('Button clicked!', element, nodeId);
              </Text>
              <Button 
                size="small" 
                type="link"
                onClick={() => setUseSimpleEditor(!useSimpleEditor)}
              >
                {useSimpleEditor ? 'Use Advanced Editor' : 'Use Simple Editor'}
              </Button>
            </div>
          </Space>
        </Card>
      </Space>
    );
  };


  const tabItems = [
    {
      key: 'appearance',
      label: (
        <Space>
          <BgColorsOutlined />
          Appearance
        </Space>
      ),
      children: <AppearanceTab />
    },
    {
      key: 'controls',
      label: (
        <Space>
          <ControlOutlined />
          Controls
        </Space>
      ),
      children: <ControlsTab />
    },
    {
      key: 'navigation',
      label: (
        <Space>
          <LinkOutlined />
          Navigation
        </Space>
      ),
      children: <NavigationTab />
    },
    {
      key: 'script',
      label: (
        <Space>
          <CodeOutlined />
          Custom Script
        </Space>
      ),
      children: <ScriptTab />
  }
  ];

  return (
    <Modal
      title="Button Settings"
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="ok" type="primary" onClick={onClose}>
          OK
        </Button>
      ]}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ minHeight: '500px' }}
      />
    </Modal>
  );
};

export default ButtonSettings;
