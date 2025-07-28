
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useEditor } from "@craftjs/core";
import { 
  Collapse, 
  Space, 
  InputNumber, 
  Input,
  Select, 
  ColorPicker, 
  Switch, 
  Slider,
  Button,
  Tooltip,
  Divider,
  Modal 
} from 'antd';

const { TextArea } = Input;
import {
  ColumnWidthOutlined,
  ColumnHeightOutlined,
  BorderOutlined,
  BgColorsOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignMiddleOutlined,
  VerticalAlignBottomOutlined,
  RadiusBottomleftOutlined,
  FontSizeOutlined,
  DragOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ExpandOutlined,
  LinkOutlined,
  DisconnectOutlined,
  SettingOutlined,
  MenuOutlined,
  MoreOutlined,
  StopOutlined,
  ArrowsAltOutlined,
  AppstoreOutlined,
  TableOutlined,
  FileImageOutlined,
  UploadOutlined,
  CodeOutlined
} from '@ant-design/icons';

import MediaLibrary from './support/MediaLibrary';

// Figma-style draggable input component
const DragInput = ({ 
  icon, 
  value, 
  onChange, 
  min = 0, 
  max = 1000, 
  step = 1, 
  suffix = 'px',
  precision = 0,
  style = {},
  tooltip = '',
  disabled = false 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartValue, setDragStartValue] = useState(0);
  const [dragStartX, setDragStartX] = useState(0);
  const iconRef = useRef(null);

  const handleMouseDown = useCallback((e) => {
    if (disabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const currentValue = parseFloat(value) || 0;
    setIsDragging(true);
    setDragStartValue(currentValue);
    setDragStartX(e.clientX);
    
    // Change cursor for the entire document
    document.body.style.cursor = 'col-resize';
    
    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - e.clientX;
      const sensitivity = e.shiftKey ? 0.1 : e.altKey ? 2 : 0.5; // Shift = fine, Alt = coarse
      const delta = deltaX * sensitivity * step;
      const newValue = Math.max(min, Math.min(max, currentValue + delta));
      const finalValue = precision > 0 ? parseFloat(newValue.toFixed(precision)) : Math.round(newValue);
      onChange(finalValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [value, onChange, min, max, step, precision, disabled]);

  const numericValue = parseFloat(value) || 0;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      minWidth: 80,
      padding: '2px 4px',
      borderRadius: 4,
      backgroundColor: isDragging ? '#f0f8ff' : 'transparent',
      border: isDragging ? '1px solid #1890ff' : '1px solid transparent',
      transition: 'all 0.2s ease',
      ...style
    }}>
      <Tooltip title={tooltip || `Drag to change ${suffix ? suffix.replace('px', 'pixels') : 'value'}. Hold Shift for fine control, Alt for coarse control.`}>
        <div
          ref={iconRef}
          onMouseDown={handleMouseDown}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            cursor: isDragging ? 'col-resize' : (disabled ? 'not-allowed' : 'col-resize'),
            color: isDragging ? '#1890ff' : (disabled ? '#d9d9d9' : '#666'),
            backgroundColor: isDragging ? '#e6f7ff' : '#f5f5f5',
            borderRadius: 3,
            transition: 'all 0.2s ease',
            fontSize: 11,
            userSelect: 'none',
            boxShadow: isDragging ? '0 0 0 2px rgba(24, 144, 255, 0.2)' : 'none'
          }}
        >
          {icon}
        </div>
      </Tooltip>
      <InputNumber
        value={numericValue}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        precision={precision}
        size="small"
        disabled={disabled}
        style={{
          width: 60,
          fontSize: 11
        }}
        controls={false}
      />
      {suffix && (
        <span style={{
          fontSize: 10,
          color: '#999',
          minWidth: 16,
          userSelect: 'none',
          fontWeight: 500
        }}>
          {suffix}
        </span>
      )}
    </div>
  );
};

// Figma-style section header
const SectionHeader = ({ icon, title, collapsed, onToggle }) => (
  <div 
    onClick={onToggle}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 8px',
      cursor: 'pointer',
      fontSize: 12,
      fontWeight: 500,
      color: '#333',
      backgroundColor: '#fafafa',
      borderRadius: 4,
      border: '1px solid #f0f0f0',
      userSelect: 'none'
    }}
  >
    {icon}
    <span style={{ flex: 1 }}>{title}</span>
    <span style={{ 
      transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
      transition: 'transform 0.2s ease',
      fontSize: 10
    }}>
      ▼
    </span>
  </div>
);

// Collapsible section wrapper
const Section = ({ icon, title, children, defaultCollapsed = false }) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  
  return (
    <div style={{ marginBottom: 8 }}>
      <SectionHeader 
        icon={icon}
        title={title}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />
      {!collapsed && (
        <div style={{ 
          padding: '8px 12px',
          backgroundColor: '#fcfcfc',
          border: '1px solid #f0f0f0',
          borderTop: 'none',
          borderRadius: '0 0 4px 4px'
        }}>
          {children}
        </div>
      )}
    </div>
  );
};

// Row layout for form items
const Row = ({ children, gap = 8, justify = 'space-between' }) => (
  <div style={{ 
    display: 'flex', 
    gap, 
    justifyContent: justify,
    alignItems: 'center',
    marginBottom: 8 
  }}>
    {children}
  </div>
);

// Label component
const Label = ({ children, style = {} }) => (
  <span style={{ 
    fontSize: 11, 
    color: '#666', 
    fontWeight: 500,
    minWidth: 'fit-content',
    ...style 
  }}>
    {children}
  </span>
);

// Gap Control component
const GapControl = ({ getValue, updateValue }) => {
  const [isLinked, setIsLinked] = useState(true);
  const [showIndividual, setShowIndividual] = useState(false);

  const handleLinkToggle = () => {
    if (!isLinked) {
      // When linking, set both values to the first non-zero value found
      const rowGap = getValue('rowGap') || 0;
      const columnGap = getValue('columnGap') || 0;
      const gapValue = getValue('gap') || rowGap || columnGap || 0;
      updateValue('gap', gapValue);
      updateValue('rowGap', gapValue);
      updateValue('columnGap', gapValue);
    }
    setIsLinked(!isLinked);
  };

  const handleUnifiedChange = (value) => {
    if (isLinked) {
      updateValue('gap', value);
      updateValue('rowGap', value);
      updateValue('columnGap', value);
    }
  };

  return (
    <div style={{ 
      marginBottom: 16,
      padding: 12,
      backgroundColor: '#fafafa',
      borderRadius: 6,
      border: '1px solid #f0f0f0'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: showIndividual ? 8 : 0
      }}>
        <Label style={{ fontSize: 12, fontWeight: 600 }}>Gap</Label>
        <div style={{ display: 'flex', gap: 4 }}>
          <Button
            size="small"
            type={showIndividual ? "primary" : "default"}
            icon={<SettingOutlined />}
            onClick={() => setShowIndividual(!showIndividual)}
            style={{ 
              width: 24, 
              height: 24, 
              padding: 0,
              fontSize: 10
            }}
            title="Toggle individual controls"
          />
          {showIndividual && (
            <Button
              size="small"
              type={isLinked ? "primary" : "default"}
              icon={isLinked ? <LinkOutlined /> : <DisconnectOutlined />}
              onClick={handleLinkToggle}
              style={{ 
                width: 24, 
                height: 24, 
                padding: 0,
                fontSize: 10
              }}
              title={isLinked ? "Unlink gaps" : "Link gaps"}
            />
          )}
        </div>
      </div>

      {!showIndividual ? (
        // Unified control
        <DragInput
          icon={<BorderOutlined />}
          value={getValue('gap')}
          onChange={handleUnifiedChange}
          tooltip="Gap (all directions)"
          style={{ width: '100%' }}
        />
      ) : (
        // Individual controls
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <DragInput
            icon="↕"
            value={getValue('rowGap')}
            onChange={(value) => {
              updateValue('rowGap', value);
              if (isLinked) {
                updateValue('columnGap', value);
                updateValue('gap', value);
              }
            }}
            tooltip="Row Gap (vertical)"
            style={{ fontSize: 10 }}
          />
          <DragInput
            icon="↔"
            value={getValue('columnGap')}
            onChange={(value) => {
              updateValue('columnGap', value);
              if (isLinked) {
                updateValue('rowGap', value);
                updateValue('gap', value);
              }
            }}
            tooltip="Column Gap (horizontal)"
            style={{ fontSize: 10 }}
          />
        </div>
      )}
    </div>
  );
};

