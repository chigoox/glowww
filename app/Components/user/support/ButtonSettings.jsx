'use client'

import React, { useState, useEffect, useMemo } from 'react';
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
  message,
  Tooltip,
  Row,
  Col
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
  
  // Local state for settings
  const [activeTab, setActiveTab] = useState('appearance');
  const [iconSearch, setIconSearch] = useState('');
  const [availableComponents, setAvailableComponents] = useState([]);
  const [selectedControl, setSelectedControl] = useState(null);
  const [editingControlIndex, setEditingControlIndex] = useState(-1);

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
  const updateProp = (propName, value) => {
    if (onPropsChange) {
      onPropsChange({ [propName]: value });
    } else if (actions) {
      actions.setProp(nodeId, (props) => {
        props[propName] = value;
      });
    }
  };

  // Control management
  const addControl = () => {
    const newControl = {
      id: Date.now().toString(),
      targetComponent: '',
      targetProp: '',
      trigger: 'click',
      isToggle: false,
      values: [''],
      toggleValues: ['', ''],
      loop: false
    };
    
    const updatedControls = [...(currentProps.controls || []), newControl];
    updateProp('controls', updatedControls);
    setEditingControlIndex(updatedControls.length - 1);
  };

  const updateControl = (index, field, value) => {
    const updatedControls = [...(currentProps.controls || [])];
    updatedControls[index] = { ...updatedControls[index], [field]: value };
    
    // If changing to toggle, ensure we have at least 2 toggle values
    if (field === 'isToggle' && value && updatedControls[index].toggleValues.length < 2) {
      updatedControls[index].toggleValues = ['', ''];
    }
    
    updateProp('controls', updatedControls);
  };

  const removeControl = (index) => {
    const updatedControls = currentProps.controls.filter((_, i) => i !== index);
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
    if (!control.targetComponent || !control.targetProp) return null;

    const component = availableComponents.find(c => c.id === control.targetComponent);
    if (!component) return null;

    const properties = getComponentProperties(component.type);
    const property = properties[control.targetProp];
    if (!property) return null;

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
            value={parseFloat(value) || 0}
            onChange={onChange}
            style={{ width: '100%' }}
          />
        );
      case 'select':
        return (
          <Select
            value={value}
            onChange={onChange}
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
            onChange={(checked) => onChange(checked)}
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
          <div>
            <Text strong>Button Text</Text>
            <Input
              value={currentProps.text || ''}
              onChange={(e) => updateProp('text', e.target.value)}
              placeholder="Enter button text"
              style={{ marginTop: 4 }}
            />
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

  const ControlsTab = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card 
        title="Component Controls" 
        size="small"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={addControl}
            size="small"
          >
            Add Control
          </Button>
        }
      >
        {(!currentProps.controls || currentProps.controls.length === 0) ? (
          <Text type="secondary">No controls added yet. Click "Add Control" to get started.</Text>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }}>
            {currentProps.controls.map((control, index) => (
              <Card
                key={control.id}
                size="small"
                title={`Control ${index + 1}`}
                extra={
                  <Button
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeControl(index)}
                  />
                }
                style={{ 
                  border: editingControlIndex === index ? '2px solid #1890ff' : undefined 
                }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text strong>Target Component</Text>
                      <Select
                        value={control.targetComponent}
                        onChange={(value) => updateControl(index, 'targetComponent', value)}
                        style={{ width: '100%', marginTop: 4 }}
                        placeholder="Select component"
                      >
                        {availableComponents.map(comp => (
                          <Option key={comp.id} value={comp.id}>
                            {comp.name} ({comp.type})
                          </Option>
                        ))}
                      </Select>
                    </Col>
                    <Col span={12}>
                      <Text strong>Property to Control</Text>
                      <Select
                        value={control.targetProp}
                        onChange={(value) => updateControl(index, 'targetProp', value)}
                        style={{ width: '100%', marginTop: 4 }}
                        placeholder="Select property"
                        disabled={!control.targetComponent}
                      >
                        {control.targetComponent && (() => {
                          const component = availableComponents.find(c => c.id === control.targetComponent);
                          if (component) {
                            const properties = getComponentProperties(component.type);
                            return Object.entries(properties).map(([key, prop]) => (
                              <Option key={key} value={key}>{prop.label}</Option>
                            ));
                          }
                          return [];
                        })()}
                      </Select>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Text strong>Trigger</Text>
                      <Select
                        value={control.trigger}
                        onChange={(value) => updateControl(index, 'trigger', value)}
                        style={{ width: '100%', marginTop: 4 }}
                      >
                        <Option value="click">Click</Option>
                        <Option value="hover">Hover</Option>
                        <Option value="focus">Focus</Option>
                      </Select>
                    </Col>
                    <Col span={12}>
                      <Space style={{ marginTop: 24 }}>
                        <Switch
                          checked={control.isToggle}
                          onChange={(value) => updateControl(index, 'isToggle', value)}
                        />
                        <Text strong>Toggle Mode</Text>
                      </Space>
                    </Col>
                  </Row>

                  {control.isToggle ? (
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
                  )}
                </Space>
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
                onChange={(e) => updateProp('navigationUrl', e.target.value)}
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
                onChange={(e) => updateProp('navigationPage', e.target.value)}
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
                onChange={(e) => updateProp('scrollTarget', e.target.value)}
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
