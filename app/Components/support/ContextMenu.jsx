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
  const { recentComponents, addToRecent, clearRecent } = useRecentComponents();
  
  // All available components - using displayName for consistency
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
  const addComponent = (componentNameOrClass, componentName) => {
    if (targetNodeId) {
      try {
        // Map component name to actual component class if needed
        let Component;
        if (typeof componentNameOrClass === 'string') {
          // If we got a string (component name), map it to the actual component
          const componentMap = {
            'Box': Box,
            'Text': Text,
            'Button': CustomButton,
            'Image': Image,
            'FlexBox': FlexBox,
            'GridBox': GridBox
          };
          Component = componentMap[componentNameOrClass];
          componentName = componentNameOrClass;
        } else {
          // If we got the actual component class
          Component = componentNameOrClass;
        }

        if (!Component) {
          console.error('❌ Component not found for:', componentNameOrClass);
          return;
        }

        // Find suitable parent for adding the component
        const findSuitableParent = (startNodeId) => {
          let currentId = startNodeId;
          let attempts = 0;
          
          while (currentId && currentId !== 'ROOT' && attempts < 10) {
            attempts++;
            try {
              const currentNode = query.node(currentId).get();
              if (currentNode && currentNode.data) {
                // Check multiple ways to determine if this can accept children
                const hasCanvasProp = currentNode.data.props && currentNode.data.props.canvas;
                const isKnownContainer = currentNode.data.displayName === 'Box' || 
                                       currentNode.data.displayName === 'FlexBox' || 
                                       currentNode.data.displayName === 'GridBox';
                
                // Check if the node has been set up to accept children via CraftJS rules
                const canAcceptChildren = hasCanvasProp || isKnownContainer;
                
                console.log(`🔍 Checking node ${currentId} (${currentNode.data.displayName}):`, {
                  hasCanvasProp,
                  isKnownContainer,
                  canAcceptChildren
                });
                
                if (canAcceptChildren) {
                  console.log('✅ Found suitable parent for component:', currentNode.data.displayName);
                  return currentId;
                }
                
                currentId = currentNode.data.parent;
              } else {
                console.warn('⚠️ Node or node data is null for:', currentId);
                break;
              }
            } catch (error) {
              console.warn('⚠️ Error checking node:', currentId, error);
              break;
            }
          }
          
          // Last resort: use ROOT
          console.log('🔄 Using ROOT as fallback for component');
          return 'ROOT';
        };

        const parentId = findSuitableParent(targetNodeId);
        
        // Create and add the new component with proper props for containers
        let componentProps = {};
        
        // For container components, ensure canvas prop is set
        if (componentName === 'Box' || componentName === 'FlexBox' || componentName === 'GridBox') {
          componentProps.canvas = true;
          if (componentName === 'Box') {
            componentProps.padding = 10;
          } else if (componentName === 'FlexBox') {
            componentProps.display = 'flex';
            componentProps.flexDirection = 'row';
            componentProps.padding = 10;
          } else if (componentName === 'GridBox') {
            componentProps.display = 'grid';
            componentProps.gridTemplateColumns = 'repeat(3, 1fr)';
            componentProps.padding = 10;
          }
        }
        
        // Merge with any default craft props (but prioritize our container props)
        if (Component.craft?.props) {
          componentProps = { ...Component.craft.props, ...componentProps };
        }
        
        const newNode = query.createNode(React.createElement(Component, componentProps));
        actions.add(newNode, parentId);
        
        // Note: Recent components tracking is now handled automatically by useRecentComponents hook
        console.log('✅ Successfully added component:', componentName, 'with props:', componentProps);
      } catch (error) {
        console.error('❌ Error adding component:', error);
      }
    }
    onClose();
  };

  // Helper function to generate unique IDs
  const generateNodeId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  // Helper function to serialize node tree for clipboard (based on GitHub issue solutions)
  const serializeNodeForClipboard = (nodeId) => {
    try {
      const nodeTree = query.node(nodeId).toNodeTree();
      
      // Serialize the tree, converting component classes to strings
      const serializedTree = JSON.parse(
        JSON.stringify(nodeTree, (key, value) => {
          if (key === 'type' && typeof value === 'function') {
            return value.displayName || value.name; // Convert component class to string
          }
          if (['dom', 'rules', 'events'].includes(key)) {
            return undefined; // Exclude non-serializable fields
          }
          return value;
        })
      );
      
      return serializedTree;
    } catch (error) {
      console.error('Error serializing node:', error);
      return null;
    }
  };

  // Helper function to clone node tree with new IDs (based on GitHub issue solutions)
  const cloneNodeTree = (originalTree) => {
    try {
      // Component mapping
      const componentMap = {
        'Box': Box,
        'Text': Text,
        'Button': CustomButton,
        'Image': Image,
        'FlexBox': FlexBox,
        'GridBox': GridBox
      };

      // Create mapping of old IDs to new IDs
      const idMapping = {};
      Object.keys(originalTree.nodes).forEach(oldId => {
        idMapping[oldId] = generateNodeId();
      });

      // Clone the tree with new IDs
      let clonedTreeJson = JSON.stringify(originalTree);
      
      // Replace all old IDs with new IDs
      Object.entries(idMapping).forEach(([oldId, newId]) => {
        const regex = new RegExp(`"${oldId}"`, 'g');
        clonedTreeJson = clonedTreeJson.replace(regex, `"${newId}"`);
      });

      const clonedTree = JSON.parse(clonedTreeJson);
      
      // Update the root ID
      clonedTree.rootNodeId = idMapping[originalTree.rootNodeId];

      // Restore component types and reset events
      Object.entries(clonedTree.nodes).forEach(([nodeId, node]) => {
        const originalNodeId = Object.keys(idMapping).find(oldId => idMapping[oldId] === nodeId);
        const originalNode = originalTree.nodes[originalNodeId];
        
        if (originalNode) {
          // Restore the component type from string back to component class
          if (typeof node.data.type === 'string') {
            node.data.type = componentMap[node.data.type] || node.data.type;
          }
          
          // Copy rules from original node
          node.rules = originalNode.rules;
          
          // Reset events
          node.events = {
            dragged: false,
            hovered: false,
            selected: false
          };
        }
      });

      return clonedTree;
    } catch (error) {
      console.error('Error cloning node tree:', error);
      return null;
    }
  };

  // Context menu actions - FIXED with proper tree cloning
  const cutNode = () => {
    if (targetNodeId && targetNodeId !== 'ROOT') {
      try {
        const serializedTree = serializeNodeForClipboard(targetNodeId);
        if (serializedTree) {
          const clipboardData = {
            type: 'cut',
            nodeTree: serializedTree,
            sourceNodeId: targetNodeId,
            timestamp: Date.now()
          };
          localStorage.setItem('craft-clipboard', JSON.stringify(clipboardData));
          console.log('✂️ Cut complete node tree with children to clipboard');
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
        const serializedTree = serializeNodeForClipboard(targetNodeId);
        if (serializedTree) {
          const clipboardData = {
            type: 'copy',
            nodeTree: serializedTree,
            sourceNodeId: targetNodeId,
            timestamp: Date.now()
          };
          localStorage.setItem('craft-clipboard', JSON.stringify(clipboardData));
          console.log('📋 Copied complete node tree with children to clipboard');
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
        
        if (clipboardData) {
          const parsed = JSON.parse(clipboardData);
          console.log('📌 Pasting node tree from clipboard');
          
          if (parsed.nodeTree) {
            // Clone the tree with new IDs
            const clonedTree = cloneNodeTree(parsed.nodeTree);
            
            if (clonedTree) {
              // Find suitable parent for pasting
              const findSuitableParent = (startNodeId) => {
                let currentId = startNodeId;
                let attempts = 0;
                
                while (currentId && currentId !== 'ROOT' && attempts < 10) {
                  attempts++;
                  try {
                    const currentNode = query.node(currentId).get();
                    if (currentNode && currentNode.data) {
                      const isCanvas = currentNode.data.props && currentNode.data.props.canvas;
                      const canAcceptChildren = isCanvas || 
                                              currentNode.data.displayName === 'Box' || 
                                              currentNode.data.displayName === 'FlexBox' || 
                                              currentNode.data.displayName === 'GridBox';
                      
                      if (canAcceptChildren) {
                        console.log('✅ Found suitable parent:', currentNode.data.displayName);
                        return currentId;
                      }
                      
                      currentId = currentNode.data.parent;
                    } else {
                      break;
                    }
                  } catch (error) {
                    console.warn('⚠️ Error checking node:', currentId, error);
                    break;
                  }
                }
                
                // Last resort: use ROOT
                console.log('🔄 Using ROOT as fallback');
                return 'ROOT';
              };

              const pasteParentId = findSuitableParent(targetNodeId);
              
              // Add the cloned tree
              actions.addNodeTree(clonedTree, pasteParentId);
              
              // Use the fix from GitHub issues - serialize/deserialize to ensure proper state
              setTimeout(() => {
                actions.deserialize(query.serialize());
                actions.selectNode(clonedTree.rootNodeId);
                console.log('✅ Successfully pasted node tree with all children');
              }, 100);
              
              // If it was a cut operation, clean up clipboard
              if (parsed.type === 'cut') {
                localStorage.removeItem('craft-clipboard');
                console.log('🗑️ Cleared clipboard after cut operation');
              }
            } else {
              console.error('❌ Failed to clone node tree');
            }
          } else {
            console.warn('⚠️ Invalid clipboard data - no nodeTree found');
          }
        } else {
          console.warn('⚠️ No clipboard data found');
        }
      } catch (error) {
        console.error('❌ Error pasting node:', error);
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
          const parentNode = query.node(parentId).get();
          
          if (parentNode) {
            // Get the index where to insert the duplicate
            const nodeIndex = parentNode.data.nodes.indexOf(targetNodeId);
            
            // Serialize the node tree
            const serializedTree = serializeNodeForClipboard(targetNodeId);
            
            if (serializedTree) {
              // Clone the tree with new IDs
              const clonedTree = cloneNodeTree(serializedTree);
              
              if (clonedTree) {
                // Add the cloned tree next to the original
                actions.addNodeTree(clonedTree, parentId, nodeIndex + 1);
                
                // Use the fix from GitHub issues - serialize/deserialize to ensure proper state
                setTimeout(() => {
                  actions.deserialize(query.serialize());
                  actions.selectNode(clonedTree.rootNodeId);
                  console.log('✅ Successfully duplicated node tree with all children');
                }, 100);
              } else {
                console.error('❌ Failed to clone node tree for duplication');
              }
            } else {
              console.error('❌ Failed to serialize node for duplication');
            }
          }
        }
      } catch (error) {
        console.error('❌ Error duplicating node:', error);
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
        zIndex: 99998,
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
          border: '1px solid #e8e8e8',
          zIndex: 99999 // Ensure tooltips appear above everything
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
            letterSpacing: 0.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            Quick Add ({recentComponents.length > 0 ? 'Recent' : 'Default'})
            {/* Debug: Clear recent button */}
            {recentComponents.length > 0 && (
              <Button 
                size="small" 
                type="text" 
                style={{ fontSize: 8, padding: '0 4px', height: 16 }}
                onClick={(e) => {
                  e.stopPropagation();
                  clearRecent();
                }}
              >
                Clear
              </Button>
            )}
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
                    background: recentComponents.length > 0 && index < recentComponents.length ? '#e6f7ff' : '#f5f5f5',
                    border: recentComponents.length > 0 && index < recentComponents.length ? '1px solid #91d5ff' : '1px solid #d9d9d9'
                  }}
                  onClick={() => {
                    // For recent components, we only have name and icon, so pass the name
                    if (recentComponents.length > 0 && index < recentComponents.length) {
                      addComponent(comp.name, comp.name);
                    } else {
                      // For default components, we have the actual component class
                      addComponent(comp.component, comp.name);
                    }
                  }}
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
