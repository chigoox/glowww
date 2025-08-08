'use client'

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { useNode, useEditor } from "@craftjs/core";
import { createPortal } from 'react-dom';
import ContextMenu from "../../utils/context/ContextMenu";
import { useContextMenu } from "../../utils/hooks/useContextMenu";
import { usePages } from "../../utils/context/PagesContext";
import { connectCraftElement } from "../../utils/craft/craftUtils";
import useEditorDisplay from "../../utils/craft/useEditorDisplay";
import { useMultiSelect } from '../../utils/context/MultiSelectContext';
import { useCraftSnap } from '../../utils/craft/useCraftSnap';
import SnapPositionHandle from '../../editor/SnapPositionHandle';
import { snapGridSystem } from '../../utils/grid/SnapGridSystem';
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
  dragRef,
  handleResizeStart,
  nodeId,
  isDragging,
  setIsDragging
}) => {
  if (typeof window === 'undefined') return null; // SSR check
  
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none', // Allow clicks to pass through
        zIndex: 99999
      }}
    >
      {/* Combined pill-shaped drag controls with EDIT in the middle */}
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
        {/* Left - MOVE (Craft.js drag) */}
        <div
          ref={dragRef}
          style={{
            background: '#52c41a',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '14px 0 0 14px',
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            minWidth: '40px',
            justifyContent: 'center',
            transition: 'background 0.2s ease'
          }}
          title="Drag to move between containers"
        >
          📦 MOVE
        </div>

        {/* Middle - EDIT Button */}
        <div
          style={{
            background: '#722ed1',
            color: 'white',
            padding: '4px 8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            minWidth: '40px',
            justifyContent: 'center',
            transition: 'background 0.2s ease',
            borderLeft: '1px solid rgba(255,255,255,0.2)',
            borderRight: '1px solid rgba(255,255,255,0.2)'
          }}
          onClick={() => setModalVisible(true)}
          title="Configure link settings"
        >
          ⚙️ EDIT
        </div>

        {/* Right - POS (Custom position drag with snapping) */}
        <SnapPositionHandle
          nodeId={nodeId}
          style={{
            background: '#1890ff',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '0 14px 14px 0',
            cursor: 'move',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            minWidth: '40px',
            justifyContent: 'center',
            transition: 'background 0.2s ease'
          }}
          onDragStart={(e) => {
            setIsDragging(true);
          }}
          onDragMove={(e, { x, y, snapped }) => {
            // Optional: Add visual feedback for snapping
            console.log(`Element moved to ${x}, ${y}, snapped: ${snapped}`);
          }}
          onDragEnd={(e) => {
            setIsDragging(false);
          }}
        >
          ↕↔ POS
        </SnapPositionHandle>
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
  width = "16rem",
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
  /*
   * 🎯 MULTI-SELECTION FEATURES:
   * - Ctrl+Click: Add/remove from multi-selection
   * - Visual indicators: Blue outline for Craft.js selection, Purple outline for multi-selection
   * - Portal controls: Show for both selected and multi-selected items
   * - Keyboard support: Delete key works on selected items
   * - Context menu: Enhanced for multi-selected items
   * - Snap system: Full integration with professional resize and position snapping
   */
  const { 
    id: nodeId, 
    connectors: { connect, drag }, 
    actions: { setProp }, 
    selected,
    parent
  } = useNode((node) => ({
    id: node.id,
    selected: node.events.selected,
    parent: node.data.parent,
  }));
  
  const { actions: editorActions, query } = useEditor();
  
  // Use our shared editor display hook (must be called early)
  const { hideEditorUI, isPreviewMode } = useEditorDisplay();
  
  // Multi-selection hook
  const { isSelected: isMultiSelected, toggleSelection } = useMultiSelect();

  // Handle delete (define early for use in keyboard effects)
  const handleDeleteLink = () => {
    editorActions.delete(nodeId);
  };

  // Debug logging for multi-selection state
  useEffect(() => {
    if (isMultiSelected) {
      console.log(`🎯 Link ${nodeId} is multi-selected`);
    }
  }, [isMultiSelected, nodeId]);

  // Keyboard support for multi-selection
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle keyboard when this element is selected
      if (selected && !hideEditorUI) {
        // Ctrl/Cmd + A for select all (if implemented in MultiSelectContext)
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
          e.preventDefault();
          // Future: implement select all functionality
          console.log('🎯 Select All requested from Link component');
        }
        
        // Delete key to remove selected elements
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          handleDeleteLink();
        }
      }
    };

    if (selected && !hideEditorUI) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [selected, hideEditorUI, nodeId, handleDeleteLink]);

  // Use snap functionality
  const { connectors: { connect: snapConnect, drag: snapDrag } } = useCraftSnap(nodeId);
  
  const linkRef = useRef(null);
  const dragRef = useRef(null);
  const [isClient, setIsClient] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(text);
  const [isHovered, setIsHovered] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [linkPosition, setLinkPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Track previous parent to detect container changes
  const prevParentRef = useRef(parent);

  // Context menu functionality
  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();

  // Function to update link position for portal positioning
  const updateLinkPosition = useCallback(() => {
    if (linkRef.current) {
      const rect = linkRef.current.getBoundingClientRect();
      setLinkPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      });
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const connectElements = () => {
      if (linkRef.current) {
        // Chain all connections properly
        connect(drag(snapConnect(snapDrag(linkRef.current))));
      }
    };

    connectElements();
    const timer = setTimeout(connectElements, 50);
    return () => clearTimeout(timer);
  }, [connect, drag, snapConnect, snapDrag]);

  // Detect parent changes and reset position properties
  useEffect(() => {
    // Skip the initial render (when prevParentRef.current is first set)
    if (prevParentRef.current !== null && prevParentRef.current !== parent) {
      // Parent has changed - element was moved to a different container
      console.log(`📦 Link ${nodeId} moved from parent ${prevParentRef.current} to ${parent} - resetting position`);
      
      // Reset position properties to default
      setProp((props) => {
        // Only reset if position properties were actually set
        if (props.top !== undefined || props.left !== undefined || 
            props.right !== undefined || props.bottom !== undefined) {
          console.log('🔄 Resetting position properties after container move');
          props.top = undefined;
          props.left = undefined;
          props.right = undefined;
          props.bottom = undefined;
          // Keep position as relative for normal flow
          props.position = "relative";
        }
      });
    }
    
    // Update the ref for next comparison
    prevParentRef.current = parent;
  }, [parent, nodeId, setProp]);

  // Update link position - only track when hovered or multi-selected
  useEffect(() => {
    // Ensure hideEditorUI is defined before proceeding
    if (hideEditorUI === undefined) return;
    
    if (!hideEditorUI && (isHovered || isMultiSelected)) {
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
  }, [hideEditorUI, isHovered, isMultiSelected, updateLinkPosition]);

  useEffect(() => {
    if (!isEditing) {
      setLocalText(text);
    }
  }, [text, isEditing]);

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
    e.stopPropagation();
    e.preventDefault();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const rect = linkRef.current.getBoundingClientRect();
    const startWidth = rect.width;
    const startHeight = rect.height;
    
    setIsResizing(true);

    // Register all elements for snapping during resize
    const nodes = query.getNodes();
    Object.entries(nodes).forEach(([id, node]) => {
      if (id !== nodeId && node.dom) {
        const elementRect = node.dom.getBoundingClientRect();
        const editorRoot = document.querySelector('[data-editor="true"]');
        if (editorRoot) {
          const editorRect = editorRoot.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(node.dom);
          
          // Get border widths for reference
          const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
          const borderRight = parseFloat(computedStyle.borderRightWidth) || 0;
          const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
          const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;
          
          // For visual alignment, we want to align to the full visual bounds (border box)
          // This includes padding and borders as users expect visual alignment to the actual edge
          const registrationBounds = {
            x: elementRect.left - editorRect.left,
            y: elementRect.top - editorRect.top,
            width: elementRect.width,
            height: elementRect.height,
          };
          
          console.log('📝 Registering element with border box bounds:', {
            id,
            elementRect: {
              left: elementRect.left - editorRect.left,
              top: elementRect.top - editorRect.top,
              width: elementRect.width,
              height: elementRect.height,
              right: (elementRect.left - editorRect.left) + elementRect.width,
              bottom: (elementRect.top - editorRect.top) + elementRect.height
            },
            borders: { borderLeft, borderRight, borderTop, borderBottom }
          });
          
          snapGridSystem.registerElement(id, node.dom, registrationBounds);
        }
      }
    });
    
    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      
      // Calculate new dimensions based on resize direction
      switch (direction) {
        case 'se': // bottom-right
          newWidth = startWidth + deltaX;
          newHeight = startHeight + deltaY;
          break;
        case 'sw': // bottom-left
          newWidth = startWidth - deltaX;
          newHeight = startHeight + deltaY;
          break;
        case 'ne': // top-right
          newWidth = startWidth + deltaX;
          newHeight = startHeight - deltaY;
          break;
        case 'nw': // top-left
          newWidth = startWidth - deltaX;
          newHeight = startHeight - deltaY;
          break;
        case 'e': // right edge
          newWidth = startWidth + deltaX;
          break;
        case 'w': // left edge
          newWidth = startWidth - deltaX;
          break;
        case 's': // bottom edge
          newHeight = startHeight + deltaY;
          break;
        case 'n': // top edge
          newHeight = startHeight - deltaY;
          break;
      }
      
      // Apply minimum constraints
      newWidth = Math.max(newWidth, 50);
      newHeight = Math.max(newHeight, 20);

      // Get current position for snap calculations
      const currentRect = linkRef.current.getBoundingClientRect();
      const editorRoot = document.querySelector('[data-editor="true"]');
      if (editorRoot) {
        const editorRect = editorRoot.getBoundingClientRect();
        
        // Calculate the intended bounds based on resize direction
        let intendedBounds = {
          left: currentRect.left - editorRect.left,
          top: currentRect.top - editorRect.top,
          width: newWidth,
          height: newHeight
        };

        // Adjust position for edges that move the element's origin
        if (direction.includes('w')) {
          // Left edge resize - element position changes
          const widthDelta = newWidth - currentRect.width;
          intendedBounds.left = (currentRect.left - editorRect.left) - widthDelta;
        }
        
        if (direction.includes('n')) {
          // Top edge resize - element position changes
          const heightDelta = newHeight - currentRect.height;
          intendedBounds.top = (currentRect.top - editorRect.top) - heightDelta;
        }

        // Calculate all edge positions with the new dimensions
        intendedBounds.right = intendedBounds.left + intendedBounds.width;
        intendedBounds.bottom = intendedBounds.top + intendedBounds.height;
        intendedBounds.centerX = intendedBounds.left + intendedBounds.width / 2;
        intendedBounds.centerY = intendedBounds.top + intendedBounds.height / 2;

        console.log('🔧 Resize bounds:', { 
          direction, 
          currentBounds: {
            left: currentRect.left - editorRect.left,
            top: currentRect.top - editorRect.top,
            width: currentRect.width,
            height: currentRect.height
          },
          intendedBounds,
          newDimensions: { newWidth, newHeight }
        });

        // Use resize-specific snap method
        const snapResult = snapGridSystem.getResizeSnapPosition(
          nodeId,
          direction,
          intendedBounds,
          newWidth,
          newHeight
        );

        if (snapResult.snapped) {
          newWidth = snapResult.bounds.width;
          newHeight = snapResult.bounds.height;
          
          console.log('🔧 Applied snap result:', { 
            snappedWidth: newWidth, 
            snappedHeight: newHeight,
            originalDimensions: { width: newWidth, height: newHeight }
          });
        }
      }
      
      // Update dimensions using Craft.js throttled setProp for smooth history
      editorActions.history.throttle(500).setProp(nodeId, (props) => {
        props.width = Math.round(newWidth);
        props.height = Math.round(newHeight);
      });
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      
      // Clear snap indicators and cleanup tracked elements
      snapGridSystem.clearSnapIndicators();
      setTimeout(() => {
        snapGridSystem.cleanupTrackedElements();
      }, 100);
      
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
    
    // Handle multi-selection in editor mode
    if (!hideEditorUI) {
      if (e.ctrlKey || e.metaKey) {
        e.stopPropagation();
        e.preventDefault();
        console.log('🎯 Ctrl+click detected on:', nodeId);
        // Toggle selection using multi-select pattern
        // This adds/removes the element from the multi-selection set
        toggleSelection(nodeId);
        return; // Don't execute link navigation in editor mode with Ctrl+click
      }
      // For regular clicks in editor mode, let the global handler manage clearing/selecting
      e.preventDefault();
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
    outline: (selected && !hideEditorUI) ? '2px solid #1890ff' : 
             (isMultiSelected && !hideEditorUI) ? '2px solid #722ed1' : 'none',
    outlineOffset: ((selected || isMultiSelected) && !hideEditorUI) ? '2px' : 'none',
    
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
        className={`${selected && !hideEditorUI ? 'ring-2 ring-blue-500' : ''} ${isMultiSelected && !hideEditorUI ? 'ring-2 ring-purple-500' : ''} ${className}`}
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

      {/* Link Portal Controls - show only on hover or multi-selection */}
      {(selected || isHovered) && isClient && !hideEditorUI  && (
        <LinkPortalControls
          linkPosition={linkPosition}
          setModalVisible={setModalVisible}
          dragRef={dragRef}
          handleResizeStart={handleResizeStart}
          nodeId={nodeId}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
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
          isMultiSelected={isMultiSelected}
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
    width: "16rem",
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