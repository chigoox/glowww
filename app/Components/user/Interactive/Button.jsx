'use client'

import * as AntdIcons from '@ant-design/icons';
import { useEditor, useNode } from "@craftjs/core";
import {
  Input,
  Typography,
  message
} from 'antd';
import { useCallback, useEffect, useRef, useState } from "react";
import ContextMenu from "../../utils/context/ContextMenu";
import { useCraftSnap } from '../../utils/craft/useCraftSnap';
import useEditorDisplay from "../../utils/craft/useEditorDisplay";
import { useContextMenu } from "../../utils/hooks/useContextMenu";
import ButtonSettings from "../support/ButtonSettings";
import PortalControls from "../support/PortalControls";
// Corrected relative path to userProps hook
import { useUserProps } from '../../utils/userprops/useUserProps';

const { TextArea } = Input;
const { Title, Text } = Typography;

// Safety wrapper to prevent deserialization errors
const ButtonSafetyWrapper = (props) => {
  try {
    return <ButtonComponent {...props} />;
  } catch (error) {
    console.error('Button render error:', error);
    // Return a minimal fallback button
    return (
      <div style={{ 
        padding: '8px 16px', 
        backgroundColor: '#1890ff', 
        color: '#ffffff', 
        borderRadius: '6px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer'
      }}>
        {props?.text || 'Button'}
      </div>
    );
  }
};

