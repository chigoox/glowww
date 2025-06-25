'use client'

import React, { useRef, useEffect, useState } from "react";
import Card from "antd/es/card/Card";
import { useNode, useEditor } from "@craftjs/core";
import { DragOutlined } from '@ant-design/icons';


export const Box = ({children }) => {
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

  // Open style menu on right click
  const handleContextMenu = (e) => {
    console.log('first', openMenuNodeId, id)
    e.preventDefault();
   
  };


  return (
    <Card
      className={`${selected ? 'ring-2 ring-blue-500' : ''} overflow-hidden`}
      ref={cardRef}
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
      {children}
    </Card>
  );
};

// Define default props for Craft.js
Box.craft = {
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