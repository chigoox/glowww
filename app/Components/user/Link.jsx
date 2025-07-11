'use client'

import React, { useRef, useEffect, useState, useMemo } from "react";
import { useNode, useEditor } from "@craftjs/core";
import { createPortal } from 'react-dom';
import ContextMenu from "../support/ContextMenu";
import { useContextMenu } from "../support/useContextMenu";
import { usePages } from "../PagesContext";
import { connectCraftElement } from "../support/craftUtils";
import useEditorDisplay from "../support/useEditorDisplay";
import { 
  Modal, 
  Input, 
  Select, 
  Switch, 
  Button as AntButton,
  Tabs,
  ColorPicker,
  Slider,
  InputNumber,
  Radio
} from 'antd';
import { EditOutlined, LinkOutlined } from '@ant-design/icons';

// Link Settings Modal Component
const LinkSettingsModal = ({ 
  visible, 
  onClose, 
  nodeId,
  currentProps 
}) => {
  const { actions } = useEditor();
  const { pages, isPreviewMode } = usePages();
  const [activeTab, setActiveTab] = useState('content');
  const [linkType, setLinkType] = useState('external');

  // Local state for form values
  const [formData, setFormData] = useState(currentProps);
  
  // Get internal pages for dropdown
  const pageOptions = pages.map(page => ({
    label: page.title,
    value: page.key
  }));

  useEffect(() => {
    setFormData(currentProps);
    // Detect if the current href is an internal page
    if (currentProps.href && !currentProps.href.startsWith('http') && !currentProps.href.startsWith('#')) {
      setLinkType('internal');
    } else {
      setLinkType('external');
    }
  }, [currentProps]);

  const updateProp = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    
    // Update the actual component prop
    actions.setProp(nodeId, (props) => {
      props[key] = value;
    });
  };

  const handleOk = () => {
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal
      title="Link Settings"
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      width={700}
      zIndex={999999}
      destroyOnHidden
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'content',
              label: '📝 Content',
              children: (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                      Link Text
                    </label>
                    <Input
                      value={formData.text}
                      onChange={(e) => updateProp('text', e.target.value)}
                      placeholder="Enter link text"
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                      Link Type
                    </label>
                    <Radio.Group 
                      value={linkType} 
                      onChange={(e) => {
                        setLinkType(e.target.value);
                        // Reset href when switching between internal and external
                        if (e.target.value === 'internal') {
                          updateProp('href', pages[0]?.path || '/');
                        } else {
                          updateProp('href', 'https://');
                        }
                      }}
                      style={{ marginBottom: 16 }}
                    >
                      <Radio.Button value="internal">Internal Page</Radio.Button>
                      <Radio.Button value="external">External URL</Radio.Button>
                    </Radio.Group>
                  </div>

                  {linkType === 'internal' ? (
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                        Select Page
                      </label>
                      <Select
                        style={{ width: '100%' }}
                        value={pageOptions.find(p => {
                          // Match by path
                          const pagePath = p.value === 'home' ? '/' : `/${p.value}`;
                          return formData.href === pagePath;
                        })?.value || pageOptions[0]?.value}
                        onChange={(value) => {
                          const selectedPage = pages.find(p => p.key === value);
                          if (selectedPage) {
                            const pagePath = selectedPage.key === 'home' ? '/' : `/${selectedPage.key}`;
                            updateProp('href', pagePath);
                          }
                        }}
                        options={pageOptions}
                      />
                    </div>
                  ) : (
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                        URL
                      </label>
                      <Input
                        value={formData.href}
                        onChange={(e) => updateProp('href', e.target.value)}
                        placeholder="https://example.com"
                      />
                    </div>
                  )}

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Switch
                        checked={formData.target === '_blank'}
                        onChange={(checked) => updateProp('target', checked ? '_blank' : '_self')}
                      />
                      Open in new tab
                    </label>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Switch
                        checked={formData.showIcon}
                        onChange={(checked) => updateProp('showIcon', checked)}
                      />
                      Show link icon
                    </label>
                  </div>

                  {formData.showIcon && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                        Icon Position
                      </label>
                      <Select
                        style={{ width: '100%' }}
                        value={formData.iconPosition}
                        onChange={(value) => updateProp('iconPosition', value)}
                      >
                        <Select.Option value="before">Before text</Select.Option>
                        <Select.Option value="after">After text</Select.Option>
                      </Select>
                    </div>
                  )}
                </div>
              )
            },
            {
              key: 'styling',
              label: '🎨 Styling',
              children: (
                <div>
                  {/* Typography */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                      Font Family
                    </label>
                    <Select
                      style={{ width: '100%' }}
                      value={formData.fontFamily}
                      onChange={(value) => updateProp('fontFamily', value)}
                    >
                      <Select.Option value="Arial">Arial</Select.Option>
                      <Select.Option value="Helvetica">Helvetica</Select.Option>
                      <Select.Option value="Times New Roman">Times New Roman</Select.Option>
                      <Select.Option value="Georgia">Georgia</Select.Option>
                      <Select.Option value="Verdana">Verdana</Select.Option>
                      <Select.Option value="Courier New">Courier New</Select.Option>
                    </Select>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                      Font Size
                    </label>
                    <InputNumber
                      style={{ width: '100%' }}
                      value={formData.fontSize}
                      onChange={(value) => updateProp('fontSize', value)}
                      min={8}
                      max={72}
                      addonAfter="px"
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                      Font Weight
                    </label>
                    <Select
                      style={{ width: '100%' }}
                      value={formData.fontWeight}
                      onChange={(value) => updateProp('fontWeight', value)}
                    >
                      <Select.Option value="100">Thin</Select.Option>
                      <Select.Option value="300">Light</Select.Option>
                      <Select.Option value="400">Normal</Select.Option>
                      <Select.Option value="500">Medium</Select.Option>
                      <Select.Option value="600">Semi-bold</Select.Option>
                      <Select.Option value="700">Bold</Select.Option>
                      <Select.Option value="900">Black</Select.Option>
                    </Select>
                  </div>

                  {/* Colors */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                      Text Color
                    </label>
                    <ColorPicker
                      value={formData.color}
                      onChange={(color) => updateProp('color', color.toHexString())}
                      showText
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                      Hover Color
                    </label>
                    <ColorPicker
                      value={formData.colorHover}
                      onChange={(color) => updateProp('colorHover', color.toHexString())}
                      showText
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                      Background Color
                    </label>
                    <ColorPicker
                      value={formData.backgroundColor}
                      onChange={(color) => updateProp('backgroundColor', color.toHexString())}
                      showText
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                      Hover Background
                    </label>
                    <ColorPicker
                      value={formData.backgroundHover}
                      onChange={(color) => updateProp('backgroundHover', color.toHexString())}
                      showText
                    />
                  </div>

                  {/* Text Decoration */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                      Text Decoration
                    </label>
                    <Select
                      style={{ width: '100%' }}
                      value={formData.textDecoration}
                      onChange={(value) => updateProp('textDecoration', value)}
                    >
                      <Select.Option value="none">None</Select.Option>
                      <Select.Option value="underline">Underline</Select.Option>
                      <Select.Option value="overline">Overline</Select.Option>
                      <Select.Option value="line-through">Strike-through</Select.Option>
                    </Select>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                      Underline Style
                    </label>
                    <Select
                      style={{ width: '100%' }}
                      value={formData.underlineStyle}
                      onChange={(value) => updateProp('underlineStyle', value)}
                    >
                      <Select.Option value="solid">Solid</Select.Option>
                      <Select.Option value="dotted">Dotted</Select.Option>
                      <Select.Option value="dashed">Dashed</Select.Option>
                      <Select.Option value="wavy">Wavy</Select.Option>
                    </Select>
                  </div>
                </div>
              )
            },
            {
              key: 'effects',
              label: '✨ Effects',
              children: (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                      Border Radius
                    </label>
                    <InputNumber
                      style={{ width: '100%' }}
                      value={formData.borderRadius}
                      onChange={(value) => updateProp('borderRadius', value)}
                      min={0}
                      max={50}
                      addonAfter="px"
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                      Padding
                    </label>
                    <Input
                      value={formData.padding}
                      onChange={(e) => updateProp('padding', e.target.value)}
                      placeholder="8px 12px"
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                      Box Shadow
                    </label>
                    <Input
                      value={formData.boxShadow}
                      onChange={(e) => updateProp('boxShadow', e.target.value)}
                      placeholder="0 2px 4px rgba(0,0,0,0.1)"
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                      Transition Duration
                    </label>
                    <Input
                      value={formData.transition}
                      onChange={(e) => updateProp('transition', e.target.value)}
                      placeholder="all 0.3s ease"
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                      Opacity: {formData.opacity}
                    </label>
                    <Slider
                      min={0}
                      max={1}
                      step={0.1}
                      value={formData.opacity}
                      onChange={(value) => updateProp('opacity', value)}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                      Transform
                    </label>
                    <Input
                      value={formData.transform}
                      onChange={(e) => updateProp('transform', e.target.value)}
                      placeholder="scale(1.05) rotate(5deg)"
                    />
                  </div>
                </div>
              )
            }
          ]}
        />
      </div>
    </Modal>
  );
};

