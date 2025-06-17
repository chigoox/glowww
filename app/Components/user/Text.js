'use client';
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
    const { connectors: {connect, drag}, hasSelectedNode, hasDraggedNode, actions: {setProp} } = useNode((state) => ({
    hasSelectedNode: state.events.selected,
    hasDraggedNode: state.events.dragged
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
        <Draggable
          handle=".drag-handle"
          position={menuPosition}
          onStop={(_, data) => setMenuPosition({ x: data.x, y: data.y })}
          nodeRef={draggableRef}
        >
          <div
            ref={draggableRef}
            style={{
              position: "fixed",
              zIndex: 9999,
              top: 0,
              left: 0,
              background: "#fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              borderRadius: 8,
              minWidth: 240,
              padding: 16,
            }}
          >
            <div
              className="drag-handle"
              style={{
                cursor: "move",
                fontWeight: 500,
                marginBottom: 8,
                userSelect: "none",
              }}
            >
              Edit Text (Drag me)
              <Button
                size="small"
                style={{ float: "right" }}
                onClick={() => setMenuOpen(false)}
              >
                Close
              </Button>
            </div>
               <Form layout="vertical" size="small" style={{ minWidth: 220 }}>
      <Form.Item label="Text">
        <Input
          value={text}
          autoFocus
          onChange={e => setProp(props => { props.text = e.target.value; })}
        />
      </Form.Item>
      <Form.Item label="Font">
        <Select
          value={fontFamily}
          options={fontFamilies}
          onChange={val => setProp(props => { props.fontFamily = val; })}
        />
      </Form.Item>
      <Form.Item label="Font Size">
        <Slider
          min={7}
          max={50}
          value={fontSize}
          onChange={val => setProp(props => { props.fontSize = val; })}
        />
      </Form.Item>
      <Form.Item label="Font Color">
        <Input
          type="color"
          value={color}
          onChange={e => setProp(props => { props.color = e.target.value; })}
          prefix={<FontColorsOutlined />}
        />
      </Form.Item>
      <Form.Item label="Background">
        <Input
          type="color"
          value={background}
          onChange={e => setProp(props => { props.background = e.target.value; })}
          prefix={<BgColorsOutlined />}
        />
      </Form.Item>
      <Form.Item label="Border">
        <Input
          value={border}
          onChange={e => setProp(props => { props.border = e.target.value; })}
          placeholder="e.g. 1px solid #000"
          prefix={<BorderOutlined />}
        />
      </Form.Item>
      <Form.Item label="Radius">
        <Slider
          min={0}
          max={50}
          value={borderRadius}
          onChange={val => setProp(props => { props.borderRadius = val; })}
        />
      </Form.Item>
      <Form.Item label="Align">
        <Select
          value={textAlign}
          options={alignments}
          onChange={val => setProp(props => { props.textAlign = val; })}
        />
      </Form.Item>
    </Form>
          </div>
        </Draggable>,
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
        onClick={() => setMenuOpen(true)}
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