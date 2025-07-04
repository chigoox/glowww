'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card, Slider, ColorPicker, Button, Tooltip, Divider } from 'antd';
import { 
  BorderOutlined, 
  RadiusUprightOutlined, 
  ColumnWidthOutlined, 
  ColumnHeightOutlined,
  VerticalAlignTopOutlined,
  UndoOutlined,
  CopyOutlined,
  ScissorOutlined,
  CopyFilled,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
  SnippetsOutlined
} from '@ant-design/icons';
import { useEditor, useNode } from '@craftjs/core';
import { Box } from '../user/Box';
import { Text } from '../user/Text';
import { Button as CustomButton } from '../user/Button';
import { Image } from '../user/Image';
import { FlexBox } from '../user/FlexBox';
import { GridBox } from '../user/GridBox';
import { useRecentComponents } from './useRecentComponents';

const ContextMenu = ({ 
  visible, 
  position, 
  onClose, 
  targetNodeId 
}) => {
  const { actions, query } = useEditor();
  const { recentComponents, addToRecent } = useRecentComponents();
  
  // All available components
  const allComponents = [
    { name: 'Box', component: Box, icon: '⬜' },
    { name: 'Text', component: Text, icon: 'T' },
    { name: 'Button', component: CustomButton, icon: '🔘' },
    { name: 'Image', component: Image, icon: '🖼️' },
    { name: 'FlexBox', component: FlexBox, icon: '📦' },
    { name: 'GridBox', component: GridBox, icon: '▦' }
  ];
  
  // Get display components (recent first, then fallback to default)
  const displayComponents = recentComponents.length > 0 
    ? recentComponents.slice(0, 3)
    : allComponents.slice(0, 3);
  
  const [activeControl, setActiveControl] = useState(null);
  const [lockedControls, setLockedControls] = useState(new Set());
  const [styleValues, setStyleValues] = useState({
    borderRadius: 0,
    padding: 4,
    margin: 5,
    zIndex: 1,
    rotation: 0,
    order: 0,
    backgroundColor: '#ffffff'
  });

  const menuRef = useRef(null);

  // Get current node props to initialize slider values
  useEffect(() => {
    if (targetNodeId) {
      try {
        const node = query.node(targetNodeId).get();
        if (node && node.data && node.data.props) {
          const props = node.data.props;
          setStyleValues(prev => ({
            ...prev,
            borderRadius: parseInt(props.borderRadius) || 0,
            padding: parseInt(props.padding) || 4,
            margin: parseInt(props.margin?.replace('px 0', '')) || 5,
            zIndex: parseInt(props.zIndex) || 1,
            rotation: 0, // We'll add this as a new feature
            order: parseInt(props.order) || 0,
            backgroundColor: props.backgroundColor || '#ffffff'
          }));
        }
      } catch (error) {
        console.error('Error getting node props:', error);
      }
    }
  }, [targetNodeId, query]);

  // Handle clicks outside menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [visible, onClose]);

  // Add component to target node
  const addComponent = (Component, componentName) => {
    if (targetNodeId) {
      try {
        const targetNode = query.node(targetNodeId).get();
        // Check if target is canvas or can accept children
        if (targetNode && targetNode.data) {
          const isCanvas = targetNode.data.props && targetNode.data.props.canvas;
          
          if (isCanvas) {
            const newNode = query.createNode(React.createElement(Component));
            actions.add(newNode, targetNodeId);
            
            // Add to recent components
            const componentInfo = allComponents.find(comp => comp.name === componentName);
            if (componentInfo) {
              addToRecent(componentInfo);
            }
          } else {
            console.warn('Cannot add component to this target - not a canvas');
          }
        }
      } catch (error) {
        console.error('Error adding component:', error);
      }
    }
    onClose();
  };

  // Context menu actions
  const cutNode = () => {
    if (targetNodeId && targetNodeId !== 'ROOT') {
      try {
        const node = query.node(targetNodeId).get();
        if (node && node.data) {
          // Store only the essential data needed to recreate the node
          const nodeData = {
            componentName: node.data.displayName, // Store component name instead of function
            props: { ...node.data.props },
            displayName: node.data.displayName,
            custom: node.data.custom
          };
          
          const clipboardData = {
            type: 'cut',
            nodeData: nodeData,
            sourceNodeId: targetNodeId
          };
          
          localStorage.setItem('craft-clipboard', JSON.stringify(clipboardData));
          console.log('Cut node to clipboard:', nodeData.displayName, clipboardData); // Debug log
          actions.delete(targetNodeId);
        }
      } catch (error) {
        console.error('Error cutting node:', error);
      }
    }
    onClose();
  };

  const copyNode = () => {
    if (targetNodeId && targetNodeId !== 'ROOT') {
      try {
        const node = query.node(targetNodeId).get();
        if (node && node.data) {
          // Store only the essential data needed to recreate the node
          const nodeData = {
            componentName: node.data.displayName, // Store component name instead of function
            props: { ...node.data.props },
            displayName: node.data.displayName,
            custom: node.data.custom
          };
          
          const clipboardData = {
            type: 'copy',
            nodeData: nodeData,
            sourceNodeId: targetNodeId
          };
          
          localStorage.setItem('craft-clipboard', JSON.stringify(clipboardData));
          console.log('Copied node to clipboard:', nodeData.displayName, clipboardData); // Debug log
        }
      } catch (error) {
        console.error('Error copying node:', error);
      }
    }
    onClose();
  };

  const pasteNode = () => {
    if (targetNodeId) {
      try {
        const clipboardData = localStorage.getItem('craft-clipboard');
        console.log('Clipboard data:', clipboardData); // Debug log
        console.log('LocalStorage keys:', Object.keys(localStorage)); // Debug log
        
        if (clipboardData) {
          const parsed = JSON.parse(clipboardData);
          console.log('Parsed clipboard:', parsed); // Debug log
          
          // Handle the correct data structure - data is nested under nodeData
          const nodeData = parsed.nodeData || parsed; // Support both formats
          if (nodeData && nodeData.componentName) {
            // Map component name to actual component
            const componentMap = {
              'Box': Box,
              'Text': Text,
              'Button': CustomButton,
              'Image': Image,
              'FlexBox': FlexBox,
              'GridBox': GridBox
            };
            
            const ComponentClass = componentMap[nodeData.componentName];
            if (!ComponentClass) {
              console.error('Unknown component:', nodeData.componentName);
              return;
            }
            
            // Check if target node can accept children
            const targetNode = query.node(targetNodeId).get();
            if (targetNode && targetNode.data) {
              // Check both canvas prop and canDrop rule
              const isCanvas = targetNode.data.props && targetNode.data.props.canvas;
              const canDrop = query.node(targetNodeId).isDraggable() !== false; // Basic check
              
              console.log('Target is canvas:', isCanvas, 'Can drop:', canDrop, 'Target node:', targetNode.data.displayName); // Debug log
              
              // Try to paste into current target first
              if (isCanvas || targetNode.data.displayName === 'Box' || targetNode.data.displayName === 'FlexBox' || targetNode.data.displayName === 'GridBox') {
                try {
                  const newNode = query.createNode(React.createElement(ComponentClass, nodeData.props));
                  actions.add(newNode, targetNodeId);
                  console.log('Successfully pasted node into:', targetNode.data.displayName); // Debug log
                  onClose();
                  return;
                } catch (error) {
                  console.warn('Failed to paste into target, trying parent:', error.message);
                }
              }
              
              // If target can't accept children, try to find parent that can
              console.warn('Cannot paste into this target - trying parent containers');
              let parentId = targetNode.data.parent;
              let attempts = 0;
              while (parentId && parentId !== 'ROOT' && attempts < 5) {
                attempts++;
                const parentNode = query.node(parentId).get();
                if (parentNode && parentNode.data) {
                  const parentIsCanvas = parentNode.data.props && parentNode.data.props.canvas;
                  const parentCanAccept = parentNode.data.displayName === 'Box' || 
                                        parentNode.data.displayName === 'FlexBox' || 
                                        parentNode.data.displayName === 'GridBox' ||
                                        parentIsCanvas;
                  
                  if (parentCanAccept) {
                    try {
                      const newNode = query.createNode(React.createElement(ComponentClass, nodeData.props));
                      actions.add(newNode, parentId);
                      console.log('Pasted into parent container:', parentNode.data.displayName); // Debug log
                      onClose();
                      return;
                    } catch (error) {
                      console.warn('Failed to paste into parent, trying next level:', error.message);
                    }
                  }
                  parentId = parentNode.data.parent;
                }
              }
              
              // Last resort: try to paste into ROOT if it's the only option
              if (parentId === 'ROOT') {
                try {
                  const newNode = query.createNode(React.createElement(ComponentClass, nodeData.props));
                  actions.add(newNode, 'ROOT');
                  console.log('Pasted into ROOT as last resort'); // Debug log
                } catch (error) {
                  console.error('Failed to paste anywhere:', error);
                }
              }
            }
          } else {
            console.warn('Invalid clipboard data structure - missing componentName');
          }
        } else {
          console.warn('No clipboard data found');
        }
      } catch (error) {
        console.error('Error pasting node:', error);
      }
    }
    onClose();
  };

  const duplicateNode = () => {
    if (targetNodeId && targetNodeId !== 'ROOT') {
      try {
        const node = query.node(targetNodeId).get();
        if (node && node.data && node.data.parent) {
          const parentId = node.data.parent;
          
          // Map component name to actual component
          const componentMap = {
            'Box': Box,
            'Text': Text,
            'Button': CustomButton,
            'Image': Image,
            'FlexBox': FlexBox,
            'GridBox': GridBox
          };
          
          const ComponentClass = componentMap[node.data.displayName];
          if (ComponentClass) {
            // Create a new node with the same component and props
            const newNode = query.createNode(React.createElement(
              ComponentClass,
              { ...node.data.props }
            ));
            actions.add(newNode, parentId);
            console.log('Duplicated node:', node.data.displayName);
          } else {
            console.error('Unknown component for duplication:', node.data.displayName);
          }
        }
      } catch (error) {
        console.error('Error duplicating node:', error);
      }
    }
    onClose();
  };

  const deleteNode = () => {
    if (targetNodeId && targetNodeId !== 'ROOT') {
      try {
        // Check if node exists before deleting
        const node = query.node(targetNodeId).get();
        if (node) {
          actions.delete(targetNodeId);
          console.log('Deleted node:', node.data.displayName);
        }
      } catch (error) {
        console.error('Error deleting node:', error);
      }
    }
    onClose();
  };

  // Update style property
  const updateStyle = (property, value) => {
    if (targetNodeId && !lockedControls.has(property)) {
      actions.setProp(targetNodeId, (props) => {
        switch (property) {
          case 'borderRadius':
            props.borderRadius = value;
            break;
          case 'padding':
            props.padding = value;
            break;
          case 'margin':
            props.margin = `${value}px 0`;
            break;
          case 'zIndex':
            props.zIndex = value;
            break;
          case 'rotation':
            props.transform = `rotate(${value}deg)`;
            break;
          case 'order':
            props.order = value;
            break;
          case 'backgroundColor':
            props.backgroundColor = value;
            break;
        }
      });
    }
  };

  // Toggle lock for a control
  const toggleLock = (property) => {
    setLockedControls(prev => {
      const newSet = new Set(prev);
      if (newSet.has(property)) {
        newSet.delete(property);
      } else {
        newSet.add(property);
      }
      return newSet;
    });
  };

  const controlButtons = [
    { 
      key: 'borderRadius', 
      icon: <RadiusUprightOutlined />, 
      label: 'Border Radius',
      min: 0,
      max: 50,
      step: 1
    },
    { 
      key: 'padding', 
      icon: <ColumnWidthOutlined />, 
      label: 'Padding',
      min: 0,
      max: 100,
      step: 1
    },
    { 
      key: 'margin', 
      icon: <ColumnHeightOutlined />, 
      label: 'Margin',
      min: 0,
      max: 100,
      step: 1
    },
    { 
      key: 'zIndex', 
      icon: <VerticalAlignTopOutlined />, 
      label: 'Z-Index',
      min: 0,
      max: 1000,
      step: 1
    },
    { 
      key: 'rotation', 
      icon: <UndoOutlined />, 
      label: 'Rotation',
      min: -180,
      max: 180,
      step: 1
    },
    { 
      key: 'order', 
      icon: <BorderOutlined />, 
      label: 'Order',
      min: -10,
      max: 10,
      step: 1
    }
  ];

  if (!visible) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 10000,
        pointerEvents: 'none'
      }}
    >
      <Card
        ref={menuRef}
        style={{
          position: 'absolute',
          top: position.y,
          left: position.x,
          width: 220, // Slimmer width
          pointerEvents: 'auto',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid #e8e8e8'
        }}
        bodyStyle={{ padding: 12 }}
      >
        {/* Color Picker (Top Right) */}
        <div style={{ 
          position: 'absolute', 
          top: 12, 
          right: 12,
          zIndex: 1
        }}>
          <ColorPicker
            value={styleValues.backgroundColor}
            onChange={(color) => {
              const colorStr = color.toHexString();
              setStyleValues(prev => ({ ...prev, backgroundColor: colorStr }));
              updateStyle('backgroundColor', colorStr);
            }}
            showText={false}
            size="small"
            style={{
              width: 24,
              height: 24
            }}
          />
        </div>

        {/* Recent Components Section */}
        <div style={{ marginBottom: 12, marginRight: 40 }}>
          <div style={{ 
            fontSize: 10, 
            color: '#8c8c8c', 
            marginBottom: 6,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: 0.5
          }}>
            Quick Add
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {displayComponents.map((comp, index) => (
              <Tooltip key={comp.name} title={`Add ${comp.name}`}>
                <Button
                  shape="circle"
                  size="small"
                  style={{
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 'bold',
                    background: '#f5f5f5',
                    border: '1px solid #d9d9d9'
                  }}
                  onClick={() => addComponent(comp.component, comp.name)}
                >
                    {comp.icon}
                </Button>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Context Actions */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ 
            fontSize: 10, 
            color: '#8c8c8c', 
            marginBottom: 6,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: 0.5
          }}>
            Actions
          </div>
          <div style={{ 
            display: 'flex', 
            gap: 4
          }}>
            <Tooltip title="Cut">
              <Button size="small" icon={<ScissorOutlined />} onClick={cutNode} style={{ width: 28, height: 28 }} />
            </Tooltip>
            <Tooltip title="Copy">
              <Button size="small" icon={<CopyOutlined />} onClick={copyNode} style={{ width: 28, height: 28 }} />
            </Tooltip>
            <Tooltip title="Paste">
              <Button size="small" icon={<SnippetsOutlined />} onClick={pasteNode} style={{ width: 28, height: 28 }} />
            </Tooltip>
            <Tooltip title="Duplicate">
              <Button size="small" icon={<CopyFilled />} onClick={duplicateNode} style={{ width: 28, height: 28 }} />
            </Tooltip>
            <Tooltip title="Delete">
              <Button size="small" icon={<DeleteOutlined />} onClick={deleteNode} danger style={{ width: 28, height: 28 }} />
            </Tooltip>
          </div>
        </div>

        {/* Style Controls - All on one line */}
        <div>
          <div style={{ 
            fontSize: 10, 
            color: '#8c8c8c', 
            marginBottom: 6,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: 0.5
          }}>
            Style Controls
          </div>
          
          {/* Control Buttons - Single Row */}
          <div style={{ 
            display: 'flex', 
            gap: 2,
            marginBottom: 8,
            flexWrap: 'wrap'
          }}>
            {controlButtons.map((control) => (
              <div key={control.key} style={{ position: 'relative' }}>
                <Tooltip title={control.label}>
                  <Button
                    size="small"
                    type={activeControl === control.key ? 'primary' : 'default'}
                    icon={control.icon}
                    onClick={() => {
                      setActiveControl(activeControl === control.key ? null : control.key);
                    }}
                    style={{ 
                      width: 28,
                      height: 28,
                      fontSize: 10,
                      opacity: lockedControls.has(control.key) ? 0.6 : 1
                    }}
                    disabled={lockedControls.has(control.key)}
                  />
                </Tooltip>
                {/* Lock button overlay */}
                <Button
                  size="small"
                  type="text"
                  icon={lockedControls.has(control.key) ? <LockOutlined /> : <UnlockOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLock(control.key);
                  }}
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 12,
                    height: 12,
                    fontSize: 8,
                    color: lockedControls.has(control.key) ? '#ff4d4f' : '#52c41a',
                    padding: 0,
                    lineHeight: 1
                  }}
                />
              </div>
            ))}
          </div>

          {/* Active Control Slider */}
          {activeControl && (
            <div style={{ 
              background: '#f8f8f8', 
              padding: 8, 
              borderRadius: 6,
              border: '1px solid #e8e8e8'
            }}>
              <div style={{ 
                fontSize: 10, 
                color: '#595959', 
                marginBottom: 4,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontWeight: 500
              }}>
                <span>{controlButtons.find(c => c.key === activeControl)?.label}</span>
                <span style={{ 
                  fontWeight: 600,
                  fontSize: 11,
                  color: '#1890ff'
                }}>
                  {styleValues[activeControl]}
                  {activeControl === 'rotation' ? '°' : activeControl === 'zIndex' || activeControl === 'order' ? '' : 'px'}
                </span>
              </div>
              <Slider
                min={controlButtons.find(c => c.key === activeControl)?.min}
                max={controlButtons.find(c => c.key === activeControl)?.max}
                step={controlButtons.find(c => c.key === activeControl)?.step}
                value={styleValues[activeControl]}
                onChange={(value) => {
                  setStyleValues(prev => ({ ...prev, [activeControl]: value }));
                  updateStyle(activeControl, value);
                }}
                tooltip={{ open: false }}
                size="small"
              />
            </div>
          )}
        </div>
      </Card>
    </div>,
    document.body
  );
};

export default ContextMenu;