// Portal Controls Component - renders outside of the link to avoid overflow clipping
const LinkPortalControls = ({ 
  linkPosition, 
  setModalVisible,
  handleDragStart,
  handleResizeStart,
  handleDoubleClick,
  handleDeleteLink
}) => {
  if (typeof window === 'undefined') return null; // SSR check
  
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none', // Allow clicks to pass through
        zIndex: 999999
      }}
    >
      {/* Combined pill-shaped drag controls */}
      <div
        style={{
          position: 'absolute',
          top: linkPosition.top - 28,
          left: linkPosition.left + linkPosition.width / 2,
          transform: 'translateX(-50%)',
          display: 'flex',
          background: 'white',
          borderRadius: '16px',
          border: '2px solid #d9d9d9',
          fontSize: '9px',
          fontWeight: 'bold',
          userSelect: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          pointerEvents: 'auto', // Re-enable pointer events for this element
          zIndex: 10000
        }}
      >
        {/* Left half - POS (Custom position drag) */}
        <div
          style={{
            background: '#1890ff',
            color: 'white',
            padding: '4px 6px',
            borderRadius: '14px 0 0 14px',
            cursor: 'move',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            minWidth: '48px',
            justifyContent: 'center',
            transition: 'background 0.2s ease'
          }}
          onMouseDown={(e) => handleDragStart(e)}
          title="Drag to change position"
        >
          ↕↔ POS
        </div>

        {/* Right half - EDIT (Settings modal) */}
        <div
          style={{
            background: '#722ed1',
            color: 'white',
            padding: '4px 6px',
            borderRadius: '0 14px 14px 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            minWidth: '48px',
            justifyContent: 'center',
            transition: 'background 0.2s ease'
          }}
          onClick={() => setModalVisible(true)}
          title="Configure link settings"
        >
          ⚙️ EDIT
        </div>
      </div>

      {/* Resize handles */}
      {/* Top-left corner */}
      <div
        style={{
          position: 'absolute',
          top: linkPosition.top - 4,
          left: linkPosition.left - 4,
          width: 8,
          height: 8,
          background: 'white',
          border: '2px solid #1890ff',
          borderRadius: '2px',
          cursor: 'nw-resize',
          zIndex: 10001,
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => handleResizeStart(e, 'nw')}
        title="Resize"
      />

      {/* Top-right corner */}
      <div
        style={{
          position: 'absolute',
          top: linkPosition.top - 4,
          left: linkPosition.left + linkPosition.width - 4,
          width: 8,
          height: 8,
          background: 'white',
          border: '2px solid #1890ff',
          borderRadius: '2px',
          cursor: 'ne-resize',
          zIndex: 10001,
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => handleResizeStart(e, 'ne')}
        title="Resize"
      />

      {/* Bottom-left corner */}
      <div
        style={{
          position: 'absolute',
          top: linkPosition.top + linkPosition.height - 4,
          left: linkPosition.left - 4,
          width: 8,
          height: 8,
          background: 'white',
          border: '2px solid #1890ff',
          borderRadius: '2px',
          cursor: 'sw-resize',
          zIndex: 10001,
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => handleResizeStart(e, 'sw')}
        title="Resize"
      />

      {/* Bottom-right corner */}
      <div
        style={{
          position: 'absolute',
          top: linkPosition.top + linkPosition.height - 4,
          left: linkPosition.left + linkPosition.width - 4,
          width: 8,
          height: 8,
          background: 'white',
          border: '2px solid #1890ff',
          borderRadius: '2px',
          cursor: 'se-resize',
          zIndex: 10001,
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => handleResizeStart(e, 'se')}
        title="Resize"
      />

      {/* Edge resize handles - beautiful semi-transparent style */}
      {/* Top edge */}
      <div
        style={{
          position: 'absolute',
          top: linkPosition.top - 4,
          left: linkPosition.left + linkPosition.width / 2 - 10,
          width: 20,
          height: 8,
          background: 'rgba(24, 144, 255, 0.3)',
          cursor: 'n-resize',
          zIndex: 9999,
          borderRadius: '4px',
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => handleResizeStart(e, 'n')}
        title="Resize height"
      />

      {/* Bottom edge */}
      <div
        style={{
          position: 'absolute',
          top: linkPosition.top + linkPosition.height - 4,
          left: linkPosition.left + linkPosition.width / 2 - 10,
          width: 20,
          height: 8,
          background: 'rgba(24, 144, 255, 0.3)',
          cursor: 's-resize',
          zIndex: 9999,
          borderRadius: '4px',
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => handleResizeStart(e, 's')}
        title="Resize height"
      />

      {/* Left edge */}
      <div
        style={{
          position: 'absolute',
          left: linkPosition.left - 4,
          top: linkPosition.top + linkPosition.height / 2 - 10,
          width: 8,
          height: 20,
          background: 'rgba(24, 144, 255, 0.3)',
          cursor: 'w-resize',
          zIndex: 9999,
          borderRadius: '4px',
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => handleResizeStart(e, 'w')}
        title="Resize width"
      />

      {/* Right edge */}
      <div
        style={{
          position: 'absolute',
          left: linkPosition.left + linkPosition.width - 4,
          top: linkPosition.top + linkPosition.height / 2 - 10,
          width: 8,
          height: 20,
          background: 'rgba(24, 144, 255, 0.3)',
          cursor: 'e-resize',
          zIndex: 9999,
          borderRadius: '4px',
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => handleResizeStart(e, 'e')}
        title="Resize width"
      />
    </div>,
    document.body
  );
};

export const Link = ({
  // Link Content
  text = "Click here",
  href = "https://example.com",
  
  // Link Behavior
  target = "_blank",
  rel = "noopener noreferrer",
  download,
  
  // Layout & Dimensions
  width = "auto",
  height = "auto",
  minWidth,
  maxWidth,
  minHeight,
  maxHeight,
  display = "inline-block",
  
  // Positioning
  position = "relative",
  top,
  left,
  right,
  bottom,
  zIndex = 1,
  
  // Spacing
  margin = "0",
  padding = "4px 8px",
  
  // Typography
  fontFamily = "Arial",
  fontSize = 14,
  fontWeight = "400",
  fontStyle = "normal",
  lineHeight = 1.4,
  letterSpacing = 0,
  textAlign = "left",
  textDecoration = "underline",
  textTransform = "none",
  
  // Colors
  color = "#1890ff",
  colorHover = "#40a9ff",
  colorVisited = "#722ed1",
  colorActive = "#096dd9",
  
  // Background
  backgroundColor = "transparent",
  background,
  backgroundHover = "rgba(24, 144, 255, 0.1)",
  
  // Border
  border = "none",
  borderRadius = 4,
  borderWidth = 0,
  borderStyle = "solid",
  borderColor = "transparent",
  
  // Visual Effects
  boxShadow = "none",
  opacity = 1,
  transform = "none",
  transition = "all 0.3s ease",
  
  // HTML Attributes
  title,
  id,
  className = "",
  name,
  
  // Accessibility
  role = "link",
  ariaLabel,
  ariaDescribedBy,
  tabIndex = 0,
  
  // Link States
  underlineStyle = "solid", // solid, dotted, dashed, wavy
  showIcon = true,
  iconPosition = "after", // before, after
  
  children,
}) => {
  const { 
    id: nodeId, 
    connectors: { connect, drag }, 
    actions: { setProp }, 
    selected 
  } = useNode((node) => ({
    id: node.id,
    selected: node.events.selected,
  }));
  
  const { actions } = useEditor();
  
  const linkRef = useRef(null);
  const [isClient, setIsClient] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(text);
  const [isHovered, setIsHovered] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [linkPosition, setLinkPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeData, setResizeData] = useState(null);

  // Context menu functionality
  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();

  // Function to update link position for portal positioning
  const updateLinkPosition = () => {
    if (linkRef.current) {
      const rect = linkRef.current.getBoundingClientRect();
      setLinkPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      });
    }
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const connectElements = () => {
      if (linkRef.current) {
        // Use our utility function to connect the element
        connectCraftElement(connect, drag, linkRef.current);
      }
    };

    // Always connect on mount and when dependencies change
    connectElements();
    
    // Reconnect when selection state changes
    const timer = setTimeout(connectElements, 50);
    return () => clearTimeout(timer);
  }, [connect, drag, selected, isClient]);

  // Update link position when hovered or selected changes
  useEffect(() => {
    if (isHovered || selected) {
      // Defer position update to avoid render cycle issues
      const timer = setTimeout(() => updateLinkPosition(), 0);
      
      // Update position on scroll and resize
      const handleScroll = () => updateLinkPosition();
      const handleResize = () => updateLinkPosition();
      
      window.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleResize);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isHovered, selected]);

  useEffect(() => {
    if (!isEditing) {
      setLocalText(text);
    }
  }, [text, isEditing]);

  // Handle delete
  const handleDeleteLink = () => {
    actions.delete(nodeId);
  };

  // Handle drag start for position changes
  const handleDragStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const currentTop = parseInt(top) || 0;
    const currentLeft = parseInt(left) || 0;
    
    setIsDragging(true);

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      // Update position using Craft.js setProp
      setProp(props => {
        props.position = 'absolute';
        props.left = currentLeft + deltaX;
        props.top = currentTop + deltaY;
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle resize start
  const handleResizeStart = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    const linkRect = linkRef.current.getBoundingClientRect();
    
    setResizeData({
      direction,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: linkRect.width,
      startHeight: linkRect.height,
      startLeft: linkRect.left,
      startTop: linkRect.top
    });

    const handleMouseMove = (moveEvent) => {
      if (!resizeData || !linkRef.current) return;

      const deltaX = moveEvent.clientX - resizeData.startX;
      const deltaY = moveEvent.clientY - resizeData.startY;

      setProp(props => {
        const minSize = 20; // Minimum size constraint
        
        switch (direction) {
          case 'se': // Southeast - resize width and height
            props.width = Math.max(minSize, resizeData.startWidth + deltaX);
            props.height = Math.max(minSize, resizeData.startHeight + deltaY);
            break;
          case 'sw': // Southwest - resize width and height, adjust left
            const newWidth = Math.max(minSize, resizeData.startWidth - deltaX);
            props.width = newWidth;
            props.height = Math.max(minSize, resizeData.startHeight + deltaY);
            if (props.position === 'absolute') {
              props.left = resizeData.startLeft - (newWidth - resizeData.startWidth);
            }
            break;
          case 'ne': // Northeast - resize width and height, adjust top
            props.width = Math.max(minSize, resizeData.startWidth + deltaX);
            const newHeight = Math.max(minSize, resizeData.startHeight - deltaY);
            props.height = newHeight;
            if (props.position === 'absolute') {
              props.top = resizeData.startTop - (newHeight - resizeData.startHeight);
            }
            break;
          case 'nw': // Northwest - resize width and height, adjust left and top
            const newWidthNW = Math.max(minSize, resizeData.startWidth - deltaX);
            const newHeightNW = Math.max(minSize, resizeData.startHeight - deltaY);
            props.width = newWidthNW;
            props.height = newHeightNW;
            if (props.position === 'absolute') {
              props.left = resizeData.startLeft - (newWidthNW - resizeData.startWidth);
              props.top = resizeData.startTop - (newHeightNW - resizeData.startHeight);
            }
            break;
          case 'n': // North - resize height, adjust top
            const newHeightN = Math.max(minSize, resizeData.startHeight - deltaY);
            props.height = newHeightN;
            if (props.position === 'absolute') {
              props.top = resizeData.startTop - (newHeightN - resizeData.startHeight);
            }
            break;
          case 's': // South - resize height
            props.height = Math.max(minSize, resizeData.startHeight + deltaY);
            break;
          case 'w': // West - resize width, adjust left
            const newWidthW = Math.max(minSize, resizeData.startWidth - deltaX);
            props.width = newWidthW;
            if (props.position === 'absolute') {
              props.left = resizeData.startLeft - (newWidthW - resizeData.startWidth);
            }
            break;
          case 'e': // East - resize width
            props.width = Math.max(minSize, resizeData.startWidth + deltaX);
            break;
        }
      });

      updateLinkPosition();
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeData(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle text editing
  const handleDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
    setLocalText(text);
  };

  const handleTextChange = (e) => {
    const newText = e.target.textContent || e.target.innerText;
    setLocalText(newText);
  };

  const handleTextBlur = () => {
    setIsEditing(false);
    setProp(props => {
      props.text = localText;
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setIsEditing(false);
      setProp(props => {
        props.text = localText;
      });
      linkRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setLocalText(text);
      linkRef.current?.blur();
    }
  };

  // Get pages context
  const { pages } = usePages();
  
  // Use our shared editor display hook
  const { hideEditorUI, isPreviewMode } = useEditorDisplay();
  
  // Check if link is internal (starts with / but not with //)
  const isInternalLink = useMemo(() => {
    if (!href) return false;
    
    // A link is internal if:
    // 1. It starts with / but not // (standard internal link format)
    // 2. OR it matches a page key in our pages array
    // 3. Does not contain a domain (.com, .org, etc.)
    
    // Check for standard internal link format
    if (href.startsWith('/') && !href.startsWith('//')) {
      return true;
    }
    
    // Check if href contains a domain (.com, .org, etc.) or protocol (http:, https:)
    if (href.match(/\.[a-z]{2,}\//) || href.includes('://')) {
      return false;
    }
    
    // Check if this matches any page key
    const path = href.startsWith('/') ? href.substring(1) : href;
    return pages.some(page => page.key === path || page.path === href);
  }, [href, pages]);

  // Handle link click
  const handleClick = (e) => {
    if (isEditing || !href) {
      e.preventDefault();
      return;
    }
    
    // In editor mode, prevent navigation for safety
    // But allow navigation in preview mode
    if (selected && !hideEditorUI) {
      e.preventDefault();
      console.log('Link clicked (editor mode):', href);
      return;
    }

    // For internal links, handle navigation differently based on preview mode
    if (isInternalLink) {
      e.preventDefault();
      
      // Get the path without leading slash
      let path = href.startsWith('/') ? href.substring(1) : href;
      
      // Handle home page case
      if (path === '' || path === '/') {
        path = 'home';
      }
      
      // Find the page that matches this path
      const targetPage = pages.find(p => p.key === path || p.path === href);
      
      if (targetPage) {
        // In preview mode, navigate to /Preview/[path]
        // In production mode, navigate directly to /[path]
        const navigationPath = isPreviewMode 
          ? `/Preview/${targetPage.key === 'home' ? '' : targetPage.key}`
          : href;
        
        // Use window.location for navigation
        window.location.href = navigationPath;
        console.log('Navigating to internal page:', navigationPath);
      } else {
        // If page is not found in our pages list, but has a leading slash,
        // still treat it as an internal path (could be a custom route)
        if (href.startsWith('/')) {
          // For paths starting with slash that aren't in pages list
          const navigationPath = isPreviewMode 
            ? `/Preview/${path === 'home' ? '' : path}`
            : href;
          
          window.location.href = navigationPath;
          console.log('Navigating to custom internal path:', navigationPath);
        } 
        // Only treat as external URL if it doesn't look like an internal path
        else if (!href.startsWith('/')) {
          console.log('Treating as external URL:', href);
          
          // If it doesn't start with http/https, add it
          if (!href.startsWith('http')) {
            window.location.href = `https://${href}`;
          } else {
            window.location.href = href;
          }
        }
      }
    }
  };

  // Helper function to process values
  const processValue = (value, property) => {
    if (typeof value === 'number' && !['opacity', 'zIndex'].includes(property)) {
      return `${value}px`;
    }
    return value;
  };

  // Get link icon
  const getLinkIcon = () => {
    if (!showIcon) return null;
    
    // Determine if link is external or internal
    // External: starts with http/https or //
    // Internal: starts with / but not with //
    const isExternal = href && (href.startsWith('http') || href.startsWith('//'));
    const isInternal = isInternalLink;
    
    if (isExternal) {
      // External link - custom SVG icon with link color
      return (
        <svg 
          width="0.8em" 
          height="0.8em" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          style={{ 
            marginLeft: iconPosition === 'after' ? '4px' : '0',
            marginRight: iconPosition === 'before' ? '4px' : '0',
            color: isHovered ? colorHover : color,
          }}
          title="External Link"
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15,3 21,3 21,9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      );
    } else if (isInternal) {
      // Internal page link - different icon
      return (
        <svg 
          width="0.8em" 
          height="0.8em" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          style={{ 
            marginLeft: iconPosition === 'after' ? '4px' : '0',
            marginRight: iconPosition === 'before' ? '4px' : '0',
            color: isHovered ? colorHover : color,
          }}
          title="Internal Page Link"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
      );
    }
    
    // Default link icon
    return (
      <LinkOutlined 
        style={{ 
          fontSize: '0.8em', 
          marginLeft: iconPosition === 'after' ? '4px' : '0',
          marginRight: iconPosition === 'before' ? '4px' : '0',
          color: isHovered ? colorHover : color,
        }} 
      />
    );
  };

  const computedStyles = {
    // Layout & Dimensions
    width: processValue(width, 'width'),
    height: processValue(height, 'height'),
    minWidth: minWidth && processValue(minWidth, 'minWidth'),
    maxWidth: maxWidth && processValue(maxWidth, 'maxWidth'),
    minHeight: minHeight && processValue(minHeight, 'minHeight'),
    maxHeight: maxHeight && processValue(maxHeight, 'maxHeight'),
    display,
    
    // Positioning
    position,
    top: top !== undefined ? processValue(top, 'top') : undefined,
    left: left !== undefined ? processValue(left, 'left') : undefined,
    right: right !== undefined ? processValue(right, 'right') : undefined,
    bottom: bottom !== undefined ? processValue(bottom, 'bottom') : undefined,
    zIndex,
    
    // Spacing
    margin: processValue(margin, 'margin'),
    padding: processValue(padding, 'padding'),
    
    // Typography
    fontFamily,
    fontSize: processValue(fontSize, 'fontSize'),
    fontWeight,
    fontStyle,
    lineHeight,
    letterSpacing: processValue(letterSpacing, 'letterSpacing'),
    textAlign,
    textDecoration: textDecoration === 'none' ? 'none' : `${textDecoration} ${underlineStyle}`,
    textTransform,
    
    // Colors - dynamic based on state
    color: isHovered ? colorHover : color,
    
    // Background
    backgroundColor: isHovered ? backgroundHover : backgroundColor,
    background,
    
    // Border
    border,
    borderRadius: processValue(borderRadius, 'borderRadius'),
    
    // Visual Effects
    boxShadow: isHovered && boxShadow !== 'none' ? `${boxShadow}, 0 2px 8px rgba(0,0,0,0.15)` : boxShadow,
    opacity,
    transform: isHovered && transform !== 'none' ? `${transform} scale(1.02)` : transform,
    transition,
    
    // Interaction
    cursor: isEditing ? 'text' : 'pointer',
    outline: (selected && !hideEditorUI) ? '2px solid #1890ff' : 'none',
    outlineOffset: (selected && !hideEditorUI) ? '2px' : 'none',
    
    // Link specific
    textDecorationColor: isHovered ? colorHover : color,
  };

  // Get current props for modal
  const currentProps = {
    text,
    href,
    target,
    rel,
    showIcon,
    iconPosition,
    fontFamily,
    fontSize,
    fontWeight,
    color,
    colorHover,
    backgroundColor,
    backgroundHover,
    textDecoration,
    underlineStyle,
    borderRadius,
    padding,
    boxShadow,
    transition,
    opacity,
    transform,
  };

  return (
    <>
      <a
        className={`${selected && !hideEditorUI ? 'ring-2 ring-blue-500' : ''} ${className}`}
        ref={linkRef}
        style={computedStyles}
        href={href}
        target={target}
        rel={rel}
        download={download}
        title={title || href}
        id={id}
        name={name}
        role={role}
        aria-label={ariaLabel || `${text} - ${href}`}
        aria-describedby={ariaDescribedBy}
        tabIndex={tabIndex}
        onClick={handleClick}
        onDoubleClick={hideEditorUI ? undefined : handleDoubleClick}
        onMouseEnter={hideEditorUI ? undefined : () => setTimeout(() => setIsHovered(true), 0)}
        onMouseLeave={hideEditorUI ? undefined : () => setTimeout(() => setIsHovered(false), 0)}
        onContextMenu={hideEditorUI ? undefined : handleContextMenu}
        data-craft-id={nodeId}
      >
        {/* Link content */}
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          {iconPosition === 'before' && getLinkIcon()}
          
          <span
            contentEditable={isEditing}
            onBlur={handleTextBlur}
            onInput={handleTextChange}
            onKeyDown={handleKeyDown}
            style={{
              outline: 'none',
              minHeight: '1em'
            }}
            suppressContentEditableWarning={true}
          >
            {isEditing ? localText : text}
          </span>
          
          {iconPosition === 'after' && getLinkIcon()}
        </span>
        
        {children}
      </a>

      {/* Link Portal Controls - show when link is hovered or component is selected, but not in preview mode */}
      {(isHovered || selected) && !isEditing && isClient && !hideEditorUI && (
        <LinkPortalControls
          linkPosition={linkPosition}
          setModalVisible={setModalVisible}
          handleDragStart={handleDragStart}
          handleResizeStart={handleResizeStart}
          handleDoubleClick={handleDoubleClick}
          handleDeleteLink={handleDeleteLink}
        />
      )}

      {/* Settings Modal - hidden in preview mode */}
      {!hideEditorUI && (
        <LinkSettingsModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          nodeId={nodeId}
          currentProps={currentProps}
        />
      )}
      
      {/* Context Menu - hidden in preview mode */}
      {!hideEditorUI && (
        <ContextMenu
          visible={contextMenu.visible}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={closeContextMenu}
          targetNodeId={nodeId}
        />
      )}
    </>
  );
};

// CraftJS configuration
Link.craft = {
  displayName: "Link",
  props: {
    text: "Click here",
    href: "https://example.com",
    target: "_blank",
    rel: "noopener noreferrer",
    download: "",
    width: "auto",
    height: "auto",
    minWidth: "",
    maxWidth: "",
    minHeight: "",
    maxHeight: "",
    display: "inline-block",
    position: "relative",
    top: "",
    left: "",
    right: "",
    bottom: "",
    zIndex: 1,
    margin: "0",
    padding: "4px 8px",
    fontFamily: "Arial",
    fontSize: 14,
    fontWeight: "400",
    fontStyle: "normal",
    lineHeight: 1.4,
    letterSpacing: 0,
    textAlign: "left",
    textDecoration: "underline",
    textTransform: "none",
    color: "#1890ff",
    colorHover: "#40a9ff",
    colorVisited: "#722ed1",
    colorActive: "#096dd9",
    backgroundColor: "transparent",
    background: "",
    backgroundHover: "rgba(24, 144, 255, 0.1)",
    border: "none",
    borderRadius: 4,
    borderWidth: 0,
    borderStyle: "solid",
    borderColor: "transparent",
    boxShadow: "none",
    opacity: 1,
    transform: "none",
    transition: "all 0.3s ease",
    title: "",
    id: "",
    className: "",
    name: "",
    role: "link",
    ariaLabel: "",
    ariaDescribedBy: "",
    tabIndex: 0,
    underlineStyle: "solid",
    showIcon: true,
    iconPosition: "after",
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => false,
    canMoveOut: () => true,
  },
  custom: {
    styleMenu: {
      supportedProps: [
        // Content & Behavior
        "text", "href", "target", "rel", "download",
        
        // Layout & Dimensions
        "width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight",
        "display", "position", "top", "left", "right", "bottom", "zIndex",
        
        // Spacing
        "margin", "padding",
        
        // Typography
        "fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight",
        "letterSpacing", "textAlign", "textDecoration", "textTransform",
        
        // Colors & States
        "color", "colorHover", "colorVisited", "colorActive",
        
        // Background
        "backgroundColor", "background", "backgroundHover",
        
        // Border
        "border", "borderRadius", "borderWidth", "borderStyle", "borderColor",
        
        // Visual Effects
        "boxShadow", "opacity", "transform", "transition",
        
        // Link Properties
        "underlineStyle", "showIcon", "iconPosition",
        
        // HTML Attributes
        "title", "id", "className", "name", "ariaLabel"
      ],
      categories: {
        content: [
          "text", "href", "target", "rel", "download"
        ],
        layout: [
          "width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight",
          "display", "position", "top", "left", "right", "bottom", "zIndex"
        ],
        spacing: [
          "margin", "padding"
        ],
        typography: [
          "fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight",
          "letterSpacing", "textAlign", "textDecoration", "textTransform"
        ],
        colors: [
          "color", "colorHover", "colorVisited", "colorActive",
          "backgroundColor", "background", "backgroundHover"
        ],
        border: [
          "border", "borderRadius", "borderWidth", "borderStyle", "borderColor"
        ],
        effects: [
          "boxShadow", "opacity", "transform", "transition"
        ],
        linkProps: [
          "underlineStyle", "showIcon", "iconPosition"
        ],
        attributes: [
          "title", "id", "className", "name", "ariaLabel"
        ]
      }
    }
  }
};