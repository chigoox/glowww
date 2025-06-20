'use client';
import { StyleMenu } from "./StyleMenu";
import ReactDOM from "react-dom";
import { useNode } from "@craftjs/core";
import React, { useRef, useEffect, useState } from "react";
import { Typography, Input, Select, Form, Popover, Button, Slider } from "antd";
import { BgColorsOutlined, FontColorsOutlined, BorderOutlined, BgOutlined } from '@ant-design/icons';
//import Draggable from "react-draggable";
const Draggable = null 
const fontFamilies = [
  { value: "Arial", label: "Arial" },
  { value: "Georgia", label: "Georgia" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Courier New", label: "Courier New" },
  { value: "Verdana", label: "Verdana" },
];

const alignments = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

export const Text = ({
  text,
  fontSize = 16,
  textAlign = "left",
  fontFamily = "Arial",
  color = "#222",
  background = "#fff",
  border = "none",
  borderRadius = 0,
  children,
}) => {
    const { id, connectors: {connect, drag}, hasSelectedNode, hasDraggedNode, actions: {setProp} } = useNode((state) => ({
    hasSelectedNode: state.events.selected,
    hasDraggedNode: state.events.dragged,
    id: state.id,
  }));

  const ref = useRef(null);
  const [editing, setEditing] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);


  useEffect(() => {
    if (!hasSelectedNode) {
      setEditing(false);
      setPopoverOpen(false);
    }
  }, [hasSelectedNode]);

    const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 100, y: 100 });

   const [isClient, setIsClient] = useState(false);

   const draggableRef = useRef(null);

   const textRef = useRef(null);
   useEffect(() => {
  if (textRef.current) {
    connect(drag(textRef.current));
  }
}, [connect, drag]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  

 const editorMenu = isClient && menuOpen
    ? ReactDOM.createPortal(
        <StyleMenu
        nodeId={id}
        props={{
          text,
          fontSize,
          textAlign,
          fontFamily,
          color,
          background,
          border,
          borderRadius,
          menuX: menuPosition.x,
          menuY: menuPosition.y,
        }}
        setProp={setProp}
        supportedProps={[
          "text", "fontSize", "textAlign", "fontFamily", "color", "background",
          "border", "borderRadius", "textDecoration", "fontStyle", "fontWeight"
        ]}
        onClose={() => setMenuOpen(false)}
        onDelete={() => actions.delete(id)}
      />,
        document.body
      )
    : null;

  return (
    <div ref={ref}>
      <Typography.Paragraph
        ref={textRef}
        style={{
          fontSize: `${fontSize}px`,
          textAlign,
          fontFamily,
          color,
          background,
          border,
          borderRadius,
          marginBottom: 0,
          cursor: "pointer"
        }}
        onContextMenu={e => {
  e.preventDefault();
  setMenuPosition({ x: e.clientX, y: e.clientY });
  setMenuOpen(true);
}}
      >
        {text || children}
      </Typography.Paragraph>
      {editorMenu}
    </div>
  );
};

Text.craft = {
  props: {
    text: "Edit me!",
    fontSize: 16,
    textAlign: "left",
    fontFamily: "Arial",
    background: "none",
    color: "#222",
    border: "none",
    borderRadius: 0,
  },
  rules: {
    canDrag: (node) => node.data.props.text !== "Drag",
  }
};