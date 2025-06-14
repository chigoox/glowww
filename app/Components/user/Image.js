'use client';
import ReactDOM from "react-dom";
import { useNode } from "@craftjs/core";
import React, { useRef, useEffect, useState } from "react";
import { Input, Form, Button, Slider, Tooltip, Space } from "antd";
import { BorderOutlined, LinkOutlined, UploadOutlined, BgColorsOutlined, PictureOutlined, AlignCenterOutlined, AlignLeftOutlined, AlignRightOutlined, VerticalAlignMiddleOutlined, AppstoreOutlined, ColumnWidthOutlined, ColumnHeightOutlined, BorderVerticleOutlined, BorderHorizontalOutlined } from '@ant-design/icons';
import Draggable from "react-draggable";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";

const positionOptions = [
  { value: "static", icon: <AppstoreOutlined />, label: "Static" },
  { value: "relative", icon: <BorderVerticleOutlined />, label: "Relative" },
  { value: "absolute", icon: <BorderHorizontalOutlined />, label: "Absolute" },
  { value: "fixed", icon: <PictureOutlined />, label: "Fixed" },
  { value: "sticky", icon: <BgColorsOutlined />, label: "Sticky" },
];

const displayOptions = [
  { value: "block", icon: <ColumnWidthOutlined />, label: "Block" },
  { value: "inline-block", icon: <ColumnHeightOutlined />, label: "Inline Block" },
  { value: "inline", icon: <AlignLeftOutlined />, label: "Inline" },
  { value: "flex", icon: <AlignCenterOutlined />, label: "Flex" },
  { value: "inline-flex", icon: <AlignRightOutlined />, label: "Inline Flex" },
  { value: "none", icon: <VerticalAlignMiddleOutlined />, label: "None" },
];

const justifyContentOptions = [
  { value: "flex-start", icon: <AlignLeftOutlined />, label: "Start" },
  { value: "center", icon: <AlignCenterOutlined />, label: "Center" },
  { value: "flex-end", icon: <AlignRightOutlined />, label: "End" },
  { value: "space-between", icon: <AppstoreOutlined />, label: "Between" },
  { value: "space-around", icon: <AppstoreOutlined />, label: "Around" },
  { value: "space-evenly", icon: <AppstoreOutlined />, label: "Evenly" },
];

const alignItemsOptions = [
  { value: "stretch", icon: <VerticalAlignMiddleOutlined />, label: "Stretch" },
  { value: "flex-start", icon: <AlignLeftOutlined />, label: "Start" },
  { value: "center", icon: <AlignCenterOutlined />, label: "Center" },
  { value: "flex-end", icon: <AlignRightOutlined />, label: "End" },
  { value: "baseline", icon: <AlignLeftOutlined />, label: "Baseline" },
];

const objectFitOptions = [
  { value: "fill", label: "Fill" },
  { value: "contain", label: "Contain" },
  { value: "cover", label: "Cover" },
  { value: "none", label: "None" },
  { value: "scale-down", label: "Scale Down" },
];

