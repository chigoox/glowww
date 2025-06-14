'use client';
import ReactDOM from "react-dom";
import { useNode } from "@craftjs/core";
import React, { useRef, useEffect, useState } from "react";
import { Typography, Input, Form, Button, Slider, Select } from "antd";
import { BgColorsOutlined, BorderOutlined, LinkOutlined, UploadOutlined } from '@ant-design/icons';
import Draggable from "react-draggable";

export const Image = ({
  src = "",
  alt = "",
  width = 200,
  height = 200,
  border = "none",
  objectFit = "cover",
  borderRadius = 0,
  link = "",
  children,
}) => {
  const {
    connectors: { connect, drag },
    hasSelectedNode,
    actions: { setProp }
  } = useNode((state) => ({
    hasSelectedNode: state.events.selected,
  }));

  const ref = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 100, y: 100 });
  const [isClient, setIsClient] = useState(false);
  const draggableRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    if (imgRef.current) {
      connect(drag(imgRef.current));
    }
  }, [connect, drag]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const objectFitOptions = [
    { value: "fill", label: "Fill" },
    { value: "contain", label: "Contain" },
    { value: "cover", label: "Cover" },
    { value: "none", label: "None" },
    { value: "scale-down", label: "Scale Down" },
  ];

  // Handle base64 upload
  const handleBase64Upload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (upload) {
      setProp(props => { props.src = upload.target.result; });
    };
    reader.readAsDataURL(file);
  };

  // Placeholder for Firebase upload
  const handleFirebaseUpload = () => {
    // TODO: Implement Firebase upload logic here
    alert("Firebase upload not implemented. Add your logic here.");
  };

  const editorMenu = isClient && menuOpen
    ? ReactDOM.createPortal(
        <Draggable
          handle=".drag-handle"
          position={menuPosition}
          onStop={(_, data) => setMenuPosition({ x: data.x, y: data.y })}
          nodeRef={draggableRef}
        >
          <div
          className="overflow- y-scroll"
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
              Edit Image (Drag me)
              <Button
                size="small"
                style={{ float: "right" }}
                onClick={() => setMenuOpen(false)}
              >
                Close
              </Button>
            </div>
            <Form layout="vertical" size="small" style={{ minWidth: 220 }}>
              <Form.Item label="Alt Text">
                <Input
                  value={alt}
                  onChange={e => setProp(props => { props.alt = e.target.value; })}
                  placeholder="Enter alt text"
                />
              </Form.Item>
              <Form.Item label="Image URL/Base64">
                <Input
                prefix={<LinkOutlined />}
                  value={src}
                  onChange={e => setProp(props => { props.src = e.target.value; })}
                  placeholder="Paste image URL or base64 here"
                />
              </Form.Item>
              <Form.Item label="Upload Image (Base64)">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleBase64Upload}
                  prefix={<UploadOutlined />}
                />
              </Form.Item>
              <Form.Item label="Object Fit">
                <Select
                  value={objectFit}
                  options={objectFitOptions}
                  onChange={val => setProp(props => { props.objectFit = val; })}
                  getPopupContainer={trigger => document.body}
                />
              </Form.Item>
              <Form.Item label="Width">
                <Slider
                  min={50}
                  max={800}
                  value={width}
                  onChange={val => setProp(props => { props.width = val; })}
                />
              </Form.Item>
              <Form.Item label="Height">
                <Slider
                  min={50}
                  max={800}
                  value={height}
                  onChange={val => setProp(props => { props.height = val; })}
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
              
            </Form>
          </div>
        </Draggable>,
        document.body
      )
    : null;

  return (
    <div ref={ref}>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer">
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            style={{
              width,
              height,
              border,
              borderRadius,
              objectFit,
              cursor: "pointer",
              display: "block"
            }}
            onClick={e => {
              e.preventDefault();
              setMenuOpen(true);
            }}
          />
        </a>
      ) : (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          style={{
            width,
            height,
            border,
            borderRadius,
            objectFit,
            cursor: "pointer",
            display: "block"
          }}
          onClick={() => setMenuOpen(true)}
        />
      )}
      {editorMenu}
    </div>
  );
};

Image.craft = {
  props: {
    src: "",
    alt: "",
    width: 200,
    height: 200,
    border: "none",
    borderRadius: 0,
    objectFit: "cover",
    link: "",
  },
  rules: {
    canDrag: () => true,
  }
};