// Stroke Color Control component
const StrokeColorControl = ({ getValue, debouncedUpdate, props }) => {
  const [isLinked, setIsLinked] = useState(true);
  const [showIndividual, setShowIndividual] = useState(false);

  const handleLinkToggle = () => {
    if (!isLinked) {
      // When linking, set all values to the first color found
      const currentColor = props.borderTopColor || props.borderRightColor || props.borderBottomColor || props.borderLeftColor || props.borderColor || '#000000';
      debouncedUpdate('borderTopColor', currentColor);
      debouncedUpdate('borderRightColor', currentColor);
      debouncedUpdate('borderBottomColor', currentColor);
      debouncedUpdate('borderLeftColor', currentColor);
    }
    setIsLinked(!isLinked);
  };

  const handleUnifiedChange = (color) => {
    if (isLinked) {
      debouncedUpdate('borderTopColor', color);
      debouncedUpdate('borderRightColor', color);
      debouncedUpdate('borderBottomColor', color);
      debouncedUpdate('borderLeftColor', color);
    }
  };

  const currentColor = props.borderTopColor || props.borderColor || '#000000';

  return (
    <div style={{ 
      marginBottom: 16,
      padding: 12,
      backgroundColor: '#fafafa',
      borderRadius: 6,
      border: '1px solid #f0f0f0'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: showIndividual ? 8 : 0
      }}>
        <Label style={{ fontSize: 12, fontWeight: 600 }}>Stroke Color</Label>
        <div style={{ display: 'flex', gap: 4 }}>
          <Button
            size="small"
            type={showIndividual ? "primary" : "default"}
            icon={<SettingOutlined />}
            onClick={() => setShowIndividual(!showIndividual)}
            style={{ 
              width: 24, 
              height: 24, 
              padding: 0,
              fontSize: 10
            }}
            title="Toggle individual controls"
          />
          {showIndividual && (
            <Button
              size="small"
              type={isLinked ? "primary" : "default"}
              icon={isLinked ? <LinkOutlined /> : <DisconnectOutlined />}
              onClick={handleLinkToggle}
              style={{ 
                width: 24, 
                height: 24, 
                padding: 0,
                fontSize: 10
              }}
              title={isLinked ? "Unlink colors" : "Link colors"}
            />
          )}
        </div>
      </div>

      {!showIndividual ? (
        // Unified control
        <ColorPicker
          value={currentColor}
          onChange={(color) => handleUnifiedChange(color.toHexString())}
          size="small"
          showText
          style={{ width: '100%' }}
        />
      ) : (
        // Individual controls
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Label style={{ fontSize: 10 }}>Top</Label>
            <ColorPicker
              value={props.borderTopColor || props.borderColor || '#000000'}
              onChange={(color) => {
                const colorValue = color.toHexString();
                debouncedUpdate('borderTopColor', colorValue);
                if (isLinked) {
                  debouncedUpdate('borderRightColor', colorValue);
                  debouncedUpdate('borderBottomColor', colorValue);
                  debouncedUpdate('borderLeftColor', colorValue);
                }
              }}
              size="small"
              showText={false}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Label style={{ fontSize: 10 }}>Right</Label>
            <ColorPicker
              value={props.borderRightColor || props.borderColor || '#000000'}
              onChange={(color) => {
                const colorValue = color.toHexString();
                debouncedUpdate('borderRightColor', colorValue);
                if (isLinked) {
                  debouncedUpdate('borderTopColor', colorValue);
                  debouncedUpdate('borderBottomColor', colorValue);
                  debouncedUpdate('borderLeftColor', colorValue);
                }
              }}
              size="small"
              showText={false}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Label style={{ fontSize: 10 }}>Bottom</Label>
            <ColorPicker
              value={props.borderBottomColor || props.borderColor || '#000000'}
              onChange={(color) => {
                const colorValue = color.toHexString();
                debouncedUpdate('borderBottomColor', colorValue);
                if (isLinked) {
                  debouncedUpdate('borderTopColor', colorValue);
                  debouncedUpdate('borderRightColor', colorValue);
                  debouncedUpdate('borderLeftColor', colorValue);
                }
              }}
              size="small"
              showText={false}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Label style={{ fontSize: 10 }}>Left</Label>
            <ColorPicker
              value={props.borderLeftColor || props.borderColor || '#000000'}
              onChange={(color) => {
                const colorValue = color.toHexString();
                debouncedUpdate('borderLeftColor', colorValue);
                if (isLinked) {
                  debouncedUpdate('borderTopColor', colorValue);
                  debouncedUpdate('borderRightColor', colorValue);
                  debouncedUpdate('borderBottomColor', colorValue);
                }
              }}
              size="small"
              showText={false}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Stroke Style Control component
const StrokeStyleControl = ({ debouncedUpdate, props }) => {
  const [isLinked, setIsLinked] = useState(true);
  const [showIndividual, setShowIndividual] = useState(false);

  const handleLinkToggle = () => {
    if (!isLinked) {
      // When linking, set all values to the first style found
      const currentStyle = props.borderTopStyle || props.borderRightStyle || props.borderBottomStyle || props.borderLeftStyle || props.borderStyle || 'solid';
      debouncedUpdate('borderTopStyle', currentStyle);
      debouncedUpdate('borderRightStyle', currentStyle);
      debouncedUpdate('borderBottomStyle', currentStyle);
      debouncedUpdate('borderLeftStyle', currentStyle);
    }
    setIsLinked(!isLinked);
  };

  const handleUnifiedChange = (style) => {
    if (isLinked) {
      debouncedUpdate('borderTopStyle', style);
      debouncedUpdate('borderRightStyle', style);
      debouncedUpdate('borderBottomStyle', style);
      debouncedUpdate('borderLeftStyle', style);
    }
  };

  const currentStyle = props.borderTopStyle || props.borderStyle || 'solid';

  return (
    <div style={{ 
      marginBottom: 16,
      padding: 12,
      backgroundColor: '#fafafa',
      borderRadius: 6,
      border: '1px solid #f0f0f0'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: showIndividual ? 8 : 0
      }}>
        <Label style={{ fontSize: 12, fontWeight: 600 }}>Stroke Style</Label>
        <div style={{ display: 'flex', gap: 4 }}>
          <Button
            size="small"
            type={showIndividual ? "primary" : "default"}
            icon={<SettingOutlined />}
            onClick={() => setShowIndividual(!showIndividual)}
            style={{ 
              width: 24, 
              height: 24, 
              padding: 0,
              fontSize: 10
            }}
            title="Toggle individual controls"
          />
          {showIndividual && (
            <Button
              size="small"
              type={isLinked ? "primary" : "default"}
              icon={isLinked ? <LinkOutlined /> : <DisconnectOutlined />}
              onClick={handleLinkToggle}
              style={{ 
                width: 24, 
                height: 24, 
                padding: 0,
                fontSize: 10
              }}
              title={isLinked ? "Unlink styles" : "Link styles"}
            />
          )}
        </div>
      </div>

      {!showIndividual ? (
        // Unified control
        <Select
          value={currentStyle}
          onChange={handleUnifiedChange}
          size="small"
          style={{ width: '100%' }}
          options={[
            { value: 'none', label: 'None' },
            { value: 'solid', label: 'Solid' },
            { value: 'dashed', label: 'Dashed' },
            { value: 'dotted', label: 'Dotted' },
            { value: 'double', label: 'Double' }
          ]}
        />
      ) : (
        // Individual controls
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Label style={{ fontSize: 10 }}>Top</Label>
            <Select
              value={props.borderTopStyle || props.borderStyle || 'solid'}
              onChange={(value) => {
                debouncedUpdate('borderTopStyle', value);
                if (isLinked) {
                  debouncedUpdate('borderRightStyle', value);
                  debouncedUpdate('borderBottomStyle', value);
                  debouncedUpdate('borderLeftStyle', value);
                }
              }}
              size="small"
              style={{ width: '100%' }}
              options={[
                { value: 'none', label: 'None' },
                { value: 'solid', label: 'Solid' },
                { value: 'dashed', label: 'Dashed' },
                { value: 'dotted', label: 'Dotted' },
                { value: 'double', label: 'Double' }
              ]}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Label style={{ fontSize: 10 }}>Right</Label>
            <Select
              value={props.borderRightStyle || props.borderStyle || 'solid'}
              onChange={(value) => {
                debouncedUpdate('borderRightStyle', value);
                if (isLinked) {
                  debouncedUpdate('borderTopStyle', value);
                  debouncedUpdate('borderBottomStyle', value);
                  debouncedUpdate('borderLeftStyle', value);
                }
              }}
              size="small"
              style={{ width: '100%' }}
              options={[
                { value: 'none', label: 'None' },
                { value: 'solid', label: 'Solid' },
                { value: 'dashed', label: 'Dashed' },
                { value: 'dotted', label: 'Dotted' },
                { value: 'double', label: 'Double' }
              ]}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Label style={{ fontSize: 10 }}>Bottom</Label>
            <Select
              value={props.borderBottomStyle || props.borderStyle || 'solid'}
              onChange={(value) => {
                debouncedUpdate('borderBottomStyle', value);
                if (isLinked) {
                  debouncedUpdate('borderTopStyle', value);
                  debouncedUpdate('borderRightStyle', value);
                  debouncedUpdate('borderLeftStyle', value);
                }
              }}
              size="small"
              style={{ width: '100%' }}
              options={[
                { value: 'none', label: 'None' },
                { value: 'solid', label: 'Solid' },
                { value: 'dashed', label: 'Dashed' },
                { value: 'dotted', label: 'Dotted' },
                { value: 'double', label: 'Double' }
              ]}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Label style={{ fontSize: 10 }}>Left</Label>
            <Select
              value={props.borderLeftStyle || props.borderStyle || 'solid'}
              onChange={(value) => {
                debouncedUpdate('borderLeftStyle', value);
                if (isLinked) {
                  debouncedUpdate('borderTopStyle', value);
                  debouncedUpdate('borderRightStyle', value);
                  debouncedUpdate('borderBottomStyle', value);
                }
              }}
              size="small"
              style={{ width: '100%' }}
              options={[
                { value: 'none', label: 'None' },
                { value: 'solid', label: 'Solid' },
                { value: 'dashed', label: 'Dashed' },
                { value: 'dotted', label: 'Dotted' },
                { value: 'double', label: 'Double' }
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced spacing/border control component with toggle
const SpacingControl = ({ 
  label, 
  topKey, 
  rightKey, 
  bottomKey, 
  leftKey, 
  getValue, 
  updateValue, 
  max = 100, 
  icons = { top: "T", right: "R", bottom: "B", left: "L" } 
}) => {
  const [isLinked, setIsLinked] = useState(true);
  const [showIndividual, setShowIndividual] = useState(false);

  const handleLinkToggle = () => {
    if (!isLinked) {
      // When linking, set all values to the first non-zero value found
      const values = [getValue(topKey), getValue(rightKey), getValue(bottomKey), getValue(leftKey)];
      const firstValue = values.find(v => v > 0) || values[0] || 0;
      updateValue(topKey, firstValue);
      updateValue(rightKey, firstValue);
      updateValue(bottomKey, firstValue);
      updateValue(leftKey, firstValue);
    }
    setIsLinked(!isLinked);
  };

  const handleUnifiedChange = (value) => {
    if (isLinked) {
      updateValue(topKey, value);
      updateValue(rightKey, value);
      updateValue(bottomKey, value);
      updateValue(leftKey, value);
    }
  };

  return (
    <div style={{ 
      marginBottom: 16,
      padding: 12,
      backgroundColor: '#fafafa',
      borderRadius: 6,
      border: '1px solid #f0f0f0'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: showIndividual ? 8 : 0
      }}>
        <Label style={{ fontSize: 12, fontWeight: 600 }}>{label}</Label>
        <div style={{ display: 'flex', gap: 4 }}>
          <Button
            size="small"
            type={showIndividual ? "primary" : "default"}
            icon={<SettingOutlined />}
            onClick={() => setShowIndividual(!showIndividual)}
            style={{ 
              width: 24, 
              height: 24, 
              padding: 0,
              fontSize: 10
            }}
            title="Toggle individual controls"
          />
          {showIndividual && (
            <Button
              size="small"
              type={isLinked ? "primary" : "default"}
              icon={isLinked ? <LinkOutlined /> : <DisconnectOutlined />}
              onClick={handleLinkToggle}
              style={{ 
                width: 24, 
                height: 24, 
                padding: 0,
                fontSize: 10
              }}
              title={isLinked ? "Unlink values" : "Link values"}
            />
          )}
        </div>
      </div>

      {!showIndividual ? (
        // Unified control
        <DragInput
          icon={icons.top}
          value={getValue(topKey)}
          onChange={handleUnifiedChange}
          tooltip={`${label} (all sides)`}
          max={max}
          style={{ width: '100%' }}
        />
      ) : (
        // Individual controls
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <DragInput
            icon={icons.top}
            value={getValue(topKey)}
            onChange={(value) => {
              updateValue(topKey, value);
              if (isLinked) {
                updateValue(rightKey, value);
                updateValue(bottomKey, value);
                updateValue(leftKey, value);
              }
            }}
            tooltip={`${label} Top`}
            max={max}
            style={{ fontSize: 10 }}
          />
          <DragInput
            icon={icons.right}
            value={getValue(rightKey)}
            onChange={(value) => {
              updateValue(rightKey, value);
              if (isLinked) {
                updateValue(topKey, value);
                updateValue(bottomKey, value);
                updateValue(leftKey, value);
              }
            }}
            tooltip={`${label} Right`}
            max={max}
            style={{ fontSize: 10 }}
          />
          <DragInput
            icon={icons.bottom}
            value={getValue(bottomKey)}
            onChange={(value) => {
              updateValue(bottomKey, value);
              if (isLinked) {
                updateValue(topKey, value);
                updateValue(rightKey, value);
                updateValue(leftKey, value);
              }
            }}
            tooltip={`${label} Bottom`}
            max={max}
            style={{ fontSize: 10 }}
          />
          <DragInput
            icon={icons.left}
            value={getValue(leftKey)}
            onChange={(value) => {
              updateValue(leftKey, value);
              if (isLinked) {
                updateValue(topKey, value);
                updateValue(rightKey, value);
                updateValue(bottomKey, value);
              }
            }}
            tooltip={`${label} Left`}
            max={max}
            style={{ fontSize: 10 }}
          />
        </div>
      )}
    </div>
  );
};

export const FigmaStyleMenu = ({ 
  nodeId, 
  onClose 
}) => {
  // Use useEditor to get selected node and actions (like classic StyleMenu)
  const { selected, actions } = useEditor((state) => {
    const [currentNodeId] = state.events.selected;
    const targetNodeId = nodeId || currentNodeId;
    
    let selected;
    if (targetNodeId && state.nodes[targetNodeId]) {
      const node = state.nodes[targetNodeId];
      selected = {
        isMultiple: false,
        id: targetNodeId,
        name: node.data.name,
        displayName: node.data.displayName,
        props: node.data.props,
        isDeletable: node.data.name !== 'ROOT'
      };
    }
    
    return { selected };
  });

  // Get props from selected node
  const props = selected?.props || {};

  // Overflow control state - moved to top level to follow Rules of Hooks
  const [showIndividualOverflow, setShowIndividualOverflow] = useState(false);
  const [isOverflowLinked, setIsOverflowLinked] = useState(true);

  // MediaLibrary state
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  // Script modal state
  const [showScriptModal, setShowScriptModal] = useState(false);

  // Debounced update function using actions.setProp like classic StyleMenu
  const debouncedUpdate = useCallback((key, value) => {
    if (selected?.id) {
      actions.setProp(selected.id, (props) => {
        props[key] = value;
      });
    }
  }, [selected?.id, actions]);

  // Helper to get current value
  const getValue = (key, defaultValue = 0) => {
    const value = props[key];
    if (typeof value === 'string' && value.includes('px')) {
      return parseFloat(value.replace('px', ''));
    }
    return value ?? defaultValue;
  };

  // Helper to update with px suffix for appropriate properties
  const updateValue = (key, value, needsPx = true) => {
    const finalValue = needsPx && typeof value === 'number' ? `${value}px` : value;
    debouncedUpdate(key, finalValue);
  };

  // Overflow control handlers
  const handleOverflowLinkToggle = () => {
    if (!isOverflowLinked) {
      // When linking, set both X and Y to the current overflow value
      const currentOverflow = props.overflow || props.overflowX || props.overflowY || 'visible';
      debouncedUpdate('overflow', currentOverflow);
      debouncedUpdate('overflowX', currentOverflow);
      debouncedUpdate('overflowY', currentOverflow);
    }
    setIsOverflowLinked(!isOverflowLinked);
  };

  const handleUnifiedOverflowChange = (value) => {
    if (isOverflowLinked) {
      debouncedUpdate('overflow', value);
      debouncedUpdate('overflowX', value);
      debouncedUpdate('overflowY', value);
    }
  };

  // Handle media selection from library
  const handleMediaSelect = (item, itemType) => {
    if (itemType === 'image') {
      debouncedUpdate('backgroundImage', `url(${item.url})`);
      setShowMediaLibrary(false);
    }
  };

  // Don't render if no node is selected
  if (!selected) {
    return null;
  }

  return (
    <div style={{
      width: 260,
      backgroundColor: '#fff',
      border: '1px solid #e0e0e0',
      borderRadius: 8,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      fontSize: 12,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      height: '100%',
      border: 'none     ',
      overflow: 'scroll',
      padding: '0px 0px 90px 0px',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>Design</span>
        {onClose && (
          <Button 
            type="text" 
            size="small" 
            onClick={onClose}
            style={{ padding: 0, width: 20, height: 20 }}
          >
            ×
          </Button>
        )}
      </div>

      <div style={{ padding: 12,  }}>
        {/* Basic Properties Section */}
        <Section icon={<BorderOutlined />} title="Basic Properties" defaultCollapsed={false}>
          <Row>
            <Label>Min Width</Label>
            <DragInput
              icon={<ColumnWidthOutlined />}
              value={getValue('minWidth')}
              onChange={(value) => updateValue('minWidth', value)}
              tooltip="Minimum Width"
            />
          </Row>
          <Row>
            <Label>Min Height</Label>
            <DragInput
              icon={<ColumnHeightOutlined />}
              value={getValue('minHeight')}
              onChange={(value) => updateValue('minHeight', value)}
              tooltip="Minimum Height"
            />
          </Row>
          <Row>
            <Label>Max Width</Label>
            <DragInput
              icon={<ColumnWidthOutlined />}
              value={getValue('maxWidth')}
              onChange={(value) => updateValue('maxWidth', value)}
              tooltip="Maximum Width"
            />
          </Row>
          <Row>
            <Label>Max Height</Label>
            <DragInput
              icon={<ColumnHeightOutlined />}
              value={getValue('maxHeight')}
              onChange={(value) => updateValue('maxHeight', value)}
              tooltip="Maximum Height"
            />
          </Row>
          <Row>
            <Label>Box Sizing</Label>
            <Select
              value={props.boxSizing || 'content-box'}
              onChange={(value) => debouncedUpdate('boxSizing', value)}
              size="small"
              style={{ flex: 1 }}
              options={[
                { value: 'content-box', label: 'Content Box' },
                { value: 'border-box', label: 'Border Box' }
              ]}
            />
          </Row>
        </Section>

        {/* Layout Section */}
        <Section icon={<BorderOutlined />} title="Layout">
          <Row>
            <Label>W</Label>
            <DragInput
              icon={<ColumnWidthOutlined />}
              value={getValue('width')}
              onChange={(value) => updateValue('width', value)}
              tooltip="Width"
            />
          </Row>
          <Row>
            <Label>H</Label>
            <DragInput
              icon={<ColumnHeightOutlined />}
              value={getValue('height')}
              onChange={(value) => updateValue('height', value)}
              tooltip="Height"
            />
          </Row>
        </Section>

        {/* Position Section */}
        <Section icon={<DragOutlined />} title="Position">
          <Row>
            <Label style={{ width: 50 }}>Position</Label>
            <Select
              value={props.position || 'static'}
              onChange={(value) => debouncedUpdate('position', value)}
              size="small"
              style={{ flex: 1 }}
              options={[
                { value: 'static', label: 'Static' },
                { value: 'relative', label: 'Relative' },
                { value: 'absolute', label: 'Absolute' },
                { value: 'fixed', label: 'Fixed' },
                { value: 'sticky', label: 'Sticky' }
              ]}
            />
          </Row>
          
          {props.position !== 'static' && (
            <>
              <Row>
                <Label>X</Label>
                <DragInput
                  icon={<ColumnWidthOutlined />}
                  value={getValue('left')}
                  onChange={(value) => updateValue('left', value)}
                  tooltip="Left position"
                  min={-1000}
                />
              </Row>
              <Row>
                <Label>Y</Label>
                <DragInput
                  icon={<ColumnHeightOutlined />}
                  value={getValue('top')}
                  onChange={(value) => updateValue('top', value)}
                  tooltip="Top position"
                  min={-1000}
                />
              </Row>
              <Row>
                <Label>Z</Label>
                <DragInput
                  icon={<DragOutlined />}
                  value={getValue('zIndex')}
                  onChange={(value) => updateValue('zIndex', value)}
                  tooltip="Z-Index (layer order)"
                  min={-1000}
                  max={1000}
                />
              </Row>
            </>
          )}
        </Section>

        {/* Spacing Section */}
        <Section icon={<BorderOutlined />} title="Spacing">
          <SpacingControl
            label="Padding"
            topKey="paddingTop"
            rightKey="paddingRight"
            bottomKey="paddingBottom"
            leftKey="paddingLeft"
            getValue={getValue}
            updateValue={updateValue}
            max={100}
            icons={{ top: "T", right: "R", bottom: "B", left: "L" }}
          />
          
          <SpacingControl
            label="Margin"
            topKey="marginTop"
            rightKey="marginRight"
            bottomKey="marginBottom"
            leftKey="marginLeft"
            getValue={getValue}
            updateValue={updateValue}
            max={100}
            icons={{ top: "T", right: "R", bottom: "B", left: "L" }}
          />
          
          <GapControl
            getValue={getValue}
            updateValue={updateValue}
          />
        </Section>

        {/* Border Radius Section */}
        <Section icon={<RadiusBottomleftOutlined />} title="Corner Radius">
          <SpacingControl
            label="Border Radius"
            topKey="borderTopLeftRadius"
            rightKey="borderTopRightRadius"
            bottomKey="borderBottomRightRadius"
            leftKey="borderBottomLeftRadius"
            getValue={getValue}
            updateValue={updateValue}
            max={100}
            icons={{ top: "↖", right: "↗", bottom: "↘", left: "↙" }}
          />
        </Section>

        {/* Stroke Section */}
        <Section icon={<BorderOutlined />} title="Stroke" defaultCollapsed>
          <SpacingControl
            label="Stroke Width"
            topKey="borderTopWidth"
            rightKey="borderRightWidth"
            bottomKey="borderBottomWidth"
            leftKey="borderLeftWidth"
            getValue={getValue}
            updateValue={updateValue}
            max={20}
            icons={{ top: "T", right: "R", bottom: "B", left: "L" }}
          />

          {/* Stroke Color Controls */}
          <StrokeColorControl
            getValue={getValue}
            debouncedUpdate={debouncedUpdate}
            props={props}
          />

          {/* Stroke Style Controls */}
          <StrokeStyleControl
            debouncedUpdate={debouncedUpdate}
            props={props}
          />


        </Section>

        {/* Fill Section */}
        <Section icon={<BgColorsOutlined />} title="Fill">
          <Row>
            <Label>Background</Label>
            <ColorPicker
              value={props.backgroundColor || 'transparent'}
              onChange={(color) => debouncedUpdate('backgroundColor', color.toHexString())}
              size="small"
              showText
              style={{ flex: 1 }}
            />
          </Row>
          
          <Row>
            <Label>Background Image</Label>
            <div style={{ display: 'flex', gap: 6, flex: 1 }}>
              <Button
                size="small"
                icon={<FileImageOutlined />}
                title="Select from Media Library"
                type={props.backgroundImage ? "default" : "dashed"}
                style={{ 
                  flex: 1,
                  height: 28,
                  fontSize: 11,
                  fontWeight: 500,
                  borderRadius: 4,
                  backgroundColor: props.backgroundImage ? '#f8f9fa' : '#fafbfc',
                  borderColor: props.backgroundImage ? '#d0d7de' : '#1890ff',
                  color: props.backgroundImage ? '#656d76' : '#1890ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setShowMediaLibrary(true)}
              >
                {props.backgroundImage ? 'Change Image' : 'Select Image'}
              </Button>
              {props.backgroundImage && (
                <Button
                  size="small"
                  title="Remove Background Image"
                  danger
                  style={{ 
                    minWidth: 28,
                    height: 28,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: 0
                  }}
                  onClick={() => debouncedUpdate('backgroundImage', '')}
                >
                  ×
                </Button>
              )}
            </div>
          </Row>
          
          {props.backgroundImage && (
            <>
              <Row>
                <Label>Background Size</Label>
                <Select
                  value={props.backgroundSize || 'cover'}
                  onChange={(value) => debouncedUpdate('backgroundSize', value)}
                  size="small"
                  style={{ flex: 1 }}
                  options={[
                    { value: 'auto', label: 'Auto' },
                    { value: 'cover', label: 'Cover' },
                    { value: 'contain', label: 'Contain' },
                    { value: '100% 100%', label: 'Stretch' }
                  ]}
                />
              </Row>
              <Row>
                <Label>Background Position</Label>
                <Select
                  value={props.backgroundPosition || 'center'}
                  onChange={(value) => debouncedUpdate('backgroundPosition', value)}
                  size="small"
                  style={{ flex: 1 }}
                  options={[
                    { value: 'center', label: 'Center' },
                    { value: 'top', label: 'Top' },
                    { value: 'bottom', label: 'Bottom' },
                    { value: 'left', label: 'Left' },
                    { value: 'right', label: 'Right' },
                    { value: 'top left', label: 'Top Left' },
                    { value: 'top right', label: 'Top Right' },
                    { value: 'bottom left', label: 'Bottom Left' },
                    { value: 'bottom right', label: 'Bottom Right' }
                  ]}
                />
              </Row>
              <Row>
                <Label>Background Repeat</Label>
                <Select
                  value={props.backgroundRepeat || 'no-repeat'}
                  onChange={(value) => debouncedUpdate('backgroundRepeat', value)}
                  size="small"
                  style={{ flex: 1 }}
                  options={[
                    { value: 'no-repeat', label: 'No Repeat' },
                    { value: 'repeat', label: 'Repeat' },
                    { value: 'repeat-x', label: 'Repeat X' },
                    { value: 'repeat-y', label: 'Repeat Y' }
                  ]}
                />
              </Row>
              <Row>
                <Label>Background Attachment</Label>
                <Select
                  value={props.backgroundAttachment || 'scroll'}
                  onChange={(value) => debouncedUpdate('backgroundAttachment', value)}
                  size="small"
                  style={{ flex: 1 }}
                  options={[
                    { value: 'scroll', label: 'Scroll' },
                    { value: 'fixed', label: 'Fixed' },
                    { value: 'local', label: 'Local' }
                  ]}
                />
              </Row>
            </>
          )}
        </Section>

        {/* Typography Section */}
        <Section icon={<FontSizeOutlined />} title="Typography" defaultCollapsed>
          <Row>
            <Label>Font Family</Label>
            <Select
              value={props.fontFamily || 'inherit'}
              onChange={(value) => debouncedUpdate('fontFamily', value)}
              size="small"
              style={{ flex: 1 }}
              options={[
                { value: 'inherit', label: 'Default' },
                { value: 'Arial, sans-serif', label: 'Arial' },
                { value: 'Helvetica, sans-serif', label: 'Helvetica' },
                { value: '"Times New Roman", serif', label: 'Times' },
                { value: '"Georgia", serif', label: 'Georgia' },
                { value: '"Courier New", monospace', label: 'Courier' },
                { value: 'system-ui, sans-serif', label: 'System' },
              ]}
            />
          </Row>
          <Row>
            <Label>Size</Label>
            <DragInput
              icon={<FontSizeOutlined />}
              value={getValue('fontSize', 16)}
              onChange={(value) => updateValue('fontSize', value)}
              tooltip="Font Size"
              min={8}
              max={100}
            />
          </Row>
          <Row>
            <Label>Weight</Label>
            <Select
              value={props.fontWeight || '400'}
              onChange={(value) => debouncedUpdate('fontWeight', value)}
              size="small"
              style={{ flex: 1 }}
              options={[
                { value: '100', label: 'Thin' },
                { value: '300', label: 'Light' },
                { value: '400', label: 'Regular' },
                { value: '500', label: 'Medium' },
                { value: '600', label: 'Semi Bold' },
                { value: '700', label: 'Bold' },
                { value: '900', label: 'Black' }
              ]}
            />
          </Row>
          <Row>
            <Label>Line Height</Label>
            <DragInput
              icon="H"
              value={getValue('lineHeight', 1.5)}
              onChange={(value) => debouncedUpdate('lineHeight', value)}
              tooltip="Line Height"
              min={0.5}
              max={3}
              step={0.1}
              precision={1}
              suffix=""
            />
          </Row>
          <Row>
            <Label>Letter Spacing</Label>
            <DragInput
              icon="↔"
              value={getValue('letterSpacing')}
              onChange={(value) => updateValue('letterSpacing', value)}
              tooltip="Letter Spacing"
              min={-5}
              max={10}
              step={0.1}
              precision={1}
            />
          </Row>
          <Row>
            <Label>Color</Label>
            <ColorPicker
              value={props.color || '#000000'}
              onChange={(color) => debouncedUpdate('color', color.toHexString())}
              size="small"
              showText
              style={{ flex: 1 }}
            />
          </Row>
          <Row>
            <Label>Align</Label>
            <Space.Compact>
              <Button 
                size="small" 
                icon={<AlignLeftOutlined />}
                type={props.textAlign === 'left' ? 'primary' : 'default'}
                onClick={() => debouncedUpdate('textAlign', 'left')}
              />
              <Button 
                size="small" 
                icon={<AlignCenterOutlined />}
                type={props.textAlign === 'center' ? 'primary' : 'default'}
                onClick={() => debouncedUpdate('textAlign', 'center')}
              />
              <Button 
                size="small" 
                icon={<AlignRightOutlined />}
                type={props.textAlign === 'right' ? 'primary' : 'default'}
                onClick={() => debouncedUpdate('textAlign', 'right')}
              />
            </Space.Compact>
          </Row>
          <Row>
            <Label>Decoration</Label>
            <Select
              value={props.textDecoration || 'none'}
              onChange={(value) => debouncedUpdate('textDecoration', value)}
              size="small"
              style={{ flex: 1 }}
              options={[
                { value: 'none', label: 'None' },
                { value: 'underline', label: 'Underline' },
                { value: 'line-through', label: 'Strike' },
                { value: 'overline', label: 'Overline' }
              ]}
            />
          </Row>
        </Section>

        {/* Effects Section */}
        <Section icon={<EyeOutlined />} title="Effects" defaultCollapsed>
          <Row>
            <Label>Opacity</Label>
            <DragInput
              icon={<EyeOutlined />}
              value={getValue('opacity', 1) * 100}
              onChange={(value) => debouncedUpdate('opacity', value / 100)}
              tooltip="Opacity"
              min={0}
              max={100}
              step={1}
              precision={0}
              suffix="%"
            />
          </Row>
          
          <div style={{ marginBottom: 12 }}>
            <Label style={{ fontSize: 10, marginBottom: 4, display: 'block' }}>Drop Shadow Presets</Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
              <Button
                size="small"
                style={{ fontSize: 10, height: 24 }}
                onClick={() => debouncedUpdate('boxShadow', '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)')}
              >
                Subtle
              </Button>
              <Button
                size="small"
                style={{ fontSize: 10, height: 24 }}
                onClick={() => debouncedUpdate('boxShadow', '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)')}
              >
                Medium
              </Button>
              <Button
                size="small"
                style={{ fontSize: 10, height: 24 }}
                onClick={() => debouncedUpdate('boxShadow', '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)')}
              >
                Strong
              </Button>
              <Button
                size="small"
                style={{ fontSize: 10, height: 24 }}
                onClick={() => debouncedUpdate('boxShadow', '0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)')}
              >
                Heavy
              </Button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
              <Button
                size="small"
                style={{ fontSize: 10, height: 24 }}
                onClick={() => debouncedUpdate('boxShadow', 'inset 0 1px 3px rgba(0,0,0,0.12)')}
              >
                Inner
              </Button>
              <Button
                size="small"
                style={{ fontSize: 10, height: 24 }}
                onClick={() => debouncedUpdate('boxShadow', '0 0 20px rgba(0,0,0,0.15)')}
              >
                Glow
              </Button>
            </div>
            <Button
              size="small"
              style={{ fontSize: 10, height: 20, width: '100%' }}
              onClick={() => debouncedUpdate('boxShadow', 'none')}
            >
              Remove Shadow
            </Button>
          </div>
          
          <div style={{ marginBottom: 12 }}>
            <Label style={{ fontSize: 10, marginBottom: 4, display: 'block' }}>Blur & Filter Presets</Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 4 }}>
              <Button
                size="small"
                style={{ fontSize: 10, height: 24 }}
                onClick={() => debouncedUpdate('filter', 'blur(2px)')}
              >
                Blur Light
              </Button>
              <Button
                size="small"
                style={{ fontSize: 10, height: 24 }}
                onClick={() => debouncedUpdate('filter', 'blur(5px)')}
              >
                Blur Heavy
              </Button>
              <Button
                size="small"
                style={{ fontSize: 10, height: 24 }}
                onClick={() => debouncedUpdate('filter', 'brightness(1.2) contrast(1.1)')}
              >
                Brighten
              </Button>
              <Button
                size="small"
                style={{ fontSize: 10, height: 24 }}
                onClick={() => debouncedUpdate('filter', 'grayscale(100%)')}
              >
                Grayscale
              </Button>
            </div>
            <Button
              size="small"
              style={{ fontSize: 10, height: 20, width: '100%' }}
              onClick={() => debouncedUpdate('filter', 'none')}
            >
              Remove Filter
            </Button>
          </div>
          
          <Row>
            <Label>Visible</Label>
            <Switch
              checked={props.visibility !== 'hidden'}
              onChange={(checked) => debouncedUpdate('visibility', checked ? 'visible' : 'hidden')}
              size="small"
            />
          </Row>
        </Section>

        {/* Flexbox Section */}
        <Section icon={<BorderOutlined />} title="Flexbox" defaultCollapsed={!(props.display === 'flex' || props.display === 'inline-flex')}>
          {(props.display === 'flex' || props.display === 'inline-flex') ? (
            <>
              <Row>
                <Label>Direction</Label>
                <Select
                  value={props.flexDirection || 'row'}
                  onChange={(value) => debouncedUpdate('flexDirection', value)}
                  size="small"
                  style={{ flex: 1 }}
                  options={[
                    { value: 'row', label: 'Row' },
                    { value: 'column', label: 'Column' },
                    { value: 'row-reverse', label: 'Row Reverse' },
                    { value: 'column-reverse', label: 'Column Reverse' }
                  ]}
                />
              </Row>
              <Row>
                <Label>Justify</Label>
                <Space.Compact>
                  <Button 
                    size="small" 
                    icon={<AlignLeftOutlined />}
                    type={props.justifyContent === 'flex-start' ? 'primary' : 'default'}
                    onClick={() => debouncedUpdate('justifyContent', 'flex-start')}
                  />
                  <Button 
                    size="small" 
                    icon={<AlignCenterOutlined />}
                    type={props.justifyContent === 'center' ? 'primary' : 'default'}
                    onClick={() => debouncedUpdate('justifyContent', 'center')}
                  />
                  <Button 
                    size="small" 
                    icon={<AlignRightOutlined />}
                    type={props.justifyContent === 'flex-end' ? 'primary' : 'default'}
                    onClick={() => debouncedUpdate('justifyContent', 'flex-end')}
                  />
                </Space.Compact>
              </Row>
              <Row>
                <Label>Align</Label>
                <Space.Compact>
                  <Button 
                    size="small" 
                    icon={<VerticalAlignTopOutlined />}
                    type={props.alignItems === 'flex-start' ? 'primary' : 'default'}
                    onClick={() => debouncedUpdate('alignItems', 'flex-start')}
                  />
                  <Button 
                    size="small" 
                    icon={<VerticalAlignMiddleOutlined />}
                    type={props.alignItems === 'center' ? 'primary' : 'default'}
                    onClick={() => debouncedUpdate('alignItems', 'center')}
                  />
                  <Button 
                    size="small" 
                    icon={<VerticalAlignBottomOutlined />}
                    type={props.alignItems === 'flex-end' ? 'primary' : 'default'}
                    onClick={() => debouncedUpdate('alignItems', 'flex-end')}
                  />
                </Space.Compact>
              </Row>
            </>
          ) : (
            <div style={{ padding: '12px 0', color: '#999', fontSize: 11, textAlign: 'center' }}>
              Set display to 'flex' or 'inline-flex' to access flexbox properties
            </div>
          )}
        </Section>

        {/* Transform Section */}
        <Section icon={<DragOutlined />} title="Transform" defaultCollapsed>
          <Row>
            <Label>Scale</Label>
            <DragInput
              icon={<ExpandOutlined />}
              value={getValue('scale', 1)}
              onChange={(value) => debouncedUpdate('scale', value)}
              tooltip="Scale"
              min={0.1}
              max={5}
              step={0.1}
              precision={1}
              suffix=""
            />
          </Row>
          <Row>
            <Label>Rotate</Label>
            <DragInput
              icon={<DragOutlined />}
              value={getValue('rotate')}
              onChange={(value) => updateValue('rotate', value, false)}
              tooltip="Rotation"
              min={-180}
              max={180}
              suffix="°"
            />
          </Row>
        </Section>

        {/* Display Section */}
        <Section icon={<EyeOutlined />} title="Display" defaultCollapsed>
          <Row>
            <Label>Display</Label>
            <Select
              value={props.display || 'block'}
              onChange={(value) => debouncedUpdate('display', value)}
              size="small"
              style={{ flex: 1 }}
              options={[
                { value: 'block', label: 'Block' },
                { value: 'inline', label: 'Inline' },
                { value: 'inline-block', label: 'Inline Block' },
                { value: 'flex', label: 'Flex' },
                { value: 'inline-flex', label: 'Inline Flex' },
                { value: 'grid', label: 'Grid' },
                { value: 'none', label: 'None' }
              ]}
            />
          </Row>
          
          {/* Overflow Control with Toggle */}
          <div style={{ 
            marginBottom: 16,
            padding: 12,
            backgroundColor: '#fafafa',
            borderRadius: 6,
            border: '1px solid #f0f0f0'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: showIndividualOverflow ? 8 : 0
            }}>
              <Label style={{ fontSize: 12, fontWeight: 600 }}>Overflow</Label>
              <div style={{ display: 'flex', gap: 4 }}>
                <Button
                  size="small"
                  type={showIndividualOverflow ? "primary" : "default"}
                  icon={<SettingOutlined />}
                  onClick={() => setShowIndividualOverflow(!showIndividualOverflow)}
                  style={{ 
                    width: 24, 
                    height: 24, 
                    padding: 0,
                    fontSize: 10
                  }}
                  title="Toggle individual controls"
                />
                {showIndividualOverflow && (
                  <Button
                    size="small"
                    type={isOverflowLinked ? "primary" : "default"}
                    icon={isOverflowLinked ? <LinkOutlined /> : <DisconnectOutlined />}
                    onClick={handleOverflowLinkToggle}
                    style={{ 
                      width: 24, 
                      height: 24, 
                      padding: 0,
                      fontSize: 10
                    }}
                    title={isOverflowLinked ? "Unlink overflow" : "Link overflow"}
                  />
                )}
              </div>
            </div>

            {!showIndividualOverflow ? (
              // Unified overflow control
              <Space.Compact style={{ flex: 1, display: 'flex' }}>
                <Button 
                  size="small" 
                  type={props.overflow === 'visible' ? 'primary' : 'default'}
                  onClick={() => handleUnifiedOverflowChange('visible')}
                  icon={<EyeOutlined />}
                  title="Visible"
                  style={{ flex: 1, minWidth: 32, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                />
                <Button 
                  size="small" 
                  type={props.overflow === 'hidden' ? 'primary' : 'default'}
                  onClick={() => handleUnifiedOverflowChange('hidden')}
                  icon={<EyeInvisibleOutlined />}
                  title="Hidden"
                  style={{ flex: 1, minWidth: 32, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                />
                <Button 
                  size="small" 
                  type={props.overflow === 'scroll' ? 'primary' : 'default'}
                  onClick={() => handleUnifiedOverflowChange('scroll')}
                  icon={<MenuOutlined />}
                  title="Scroll"
                  style={{ flex: 1, minWidth: 32, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                />
                <Button 
                  size="small" 
                  type={props.overflow === 'auto' ? 'primary' : 'default'}
                  onClick={() => handleUnifiedOverflowChange('auto')}
                  icon={<MoreOutlined />}
                  title="Auto"
                  style={{ flex: 1, minWidth: 32, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                />
              </Space.Compact>
            ) : (
              // Individual overflow controls
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Label style={{ fontSize: 10 }}>Overflow X</Label>
                  <Space.Compact style={{ flex: 1, display: 'flex' }}>
                    <Button 
                      size="small" 
                      type={props.overflowX === 'visible' ? 'primary' : 'default'}
                      onClick={() => {
                        debouncedUpdate('overflowX', 'visible');
                        if (isOverflowLinked) {
                          debouncedUpdate('overflowY', 'visible');
                          debouncedUpdate('overflow', 'visible');
                        }
                      }}
                      icon={<EyeOutlined />}
                      title="Visible"
                      style={{ flex: 1, minWidth: 26, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    />
                    <Button 
                      size="small" 
                      type={props.overflowX === 'hidden' ? 'primary' : 'default'}
                      onClick={() => {
                        debouncedUpdate('overflowX', 'hidden');
                        if (isOverflowLinked) {
                          debouncedUpdate('overflowY', 'hidden');
                          debouncedUpdate('overflow', 'hidden');
                        }
                      }}
                      icon={<EyeInvisibleOutlined />}
                      title="Hidden"
                      style={{ flex: 1, minWidth: 26, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    />
                    <Button 
                      size="small" 
                      type={props.overflowX === 'scroll' ? 'primary' : 'default'}
                      onClick={() => {
                        debouncedUpdate('overflowX', 'scroll');
                        if (isOverflowLinked) {
                          debouncedUpdate('overflowY', 'scroll');
                          debouncedUpdate('overflow', 'scroll');
                        }
                      }}
                      icon={<MenuOutlined />}
                      title="Scroll"
                      style={{ flex: 1, minWidth: 26, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    />
                    <Button 
                      size="small" 
                      type={props.overflowX === 'auto' ? 'primary' : 'default'}
                      onClick={() => {
                        debouncedUpdate('overflowX', 'auto');
                        if (isOverflowLinked) {
                          debouncedUpdate('overflowY', 'auto');
                          debouncedUpdate('overflow', 'auto');
                        }
                      }}
                      icon={<MoreOutlined />}
                      title="Auto"
                      style={{ flex: 1, minWidth: 26, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    />
                    <Button 
                      size="small" 
                      type={props.overflowX === 'clip' ? 'primary' : 'default'}
                      onClick={() => {
                        debouncedUpdate('overflowX', 'clip');
                        if (isOverflowLinked) {
                          debouncedUpdate('overflowY', 'clip');
                        }
                      }}
                      icon={<StopOutlined />}
                      title="Clip"
                      style={{ flex: 1, minWidth: 26, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    />
                  </Space.Compact>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Label style={{ fontSize: 10 }}>Overflow Y</Label>
                  <Space.Compact style={{ flex: 1, display: 'flex' }}>
                    <Button 
                      size="small" 
                      type={props.overflowY === 'visible' ? 'primary' : 'default'}
                      onClick={() => {
                        debouncedUpdate('overflowY', 'visible');
                        if (isOverflowLinked) {
                          debouncedUpdate('overflowX', 'visible');
                          debouncedUpdate('overflow', 'visible');
                        }
                      }}
                      icon={<EyeOutlined />}
                      title="Visible"
                      style={{ flex: 1, minWidth: 26, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    />
                    <Button 
                      size="small" 
                      type={props.overflowY === 'hidden' ? 'primary' : 'default'}
                      onClick={() => {
                        debouncedUpdate('overflowY', 'hidden');
                        if (isOverflowLinked) {
                          debouncedUpdate('overflowX', 'hidden');
                          debouncedUpdate('overflow', 'hidden');
                        }
                      }}
                      icon={<EyeInvisibleOutlined />}
                      title="Hidden"
                      style={{ flex: 1, minWidth: 26, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    />
                    <Button 
                      size="small" 
                      type={props.overflowY === 'scroll' ? 'primary' : 'default'}
                      onClick={() => {
                        debouncedUpdate('overflowY', 'scroll');
                        if (isOverflowLinked) {
                          debouncedUpdate('overflowX', 'scroll');
                          debouncedUpdate('overflow', 'scroll');
                        }
                      }}
                      icon={<MenuOutlined />}
                      title="Scroll"
                      style={{ flex: 1, minWidth: 26, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    />
                    <Button 
                      size="small" 
                      type={props.overflowY === 'auto' ? 'primary' : 'default'}
                      onClick={() => {
                        debouncedUpdate('overflowY', 'auto');
                        if (isOverflowLinked) {
                          debouncedUpdate('overflowX', 'auto');
                          debouncedUpdate('overflow', 'auto');
                        }
                      }}
                      icon={<MoreOutlined />}
                      title="Auto"
                      style={{ flex: 1, minWidth: 26, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    />
                    <Button 
                      size="small" 
                      type={props.overflowY === 'clip' ? 'primary' : 'default'}
                      onClick={() => {
                        debouncedUpdate('overflowY', 'clip');
                        if (isOverflowLinked) {
                          debouncedUpdate('overflowX', 'clip');
                        }
                      }}
                      icon={<StopOutlined />}
                      title="Clip"
                      style={{ flex: 1, minWidth: 26, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    />
                  </Space.Compact>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Grid Section */}
        <Section icon={<AppstoreOutlined />} title="Grid" defaultCollapsed={props.display !== 'grid'}>
          {props.display === 'grid' ? (
            <>
              <Row>
                <Label>Template Columns</Label>
                <Select
                  value={props.gridTemplateColumns || 'none'}
                  onChange={(value) => debouncedUpdate('gridTemplateColumns', value)}
                  size="small"
                  style={{ flex: 1 }}
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'repeat(2, 1fr)', label: '2 Columns' },
                    { value: 'repeat(3, 1fr)', label: '3 Columns' },
                    { value: 'repeat(4, 1fr)', label: '4 Columns' },
                    { value: '1fr 2fr', label: '1:2 Ratio' },
                    { value: '2fr 1fr', label: '2:1 Ratio' }
                  ]}
                />
              </Row>
              <Row>
                <Label>Template Rows</Label>
                <Select
                  value={props.gridTemplateRows || 'none'}
                  onChange={(value) => debouncedUpdate('gridTemplateRows', value)}
                  size="small"
                  style={{ flex: 1 }}
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'repeat(2, 1fr)', label: '2 Rows' },
                    { value: 'repeat(3, 1fr)', label: '3 Rows' },
                    { value: 'repeat(4, 1fr)', label: '4 Rows' },
                    { value: 'auto 1fr', label: 'Auto + Fill' },
                    { value: '1fr auto', label: 'Fill + Auto' }
                  ]}
                />
              </Row>
              <Row>
                <Label>Grid Gap</Label>
                <DragInput
                  icon={<AppstoreOutlined />}
                  value={getValue('gridGap')}
                  onChange={(value) => updateValue('gridGap', value)}
                  tooltip="Grid Gap"
                  max={50}
                />
              </Row>
              <Row>
                <Label>Column Gap</Label>
                <DragInput
                  icon="↔"
                  value={getValue('gridColumnGap')}
                  onChange={(value) => updateValue('gridColumnGap', value)}
                  tooltip="Grid Column Gap"
                  max={50}
                />
              </Row>
              <Row>
                <Label>Row Gap</Label>
                <DragInput
                  icon="↕"
                  value={getValue('gridRowGap')}
                  onChange={(value) => updateValue('gridRowGap', value)}
                  tooltip="Grid Row Gap"
                  max={50}
                />
              </Row>
              <Row>
                <Label>Justify Items</Label>
                <Select
                  value={props.justifyItems || 'stretch'}
                  onChange={(value) => debouncedUpdate('justifyItems', value)}
                  size="small"
                  style={{ flex: 1 }}
                  options={[
                    { value: 'stretch', label: 'Stretch' },
                    { value: 'start', label: 'Start' },
                    { value: 'center', label: 'Center' },
                    { value: 'end', label: 'End' }
                  ]}
                />
              </Row>
              <Row>
                <Label>Align Items</Label>
                <Select
                  value={props.alignItems || 'stretch'}
                  onChange={(value) => debouncedUpdate('alignItems', value)}
                  size="small"
                  style={{ flex: 1 }}
                  options={[
                    { value: 'stretch', label: 'Stretch' },
                    { value: 'start', label: 'Start' },
                    { value: 'center', label: 'Center' },
                    { value: 'end', label: 'End' }
                  ]}
                />
              </Row>
            </>
          ) : (
            <div style={{ padding: '12px 0', color: '#999', fontSize: 11, textAlign: 'center' }}>
              Set display to 'grid' to access grid properties
            </div>
          )}
        </Section>

        {/* Grid Item Section */}
        <Section icon={<MenuOutlined />} title="Grid Item" defaultCollapsed>
          <Row>
            <Label>Column Span</Label>
            <Select
              value={props.gridColumn || 'auto'}
              onChange={(value) => debouncedUpdate('gridColumn', value)}
              size="small"
              style={{ flex: 1 }}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'span 1', label: 'Span 1' },
                { value: 'span 2', label: 'Span 2' },
                { value: 'span 3', label: 'Span 3' },
                { value: 'span 4', label: 'Span 4' },
                { value: 'span 5', label: 'Span 5' },
                { value: 'span 6', label: 'Span 6' },
                { value: '1 / -1', label: 'Full Width' }
              ]}
            />
          </Row>
          <Row>
            <Label>Row Span</Label>
            <Select
              value={props.gridRow || 'auto'}
              onChange={(value) => debouncedUpdate('gridRow', value)}
              size="small"
              style={{ flex: 1 }}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'span 1', label: 'Span 1' },
                { value: 'span 2', label: 'Span 2' },
                { value: 'span 3', label: 'Span 3' },
                { value: 'span 4', label: 'Span 4' },
                { value: 'span 5', label: 'Span 5' },
                { value: 'span 6', label: 'Span 6' },
                { value: '1 / -1', label: 'Full Height' }
              ]}
            />
          </Row>
          <Row>
            <Label>Column Start</Label>
            <InputNumber
              value={props.gridColumnStart ? parseInt(props.gridColumnStart) : undefined}
              onChange={(value) => debouncedUpdate('gridColumnStart', value ? value.toString() : '')}
              size="small"
              style={{ flex: 1 }}
              min={1}
              max={12}
              placeholder="Auto"
            />
          </Row>
          <Row>
            <Label>Column End</Label>
            <InputNumber
              value={props.gridColumnEnd ? parseInt(props.gridColumnEnd) : undefined}
              onChange={(value) => debouncedUpdate('gridColumnEnd', value ? value.toString() : '')}
              size="small"
              style={{ flex: 1 }}
              min={1}
              max={12}
              placeholder="Auto"
            />
          </Row>
          <Row>
            <Label>Row Start</Label>
            <InputNumber
              value={props.gridRowStart ? parseInt(props.gridRowStart) : undefined}
              onChange={(value) => debouncedUpdate('gridRowStart', value ? value.toString() : '')}
              size="small"
              style={{ flex: 1 }}
              min={1}
              max={12}
              placeholder="Auto"
            />
          </Row>
          <Row>
            <Label>Row End</Label>
            <InputNumber
              value={props.gridRowEnd ? parseInt(props.gridRowEnd) : undefined}
              onChange={(value) => debouncedUpdate('gridRowEnd', value ? value.toString() : '')}
              size="small"
              style={{ flex: 1 }}
              min={1}
              max={12}
              placeholder="Auto"
            />
          </Row>
          <Row>
            <Label>Grid Area</Label>
            <Input
              value={props.gridArea || ''}
              onChange={(e) => debouncedUpdate('gridArea', e.target.value)}
              size="small"
              style={{ flex: 1 }}
              placeholder="e.g. header, 1 / 1 / 2 / 3"
            />
          </Row>
          <Row>
            <Label>Justify Self</Label>
            <Select
              value={props.justifySelf || 'auto'}
              onChange={(value) => debouncedUpdate('justifySelf', value)}
              size="small"
              style={{ flex: 1 }}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'stretch', label: 'Stretch' },
                { value: 'start', label: 'Start' },
                { value: 'center', label: 'Center' },
                { value: 'end', label: 'End' }
              ]}
            />
          </Row>
          <Row>
            <Label>Align Self</Label>
            <Select
              value={props.alignSelf || 'auto'}
              onChange={(value) => debouncedUpdate('alignSelf', value)}
              size="small"
              style={{ flex: 1 }}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'stretch', label: 'Stretch' },
                { value: 'start', label: 'Start' },
                { value: 'center', label: 'Center' },
                { value: 'end', label: 'End' }
              ]}
            />
          </Row>
        </Section>

        {/* Table Styling Section */}
        <Section icon={<TableOutlined />} title="Table Styling" defaultCollapsed>
          <Row>
            <Label>Table Layout</Label>
            <Select
              value={props.tableLayout || 'auto'}
              onChange={(value) => debouncedUpdate('tableLayout', value)}
              size="small"
              style={{ flex: 1 }}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'fixed', label: 'Fixed' }
              ]}
            />
          </Row>
          <Row>
            <Label>Border Collapse</Label>
            <Select
              value={props.borderCollapse || 'separate'}
              onChange={(value) => debouncedUpdate('borderCollapse', value)}
              size="small"
              style={{ flex: 1 }}
              options={[
                { value: 'separate', label: 'Separate' },
                { value: 'collapse', label: 'Collapse' }
              ]}
            />
          </Row>
          <Row>
            <Label>Border Spacing</Label>
            <DragInput
              icon={<TableOutlined />}
              value={getValue('borderSpacing')}
              onChange={(value) => updateValue('borderSpacing', value)}
              tooltip="Border Spacing"
              max={20}
            />
          </Row>
          <Row>
            <Label>Caption Side</Label>
            <Select
              value={props.captionSide || 'top'}
              onChange={(value) => debouncedUpdate('captionSide', value)}
              size="small"
              style={{ flex: 1 }}
              options={[
                { value: 'top', label: 'Top' },
                { value: 'bottom', label: 'Bottom' }
              ]}
            />
          </Row>
          <Row>
            <Label>Empty Cells</Label>
            <Select
              value={props.emptyCells || 'show'}
              onChange={(value) => debouncedUpdate('emptyCells', value)}
              size="small"
              style={{ flex: 1 }}
              options={[
                { value: 'show', label: 'Show' },
                { value: 'hide', label: 'Hide' }
              ]}
            />
          </Row>
          <Row>
            <Label>Vertical Align</Label>
            <Select
              value={props.verticalAlign || 'baseline'}
              onChange={(value) => debouncedUpdate('verticalAlign', value)}
              size="small"
              style={{ flex: 1 }}
              options={[
                { value: 'baseline', label: 'Baseline' },
                { value: 'top', label: 'Top' },
                { value: 'middle', label: 'Middle' },
                { value: 'bottom', label: 'Bottom' },
                { value: 'text-top', label: 'Text Top' },
                { value: 'text-bottom', label: 'Text Bottom' },
                { value: 'sub', label: 'Subscript' },
                { value: 'super', label: 'Superscript' }
              ]}
            />
          </Row>
        </Section>

        {/* Advanced Section */}
        <Section icon={<SettingOutlined />} title="Advanced" defaultCollapsed>
          <Row>
            <Label>CSS Classes</Label>
            <Input
              value={props.className || ''}
              onChange={(e) => debouncedUpdate('className', e.target.value)}
              placeholder="Enter CSS class names"
              size="small"
              style={{ flex: 1 }}
            />
          </Row>
          <Row>
            <Label>ID</Label>
            <Input
              value={props.id || ''}
              onChange={(e) => debouncedUpdate('id', e.target.value)}
              placeholder="Enter element ID"
              size="small"
              style={{ flex: 1 }}
            />
          </Row>
          <Row>
            <Label>Data Attributes</Label>
            <Input
              value={props['data-testid'] || ''}
              onChange={(e) => debouncedUpdate('data-testid', e.target.value)}
              placeholder="data-testid"
              size="small"
              style={{ flex: 1 }}
            />
          </Row>
          <Row>
            <Label>Aria Label</Label>
            <Input
              value={props['aria-label'] || ''}
              onChange={(e) => debouncedUpdate('aria-label', e.target.value)}
              placeholder="Accessibility label"
              size="small"
              style={{ flex: 1 }}
            />
          </Row>
          <Row>
            <Label>Role</Label>
            <Select
              value={props.role || ''}
              onChange={(value) => debouncedUpdate('role', value)}
              size="small"
              style={{ flex: 1 }}
              placeholder="Select ARIA role"
              options={[
                { value: '', label: 'None' },
                { value: 'button', label: 'Button' },
                { value: 'navigation', label: 'Navigation' },
                { value: 'main', label: 'Main' },
                { value: 'banner', label: 'Banner' },
                { value: 'contentinfo', label: 'Content Info' },
                { value: 'complementary', label: 'Complementary' },
                { value: 'article', label: 'Article' },
                { value: 'section', label: 'Section' },
                { value: 'list', label: 'List' },
                { value: 'listitem', label: 'List Item' },
                { value: 'link', label: 'Link' },
                { value: 'heading', label: 'Heading' },
                { value: 'img', label: 'Image' },
                { value: 'presentation', label: 'Presentation' }
              ]}
            />
          </Row>
          <Row>
            <Label>Tab Index</Label>
            <DragInput
              icon={<SettingOutlined />}
              value={getValue('tabIndex', 0)}
              onChange={(value) => updateValue('tabIndex', value, false)}
              tooltip="Tab Index"
              min={-1}
              max={100}
              step={1}
              precision={0}
              suffix=""
            />
          </Row>
        </Section>

        {/* Scripting Section */}
        <Section icon={<SettingOutlined />} title="Scripting" defaultCollapsed>
          <Row>
            <Label>JavaScript Code</Label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <TextArea
                value={props.customScript || ''}
                onChange={(e) => debouncedUpdate('customScript', e.target.value)}
                placeholder="// Click 'Edit Script' for full editor..."
                rows={3}
                style={{ 
                  width: '100%',
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, source-code-pro, monospace',
                  fontSize: 11,
                  lineHeight: 1.3,
                  resize: 'none'
                }}
                readOnly
              />
              <Button
                icon={<CodeOutlined />}
                onClick={() => setShowScriptModal(true)}
                size="small"
                style={{
                  alignSelf: 'flex-start',
                  fontSize: 11
                }}
                title="Open Script Editor"
              >
                Edit Script
              </Button>
            </div>
          </Row>
          <Row>
            <Label>Execute On</Label>
            <Select
              value={props.executeOn || 'mount'}
              onChange={(value) => debouncedUpdate('executeOn', value)}
              size="small"
              style={{ flex: 1 }}
              options={[
                { value: 'mount', label: 'Component Mount' },
                { value: 'update', label: 'Component Update' },
                { value: 'click', label: 'On Click' },
                { value: 'hover', label: 'On Hover' },
                { value: 'custom', label: 'Custom Event' }
              ]}
            />
          </Row>
          {props.executeOn === 'custom' && (
            <Row>
              <Label>Custom Event</Label>
              <Input
                value={props.customEvent || ''}
                onChange={(e) => debouncedUpdate('customEvent', e.target.value)}
                placeholder="Enter event name (e.g., 'resize', 'scroll')"
                size="small"
                style={{ flex: 1 }}
              />
            </Row>
          )}
          <Row>
            <Label>Script Enabled</Label>
            <Switch
              checked={props.scriptEnabled !== false}
              onChange={(checked) => debouncedUpdate('scriptEnabled', checked)}
              size="small"
            />
          </Row>
        </Section>
      </div>

      {/* MediaLibrary Modal */}
      <MediaLibrary
        visible={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelect={handleMediaSelect}
        type="images"
        title="Select Background Image"
      />

      {/* Script Editor Modal */}
      <Modal
        title="JavaScript Code Editor"
        open={showScriptModal}
        onCancel={() => setShowScriptModal(false)}
        onOk={() => setShowScriptModal(false)}
        width={800}
        style={{ top: 20 }}
        styles={{ body: { padding: '16px' } }}
        okText="Save & Close"
        cancelText="Cancel"
      >
        <div style={{ marginBottom: 16 }}>
          <Label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block' }}>
            Write your JavaScript code below:
          </Label>
          <TextArea
            value={props.customScript || ''}
            onChange={(e) => debouncedUpdate('customScript', e.target.value)}
            placeholder="// Write your custom JavaScript code here
// This code will be executed when the component is rendered
// 
// Available variables:
// - element: The DOM element
// - props: Component properties
// 
// Example:
// console.log('Component rendered');
// element.addEventListener('click', () => {
//   console.log('Element clicked!');
//   element.style.backgroundColor = '#ff0000';
// });
//
// element.addEventListener('mouseenter', () => {
//   element.style.transform = 'scale(1.05)';
// });
//
// element.addEventListener('mouseleave', () => {
//   element.style.transform = 'scale(1)';
// });"
            rows={20}
            style={{ 
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, source-code-pro, monospace',
              fontSize: 14,
              lineHeight: 1.5,
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: 6
            }}
          />
        </div>
        <div style={{ 
          padding: '12px 16px',
          backgroundColor: '#f8f9fa',
          borderRadius: 6,
          border: '1px solid #e9ecef',
          fontSize: 11,
          color: '#666'
        }}>
          <strong>Tips:</strong>
          <ul style={{ margin: '4px 0 0 16px', paddingLeft: 0 }}>
            <li>Use <code>element</code> to access the DOM element</li>
            <li>Use <code>props</code> to access component properties</li>
            <li>Code will execute based on the "Execute On" setting</li>
            <li>Use console.log() for debugging</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
};
