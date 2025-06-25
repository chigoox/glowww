'use client'

import React, { useRef, useEffect, useState } from "react";
import Card from "antd/es/card/Card";
import { useNode, useEditor } from "@craftjs/core";
import { DragOutlined } from '@ant-design/icons';
import { StyleMenu } from "./StyleMenu";

// Define option arrays that StyleMenu needs
const positionOptions = [
  { value: "static", label: "Static" },
  { value: "relative", label: "Relative" },
  { value: "absolute", label: "Absolute" },
  { value: "fixed", label: "Fixed" },
  { value: "sticky", label: "Sticky" },
];

const displayOptions = [
  { value: "block", label: "Block" },
  { value: "flex", label: "Flex" },
  { value: "grid", label: "Grid" },
  { value: "inline", label: "Inline" },
  { value: "inline-block", label: "Inline Block" },
  { value: "inline-flex", label: "Inline Flex" },
  { value: "none", label: "None" },
];

const flexDirectionOptions = [
  { value: "row", label: "Row" },
  { value: "column", label: "Column" },
  { value: "row-reverse", label: "Row Reverse" },
  { value: "column-reverse", label: "Column Reverse" },
];

const flexWrapOptions = [
  { value: "nowrap", label: "No Wrap" },
  { value: "wrap", label: "Wrap" },
  { value: "wrap-reverse", label: "Wrap Reverse" },
];

