'use client'
// Container.js

import React, { useRef, useEffect } from "react";
import Card from "antd/es/card/Card";
import { useNode } from "@craftjs/core";

import { DragOutlined } from '@ant-design/icons';

export const Container = ({ background, padding = 0, children , ySpacing}) => {
  const { connectors: { connect, drag } } = useNode();
 
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

  return (
    <Card
      className="relative overflow-hidden"
      ref={cardRef}
      style={{ margin: "5px 0", background, padding: `${padding}px`, position: "relative" }}
    >
      {/* Add a drag handle for the container */}
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