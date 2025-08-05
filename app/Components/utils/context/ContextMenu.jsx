'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  SnippetsOutlined,
  AppstoreOutlined,
  EditOutlined,
  BgColorsOutlined
} from '@ant-design/icons';
import { useEditor, useNode } from '@craftjs/core';
import { useMultiSelect } from './MultiSelectContext';
import { Box } from '../../user/Box';
import { Text } from '../../user/Text';
import { Button as CustomButton } from '../../user/Button';
import { Image } from '../../user/Image';
import { FlexBox } from '../../user/FlexBox';
import { GridBox } from '../../user/GridBox';
import { Paragraph } from '../../user/Paragraph';
import { Video } from '../../user/Video';
import { Carousel } from '../../user/Carousel';
import { FormInput } from '../../user/Input';
import { Link } from '../../user/Link';
import { Form } from '../../user/Advanced/Form';
import { ShopFlexBox } from '../../user/Advanced/ShopFlexBox';
import { useRecentComponents } from '../craft/useRecentComponents';

const ContextMenu = ({ 
  visible, 
  position, 
  onClose, 
  targetNodeId 
}) => {
  const { actions, query } = useEditor();
  const { selectedNodes, isMultiSelecting } = useMultiSelect();
  const { recentComponents, addToRecent, clearRecent } = useRecentComponents();
  const menuRef = useRef(null);
  const drawerRef = useRef(null);
  
  // Determine which nodes to operate on (memoized to prevent infinite re-renders)
  const operationNodes = useMemo(() => {
    return isMultiSelecting && selectedNodes.size > 0 
      ? Array.from(selectedNodes) 
      : targetNodeId ? [targetNodeId] : [];
  }, [isMultiSelecting, selectedNodes, targetNodeId]);
  
 
  
  // All available components - using displayName for consistency
  const allComponents = [
    { name: 'Box', component: Box, icon: '⬜' },
    { name: 'Text', component: Text, icon: 'T' },
    { name: 'Button', component: CustomButton, icon: '🔘' },
    { name: 'Image', component: Image, icon: '🖼️' },
    { name: 'FlexBox', component: FlexBox, icon: '📦' },
    { name: 'GridBox', component: GridBox, icon: '▦' },
    { name: 'Paragraph', component: Paragraph, icon: '¶' },
    { name: 'Video', component: Video, icon: '🎥' },
    { name: 'Carousel', component: Carousel, icon: '🎠' },
    { name: 'FormInput', component: FormInput, icon: '📝' },
    { name: 'Link', component: Link, icon: '🔗' },
    { name: 'Form', component: Form, icon: '📋' },
    { name: 'ShopFlexBox', component: ShopFlexBox, icon: '🛒' }
  ];

  
  const [activeControl, setActiveControl] = useState(null);
  const [lockedControls, setLockedControls] = useState(new Set());
  const [isRecentLocked, setIsRecentLocked] = useState(false);
  const [showComponentDrawer, setShowComponentDrawer] = useState(false);
  const [selectedComponentForSlot, setSelectedComponentForSlot] = useState(null);
  const [manualSlots, setManualSlots] = useState({
    1: 'Box',
    2: 'Text', 
    3: 'Button'
  }); // Manual slot assignments when locked
  const [styleValues, setStyleValues] = useState({
    borderRadius: 0,
    padding: 4,
    margin: 5,
    zIndex: 1,
    rotation: 0,
    stroke: 0,
    strokeColor: '#000000',
    backgroundColor: '#ffffff'
  });





  // Get display components based on lock status and manual/recent selections
  const displayComponents = (() => {
    if (isRecentLocked) {
      // Use manual slot assignments, fill empty slots with recent components
      const slots = [1, 2, 3];
      return slots.map(slotNum => {
        if (manualSlots[slotNum]) {
          // Return manually assigned component
          return allComponents.find(comp => comp.name === manualSlots[slotNum]);
        } else if (recentComponents.length >= slotNum) {
          // Fill empty slots with recent components
          return recentComponents[slotNum - 1];
        } else {
          // Fallback to default components
          return allComponents[slotNum - 1];
        }
      }).filter(Boolean);
    } else {
      // When unlocked, use recent components or fallback to defaults
      if (recentComponents.length > 0) {
        return recentComponents.slice(0, 3);
      } else {
        return allComponents.slice(0, 3);
      }
    }
  })();

  // Get current node props to initialize slider values
  useEffect(() => {
    if (operationNodes.length > 0) {
      try {
        // Helper function to safely parse margin values
        const parseMargin = (margin) => {
          if (typeof margin === 'number') {
            return margin;
          }
          if (typeof margin === 'string') {
            // Try to extract first number from string like "0 4px" or "10px"
            const match = margin.match(/\d+/);
            return match ? parseInt(match[0]) : 5;
          }
          return 5; // default fallback
        };

        // Get properties from all operation nodes
        const nodeProperties = operationNodes.map(nodeId => {
          const node = query.node(nodeId).get();
          if (node && node.data && node.data.props) {
            const props = node.data.props;
            return {
              borderRadius: parseInt(props.borderRadius) || 0,
              padding: parseInt(props.padding) || 4,
              margin: parseMargin(props.margin),
              zIndex: parseInt(props.zIndex) || 1,
              rotation: 0, // We'll add this as a new feature
              stroke: parseInt(props.stroke) || 0,
              strokeColor: props.strokeColor || '#000000',
              backgroundColor: props.backgroundColor || '#ffffff'
            };
          }
          return null;
        }).filter(Boolean);

        if (nodeProperties.length > 0) {
          // Calculate shared properties (use first node's values, but could be enhanced to show "mixed" state)
          const sharedProps = nodeProperties[0];
          
          // For multi-selection, you could check if all nodes have the same value
          // and show "Mixed" or average values if they differ
          if (operationNodes.length > 1) {
          }
          
          setStyleValues(prev => ({
            ...prev,
            ...sharedProps
          }));
        }
      } catch (error) {
        console.error('Error getting node props:', error);
      }
    }
  }, [operationNodes, query]);

  // Handle clicks outside menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is within main menu
      if (menuRef.current && menuRef.current.contains(event.target)) {
        return;
      }
      
      // Check if click is within component drawer (if open)
      if (showComponentDrawer && drawerRef.current && drawerRef.current.contains(event.target)) {
        return;
      }
      
      // If click is outside both menu and drawer, close the menu
      onClose();
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [visible, onClose, showComponentDrawer]);

  // Handle recent components lock toggle
  const toggleRecentLock = () => {
    setIsRecentLocked(prev => !prev);
  };

  // Handle slot assignment in drawer
  const assignComponentToSlot = (componentName, slotNumber) => {
    setManualSlots(prev => ({
      ...prev,
      [slotNumber]: componentName
    }));
    setSelectedComponentForSlot(null); // Clear selection after assignment
  };

  // Handle component drawer visibility toggle
  const toggleComponentDrawer = () => {
    setShowComponentDrawer(prev => !prev);
    setSelectedComponentForSlot(null); // Clear selection when closing
  };

  // Centralized component mapping - single source of truth
  const getComponentMap = () => ({
    'Box': Box,
    'Text': Text,
    'Button': CustomButton,
    'Image': Image,
    'FlexBox': FlexBox,
    'GridBox': GridBox,
    'Paragraph': Paragraph,
    'Video': Video,
    'Carousel': Carousel,
    'FormInput': FormInput,
    'Link': Link,
    'Form': Form,
    'ShopFlexBox': ShopFlexBox
  });

  // Add component to target node
  const addComponent = (componentNameOrClass, componentName) => {
    if (targetNodeId) {
      try {
        // Map component name to actual component class if needed
        let Component;
        if (typeof componentNameOrClass === 'string') {
          // If we got a string (component name), map it to the actual component
          const componentMap = getComponentMap();
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
                
                
                
                if (canAcceptChildren) {
                  return currentId;
                }
                
                currentId = currentNode.data.parent;
              } else {
                break;
              }
            } catch (error) {
              break;
            }
          }
          
          // Last resort: use ROOT
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
        
        // Use the new parseReactElement method instead of deprecated createNode
        const reactElement = React.createElement(Component, componentProps);
        const nodeTree = query.parseReactElement(reactElement).toNodeTree();
        actions.addNodeTree(nodeTree, parentId);
        
        // Note: Recent components tracking is now handled automatically by useRecentComponents hook
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
      // Component mapping - Use centralized mapping
      const componentMap = getComponentMap();

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
                return 'ROOT';
              };

              const pasteParentId = findSuitableParent(targetNodeId);
              
              // Add the cloned tree
              actions.addNodeTree(clonedTree, pasteParentId);
              
              // Use the fix from GitHub issues - serialize/deserialize to ensure proper state
              setTimeout(() => {
                actions.deserialize(query.serialize());
                actions.selectNode(clonedTree.rootNodeId);
              }, 100);
              
              // If it was a cut operation, clean up clipboard
              if (parsed.type === 'cut') {
                localStorage.removeItem('craft-clipboard');
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
    if (operationNodes.length > 0) {
      try {
        // Delete all operation nodes
        operationNodes.forEach(nodeId => {
          if (nodeId !== 'ROOT') {
            const node = query.node(nodeId).get();
            if (node) {
              actions.delete(nodeId);
            }
          }
        });
        
      } catch (error) {
        console.error('Error deleting nodes:', error);
      }
    }
    onClose();
  };

  // Update style property
  const updateStyle = (property, value) => {
    if (operationNodes.length > 0 && !lockedControls.has(property)) {
      // Apply to all operation nodes (either selected nodes or target node)
      operationNodes.forEach(nodeId => {
        actions.setProp(nodeId, (props) => {
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
            case 'stroke':
              props.stroke = value;
              break;
            case 'strokeColor':
              props.strokeColor = value;
              break;
            case 'backgroundColor':
              props.backgroundColor = value;
              break;
          }
        });
      });
      
      console.log(`🎨 Applied ${property}: ${value} to ${operationNodes.length} nodes`);
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
      key: 'stroke', 
      icon: <EditOutlined />, 
      label: 'Stroke Width',
      min: 0,
      max: 20,
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
        zIndex: 99999,
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
          zIndex: 999 // Ensure tooltips appear above everything
        }}
        bodyStyle={{ padding: 12 }}
      >
        {/* Color Pickers (Top Right) */}
        <div style={{ 
          position: 'absolute', 
          top: 12, 
          right: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          zIndex: 99999999999
        }}>
          {/* Background Color Picker */}
          <Tooltip title="Background Color" placement="left">
            <ColorPicker
              zIndex={99999}
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
                height: 24,
                zIndex: 99999999999,
              }}
            />
          </Tooltip>
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
            Quick Add ({isRecentLocked ? 'Manual' : 'Recent'})
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {/* Lock/Unlock button for recent components */}
              <Button 
                size="small" 
                type="text" 
                style={{ 
                  fontSize: 10, 
                  padding: '2px 4px', 
                  height: 16,
                  color: isRecentLocked ? '#1890ff' : '#8c8c8c',
                  fontWeight: 'bold'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRecentLock();
                }}
                title={isRecentLocked ? 'Switch to Auto (Recent components)' : 'Switch to Manual (Custom slots)'}
              >
                {isRecentLocked ? 'M' : 'A'}
              </Button>
              
              {/* Component selection drawer toggle */}
              <Button 
                size="small" 
                type="text" 
                style={{ 
                  fontSize: 10, 
                  padding: '2px 4px', 
                  height: 16,
                  color: showComponentDrawer ? '#1890ff' : '#8c8c8c'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleComponentDrawer();
                }}
                title="Toggle component selector"
              >
                <AppstoreOutlined />
              </Button>
              
              {/* Debug: Clear recent button */}
              {recentComponents.length > 0 && !isRecentLocked && (
                <Button 
                  size="small" 
                  type="text" 
                  style={{ fontSize: 8, padding: '0 4px', height: 16 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    clearRecent();
                  }}
                  title="Clear recent components"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {displayComponents.map((comp, index) => (
                    
              <Tooltip key={comp.name} zIndex={99999} title={`Add ${comp.name}`}>
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
            <Tooltip zIndex={99999} title="Cut">
              <Button size="small" icon={<ScissorOutlined />} onClick={cutNode} style={{ width: 28, height: 28 }} />
            </Tooltip>
            <Tooltip zIndex={99999} title="Copy">
              <Button size="small" icon={<CopyOutlined />} onClick={copyNode} style={{ width: 28, height: 28 }} />
            </Tooltip>
            <Tooltip zIndex={99999} title="Paste">
              <Button size="small" icon={<SnippetsOutlined />} onClick={pasteNode} style={{ width: 28, height: 28 }} />
            </Tooltip>
            <Tooltip zIndex={99999} title="Duplicate">
              <Button size="small" icon={<CopyFilled />} onClick={duplicateNode} style={{ width: 28, height: 28 }} />
            </Tooltip>
            <Tooltip zIndex={99999} title="Delete">
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
                <Tooltip zIndex={99999} title={control.label}>
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
                
                {/* Stroke Color Picker - positioned at bottom right of stroke control */}
                {control.key === 'stroke' && (
                  <div style={{
                    position: 'absolute',
                    bottom: -2,
                    right: 10, // Offset to avoid overlap with lock button
                    zIndex: 99999999999
                  }}>
                    <Tooltip title="Stroke Color" placement="top">
                      <ColorPicker
                        zIndex={99999}
                        value={styleValues.strokeColor}
                        onChange={(color) => {
                          const colorStr = color.toHexString();
                          setStyleValues(prev => ({ ...prev, strokeColor: colorStr }));
                          updateStyle('strokeColor', colorStr);
                        }}
                        showText={false}
                        size="small"
                        style={{
                          width: 12,
                          height: 12,
                          border: '1px solid #fff',
                          borderRadius: '50%',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }}
                      />
                    </Tooltip>
                  </div>
                )}
                
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

      {/* Component Selection Drawer */}
      {showComponentDrawer && (
        <Card
          ref={drawerRef}
          style={{
            position: 'absolute',
            top: position.y,
            left: position.x + 230, // Position to the right of main menu
            width: 300,
            maxHeight: 400,
            overflowY: 'auto',
            pointerEvents: 'auto',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            borderRadius: 8,
            border: '1px solid #e8e8e8',
            zIndex: 99999999999999,
            background: '#fff'
          }}
          bodyStyle={{ padding: 12 }}
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          onMouseLeave={() => {
            // Close drawer when mouse leaves
            setShowComponentDrawer(false);
            setSelectedComponentForSlot(null); // Also clear selection
          }}
        >
          <div style={{ 
            fontSize: 12, 
            fontWeight: 600, 
            marginBottom: 12,
            color: '#262626',
            borderBottom: '1px solid #f0f0f0',
            paddingBottom: 8
          }}>
            Component Slot Assignment
          </div>
          
          {/* Slot indicators */}
          <div style={{ 
            display: 'flex', 
            gap: 8, 
            marginBottom: 12,
            padding: 8,
            background: '#f8f8f8',
            borderRadius: 6
          }}>
            {[1, 2, 3].map(slotNum => {
              const assignedComponent = manualSlots[slotNum];
              const component = allComponents.find(comp => comp.name === assignedComponent);
              return (
                <Button
                  key={slotNum} 
                  style={{
                    flex: 1,
                    height: 60,
                    padding: 8,
                    background: selectedComponentForSlot && !assignedComponent ? '#fff7e6' : '#fff',
                    border: selectedComponentForSlot && !assignedComponent ? '2px dashed #ffa940' : '1px solid #e8e8e8',
                    borderRadius: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    cursor: selectedComponentForSlot ? 'pointer' : 'default'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedComponentForSlot) {
                      assignComponentToSlot(selectedComponentForSlot, slotNum);
                    }
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Slot {slotNum}</div>
                  <div style={{ fontSize: 16, marginBottom: 2 }}>
                    {component?.icon || (selectedComponentForSlot ? '📍' : '❓')}
                  </div>
                  <div style={{ fontSize: 9, color: '#666' }}>
                    {assignedComponent || (selectedComponentForSlot ? 'Click here' : 'Empty')}
                  </div>
                </Button>
              );
            })}
          </div>
          
          {/* Component selection */}
          <div style={{ 
            fontSize: 10, 
            color: '#666', 
            marginBottom: 8,
            fontWeight: 500
          }}>
            {selectedComponentForSlot 
              ? `Selected: ${selectedComponentForSlot} - Click a slot to assign` 
              : 'Click a component to select it:'
            }
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: 6 
          }}>
            {allComponents.map((comp) => (
              <Button
                key={comp.name}
                size="small"
                style={{
                  height: 50,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  background: selectedComponentForSlot === comp.name ? '#e6f7ff' : '#fafafa',
                  border: selectedComponentForSlot === comp.name ? '2px solid #1890ff' : '1px solid #d9d9d9',
                  borderRadius: 4,
                  fontSize: 8,
                  transition: 'all 0.2s ease'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedComponentForSlot(selectedComponentForSlot === comp.name ? null : comp.name);
                }}
              >
                <span style={{ fontSize: 14 }}>{comp.icon}</span>
                <span>{comp.name}</span>
              </Button>
            ))}
          </div>
          
          <div style={{ 
            marginTop: 12, 
            paddingTop: 8, 
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            gap: 8
          }}>
            <Button 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                setManualSlots({ 1: null, 2: null, 3: null });
              }}
              style={{ flex: 1 }}
            >
              Clear All Slots
            </Button>
          </div>
        </Card>
      )}
    </div>,
    document.body
  );
};

export default ContextMenu;