const alignItemsOptions = [
  { value: "flex-start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "flex-end", label: "End" },
  { value: "stretch", label: "Stretch" },
  { value: "baseline", label: "Baseline" },
];

const justifyContentOptions = [
  { value: "flex-start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "flex-end", label: "End" },
  { value: "space-between", label: "Space Between" },
  { value: "space-around", label: "Space Around" },
  { value: "space-evenly", label: "Space Evenly" },
];

const overflowOptions = [
  { value: "visible", label: "Visible" },
  { value: "hidden", label: "Hidden" },
  { value: "scroll", label: "Scroll" },
  { value: "auto", label: "Auto" },
];

export const Container = ({ 
  // Layout & positioning props
  width = "auto",
  height = "auto",
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  position = "relative",
  top,
  right,
  bottom,
  left,
  zIndex = "auto",

  // Display & flex props
  display = "block",
  flexDirection = "row",
  flexWrap = "nowrap",
  alignItems = "stretch",
  justifyContent = "flex-start",
  gap = 0,

  // Spacing props
  padding = 0,
  margin = "5px 0",
  
  // Visual styling props
  background = "white",
  backgroundColor,
  backgroundImage,
  border = "none",
  borderRadius = 0,
  boxShadow = "none",
  
  // Behavior props
  overflow = "visible",
  transform = "none",
  transition = "none",
  opacity = 1,

  // Children & other props
  children,
  ySpacing,
  openMenuNodeId,
   setOpenMenuNodeId,
  ...props 
}) => {
  const { id, connectors: { connect, drag }, actions: { setProp }, selected } = useNode((node) => ({
    id: node.id,
    selected: node.events.selected,
  }));
  const { actions } = useEditor();

  const cardRef = useRef(null);
  const dragHandleRef = useRef(null);

  // StyleMenu state
  console.log(openMenuNodeId)
 const menuOpen = openMenuNodeId === id;
 console.log(menuOpen)
  const [menuDragPos, setMenuDragPos] = useState({ x: 100, y: 100 });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (cardRef.current) {
      connect(cardRef.current);
    }
    if (dragHandleRef.current) {
      drag(dragHandleRef.current);
    }
  }, [connect, drag]);

  // Open style menu on right click
  const handleContextMenu = (e) => {
    console.log('first', openMenuNodeId, id)
    e.preventDefault();
    setMenuDragPos({ x: e.clientX, y: e.clientY });
    setOpenMenuNodeId(id);
  };

  // Supported style props for the menu
  const supportedProps = [
    // Dimensions
    "width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight",
    // Positioning
    "position", "top", "right", "bottom", "left", "zIndex",
    // Display & flex
    "display", "flexDirection", "flexWrap", "alignItems", "justifyContent", "gap",
    // Spacing
    "padding", "margin", 
    // Visual styling
    "background", "backgroundColor", "backgroundImage", "border", "borderRadius", "boxShadow",
    // Behavior
    "overflow", "transform", "transition", "opacity"
  ];

  // Convert numeric values to pixel values where appropriate
  const processValue = (value, property) => {
    if (typeof value === 'number' && !['opacity', 'zIndex', 'fontWeight'].includes(property)) {
      return `${value}px`;
    }
    return value;
  };
  return (
    <Card
      className={`${selected ? 'ring-2 ring-blue-500' : ''} overflow-hidden`}
      ref={cardRef}
      style={{ 
        // Dimensions
        width: processValue(width, 'width'),
        height: processValue(height, 'height'),
        minWidth: minWidth && processValue(minWidth, 'minWidth'),
        minHeight: minHeight && processValue(minHeight, 'minHeight'),
        maxWidth: maxWidth && processValue(maxWidth, 'maxWidth'),
        maxHeight: maxHeight && processValue(maxHeight, 'maxHeight'),
        
        // Positioning
        position,
        top: top !== undefined ? processValue(top, 'top') : undefined,
        right: right !== undefined ? processValue(right, 'right') : undefined,
        bottom: bottom !== undefined ? processValue(bottom, 'bottom') : undefined,
        left: left !== undefined ? processValue(left, 'left') : undefined,
        zIndex,
        
        // Display & flex
        display,
        flexDirection,
        flexWrap,
        alignItems,
        justifyContent,
        gap: processValue(gap, 'gap'),
        
        // Spacing
        padding: processValue(padding, 'padding'),
        margin: processValue(margin, 'margin'),
        
        // Visual styling
        background,
        backgroundColor,
        backgroundImage,
        border,
        borderRadius: processValue(borderRadius, 'borderRadius'),
        boxShadow,
        
        // Behavior
        overflow,
        transform,
        transition,
        opacity,
      }}
      onContextMenu={handleContextMenu}
    >
      {/* Drag handle */}
      <div
        ref={dragHandleRef}
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          width: 24,
          height: 24,
          background: "#eee",
          borderRadius: "50%",
          cursor: "grab",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
        onMouseDown={e => e.stopPropagation()}
        title="Drag Container"
      >
        <DragOutlined />
      </div>
      {/* Pass openMenuNodeId and setOpenMenuNodeId to all children */}
    {React.Children.map(children, child => {
  if (React.isValidElement(child) && child.type !== React.Fragment) {
    return React.cloneElement(child, { openMenuNodeId, setOpenMenuNodeId });
  }
  // For fragments, recursively map their children
  if (React.isValidElement(child) && child.type === React.Fragment) {
    return React.cloneElement(
      child,
      {},
      React.Children.map(child.props.children, c =>
        React.isValidElement(c)
          ? React.cloneElement(c, { openMenuNodeId, setOpenMenuNodeId })
          : c
      )
    );
  }
  return child;
})}
      {/* StyleMenu portal */}
      {isClient && menuOpen && (
        <StyleMenu
          nodeId={id}
          props={{
            // Pass all layout props to StyleMenu
            width,
            height,
            minWidth,
            minHeight,
            maxWidth,
            maxHeight,
            position,
            top,
            right,
            bottom,
            left,
            zIndex,
            display,
            flexDirection,
            flexWrap,
            alignItems,
            justifyContent,
            gap,
            padding,
            margin,
            background,
            backgroundColor,
            backgroundImage,
            border,
            borderRadius,
            boxShadow,
            overflow,
            transform,
            transition,
            opacity,
            menuX: menuDragPos.x,
            menuY: menuDragPos.y,
            positionOptions,
            displayOptions,
            flexDirectionOptions,
            flexWrapOptions,
            alignItems:alignItemsOptions,
            justifyContentOptions,
            overflowOptions,
            ...props
          }}
          setProp={setProp}
          supportedProps={supportedProps}
          onClose={() => setOpenMenuNodeId(null)}
          onDelete={() => actions.delete(id)}
        />
      )}
    </Card>
  );
};

// Define default props for Craft.js
Container.craft = {
  props: {
    width: "auto",
    height: "auto",
    position: "relative",
    padding: 20,
    background: "white",
  },
  rules: {
    canDrag: () => true,
  }
};