export const Image = ({
  src = "",
  alt = "",
  width = 200,
  height = 200,
  border = "none",
  objectFit = "cover",
  borderRadius = 0,
  link = "",
  position = "static",
  display = "block",
  justifyContent = "flex-start",
  alignItems = "stretch",
  x = 0,
  y = 0,
  zIndex = 1,
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
    alert("Firebase upload not implemented. Add your logic here.");
  };

  // Compact button group for options
  const ButtonGroup = ({ options, value, onChange, size = "small" }) => (
    <Space.Compact block>
      {options.map(opt => (
        <Tooltip title={opt.label} key={opt.value}>
          <Button
            type={value === opt.value ? "primary" : "default"}
            icon={opt.icon}
            size={size}
            style={{ minWidth: 32, padding: 0 }}
            onClick={() => onChange(opt.value)}
          >
            {!opt.icon && opt.label}
          </Button>
        </Tooltip>
      ))}
    </Space.Compact>
  );

  // Compact button group for objectFit (text only)
  const ObjectFitGroup = ({ value, onChange }) => (
    <Space.Compact block>
      {objectFitOptions.map(opt => (
        <Tooltip title={opt.label} key={opt.value}>
          <Button
            type={value === opt.value ? "primary" : "default"}
            size="small"
            style={{ minWidth: 32, padding: 0 }}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </Button>
        </Tooltip>
      ))}
    </Space.Compact>
  );

  const editorMenu = isClient && menuOpen
    ? ReactDOM.createPortal(
        <Draggable
          handle=".drag-handle"
          position={menuPosition}
          onStop={(_, data) => setMenuPosition({ x: data.x, y: data.y })}
          nodeRef={draggableRef}
        >
          <div
          className=""
            ref={draggableRef}
            style={{
              position: "fixed",
              zIndex: 9999,
              top: 0,
              left: 0,
              background: "#fff",
              boxShadow: "0 2px 16px rgba(0,0,0,0.18)",
              borderRadius: 12,
              minWidth: 220,
              padding: 12,
              fontSize: 13,
              maxWidth: 320,
            }}
          >
            <div
              className="drag-handle"
              style={{
                cursor: "move",
                fontWeight: 600,
                marginBottom: 8,
                userSelect: "none",
                letterSpacing: 0.5,
                fontSize: 15,
                color: "#222",
              }}
            >
              <PictureOutlined style={{ marginRight: 6 }} />
              Image
              <Button
                size="small"
                type="text"
                style={{ float: "right" }}
                onClick={() => setMenuOpen(false)}
              >
                ✕
              </Button>
            </div>
            <Form className={'overflow-y-scroll h-96'} layout="vertical" size="small" style={{ minWidth: 180 }}>
              <Form.Item label="Alt">
                <Input
                  value={alt}
                  onChange={e => setProp(props => { props.alt = e.target.value; })}
                  placeholder="Alt text"
                  size="small"
                />
              </Form.Item>
              <Form.Item label="Link">
                <Input
                  value={link}
                  prefix={<LinkOutlined />}
                  onChange={e => setProp(props => { props.link = e.target.value; })}
                  placeholder="https://"
                  size="small"
                />
              </Form.Item>
              <Form.Item label="Image URL/Base64">
                <Input
                  value={src}
                  onChange={e => setProp(props => { props.src = e.target.value; })}
                  placeholder="Paste URL or base64"
                  size="small"
                />
              </Form.Item>
              <Form.Item label="Upload">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleBase64Upload}
                  prefix={<UploadOutlined />}
                  size="small"
                />
              </Form.Item>
              <Form.Item>
                <Button
                  icon={<UploadOutlined />}
                  onClick={handleFirebaseUpload}
                  block
                  size="small"
                >
                  Upload to Firebase
                </Button>
              </Form.Item>
              <Form.Item label="Object Fit">
                <ObjectFitGroup
                  value={objectFit}
                  onChange={val => setProp(props => { props.objectFit = val; })}
                />
              </Form.Item>
              <Form.Item label="Position">
                <ButtonGroup
                  options={positionOptions}
                  value={position}
                  onChange={val => setProp(props => { props.position = val; })}
                />
              </Form.Item>
              <Form.Item label="Display">
                <ButtonGroup
                  options={displayOptions}
                  value={display}
                  onChange={val => setProp(props => { props.display = val; })}
                />
              </Form.Item>
              {display.includes("flex") && (
                <>
                  <Form.Item label="Justify">
                    <ButtonGroup
                      options={justifyContentOptions}
                      value={justifyContent}
                      onChange={val => setProp(props => { props.justifyContent = val; })}
                    />
                  </Form.Item>
                  <Form.Item label="Align">
                    <ButtonGroup
                      options={alignItemsOptions}
                      value={alignItems}
                      onChange={val => setProp(props => { props.alignItems = val; })}
                    />
                  </Form.Item>
                </>
              )}
              <Form.Item label="X">
                <Slider
                  min={-500}
                  max={500}
                  value={x}
                  onChange={val => setProp(props => { props.x = val; })}
                  tooltip={{ open: false }}
                  size="small"
                />
              </Form.Item>
              <Form.Item label="Y">
                <Slider
                  min={-500}
                  max={500}
                  value={y}
                  onChange={val => setProp(props => { props.y = val; })}
                  tooltip={{ open: false }}
                  size="small"
                />
              </Form.Item>
              <Form.Item label="Z">
                <Slider
                  min={0}
                  max={100}
                  value={zIndex}
                  onChange={val => setProp(props => { props.zIndex = val; })}
                  tooltip={{ open: false }}
                  size="small"
                />
              </Form.Item>
              <Form.Item label="W">
                <Slider
                  min={50}
                  max={800}
                  value={width}
                  onChange={val => setProp(props => { props.width = val; })}
                  tooltip={{ open: false }}
                  size="small"
                />
              </Form.Item>
              <Form.Item label="H">
                <Slider
                  min={50}
                  max={800}
                  value={height}
                  onChange={val => setProp(props => { props.height = val; })}
                  tooltip={{ open: false }}
                  size="small"
                />
              </Form.Item>
              <Form.Item label="Border">
                <Input
                  value={border}
                  onChange={e => setProp(props => { props.border = e.target.value; })}
                  placeholder="e.g. 1px solid #000"
                  prefix={<BorderOutlined />}
                  size="small"
                />
              </Form.Item>
              <Form.Item label="Radius">
                <Slider
                  min={0}
                  max={50}
                  value={borderRadius}
                  onChange={val => setProp(props => { props.borderRadius = val; })}
                  tooltip={{ open: false }}
                  size="small"
                />
              </Form.Item>
            </Form>
          </div>
        </Draggable>,
        document.body
      )
    : null;

  return (
    <div className="absolute inset-0" ref={ref}>
      <ResizableBox
        width={width}
        height={height}
        onResizeStop={(e, data) => {
          setProp((props) => {
            props.width = data.size.width;
            props.height = data.size.height;
          });
        }}
        resizeHandles={["se"]}
        minConstraints={[50, 50]}
        maxConstraints={[9000, 9000]}
      >
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
              position,
              display,
              justifyContent: display.includes("flex") ? justifyContent : undefined,
              alignItems: display.includes("flex") ? alignItems : undefined,
              left: position === "absolute" || position === "fixed" || position === "relative" ? x : undefined,
              top: position === "absolute" || position === "fixed" || position === "relative" ? y : undefined,
              zIndex,
              cursor: "pointer",
            }}
            onClick={e => {
              e.preventDefault();
              setMenuOpen(true);
            }}
          />
          </ResizableBox>
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
    position: "static",
    display: "block",
    justifyContent: "flex-start",
    alignItems: "stretch",
    x: 0,
    y: 0,
    zIndex: 1,
  },
  rules: {
    canDrag: () => true,
  }
};