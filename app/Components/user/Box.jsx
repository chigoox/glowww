'use client'

import React, { useRef, useEffect, useState } from "react";
import Card from "antd/es/card/Card";
import { useNode, useEditor } from "@craftjs/core";
import { DragOutlined } from '@ant-design/icons';

export const Box = ({
  // Add all the style props that StyleMenu can control
  width = "auto",
  height = "auto",
  padding = 20,
  margin = "5px 0",
  backgroundColor = "white",
  background = "white",
  border = "none",
  borderRadius = 0,
  boxShadow = "none",
  display = "block",
  position = "relative",
  zIndex = 1,
  overflow = "visible",
  transform = "none",
  opacity = 1,
  top,
  right,
  bottom,
  left,
  minWidth,
  maxWidth,
  minHeight,
  maxHeight,
  flexDirection = "row",
  alignItems = "stretch",
  justifyContent = "flex-start",
  gap = 0,
  children 
}) => {
  const { id, connectors: { connect, drag }, actions: { setProp }, selected } = useNode((node) => ({
    id: node.id,
    selected: node.events.selected,
  }));
  const { actions } = useEditor();

  const cardRef = useRef(null);
  const dragHandleRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) {
      connect(cardRef.current);
    }
    if (dragHandleRef.current) {
      drag(dragHandleRef.current);
    }
  }, [connect, drag]);

  // Helper function to process values (add px to numbers where appropriate)
  const processValue = (value, property) => {
    if (typeof value === 'number' && !['opacity', 'zIndex'].includes(property)) {
      return `${value}px`;
    }
    return value;
  };

  return (
    <div
      className={`${selected ? 'ring-2 ring-blue-500' : ''} overflow-hidden`}
      ref={cardRef}
      style={{ 
        // Apply all the style props to the actual element
        width: processValue(width, 'width'),
        height: processValue(height, 'height'),
        padding: processValue(padding, 'padding'),
        margin: processValue(margin, 'margin'),
        backgroundColor,
        background,
        border,
        borderRadius: processValue(borderRadius, 'borderRadius'),
        boxShadow,
        display,
        position,
        zIndex,
        overflow,
        transform,
        opacity,
        top: top !== undefined ? processValue(top, 'top') : undefined,
        right: right !== undefined ? processValue(right, 'right') : undefined,
        bottom: bottom !== undefined ? processValue(bottom, 'bottom') : undefined,
        left: left !== undefined ? processValue(left, 'left') : undefined,
        minWidth: minWidth && processValue(minWidth, 'minWidth'),
        maxWidth: maxWidth && processValue(maxWidth, 'maxWidth'),
        minHeight: minHeight && processValue(minHeight, 'minHeight'),
        maxHeight: maxHeight && processValue(maxHeight, 'maxHeight'),
        flexDirection,
        alignItems,
        justifyContent,
        gap: processValue(gap, 'gap'),
      }}
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
      {children}
    </div>
  );
};

// Define default props for Craft.js - these will be the initial values
Box.craft = {
  props: {
    width: "auto",
    height: "auto",
    padding: 20,
    margin: "5px 0",
    backgroundColor: "white",
    background: "white",
    border: "none",
    borderRadius: 0,
    boxShadow: "none",
    display: "block",
    position: "relative",
    zIndex: 1,
    overflow: "visible",
    transform: "none",
    opacity: 1,
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "flex-start",
    gap: 0,
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => true,
  }
};