// Main Button Component
const ButtonComponent = ({
  // Content & Text
  text = "Click Me",
  
  // Visual styling
  buttonType = "primary",
  size = "medium",
  
  // Dimensions
  width = "auto",
  height = "auto", 
  minWidth = 80,
  maxWidth = "",
  minHeight = 32,
  maxHeight = "",
  
  // Position & Layout
  position = "relative",
  top = "",
  right = "",
  bottom = "",
  left = "",
  zIndex = 1,
  display = "inline-flex",
  visibility = "visible",
  hidden = false,
  
  // Spacing
  margin = "5px 0",
  padding = "8px 16px",
  gap = 8,
  
  // Typography
  fontFamily = "Arial", 
  fontSize = 14,
  fontWeight = "400",
  color = "#ffffff",
  textAlign = "center",
  textDecoration = "none",
  
  // Background & Colors
  backgroundColor = "#1890ff",
  background = "",
  backgroundImage = "",
  
  // Borders
  border = "1px solid #1890ff",
  borderRadius = 6,
  borderWidth = 1,
  borderStyle = "solid", 
  borderColor = "#1890ff",
  
  // Effects
  boxShadow = "0 2px 4px rgba(0,0,0,0.1)",
  opacity = 1,
  transform = "none",
  filter = "none",
  transition = "all 0.3s ease",
  
  // Flexbox
  flexDirection = "row",
  alignItems = "center", 
  justifyContent = "center",
  
  // Interaction
  disabled = false,
  cursor = "pointer",
  
  // Link behavior
  href = "",
  target = "_blank",
  rel = "noopener noreferrer",
  
  // Accessibility
  title = "",
  className = "",
  id = "",
  role = "button",
  ariaLabel = "",
  tabIndex = 0,
  
  // Action system
  actionType = "none",
  targetNodeId = "",
  scrollOffset = 0,
  animationType = "fadeIn", 
  scriptComponentId = "",
  confirmDialog = false,
  confirmMessage = "Are you sure?",

  // Icon system (keeping existing)
  showIcon = false,
  iconName = "HomeOutlined",
  iconPosition = "before",

  // Controls system (keeping existing)
  controls = [],
  
  // Script system (keeping existing)
  customScript = "",
  
  // Navigation system (keeping existing)
  navigationType = "none",
  navigationUrl = "",
  navigationPage = "",
  scrollTarget = "",
  openInNewTab = false,
  
  children,
  ...props
}) => {
  const {
    connectors: { connect, drag },
    selected,
    id: nodeId
  } = useNode((state) => ({
    selected: state.events.selected,
    id: state.id
  }));

  const { enabled, query, actions } = useEditor((state) => ({
    enabled: state.options.enabled
  }));

  const { hideEditorUI } = useEditorDisplay();
  const { snapConnect } = useCraftSnap();
  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();
  // User props API (hook must be called at top-level)
  const userPropsApi = useUserProps(nodeId);
  
  const buttonRef = useRef(null);
  const dragRef = useRef(null);
  const [isClient, setIsClient] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [toggleStates, setToggleStates] = useState({});

  // Coercion helpers to keep component prop values in the right type
  const smartInfer = (val) => {
    if (val === null || val === undefined) return val;
    if (typeof val !== 'string') return val;
    const s = val.trim();
    if (s === '') return '';
    if (s === 'true') return true;
    if (s === 'false') return false;
    const n = Number(s);
    if (!Number.isNaN(n) && /^-?\d*(\.\d+)?$/.test(s)) return n;
    return val;
  };

  const coerceToMatchType = (current, input) => {
    // If we have an existing type on the prop, match it
    if (typeof current === 'number') {
      if (typeof input === 'number') return input;
      const n = Number(input);
      return Number.isNaN(n) ? current : n;
    }
    if (typeof current === 'boolean') {
      if (typeof input === 'boolean') return input;
      if (typeof input === 'string') return input === 'true';
      return Boolean(input);
    }
    if (typeof current === 'string') {
      return String(input);
    }
    // Fallback: infer basic primitives from string; otherwise pass-through
    return smartInfer(input);
  };

  // Update position function
  const updateButtonPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonPosition({
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

  // Force re-render when critical visual props change
  useEffect(() => {
    if (buttonRef.current && isClient) {
      // Force style updates to ensure visual properties are applied
      const element = buttonRef.current;
      
      // Colors
      element.style.backgroundColor = backgroundColor || "#1890ff";
      element.style.color = color || "#ffffff";
      element.style.borderColor = borderColor || "#1890ff";
      
      // Typography
      element.style.fontFamily = fontFamily || "Arial";
      element.style.fontSize = typeof fontSize === 'number' ? `${fontSize}px` : (fontSize || "14px");
      element.style.fontWeight = fontWeight || "400";
      
      // Borders
      element.style.border = border || "1px solid #1890ff";
      element.style.borderRadius = typeof borderRadius === 'number' ? `${borderRadius}px` : (borderRadius || "6px");
      
      // Effects
      element.style.boxShadow = boxShadow || "0 2px 4px rgba(0,0,0,0.1)";
      element.style.opacity = opacity !== undefined ? opacity : 1;
      
      // Layout
      element.style.padding = padding || "8px 16px";
      element.style.margin = margin || "5px 0";
      
      // Debug logging in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Button visual props:', { 
          backgroundColor, color, borderColor, fontSize, fontWeight, 
          border, borderRadius, boxShadow, padding, margin 
        });
      }
    }
  }, [
    backgroundColor, color, borderColor, fontFamily, fontSize, fontWeight,
    border, borderRadius, boxShadow, opacity, padding, margin, isClient
  ]);

  useEffect(() => {
    if (buttonRef.current && snapConnect) {
      snapConnect(buttonRef.current);
    }
    if (dragRef.current && drag) {
      drag(dragRef.current);
    }
  }, [snapConnect, drag]);

  useEffect(() => {
    if ((isHovered || selected) && isClient) {
      updateButtonPosition();
      const handleScroll = () => updateButtonPosition();
      const handleResize = () => updateButtonPosition();
      
      window.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isHovered, selected, updateButtonPosition, isClient]);

  // Execute control
  const executeControl = (control) => {
    if (!actions) return;
    const category = control.targetCategory || 'component';
    const isToggle = !!control.isToggle;
    try {
      if (category === 'component') {
        if (!control.targetComponent || !control.targetProp) return;
        // Read current value to determine desired type
        let currentVal;
        try {
          currentVal = query.node(control.targetComponent).get().data.props[control.targetProp];
        } catch (_) {
          currentVal = undefined;
        }
        if (isToggle) {
          const currentState = toggleStates[control.id] || 0;
          const nextState = control.loop ? (currentState + 1) % control.toggleValues.length : Math.min(currentState + 1, control.toggleValues.length - 1);
          setToggleStates(prev => ({ ...prev, [control.id]: nextState }));
          const raw = control.toggleValues[nextState];
          const value = coerceToMatchType(currentVal, raw);
          actions.setProp(control.targetComponent, (props) => {
            props[control.targetProp] = value;
          });
        } else {
          const raw = control.values?.[0];
          const value = coerceToMatchType(currentVal, raw);
          actions.setProp(control.targetComponent, (props) => {
            props[control.targetProp] = value;
          });
        }
      } else if (category === 'userProps') {
        const targetNode = control.targetUserNodeId || control.targetComponent; // component id or 'ROOT'
        const path = control.targetUserPropPath;
        if (!targetNode || !path) return;
        const { setPrimitiveSmartAtPath, inferTypeFromString } = userPropsApi;
        if (isToggle) {
          const currentState = toggleStates[control.id] || 0;
          const nextState = control.loop ? (currentState + 1) % control.toggleValues.length : Math.min(currentState + 1, control.toggleValues.length - 1);
          setToggleStates(prev => ({ ...prev, [control.id]: nextState }));
          const raw = control.toggleValues[nextState];
          const inferred = inferTypeFromString(String(raw));
          setPrimitiveSmartAtPath(path, raw, { explicitType: undefined, respectExistingType: true, inferredType: inferred }, targetNode);
        } else {
          const raw = control.values?.[0];
          const inferred = inferTypeFromString(String(raw ?? ''));
          setPrimitiveSmartAtPath(path, raw, { explicitType: undefined, respectExistingType: true, inferredType: inferred }, targetNode);
        }
      }
    } catch (error) {
      console.error('Error executing control:', error);
    }
  };

  // Execute custom script
  const executeCustomScript = () => {
    if (!customScript.trim()) return;
    
    try {
      const func = new Function('element', 'nodeId', 'actions', 'query', customScript);
      func(buttonRef.current, nodeId, actions, query);
    } catch (error) {
      console.error('Error executing custom script:', error);
      if (enabled) {
        message.error('Script execution error: ' + error.message);
      }
    }
  };

  // Handle navigation
  const handleNavigation = () => {
    if (navigationType === 'external' && navigationUrl) {
      if (openInNewTab) {
        window.open(navigationUrl, '_blank');
      } else {
        window.location.href = navigationUrl;
      }
    } else if (navigationType === 'internal' && navigationPage) {
      if (openInNewTab) {
        window.open(navigationPage, '_blank');
      } else {
        window.location.href = navigationPage;
      }
    } else if (navigationType === 'scroll' && scrollTarget) {
      const element = document.getElementById(scrollTarget);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Handle button click
  const handleButtonClick = (e) => {
    if (enabled) {
      e.preventDefault();
      return;
    }
    
    // Execute controls
    controls.forEach(control => {
      if (control.trigger === 'click') {
        executeControl(control);
      }
    });
    
    // Execute custom script
    executeCustomScript();
    
    // User prop binding with smart coercion
    try {
      if (props.userPropBindingPath && props.userPropBindingPath.trim()) {
        const { setPrimitiveSmartAtPath, inferTypeFromString } = userPropsApi;
        const targetNode = props.userPropBindingTarget || nodeId;
        const raw = props.userPropBindingValue !== undefined ? props.userPropBindingValue : '';
        const explicitType = props.userPropBindingType || undefined;
        const inferred = inferTypeFromString(String(raw));
        setPrimitiveSmartAtPath(props.userPropBindingPath, raw, {
          explicitType: explicitType || undefined,
          respectExistingType: !explicitType,
          inferredType: inferred
        }, targetNode);
      }
    } catch (err) {
      console.warn('User prop binding failed:', err);
    }

    // Handle navigation
    handleNavigation();
  };

  // Handle button hover
  const handleButtonHover = (isHovering) => {
    if (!enabled) {
      controls.forEach(control => {
        if (control.trigger === 'hover' && isHovering) {
          executeControl(control);
        }
      });
    }
  };

  // Render icon
  const renderIcon = () => {
    if (!showIcon || !iconName) return null;
    
    const IconComponent = AntdIcons[iconName];
    if (!IconComponent) return null;
    
    return <IconComponent style={{ fontSize: 'inherit' }} />;
  };

  const buttonStyle = {
    // First apply any props.style so our explicit styles can override
    ...props.style,
    
    // Typography - ensure these have fallbacks
    fontFamily: fontFamily || "Arial",
    fontSize: fontSize || 14,
    fontWeight: fontWeight || "400",
    color: color || "#ffffff",
    textAlign: textAlign || "center",
    textDecoration: textDecoration || "none",
    
    // Background & Colors - ensure these are always applied and override props.style
    backgroundColor: backgroundColor || "#1890ff",
    background: background || "",
    backgroundImage: backgroundImage || "",
    
    // Dimensions
    width: width || "auto",
    height: height || "auto",
    minWidth: minWidth || 80,
    maxWidth,
    minHeight: minHeight || 32,
    maxHeight,
    
    // Position & Layout
    position: position || "relative",
    top,
    right,
    bottom,
    left,
    zIndex: zIndex || 1,
    display: display || "inline-flex",
    visibility: hidden ? 'hidden' : (visibility || "visible"),
    
    // Spacing - ensure these have fallbacks
    margin: margin || "5px 0",
    padding: padding || "8px 16px",
    
    // Borders - ensure these have fallbacks
    border: border || "1px solid #1890ff",
    borderRadius: borderRadius || 6,
    borderWidth: borderWidth || 1,
    borderStyle: borderStyle || "solid",
    borderColor: borderColor || "#1890ff",
    
    // Effects - ensure these have fallbacks
    boxShadow: boxShadow || "0 2px 4px rgba(0,0,0,0.1)",
    opacity: opacity !== undefined ? opacity : 1,
    transform: transform || "none",
    filter: filter || "none",
    transition: transition || "all 0.3s ease",
    
    // Flexbox - ensure these have fallbacks
    flexDirection: flexDirection || "row",
    alignItems: alignItems || "center",
    justifyContent: justifyContent || "center",
    gap: showIcon && text ? (gap || 8) : 0,
    
    // Interaction
    cursor: enabled ? 'move' : (cursor || "pointer"),
    
    // Button specific
    outline: selected ? '2px solid #1890ff' : 'none',
    userSelect: 'none'
  };

  if (!isClient) {
    return <div>Loading...</div>;
  }

  return (
    <div
      ref={(ref) => {
        buttonRef.current = ref;
        // Guard against undefined connector in read-only/published contexts
        try { connect && typeof connect === 'function' && ref && connect(ref); } catch (e) { /* silent */ }
      }}
      style={buttonStyle}
      onClick={handleButtonClick}
      onMouseEnter={() => {
        setIsHovered(true);
        handleButtonHover(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        handleButtonHover(false);
      }}
      onContextMenu={hideEditorUI ? undefined : handleContextMenu}
      onDoubleClick={() => enabled && setSettingsVisible(true)}
    >
      {/* Drag handle for editor */}
      {enabled && (
        <div
          ref={dragRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            cursor: 'move',
            zIndex: 10
          }}
        />
      )}
      
      {/* Button content */}
      {iconPosition === 'before' && renderIcon()}
      {text && <span>{text}</span>}
      {iconPosition === 'after' && renderIcon()}
      
      {/* Portal controls for editor */}
      {selected && !hideEditorUI && enabled && isClient && (
        <PortalControls
          boxPosition={buttonPosition}
          dragRef={dragRef}
          nodeId={nodeId}
          updateBoxPosition={updateButtonPosition}
          targetRef={buttonRef}
          onResize={updateButtonPosition}
          onResizeEnd={updateButtonPosition}
          onEditClick={() => setSettingsVisible(true)}
          editorActions={actions}
          craftQuery={query}
          minWidth={50}
          minHeight={20}
        />
      )}
      
      {/* Context menu */}
      {!hideEditorUI && enabled && (
        <ContextMenu
          visible={contextMenu.visible}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={closeContextMenu}
          targetNodeId={nodeId}
          onEdit={() => setSettingsVisible(true)}
        />
      )}
      
      {/* Settings modal */}
      <ButtonSettings
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        nodeId={nodeId}
        currentProps={{
          // Content & Text
          text,
          
          // Visual styling
          buttonType,
          size,
          
          // Dimensions
          width,
          height,
          minWidth,
          maxWidth,
          minHeight,
          maxHeight,
          
          // Position & Layout
          position,
          top,
          right,
          bottom,
          left,
          zIndex,
          display,
          visibility,
          hidden,
          
          // Spacing
          margin,
          padding,
          gap,
          
          // Typography
          fontFamily,
          fontSize,
          fontWeight,
          color,
          textAlign,
          textDecoration,
          
          // Background & Colors
          backgroundColor,
          background,
          backgroundImage,
          
          // Borders
          border,
          borderRadius,
          borderWidth,
          borderStyle,
          borderColor,
          
          // Effects
          boxShadow,
          opacity,
          transform,
          filter,
          transition,
          
          // Flexbox
          flexDirection,
          alignItems,
          justifyContent,
          
          // Interaction
          disabled,
          cursor,
          
          // Link behavior
          href,
          target,
          rel,
          
          // Accessibility
          title,
          className,
          id,
          role,
          ariaLabel,
          tabIndex,
          
          // Action system
          actionType,
          targetNodeId,
          scrollOffset,
          animationType,
          scriptComponentId,
          confirmDialog,
          confirmMessage,
          
          // Icon system
          showIcon,
          iconName,
          iconPosition,
          
          // Controls system
          controls,
          
          // Script system
          customScript,
          
          // Navigation system
          navigationType,
          navigationUrl,
          navigationPage,
          scrollTarget,
          openInNewTab,
          
          ...props
        }}
        onPropsChange={(newProps) => {
          Object.entries(newProps).forEach(([key, value]) => {
            actions.setProp(nodeId, (props) => {
              props[key] = value;
            });
          });
        }}
      />
    </div>
  );
};

// Export the safety wrapper as Button
export const Button = ButtonSafetyWrapper;

// Attach craft configuration to the wrapper
Button.craft = {
  displayName: "Button",
  props: {
    // Content & Text
    text: "Click Me",
    
    // Visual styling
    buttonType: "primary",
    size: "medium",
    
    // Dimensions
    width: "auto",
    height: "auto",
    minWidth: 80,
    maxWidth: "",
    minHeight: 32,
    maxHeight: "",
    
    // Position & Layout
    position: "relative",
    top: "",
    right: "",
    bottom: "",
    left: "",
    zIndex: 1,
    display: "inline-flex",
    visibility: "visible",
    hidden: false,
    
    // Spacing
    margin: "5px 0",
    padding: "8px 16px",
    gap: 8,
    
    // Typography
    fontFamily: "Arial",
    fontSize: 14,
    fontWeight: "400",
    color: "#ffffff",
    textAlign: "center",
    textDecoration: "none",
    
    // Background & Colors
    backgroundColor: "#1890ff",
    background: "",
    backgroundImage: "",
    
    // Borders
    border: "1px solid #1890ff",
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#1890ff",
    
    // Effects
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    opacity: 1,
    transform: "none",
    filter: "none",
    transition: "all 0.3s ease",
    
    // Flexbox
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    
    // Interaction
    disabled: false,
    cursor: "pointer",
    
    // Link behavior
    href: "",
    target: "_blank",
    rel: "noopener noreferrer",
    
    // Accessibility
    title: "",
    className: "",
    id: "",
    role: "button",
    ariaLabel: "",
    tabIndex: 0,
    
    // Action system
    actionType: "none",
    targetNodeId: "",
    scrollOffset: 0,
    animationType: "fadeIn",
    scriptComponentId: "",
    confirmDialog: false,
    confirmMessage: "Are you sure?",

    // Icon system
    showIcon: false,
    iconName: "HomeOutlined",
    iconPosition: "before",

    // Controls system
    controls: [],
    
    // Script system
    customScript: "",
    
    // Navigation system
    navigationType: "none",
    navigationUrl: "",
    navigationPage: "",
    scrollTarget: "",
    openInNewTab: false
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => false,
    canMoveOut: () => true
  },
  custom: {
    styleMenu: {
      supportedProps: [
        'text', 'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
        'position', 'top', 'left', 'right', 'bottom', 'zIndex', 'margin', 'padding',
        'fontFamily', 'fontSize', 'fontWeight', 'color', 'textAlign', 'textDecoration',
        'backgroundColor', 'background', 'backgroundImage', 'border', 'borderRadius',
        'borderWidth', 'borderStyle', 'borderColor', 'boxShadow', 'opacity', 'transform', 
        'filter', 'transition', 'flexDirection', 'alignItems', 'justifyContent', 'gap',
        'buttonType', 'size', 'disabled', 'href', 'target', 'title', 'className', 'id', 
        'ariaLabel', 'display', 'visibility', 'hidden', 'actionType', 'targetNodeId', 
        'scrollOffset', 'animationType', 'scriptComponentId', 'confirmDialog', 
        'confirmMessage', 'showIcon', 'iconName', 'iconPosition', 'controls', 
        'customScript', 'navigationType', 'navigationUrl', 'navigationPage', 
        'scrollTarget', 'openInNewTab'
      ]
    }
  }
};
