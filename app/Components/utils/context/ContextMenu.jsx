'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Card, Slider, ColorPicker, Button, Tooltip, Divider, ConfigProvider, theme } from 'antd';
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
import { useTheme } from '../../theme/ThemeProvider';
import { Box } from '../../user/Layout/Box';
import { Text } from '../../user/Text/Text';
import { Button as CustomButton } from '../../user/Interactive/Button';
import { Image } from '../../user/Media/Image';
import { FlexBox } from '../../user/Layout/FlexBox';
import { GridBox } from '../../user/Layout/GridBox';
import { Paragraph } from '../../user/Text/Paragraph';
import { Video } from '../../user/Media/Video';
import { Carousel } from '../../user/Media/Carousel';
import { FormInput } from '../../user/Input';
import { Link } from '../../user/Interactive/Link';
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
  const { effectiveTheme } = useTheme();
  const menuRef = useRef(null);
  const drawerRef = useRef(null);
  const [hasTextSelection, setHasTextSelection] = useState(false);
  
  // Theme-aware styles
  const isDark = effectiveTheme === 'dark';
  const themeStyles = {
    background: isDark 
      ? 'rgba(26, 26, 26, 0.95)' 
      : 'rgba(255, 255, 255, 0.95)',
    border: isDark 
      ? '1px solid #525252' 
      : '1px solid #e2e8f0',
    textColor: isDark ? '#f5f5f5' : '#1e293b',
    textColorSecondary: isDark ? '#d4d4d4' : '#64748b',
    cardBackground: isDark ? '#1f1f1f' : '#ffffff',
    shadowColor: isDark 
      ? 'rgba(0, 0, 0, 0.8)' 
      : 'rgba(0, 0, 0, 0.15)',
    backdropFilter: 'blur(20px) saturate(180%)',
    hoverBackground: isDark ? '#404040' : '#f5f5f5'
  };
  
  // Apply global CSS for tooltips to follow theme
  useEffect(() => {
    if (visible) {
      const style = document.createElement('style');
      style.id = 'context-menu-tooltip-override';
      style.textContent = `
        .ant-tooltip {
          z-index: 99999999 !important;
        }
        .ant-tooltip-inner {
          background: ${isDark ? '#1f1f1f' : '#ffffff'} !important;
          color: ${themeStyles.textColor} !important;
          border: 1px solid ${isDark ? '#525252' : '#e2e8f0'} !important;
        }
        .ant-tooltip-arrow::before {
          background: ${isDark ? '#1f1f1f' : '#ffffff'} !important;
          border: 1px solid ${isDark ? '#525252' : '#e2e8f0'} !important;
        }
        /* Force better contrast for Ant Design icons in context menu */
        .ant-btn .anticon {
          color: ${themeStyles.textColor} !important;
        }
        .ant-btn:hover .anticon {
          color: ${themeStyles.textColor} !important;
        }
        /* Ensure all spans within buttons inherit text color */
        .ant-btn span {
          color: inherit !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        const existingStyle = document.getElementById('context-menu-tooltip-override');
        if (existingStyle) {
          document.head.removeChild(existingStyle);
        }
      };
    }
  }, [visible, isDark, themeStyles]);

  // Determine which nodes to operate on (memoized to prevent infinite re-renders)
  const operationNodes = useMemo(() => {
    return isMultiSelecting && selectedNodes.size > 0 
      ? Array.from(selectedNodes) 
      : targetNodeId ? [targetNodeId] : [];
  }, [isMultiSelecting, selectedNodes, targetNodeId]);

  // Determine if the target node is a Text node (for Copy Text action)
  const isTextTarget = useMemo(() => {
    try {
      if (!targetNodeId) return false;
      const node = query.node(targetNodeId).get();
      if (!node || !node.data) return false;
      // Prefer displayName, but also check for text prop presence
      const display = node.data.displayName || node.data.type?.name;
      const hasTextProp = !!node.data.props?.text;
      const hasContentProp = !!node.data.props?.content; // e.g., Paragraph
      return display === 'Text' || display === 'Paragraph' || hasTextProp || hasContentProp;
    } catch {
      return false;
    }
  }, [query, targetNodeId]);
  
 
  
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

  // Track if there is any current DOM text selection (to hint Copy Text availability)
  useEffect(() => {
    if (!visible) return;
    const handleSelectionChange = () => {
      try {
        const sel = window.getSelection();
        setHasTextSelection(!!sel && sel.toString().length > 0);
      } catch {
        setHasTextSelection(false);
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    handleSelectionChange();
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [visible]);

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

  // Copy selected text or the Text node's content to the OS clipboard
  const copyTextContent = async () => {
    try {
      let textToCopy = '';
      // 1) Prefer any active user selection
      const sel = window.getSelection && window.getSelection();
      if (sel && sel.toString()) {
        textToCopy = sel.toString();
      }
      // 2) Fallback to the node's text prop if available
      if (!textToCopy && targetNodeId) {
        const node = query.node(targetNodeId).get();
        const props = node?.data?.props || {};
        if (props.text) {
          textToCopy = props.text;
        } else if (props.content) {
          // Strip HTML to plain text for rich content
          const tmp = document.createElement('div');
          tmp.innerHTML = props.content;
          textToCopy = tmp.textContent || tmp.innerText || '';
        }
      }

      if (!textToCopy) {
        console.warn('No text available to copy');
        onClose();
        return;
      }

      // Use modern clipboard API with fallback
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const ta = document.createElement('textarea');
        ta.value = textToCopy;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      
      // Show success feedback
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${isDark ? '#52c41a' : '#f6ffed'};
        color: ${isDark ? '#fff' : '#52c41a'};
        border: 1px solid ${isDark ? 'rgba(255,255,255,0.2)' : '#b7eb8f'};
        padding: 8px 16px;
        border-radius: 8px;
        z-index: 999999;
        font-size: 14px;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      notification.textContent = `✓ Text copied: "${textToCopy.substring(0, 30)}${textToCopy.length > 30 ? '...' : ''}"`;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 2000);
    } catch (err) {
      console.error('Error copying text:', err);
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
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorText: themeStyles.textColor,
          colorTextSecondary: themeStyles.textColorSecondary,
          colorBgElevated: themeStyles.cardBackground,
          colorBorder: isDark ? '#525252' : '#e2e8f0',
          colorBgContainer: themeStyles.cardBackground,
        },
        components: {
          Tooltip: {
            colorBgSpotlight: isDark ? '#1f1f1f' : '#ffffff',
            colorTextLightSolid: themeStyles.textColor,
          },
          Slider: {
            colorText: themeStyles.textColor,
          },
        }
      }}
    >
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
          width: 260,
          pointerEvents: 'auto',
          boxShadow: `0 20px 40px ${themeStyles.shadowColor}`,
          borderRadius: 16,
          overflow: 'hidden',
          border: themeStyles.border,
          background: themeStyles.background,
          backdropFilter: themeStyles.backdropFilter,
          zIndex: 999,
          // Prevent text selection on the menu itself, but allow on inputs
          userSelect: 'none'
        }}
        bodyStyle={{ 
          padding: 16,
          background: 'transparent',
          color: themeStyles.textColor
        }}
        // Allow text selection on the card content for copying
        onMouseDown={(e) => {
          // Only prevent if not clicking on selectable text elements
          const target = e.target;
          const isSelectableText = target.tagName === 'INPUT' || 
                                  target.tagName === 'TEXTAREA' || 
                                  target.contentEditable === 'true' ||
                                  target.closest('.selectable-text');
          if (!isSelectableText) {
            e.preventDefault();
          }
        }}
      >
        {/* Color Pickers (Top Right) */}
        <div style={{ 
          position: 'absolute', 
          top: 16, 
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
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
                width: 28,
                height: 28,
                borderRadius: 8,
                border: `2px solid ${themeStyles.border}`,
                boxShadow: `0 2px 8px ${themeStyles.shadowColor}`,
                zIndex: 99999999999,
              }}
            />
          </Tooltip>
        </div>

  {/* Quick Add - Recent/Manual */}
        <div style={{ marginBottom: 16, marginRight: 48 }}>
          <div style={{ 
            fontSize: 11, 
            color: themeStyles.textColorSecondary, 
            marginBottom: 8,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span className="selectable-text" style={{ color: themeStyles.textColorSecondary }}>Quick Add ({isRecentLocked ? 'Manual' : 'Recent'})</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {/* Lock/Unlock button for recent components */}
              <Button 
                size="small" 
                type="text" 
                style={{ 
                  fontSize: 10, 
                  padding: '2px 6px', 
                  height: 18,
                  color: isRecentLocked ? '#1890ff' : themeStyles.textColorSecondary,
                  fontWeight: 'bold',
                  background: isRecentLocked ? 'rgba(24, 144, 255, 0.1)' : 'transparent',
                  borderRadius: 4
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
                  padding: '2px 6px', 
                  height: 18,
                  color: showComponentDrawer ? '#1890ff' : themeStyles.textColorSecondary,
                  background: showComponentDrawer ? 'rgba(24, 144, 255, 0.1)' : 'transparent',
                  borderRadius: 4
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
                  style={{ 
                    fontSize: 8, 
                    padding: '0 6px', 
                    height: 18,
                    color: themeStyles.textColorSecondary,
                    borderRadius: 4
                  }}
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
          <div style={{ display: 'flex', gap: 8 }}>
            {displayComponents.map((comp, index) => (
                    
              <Tooltip key={comp.name} zIndex={99999} title={`Add ${comp.name}`}>
                <Button
                  shape="circle"
                  size="small"
                  style={{
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 'bold',
                    background: recentComponents.length > 0 && index < recentComponents.length 
                      ? (isDark ? 'rgba(24, 144, 255, 0.2)' : '#e6f7ff')
                      : (isDark ? 'rgba(255, 255, 255, 0.08)' : '#f5f5f5'),
                    border: recentComponents.length > 0 && index < recentComponents.length 
                      ? (isDark ? '1px solid rgba(24, 144, 255, 0.5)' : '1px solid #91d5ff')
                      : `1px solid ${isDark ? '#525252' : '#d9d9d9'}`,
                    color: themeStyles.textColor,
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = `0 4px 12px ${themeStyles.shadowColor}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
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
        <div style={{ marginBottom: 16 }}>
          <div style={{ 
            fontSize: 11, 
            color: themeStyles.textColorPrimary, 
            marginBottom: 8,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.8
          }}>
            <span className="selectable-text" style={{ color: themeStyles.textColorSecondary }}>Actions</span>
          </div>
          <div style={{ 
            display: 'flex', 
            gap: 6,
            flexWrap: 'wrap'
          }}>
            <Tooltip zIndex={99999} title="Open Props Manager">
              <Button 
                size="small" 
                // Sliders icon without adding new heavy UI dependency; reuse EditOutlined for consistency
                icon={<EditOutlined />} 
                onClick={() => {
                  try {
                    if (targetNodeId) {
                      actions.selectNode(targetNodeId);
                    }
                    const evt = new CustomEvent('open-props-manager', { detail: { target: 'component' } });
                    window.dispatchEvent(evt);
                  } catch {/* ignore */}
                  onClose();
                }} 
                style={{ 
                  width: 32, 
                  height: 32,
                  background: isDark ? 'rgba(24, 144, 255, 0.15)' : '#e6f7ff',
                  border: isDark ? '1px solid rgba(24, 144, 255, 0.4)' : '1px solid #91d5ff',
                  color: isDark ? '#69c0ff' : '#1890ff',
                  borderRadius: 8,
                  transition: 'all 0.2s ease'
                }} 
              />
            </Tooltip>
            <Tooltip zIndex={99999} title="Cut">
              <Button 
                size="small" 
                icon={<ScissorOutlined />} 
                onClick={cutNode} 
                style={{ 
                  width: 32, 
                  height: 32,
                  background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#fafafa',
                  border: `1px solid ${isDark ? '#525252' : '#d9d9d9'}`,
                  color: themeStyles.textColor,
                  borderRadius: 8,
                  transition: 'all 0.2s ease'
                }} 
              />
            </Tooltip>
            <Tooltip zIndex={99999} title="Copy component">
              <Button 
                size="small" 
                icon={<CopyOutlined />} 
                onClick={copyNode} 
                style={{ 
                  width: 32, 
                  height: 32,
                  background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#fafafa',
                  border: `1px solid ${isDark ? '#525252' : '#d9d9d9'}`,
                  color: themeStyles.textColor,
                  borderRadius: 8,
                  transition: 'all 0.2s ease'
                }} 
              />
            </Tooltip>
            {(isTextTarget || hasTextSelection) && (
              <Tooltip zIndex={99999} title={hasTextSelection ? 'Copy selected text' : 'Copy text content'}>
                <Button 
                  size="small" 
                  onClick={copyTextContent} 
                  style={{ 
                    width: 32, 
                    height: 32,
                    background: isDark ? 'rgba(82, 196, 26, 0.2)' : '#f6ffed',
                    border: isDark ? '1px solid rgba(82, 196, 26, 0.5)' : '1px solid #b7eb8f',
                    color: isDark ? '#73d13d' : '#52c41a',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease'
                  }}
                >
                  T
                </Button>
              </Tooltip>
            )}
            <Tooltip zIndex={99999} title="Paste">
              <Button 
                size="small" 
                icon={<SnippetsOutlined />} 
                onClick={pasteNode} 
                style={{ 
                  width: 32, 
                  height: 32,
                  background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#fafafa',
                  border: `1px solid ${isDark ? '#525252' : '#d9d9d9'}`,
                  color: themeStyles.textColor,
                  borderRadius: 8,
                  transition: 'all 0.2s ease'
                }} 
              />
            </Tooltip>
            <Tooltip zIndex={99999} title="Duplicate">
              <Button 
                size="small" 
                icon={<CopyFilled />} 
                onClick={duplicateNode} 
                style={{ 
                  width: 32, 
                  height: 32,
                  background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#fafafa',
                  border: `1px solid ${isDark ? '#525252' : '#d9d9d9'}`,
                  color: themeStyles.textColor,
                  borderRadius: 8,
                  transition: 'all 0.2s ease'
                }} 
              />
            </Tooltip>
            <Tooltip zIndex={99999} title="Delete">
              <Button 
                size="small" 
                icon={<DeleteOutlined />} 
                onClick={deleteNode} 
                style={{ 
                  width: 32, 
                  height: 32,
                  background: isDark ? 'rgba(255, 77, 79, 0.2)' : '#fff2f0',
                  border: isDark ? '1px solid rgba(255, 77, 79, 0.5)' : '1px solid #ffccc7',
                  color: '#ff4d4f',
                  borderRadius: 8,
                  transition: 'all 0.2s ease'
                }} 
              />
            </Tooltip>
          </div>
        </div>

        {/* Style Controls - All on one line */}
        <div>
          <div style={{ 
            fontSize: 11, 
            color: themeStyles.textColorSecondary, 
            marginBottom: 8,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.8
          }}>
            <span className="selectable-text" style={{ color: themeStyles.textColorSecondary }}>Style Controls</span>
          </div>
          
          {/* Control Buttons - Single Row */}
          <div style={{ 
            display: 'flex', 
            gap: 4,
            marginBottom: 12,
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
                      width: 32,
                      height: 32,
                      fontSize: 12,
                      opacity: lockedControls.has(control.key) ? 0.6 : 1,
                      background: activeControl === control.key 
                        ? '#1890ff'
                        : (isDark ? 'rgba(255, 255, 255, 0.08)' : '#fafafa'),
                      border: activeControl === control.key 
                        ? '1px solid #1890ff'
                        : `1px solid ${isDark ? '#525252' : '#d9d9d9'}`,
                      color: activeControl === control.key 
                        ? '#fff'
                        : themeStyles.textColor,
                      borderRadius: 8,
                      transition: 'all 0.2s ease'
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
                    width: 14,
                    height: 14,
                    fontSize: 9,
                    color: lockedControls.has(control.key) ? '#ff4d4f' : '#52c41a',
                    padding: 0,
                    lineHeight: 1,
                    background: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.9)',
                    borderRadius: '50%',
                    border: `1px solid ${lockedControls.has(control.key) ? '#ff4d4f' : '#52c41a'}`
                  }}
                />
              </div>
            ))}
          </div>

          {/* Active Control Slider */}
          {activeControl && (
            <div style={{ 
              background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f8f8f8', 
              padding: 12, 
              borderRadius: 8,
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e8e8e8'
            }}>
              <div style={{ 
                fontSize: 11, 
                color: themeStyles.textColor, 
                marginBottom: 6,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontWeight: 500
              }}>
                <span className="selectable-text" style={{ color: themeStyles.textColor }}>
                  {controlButtons.find(c => c.key === activeControl)?.label}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Stroke Color Picker - show only when stroke control is active */}
                  {activeControl === 'stroke' && (
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
                          width: 20,
                          height: 20,
                          border: `2px solid ${themeStyles.textColor}`,
                          borderRadius: '50%',
                          boxShadow: `0 2px 6px ${themeStyles.shadowColor}`
                        }}
                      />
                    </Tooltip>
                  )}
                  <span style={{ 
                    fontWeight: 600,
                    fontSize: 12,
                    color: '#1890ff',
                    background: isDark ? 'rgba(24, 144, 255, 0.1)' : 'rgba(24, 144, 255, 0.08)',
                    padding: '2px 6px',
                    borderRadius: 4
                  }} className="selectable-text">
                    {styleValues[activeControl]}
                    {activeControl === 'rotation' ? '°' : activeControl === 'zIndex' || activeControl === 'order' ? '' : 'px'}
                  </span>
                </div>
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
                styles={{
                  track: {
                    background: isDark ? 'rgba(255, 255, 255, 0.2)' : '#f0f0f0'
                  },
                  rail: {
                    background: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e8e8e8'
                  }
                }}
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
            left: position.x + 250, // Position to the right of main menu
            width: 320,
            maxHeight: 420,
            overflowY: 'auto',
            pointerEvents: 'auto',
            boxShadow: `0 20px 40px ${themeStyles.shadowColor}`,
            borderRadius: 16,
            border: themeStyles.border,
            background: themeStyles.background,
            backdropFilter: themeStyles.backdropFilter,
            zIndex: 99999999999999
          }}
          bodyStyle={{ 
            padding: 16,
            background: 'transparent',
            color: themeStyles.textColor
          }}
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          onMouseLeave={() => {
            // Close drawer when mouse leaves
            setShowComponentDrawer(false);
            setSelectedComponentForSlot(null); // Also clear selection
          }}
        >
          <div style={{ 
            fontSize: 13, 
            fontWeight: 600, 
            marginBottom: 16,
            color: themeStyles.textColor,
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #f0f0f0',
            paddingBottom: 8
          }}>
            <span className="selectable-text" style={{ color: themeStyles.textColor }}>Component Slot Assignment</span>
          </div>
          
          {/* Slot indicators */}
          <div style={{ 
            display: 'flex', 
            gap: 8, 
            marginBottom: 16,
            padding: 12,
            background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f8f8f8',
            borderRadius: 8,
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e8e8e8'
          }}>
            {[1, 2, 3].map(slotNum => {
              const assignedComponent = manualSlots[slotNum];
              const component = allComponents.find(comp => comp.name === assignedComponent);
              return (
                <Button
                  key={slotNum} 
                  style={{
                    flex: 1,
                    height: 64,
                    padding: 8,
                    background: selectedComponentForSlot && !assignedComponent 
                      ? (isDark ? 'rgba(255, 165, 64, 0.2)' : '#fff7e6')
                      : (isDark ? 'rgba(255, 255, 255, 0.08)' : '#fafafa'),
                    border: selectedComponentForSlot && !assignedComponent 
                      ? (isDark ? '2px dashed rgba(255, 165, 64, 0.6)' : '2px dashed #ffa940')
                      : (isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #e8e8e8'),
                    borderRadius: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    cursor: selectedComponentForSlot ? 'pointer' : 'default',
                    color: themeStyles.textColor,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedComponentForSlot) {
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedComponentForSlot) {
                      assignComponentToSlot(selectedComponentForSlot, slotNum);
                    }
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4, color: themeStyles.textColor }} className="selectable-text">Slot {slotNum}</div>
                  <div style={{ fontSize: 18, marginBottom: 2 }}>
                    {component?.icon || (selectedComponentForSlot ? '📍' : '❓')}
                  </div>
                  <div style={{ fontSize: 9, color: themeStyles.textColorSecondary }} className="selectable-text">
                    {assignedComponent || (selectedComponentForSlot ? 'Click here' : 'Empty')}
                  </div>
                </Button>
              );
            })}
          </div>
          
          {/* Component selection */}
          <div style={{ 
            fontSize: 11, 
            color: themeStyles.textColorSecondary, 
            marginBottom: 12,
            fontWeight: 500
          }}>
            <span className="selectable-text" style={{ color: themeStyles.textColorSecondary }}>
              {selectedComponentForSlot 
                ? `Selected: ${selectedComponentForSlot} - Click a slot to assign` 
                : 'Click a component to select it:'
              }
            </span>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: 8 
          }}>
            {allComponents.map((comp) => (
              <Button
                key={comp.name}
                size="small"
                style={{
                  height: 56,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  background: selectedComponentForSlot === comp.name 
                    ? (isDark ? 'rgba(24, 144, 255, 0.2)' : '#e6f7ff')
                    : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#fafafa'),
                  border: selectedComponentForSlot === comp.name 
                    ? (isDark ? '2px solid rgba(24, 144, 255, 0.8)' : '2px solid #1890ff')
                    : (isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #d9d9d9'),
                  borderRadius: 6,
                  fontSize: 9,
                  transition: 'all 0.2s ease',
                  color: themeStyles.textColor
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = `0 4px 12px ${themeStyles.shadowColor}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedComponentForSlot(selectedComponentForSlot === comp.name ? null : comp.name);
                }}
              >
                <span style={{ fontSize: 16 }}>{comp.icon}</span>
                <span className="selectable-text" style={{ color: themeStyles.textColor }}>{comp.name}</span>
              </Button>
            ))}
          </div>
          
          <div style={{ 
            marginTop: 16, 
            paddingTop: 12, 
            borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #f0f0f0',
            display: 'flex',
            gap: 8
          }}>
            <Button 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                setManualSlots({ 1: null, 2: null, 3: null });
              }}
              style={{ 
                flex: 1,
                background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#fafafa',
                border: `1px solid ${isDark ? '#525252' : '#d9d9d9'}`,
                color: themeStyles.textColor,
                borderRadius: 6
              }}
            >
              <span className="selectable-text" style={{ color: themeStyles.textColor }}>Clear All Slots</span>
            </Button>
          </div>
        </Card>
      )}
      </div>
    </ConfigProvider>,
    document.body
  );
};

export default ContextMenu;
