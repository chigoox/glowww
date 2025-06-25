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
  padding = 0,
  children,
  transform = "none",
  openMenuNodeId,
   setOpenMenuNodeId
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

    const menuOpen = openMenuNodeId === id;
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
          transform,
        }}
        setProp={setProp}
        supportedProps={[
          "text", "fontSize","position", "textAlign", "fontFamily", "color", "background","transform","padding",
          "border", "borderRadius", "display","textDecoration", "fontStyle", "fontWeight", 'backgroundColor'
        ]}
        onClose={() => setOpenMenuNodeId(null)}
        onDelete={() => actions.delete(id)}
      />,
        document.body
      )
    : null;

  return (
  <div 
    ref={ref}
    style={{
      transform: transform, 
      transformOrigin: 'center center',
      display: 'inline-block',
      width: 'fit-content', // Add this
      position: 'relative', // Add this
    }}
  >
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
        cursor: "pointer",
      padding,

      }}
      onContextMenu={e => {
        e.preventDefault();
        setMenuPosition({ x: e.clientX, y: e.clientY });
        setOpenMenuNodeId(id);
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
    padding: 0,
    transform: "none",
  },
  rules: {
    canDrag: (node) => node.data.props.text !== "Drag",
  }
};