'use client'

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useNode, useEditor, Element } from "@craftjs/core";
import { EditOutlined, SettingOutlined, DeleteOutlined, RotateRightOutlined } from '@ant-design/icons';
import { createPortal } from 'react-dom';
import { 
  Button as AntButton, 
  Modal, 
  Input, 
  Select, 
  Switch, 
  message 
} from 'antd';
import { Text } from "./Text";

// Built-in action types
const ACTION_TYPES = [
  { value: "none", label: "None" },
  { value: "link", label: "Open Link" },
  { value: "submit", label: "Submit Form" },
  { value: "scroll", label: "Scroll to Element" },
  { value: "toggle", label: "Toggle Visibility" },
  { value: "modal", label: "Show/Hide Modal" },
  { value: "script", label: "Run Script Component" },
  { value: "theme", label: "Toggle Theme" },
  { value: "animation", label: "Trigger Animation" }
];

// Settings Modal Component
const ButtonSettingsModal = ({ 
  visible, 
  onClose, 
  nodeId,
  currentProps 
}) => {
  const { actions, query } = useEditor();
  const [activeTab, setActiveTab] = useState('content');
  const [availableNodes, setAvailableNodes] = useState([]);

  // Local state for form values
  const [formData, setFormData] = useState(currentProps);

  useEffect(() => {
    setFormData(currentProps);
  }, [currentProps]);

  // Get all available nodes for targeting
  useEffect(() => {
    if (visible) {
      const nodes = query.getNodes();
      const nodeList = Object.entries(nodes)
        .filter(([id, node]) => node.data.displayName && id !== nodeId)
        .map(([id, node]) => {
          const hasVisibleProp = node.data.props.hasOwnProperty('visible');
          const hasHiddenProp = node.data.props.hasOwnProperty('hidden');
          const hasDisplayProp = node.data.props.hasOwnProperty('display');
          
          return {
            id,
            name: node.data.displayName,
            type: node.data.type?.displayName || 'Unknown',
            canToggle: hasVisibleProp || hasHiddenProp || hasDisplayProp || true,
            toggleMethod: hasVisibleProp ? 'visible prop' : hasHiddenProp ? 'hidden prop' : hasDisplayProp ? 'display prop' : 'DOM style'
          };
        });
      setAvailableNodes(nodeList);
    }
  }, [query, nodeId, visible]);

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
      title="Button Settings"
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      width={600}
      zIndex={999999}
      destroyOnClose
    >
      <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid #e8e8e8', 
          marginBottom: 16 
        }}>
          {[
            { key: 'content', label: '📝 Content' },
            { key: 'actions', label: '⚡ Actions' },
            { key: 'styling', label: '🎨 Styling' }
          ].map(tab => (
            <AntButton
              key={tab.key}
              type={activeTab === tab.key ? 'primary' : 'default'}
              onClick={() => setActiveTab(tab.key)}
              style={{ 
                marginRight: 8,
                marginBottom: -1,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0
              }}
            >
              {tab.label}
            </AntButton>
          ))}
        </div>

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Button Text
              </label>
              <Input
                value={formData.text}
                onChange={(e) => updateProp('text', e.target.value)}
                placeholder="Enter button text"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Button Type
              </label>
              <Select
                style={{ width: '100%' }}
                value={formData.buttonType}
                onChange={(value) => updateProp('buttonType', value)}
              >
                <Select.Option value="primary">Primary</Select.Option>
                <Select.Option value="secondary">Secondary</Select.Option>
                <Select.Option value="outline">Outline</Select.Option>
                <Select.Option value="ghost">Ghost</Select.Option>
              </Select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Button Size
              </label>
              <Select
                style={{ width: '100%' }}
                value={formData.size}
                onChange={(value) => updateProp('size', value)}
              >
                <Select.Option value="small">Small</Select.Option>
                <Select.Option value="medium">Medium</Select.Option>
                <Select.Option value="large">Large</Select.Option>
              </Select>
            </div>
          </div>
        )}

        {/* Actions Tab */}
        {activeTab === 'actions' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Action Type
              </label>
              <Select
                style={{ width: '100%' }}
                value={formData.actionType}
                onChange={(value) => updateProp('actionType', value)}
              >
                {ACTION_TYPES.map(action => (
                  <Select.Option key={action.value} value={action.value}>
                    {action.label}
                  </Select.Option>
                ))}
              </Select>
            </div>

            {/* Link Action Settings */}
            {formData.actionType === 'link' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  Link URL
                </label>
                <Input
                  value={formData.href || ''}
                  onChange={(e) => updateProp('href', e.target.value)}
                  placeholder="https://example.com"
                />
                <div style={{ marginTop: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Switch
                      checked={formData.target === '_blank'}
                      onChange={(checked) => updateProp('target', checked ? '_blank' : '_self')}
                    />
                    Open in new tab
                  </label>
                </div>
              </div>
            )}

            {/* Target Component Settings */}
            {['scroll', 'toggle', 'modal', 'animation'].includes(formData.actionType) && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  Target Component
                </label>
                <Select
                  style={{ width: '100%' }}
                  value={formData.targetNodeId}
                  onChange={(value) => updateProp('targetNodeId', value)}
                  placeholder="Select a component"
                  showSearch
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {availableNodes.map(node => (
                    <Select.Option key={node.id} value={node.id}>
                      {node.name} ({node.type})
                      {formData.actionType === 'toggle' && (
                        <span style={{ color: '#666', fontSize: '12px' }}>
                          {' '}- via {node.toggleMethod}
                        </span>
                      )}
                    </Select.Option>
                  ))}
                </Select>
                {formData.actionType === 'toggle' && (
                  <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                    💡 This will toggle the component's visibility using the best available method
                  </div>
                )}
              </div>
            )}

            {/* Scroll Settings */}
            {formData.actionType === 'scroll' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  Scroll Offset (px)
                </label>
                <Input
                  type="number"
                  value={formData.scrollOffset}
                  onChange={(e) => updateProp('scrollOffset', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            )}

            {/* Animation Settings */}
            {formData.actionType === 'animation' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  Animation Type
                </label>
                <Select
                  style={{ width: '100%' }}
                  value={formData.animationType}
                  onChange={(value) => updateProp('animationType', value)}
                >
                  <Select.Option value="fadeIn">Fade In</Select.Option>
                  <Select.Option value="slideUp">Slide Up</Select.Option>
                  <Select.Option value="slideDown">Slide Down</Select.Option>
                  <Select.Option value="bounce">Bounce</Select.Option>
                  <Select.Option value="pulse">Pulse</Select.Option>
                </Select>
              </div>
            )}

            {/* Script Component Settings */}
            {formData.actionType === 'script' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  Script Component ID
                </label>
                <Input
                  value={formData.scriptComponentId || ''}
                  onChange={(e) => updateProp('scriptComponentId', e.target.value)}
                  placeholder="Enter script component ID"
                />
              </div>
            )}

            {/* Confirmation Dialog */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Switch
                  checked={formData.confirmDialog}
                  onChange={(checked) => updateProp('confirmDialog', checked)}
                />
                Show confirmation dialog
              </label>
            </div>

            {formData.confirmDialog && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  Confirmation Message
                </label>
                <Input
                  value={formData.confirmMessage || ''}
                  onChange={(e) => updateProp('confirmMessage', e.target.value)}
                  placeholder="Are you sure?"
                />
              </div>
            )}
          </div>
        )}

        {/* Styling Tab */}
        {activeTab === 'styling' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Background Color
              </label>
              <input
                type="color"
                value={formData.backgroundColor || '#1890ff'}
                onChange={(e) => updateProp('backgroundColor', e.target.value)}
                style={{ width: '100%', height: 40, border: '1px solid #d9d9d9', borderRadius: 6 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Text Color
              </label>
              <input
                type="color"
                value={formData.color || '#ffffff'}
                onChange={(e) => updateProp('color', e.target.value)}
                style={{ width: '100%', height: 40, border: '1px solid #d9d9d9', borderRadius: 6 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Font Size
              </label>
              <Input
                type="number"
                value={formData.fontSize}
                onChange={(e) => updateProp('fontSize', parseInt(e.target.value) || 14)}
                placeholder="14"
                addonAfter="px"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Padding
              </label>
              <Input
                value={formData.padding || ''}
                onChange={(e) => updateProp('padding', e.target.value)}
                placeholder="8px 16px"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Border Radius
              </label>
              <Input
                type="number"
                value={formData.borderRadius}
                onChange={(e) => updateProp('borderRadius', parseInt(e.target.value) || 0)}
                placeholder="6"
                addonAfter="px"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Width
              </label>
              <Input
                value={formData.width || ''}
                onChange={(e) => updateProp('width', e.target.value)}
                placeholder="auto"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Height
              </label>
              <Input
                value={formData.height || ''}
                onChange={(e) => updateProp('height', e.target.value)}
                placeholder="auto"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

// Portal Controls Component - renders outside of the button to avoid overflow clipping
const ButtonPortalControls = ({ 
  buttonPosition, 
  setModalVisible,
  handleDragStart,
  handleResizeStart,
  handleDoubleClick,
  handleDeleteButton
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
          top: buttonPosition.top - 28,
          left: buttonPosition.left + buttonPosition.width / 2,
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
          title="Configure button settings"
        >
          ⚙️ EDIT
        </div>
      </div>

      {/* Resize handles */}
      {/* Top-left corner */}
      <div
        style={{
          position: 'absolute',
          top: buttonPosition.top - 4,
          left: buttonPosition.left - 4,
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
          top: buttonPosition.top - 4,
          left: buttonPosition.left + buttonPosition.width - 4,
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
          top: buttonPosition.top + buttonPosition.height - 4,
          left: buttonPosition.left - 4,
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
          top: buttonPosition.top + buttonPosition.height - 4,
          left: buttonPosition.left + buttonPosition.width - 4,
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
          top: buttonPosition.top - 4,
          left: buttonPosition.left + buttonPosition.width / 2 - 10,
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
          top: buttonPosition.top + buttonPosition.height - 4,
          left: buttonPosition.left + buttonPosition.width / 2 - 10,
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
          left: buttonPosition.left - 4,
          top: buttonPosition.top + buttonPosition.height / 2 - 10,
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
          left: buttonPosition.left + buttonPosition.width - 4,
          top: buttonPosition.top + buttonPosition.height / 2 - 10,
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

export const Button = ({
  // Existing Button props
  text = "Click Me",
  width = "auto",
  height = "auto",
  minWidth = 80,
  maxWidth,
  minHeight = 32,
  maxHeight,
  position = "relative",
  top,
  left,
  right,
  bottom,
  zIndex = 1,
  margin = "5px 0",
  padding = "8px 16px",
  fontFamily = "Arial",
  fontSize = 14,
  fontWeight = "400",
  color = "#ffffff",
  textAlign = "center",
  textDecoration = "none",
  backgroundColor = "#1890ff",
  background,
  backgroundImage,
  border = "1px solid #1890ff",
  borderRadius = 6,
  borderWidth = 1,
  borderStyle = "solid",
  borderColor = "#1890ff",
  boxShadow = "0 2px 4px rgba(0,0,0,0.1)",
  opacity = 1,
  transform = "none",
  transition = "all 0.3s ease",
  disabled = false,
  href,
  target = "_blank",
  rel = "noopener noreferrer",
  buttonType = "primary",
  size = "medium",
  flexDirection = "row",
  alignItems = "center",
  justifyContent = "center",
  gap = 8,
  title,
  className = "",
  id,
  role = "button",
  ariaLabel,
  tabIndex = 0,
  display = "inline-flex",
  visibility = "visible",
  hidden = false,
  
  // NEW: Action system props
  actionType = "none",
  targetNodeId = "",
  scrollOffset = 0,
  animationType = "fadeIn",
  scriptComponentId = "",
  confirmDialog = false,
  confirmMessage = "Are you sure?",
  
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
  
  const { actions, query } = useEditor();
  
  const buttonRef = useRef(null);
  const [isClient, setIsClient] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(text);
  const [isHovered, setIsHovered] = useState(false);
  const [hasScript, setHasScript] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeData, setResizeData] = useState(null);

  // Function to update button position for portal positioning
  const updateButtonPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonPosition({
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
    if (!isEditing) {
      setLocalText(text);
    }
  }, [text, isEditing]);

  useEffect(() => {
    const connectElements = () => {
      if (buttonRef.current) {
        // Connect both selection and dragging to the main element - makes whole button draggable
        connect(drag(buttonRef.current));
      }
    };

    // Always connect on mount and when dependencies change
    connectElements();
    
    // Reconnect when selection state changes
    const timer = setTimeout(connectElements, 50);
    return () => clearTimeout(timer);
  }, [connect, drag, selected, isClient]);

  // Update button position when hovered or selected changes
  useEffect(() => {
    if (isHovered || selected) {
      // Defer position update to avoid render cycle issues
      const timer = setTimeout(() => updateButtonPosition(), 0);
      
      // Update position on scroll and resize
      const handleScroll = () => updateButtonPosition();
      const handleResize = () => updateButtonPosition();
      
      window.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleResize);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isHovered, selected]);

  // Check if this button has script attached
  useEffect(() => {
    setHasScript(actionType !== "none" || scriptComponentId);
  }, [actionType, scriptComponentId]);

  // Handle rotation
  const handleRotate = () => {
    const newRotation = rotation + 90;
    setRotation(newRotation);
    setProp(props => {
      props.transform = `rotate(${newRotation}deg)`;
    });
  };

  // Handle delete
  const handleDeleteButton = () => {
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
    const buttonRect = buttonRef.current.getBoundingClientRect();
    
    setResizeData({
      direction,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: buttonRect.width,
      startHeight: buttonRect.height,
      startLeft: buttonRect.left,
      startTop: buttonRect.top
    });

    const handleMouseMove = (moveEvent) => {
      if (!resizeData || !buttonRef.current) return;

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

      updateButtonPosition();
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

  // Handle settings modal
  const handleCloseModal = () => {
    setModalVisible(false);
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

  const handleBlur = () => {
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
      buttonRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setLocalText(text);
      buttonRef.current?.blur();
    }
  };

  // Enhanced click handler with built-in actions
  const handleClick = useCallback(async (e) => {
    if (isEditing) return;
    
    // Show confirmation dialog if enabled
    if (confirmDialog && !window.confirm(confirmMessage)) {
      return;
    }

    try {
      switch (actionType) {
        case "link":
          if (href) {
            if (target === '_blank') {
              window.open(href, '_blank', 'noopener,noreferrer');
            } else {
              window.location.href = href;
            }
          }
          break;

        case "submit":
          // Find parent form and submit
          let parentNode = query.node(nodeId).get().data.parent;
          while (parentNode) {
            const node = query.node(parentNode).get();
            if (node?.data.type?.displayName === "Form") {
              // Dispatch form submit event
              const formElement = document.querySelector(`[data-craft-id="${parentNode}"] form`);
              if (formElement) {
                formElement.requestSubmit();
              }
              break;
            }
            parentNode = node?.data.parent;
          }
          break;

        case "scroll":
  if (targetNodeId) {
    const targetElement = document.querySelector(`[data-craft-id="${targetNodeId}"]`);
    if (targetElement) {
      // Calculate offset position
      const rect = targetElement.getBoundingClientRect();
      const offsetPosition = rect.top + window.pageYOffset - scrollOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      
      console.log('Scrolling to element:', targetNodeId, 'at position:', offsetPosition);
    } else {
      console.warn('Target element not found:', targetNodeId);
    }
  }
  break;

        case "toggle":
          if (targetNodeId) {
            console.log('🔍 Debug - Toggle action started for:', targetNodeId);
            const targetNode = query.node(targetNodeId).get();
            console.log('🔍 Target node:', targetNode);
            
            if (targetNode) {
              console.log('🔍 Node props:', targetNode.data.props);
              
              // Method 1: Check if the component has a 'visible' prop (like modals)
              if (targetNode.data.props.hasOwnProperty('visible')) {
                console.log('🔍 Using visible prop method');
                actions.setProp(targetNodeId, (props) => {
                  console.log('🔍 Before toggle - visible:', props.visible);
                  props.visible = !props.visible;
                  console.log('🔍 After toggle - visible:', props.visible);
                });
              }
              // Method 2: Check if the component has a 'hidden' prop
              else if (targetNode.data.props.hasOwnProperty('hidden')) {
                console.log('🔍 Using hidden prop method');
                actions.setProp(targetNodeId, (props) => {
                  props.hidden = !props.hidden;
                });
              }
              // Method 3: Check if the component has 'display' prop (most common for Text, Image, etc.)
              else if (targetNode.data.props.hasOwnProperty('display')) {
                console.log('🔍 Using display prop method');
                actions.setProp(targetNodeId, (props) => {
                  const currentDisplay = props.display;
                  props.display = currentDisplay === "none" ? "block" : "none";
                  console.log('🔍 Toggled display from', currentDisplay, 'to', props.display);
                });
              }
              // Method 4: Use visibility prop (fallback)
              else if (targetNode.data.props.hasOwnProperty('visibility')) {
                console.log('🔍 Using visibility prop method');
                actions.setProp(targetNodeId, (props) => {
                  const currentVisibility = props.visibility;
                  props.visibility = currentVisibility === "hidden" ? "visible" : "hidden";
                  console.log('🔍 Toggled visibility from', currentVisibility, 'to', props.visibility);
                });
              }
              // Method 5: Add display prop if it doesn't exist
              else {
                console.log('🔍 Creating display prop method');
                actions.setProp(targetNodeId, (props) => {
                  // Default to hiding the component by setting display to none
                  props.display = "none";
                  console.log('🔍 Added display: none to component');
                });
              }
              
              console.log('🔍 Toggle completed for component:', targetNodeId);
            }
          }
          break;

        case "modal":
          if (targetNodeId) {
            actions.setProp(targetNodeId, (props) => {
              props.visible = !props.visible;
            });
          }
          break;

        case "script":
          // Trigger ScriptComponent
          if (scriptComponentId) {
            window.dispatchEvent(new CustomEvent("run-script", {
              detail: { 
                scriptId: scriptComponentId, 
                sourceId: nodeId,
                sourceType: "button",
                data: { text, actionType }
              }
            }));
          }
          break;

        case "animation":
          if (targetNodeId) {
            const targetElement = document.querySelector(`[data-craft-id="${targetNodeId}"]`);
            if (targetElement) {
              // Add animation class
              targetElement.classList.add(`animate-${animationType}`);
              // Remove after animation completes
              setTimeout(() => {
                targetElement.classList.remove(`animate-${animationType}`);
              }, 1000);
            }
          }
          break;

        case "theme":
          // Toggle global theme
          document.body.classList.toggle('dark-theme');
          break;

        default:
          // Fallback to original href behavior
          if (href) {
            if (target === '_blank') {
              window.open(href, '_blank', 'noopener,noreferrer');
            } else {
              window.location.href = href;
            }
          }
          break;
      }

      console.log(`Button action: ${actionType}`, { targetNodeId, nodeId });
      
    } catch (error) {
      console.error('Button action failed:', error);
    }
  }, [
    isEditing, actionType, href, target, targetNodeId, scrollOffset, 
    animationType, scriptComponentId, confirmDialog, confirmMessage, 
    query, nodeId, actions, text
  ]);

  // Keep all your existing style logic
  const processValue = (value, property) => {
    if (typeof value === 'number' && !['opacity', 'zIndex'].includes(property)) {
      return `${value}px`;
    }
    return value;
  };

  const getButtonTypeStyles = () => {
    const baseStyles = {
      primary: {
        backgroundColor: backgroundColor || "#1890ff",
        color: color || "#ffffff",
        border: border || "1px solid #1890ff"
      },
      secondary: {
        backgroundColor: "#f0f0f0",
        color: "#333333",
        border: "1px solid #d9d9d9"
      },
      outline: {
        backgroundColor: "transparent",
        color: borderColor || "#1890ff",
        border: `1px solid ${borderColor || "#1890ff"}`
      },
      ghost: {
        backgroundColor: "transparent",
        color: color || "#1890ff",
        border: "none"
      }
    };
    
    return baseStyles[buttonType] || baseStyles.primary;
  };

  const getSizeStyles = () => {
    const sizeStyles = {
      small: {
        padding: "4px 8px",
        fontSize: "12px",
        minHeight: "24px"
      },
      medium: {
        padding: padding || "8px 16px",
        fontSize: fontSize || "14px",
        minHeight: minHeight || "32px"
      },
      large: {
        padding: "12px 24px",
        fontSize: "16px",
        minHeight: "40px"
      }
    };
    
    return sizeStyles[size] || sizeStyles.medium;
  };

  const typeStyles = getButtonTypeStyles();
  const sizeStyles = getSizeStyles();

  const computedStyles = {
    width: processValue(width, 'width'),
    height: processValue(height, 'height'),
    minWidth: processValue(minWidth, 'minWidth'),
    maxWidth: maxWidth && processValue(maxWidth, 'maxWidth'),
    minHeight: processValue(minHeight, 'minHeight'),
    maxHeight: maxHeight && processValue(maxHeight, 'maxHeight'),
    position,
    top: top !== undefined ? processValue(top, 'top') : undefined,
    left: left !== undefined ? processValue(left, 'left') : undefined,
    right: right !== undefined ? processValue(right, 'right') : undefined,
    bottom: bottom !== undefined ? processValue(bottom, 'bottom') : undefined,
    zIndex,
    margin: processValue(margin, 'margin'),
    padding: sizeStyles.padding,
    fontFamily,
    fontSize: sizeStyles.fontSize,
    fontWeight,
    color: typeStyles.color,
    textAlign,
    textDecoration,
    backgroundColor: typeStyles.backgroundColor,
    background,
    backgroundImage,
    border: typeStyles.border,
    borderRadius: processValue(borderRadius, 'borderRadius'),
    boxShadow: disabled ? 'none' : boxShadow,
    opacity: disabled ? 0.6 : opacity,
    transform,
    transition,
    cursor: disabled ? 'not-allowed' : 'pointer',
    userSelect: 'none',
    outline: 'none',
    display: display,
    visibility: visibility,
    flexDirection,
    alignItems,
    justifyContent,
    gap: processValue(gap, 'gap'),
    
    // Add visual indicator for buttons with actions
    ...(hasScript && {
      boxShadow: `${boxShadow}, 0 0 0 2px rgba(82, 196, 26, 0.3)`,
    }),
    
    ...(isHovered && !disabled && {
      transform: `${transform} scale(1.02)`,
      boxShadow: hasScript 
        ? '0 4px 8px rgba(0,0,0,0.15), 0 0 0 2px rgba(82, 196, 26, 0.5)'
        : '0 4px 8px rgba(0,0,0,0.15)'
    })
  };

  const ButtonElement = href && actionType === "link" ? 'a' : 'button';

  // Get current props for modal
  const currentProps = {
    text,
    actionType,
    targetNodeId,
    href,
    confirmDialog,
    confirmMessage,
    buttonType,
    size,
    target,
    backgroundColor,
    color,
    fontSize,
    padding,
    borderRadius,
    width,
    height,
    scrollOffset,
    animationType,
    scriptComponentId,
  };

  // Don't render if hidden
  if (hidden) {
    return null;
  }

  return (
    <>
      <ButtonElement
        className={`${selected ? 'ring-2 ring-blue-500' : ''} ${isHovered ? 'ring-1 ring-gray-300' : ''} ${className}`}
        ref={buttonRef}
        style={{
          ...computedStyles,
          position: 'relative',
          cursor: isEditing ? 'text' : 'pointer',
          userSelect: isEditing ? 'text' : 'none',
          transition: isHovered && !selected ? 'box-shadow 0.2s ease' : 'none',
        }}
        disabled={disabled && actionType !== "link"}
        href={href && actionType === "link" ? href : undefined}
        target={href && actionType === "link" ? target : undefined}
        rel={href && actionType === "link" ? rel : undefined}
        title={title}
        id={id}
        role={role}
        aria-label={ariaLabel || text}
        tabIndex={tabIndex}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setTimeout(() => setIsHovered(true), 0)}
        onMouseLeave={() => setTimeout(() => setIsHovered(false), 0)}
        data-craft-id={nodeId}
      >
        {/* Script indicator */}
        {hasScript && (
          <div
            style={{
              position: "absolute",
              top: -8,
              left: -8,
              width: 16,
              height: 16,
              background: "#52c41a",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 8,
              border: "1px solid white",
              boxShadow: "0 1px 2px rgba(0,0,0,0.2)"
            }}
            title={`Action: ${actionType}`}
          >
            <SettingOutlined />
          </div>
        )}
        
        {/* Button content */}
        {text && !children?.length && (
          <span
            contentEditable={isEditing}
            onBlur={handleBlur}
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
        )}
        
        {children}
      </ButtonElement>

      {/* Button Portal Controls - show when button is hovered or component is selected */}
      {(isHovered || selected) && !isEditing && (
        <ButtonPortalControls
          buttonPosition={buttonPosition}
          setModalVisible={setModalVisible}
          handleDragStart={handleDragStart}
          handleResizeStart={handleResizeStart}
          handleDoubleClick={handleDoubleClick}
          handleDeleteButton={handleDeleteButton}
        />
      )}

      {/* Settings Modal */}
      <ButtonSettingsModal
        visible={modalVisible}
        onClose={handleCloseModal}
        nodeId={nodeId}
        currentProps={currentProps}
      />
    </>
  );
};

// Enhanced CraftJS configuration
Button.craft = {
  displayName: "Button",
  props: {
    text: "Click Me",
    width: "auto",
    height: "auto",
    minWidth: 80,
    maxWidth: "",
    minHeight: 32,
    maxHeight: "",
    position: "relative",
    top: "",
    left: "",
    right: "",
    bottom: "",
    zIndex: 1,
    margin: "5px 0",
    padding: "8px 16px",
    fontFamily: "Arial",
    fontSize: 14,
    fontWeight: "400",
    color: "#ffffff",
    textAlign: "center",
    textDecoration: "none",
    backgroundColor: "#1890ff",
    background: "",
    backgroundImage: "",
    border: "1px solid #1890ff",
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#1890ff",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    opacity: 1,
    transform: "none",
    transition: "all 0.3s ease",
    disabled: false,
    href: "",
    target: "_blank",
    rel: "noopener noreferrer",
    buttonType: "primary",
    size: "medium",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    title: "",
    className: "",
    id: "",
    role: "button",
    ariaLabel: "",
    tabIndex: 0,
    display: "inline-flex",
    visibility: "visible",
    hidden: false,
    actionType: "none",
    targetNodeId: "",
    scrollOffset: 0,
    animationType: "fadeIn",
    scriptComponentId: "",
    confirmDialog: false,
    confirmMessage: "Are you sure?",
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => true,
    canMoveOut: () => true,
  },
  custom: {
    styleMenu: {
      supportedProps: [
        "text", "width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight",
        "position", "top", "left", "right", "bottom", "zIndex", "margin", "padding",
        "fontFamily", "fontSize", "fontWeight", "color", "textAlign", "textDecoration",
        "backgroundColor", "background", "backgroundImage", "border", "borderRadius",
        "boxShadow", "opacity", "transform", "transition", "overflow",
        "flexDirection", "alignItems", "justifyContent", "gap",
        "buttonType", "size", "disabled", "href", "target", "title", "className", "id", "ariaLabel",
        "display", "visibility", "hidden",
        "actionType", "targetNodeId", "scrollOffset", "animationType", 
        "scriptComponentId", "confirmDialog", "confirmMessage"
      ],
      actionTypes: ACTION_TYPES
    }
  }
};