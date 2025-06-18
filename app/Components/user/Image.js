'use client';
import ReactDOM from "react-dom";
import { useNode, useEditor } from "@craftjs/core";
import React, { useRef, useEffect, useState } from "react";
import { Input, Form, Button, Slider, Space } from "antd";
import {DeleteOutlined,DragOutlined, BorderOutlined, LinkOutlined, UploadOutlined, BgColorsOutlined, PictureOutlined, AlignCenterOutlined, AlignLeftOutlined, AlignRightOutlined, VerticalAlignMiddleOutlined, AppstoreOutlined, ColumnWidthOutlined, ColumnHeightOutlined, BorderVerticleOutlined, BorderHorizontalOutlined } from '@ant-design/icons';
import interact from "interactjs";
import { StyleMenu } from "./StyleMenu"; 


const HANDLE_SIZE = 12;

const handles = [
  { key: "tl", style: { left: -HANDLE_SIZE/2, top: -HANDLE_SIZE/2, cursor: "nwse-resize" }, axis: "both" },
  { key: "tm", style: { left: "50%", top: -HANDLE_SIZE/2, transform: "translateX(-50%)", cursor: "ns-resize" }, axis: "y" },
  { key: "tr", style: { right: -HANDLE_SIZE/2, top: -HANDLE_SIZE/2, cursor: "nesw-resize" }, axis: "both" },
  { key: "mr", style: { right: -HANDLE_SIZE/2, top: "50%", transform: "translateY(-50%)", cursor: "ew-resize" }, axis: "x" },
  { key: "br", style: { right: -HANDLE_SIZE/2, bottom: -HANDLE_SIZE/2, cursor: "nwse-resize" }, axis: "both" },
  { key: "bm", style: { left: "50%", bottom: -HANDLE_SIZE/2, transform: "translateX(-50%)", cursor: "ns-resize" }, axis: "y" },
  { key: "bl", style: { left: -HANDLE_SIZE/2, bottom: -HANDLE_SIZE/2, cursor: "nesw-resize" }, axis: "both" },
  { key: "ml", style: { left: -HANDLE_SIZE/2, top: "50%", transform: "translateY(-50%)", cursor: "ew-resize" }, axis: "x" },
];

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
  x = 0,
  y = 0,
  zIndex = 1,
  children,
}) => {

const {
    id,
    connectors: { connect, drag },
    hasSelectedNode,
    actions: { setProp }
  } = useNode((node) => ({
    id: node.id,
    hasSelectedNode: node.events.selected,
  }));

const { actions } = useEditor();

  const ref = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 100, y: 100 });
  const [isClient, setIsClient] = useState(false);
  const menuRef = useRef(null);
  const [menuDragPos, setMenuDragPos] = useState({ x: 100, y: 100 });
  const handleRefs = useRef({});
  const dragIconRef = useRef(null);

  const [isCraftDrag, setIsCraftDrag] = useState(false);
  
// Only set menu position when opening
const handleMenuOpen = (e) => {
  if (!menuOpen) {
    setMenuDragPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  }
};

useEffect(() => {
  if (dragIconRef.current) {
    connect(drag(dragIconRef.current));
  }
}, [connect, drag]);

// Make the menu draggable with interact.js
useEffect(() => {
  if (!menuRef.current) return;
  interact(menuRef.current).draggable({
    allowFrom: '.drag-handle',
    listeners: {
      move(event) {
        setMenuDragPos(pos => ({
          x: pos.x + event.dx,
          y: pos.y + event.dy
        }));
      }
    }
  });
  return () => {
    if (menuRef.current) interact(menuRef.current).unset();
  };
}, [menuRef, menuOpen]);

// Resize with 8 handles
  useEffect(() => {
    handles.forEach(handle => {
      const handleEl = handleRefs.current[handle.key];
      if (!handleEl) return;
      interact(handleEl).draggable({
        listeners: {
          move(event) {
            setImgState(prev => {
              let { x, y, width, height } = prev;
              // Corner handles
              if (handle.key === "tl") {
                width = Math.max(50, width - event.dx);
                height = Math.max(50, height - event.dy);
                x += event.dx;
                y += event.dy;
              } else if (handle.key === "tr") {
                width = Math.max(50, width + event.dx);
                height = Math.max(50, height - event.dy);
                y += event.dy;
              } else if (handle.key === "br") {
                width = Math.max(50, width + event.dx);
                height = Math.max(50, height + event.dy);
              } else if (handle.key === "bl") {
                width = Math.max(50, width - event.dx);
                height = Math.max(50, height + event.dy);
                x += event.dx;
              }
              // Side handles
              else if (handle.key === "tm") {
                height = Math.max(50, height - event.dy);
                y += event.dy;
              } else if (handle.key === "bm") {
                height = Math.max(50, height + event.dy);
              } else if (handle.key === "ml") {
                width = Math.max(50, width - event.dx);
                x += event.dx;
              } else if (handle.key === "mr") {
                width = Math.max(50, width + event.dx);
              }
              setProp(props => { props.x = x; props.y = y; props.width = width; props.height = height; });
              return { x, y, width, height };
            });
          }
        }
      });
    });
    return () => {
      handles.forEach(handle => {
        const handleEl = handleRefs.current[handle.key];
        if (handleEl) interact(handleEl).unset();
      });
    };
  }, [setProp]);

  // Sync state with props
  useEffect(() => { setImgState({ x, y, width, height }); }, [x, y, width, height]);

useEffect(() => {
  const handleUp = () => setIsCraftDrag(false);
  window.addEventListener('mouseup', handleUp);
  return () => window.removeEventListener('mouseup', handleUp);
}, []);

  // For interact.js state
  const [imgState, setImgState] = useState({
    x,
    y,
    width,
    height,
    borderRadius,
  });

  // Sync state with props if changed externally
  useEffect(() => {
    setImgState((prev) => ({
      ...prev,
      x, y, width, height, borderRadius
    }));
  }, [x, y, width, height, borderRadius]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // interact.js for drag and resize
 useEffect(() => {
  if (!ref.current || isCraftDrag) return; // <-- Don't enable interact.js drag if Craft.js drag is active

  interact(ref.current)
    .draggable({
      listeners: {
        move(event) {
          setImgState((prev) => {
            const newX = prev.x + event.dx;
            const newY = prev.y + event.dy;
            setProp((props) => {
              props.x = newX;
              props.y = newY;
            });
            return { ...prev, x: newX, y: newY };
          });
        },
      },
    });

  return () => {
    if (ref.current) {
      interact(ref.current).unset();
    }
  };
}, [ref, setProp, isCraftDrag]);

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

  // Button group for options
  const ButtonGroup = ({ options, value, onChange, size = "small" }) => (
    <Space.Compact block>
      {options.map(opt => (
        <span className="relative group" key={opt.value}>
          <Button
            type={value === opt.value ? "primary" : "default"}
            icon={opt.icon}
            size={size}
            style={{ minWidth: 32, padding: 0 }}
            onClick={() => onChange(opt.value)}
          >
            {!opt.icon && opt.label}
          </Button>
          {/* Custom hover label */}
          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition z-50">
            {opt.label}
          </span>
        </span>
      ))}
    </Space.Compact>
  );

  // Button group for objectFit (text only)
  const ObjectFitGroup = ({ value, onChange }) => (
    <Space.Compact block>
      {objectFitOptions.map(opt => (
        <span className="relative group" key={opt.value}>
          <Button
            type={value === opt.value ? "primary" : "default"}
            size="small"
            style={{ minWidth: 32, padding: 0 }}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </Button>
          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition z-50">
            {opt.label}
          </span>
        </span>
      ))}
    </Space.Compact>
  );

  // Border radius controls (all or individual corners)
  const [radiusMode, setRadiusMode] = useState("all");
  const [cornerRadius, setCornerRadius] = useState({
    tl: borderRadius,
    tr: borderRadius,
    br: borderRadius,
    bl: borderRadius,
  });

  // Update borderRadius prop
  useEffect(() => {
    if (radiusMode === "all") {
      setProp(props => { props.borderRadius = cornerRadius.tl; });
    } else {
      setProp(props => {
        props.borderRadius = `${cornerRadius.tl}px ${cornerRadius.tr}px ${cornerRadius.br}px ${cornerRadius.bl}px`;
      });
    }
  }, [cornerRadius, radiusMode, setProp]);

  // Editor menu
  const editorMenu = isClient && menuOpen
    ? ReactDOM.createPortal(
        <div
           ref={menuRef}
         style={{
          position: "fixed",
          zIndex: 9999,
          top: menuDragPos.y,
          left: menuDragPos.x,
          background: "#fff",
          boxShadow: "0 2px 16px rgba(0,0,0,0.18)",
          borderRadius: 12,
          minWidth: 220,
          padding: 20,
          fontSize: 13,
          maxWidth: 320,
          cursor: "default"
        }}
        >
          <div
          className="drag-handle"
          style={{
            fontWeight: 600,
            marginBottom: 8,
            userSelect: "none",
            letterSpacing: 0.5,
            fontSize: 15,
            color: "#222",
            cursor: "move"
          }}
        >
            <PictureOutlined style={{ marginRight: 6 }} />
            Image
            <Button
  danger
  icon={<DeleteOutlined />}
 onClick={() => actions.delete(id)}
  block
  className="text-xs"
  style={{ marginTop: 8, height: 24, width:24, border:"none" }}
>
</Button>
            <Button
              size="small"
              type="text"
              style={{ float: "right" }}
              onClick={() => setMenuOpen(false)}
            >
              ✕
            </Button>
          </div>
          <Form className={'overflow-y-scroll h-96 flex flex-col -gap-10'} layout="vertical" size="small" style={{ minWidth: 180 }}>
            <Form.Item label="Alt">
              <Input
                value={alt}
                onChange={e => setProp(props => { props.alt = e.target.value; })}
                placeholder="Alt text"
                size="small"
              />
              </Form.Item>
          
            <Form.Item label="Link/Base64">
              <Input
                prefix={<LinkOutlined />}
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
                Save to Bucket
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
            <Form.Item label="X">
              <Slider
                min={-500}
                max={500}
                value={imgState.x}
                onChange={val => {
                  setImgState(s => ({ ...s, x: val }));
                  setProp(props => { props.x = val; });
                }}
                tooltip={{ open: false }}
                size="small"
              />
            </Form.Item>
            <Form.Item label="Y">
              <Slider
                min={-500}
                max={500}
                value={imgState.y}
                onChange={val => {
                  setImgState(s => ({ ...s, y: val }));
                  setProp(props => { props.y = val; });
                }}
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
                value={imgState.width}
                onChange={val => {
                  setImgState(s => ({ ...s, width: val }));
                  setProp(props => { props.width = val; });
                }}
                tooltip={{ open: false }}
                size="small"
              />
            </Form.Item>
            <Form.Item label="H">
              <Slider
                min={50}
                max={800}
                value={imgState.height}
                onChange={val => {
                  setImgState(s => ({ ...s, height: val }));
                  setProp(props => { props.height = val; });
                }}
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
              <div className="flex gap-2 mb-2">
                <Button
                  size="small"
                  type={radiusMode === "all" ? "primary" : "default"}
                  onClick={() => setRadiusMode("all")}
                >
                  All
                </Button>
                <Button
                  size="small"
                  type={radiusMode === "corners" ? "primary" : "default"}
                  onClick={() => setRadiusMode("corners")}
                >
                  Corners
                </Button>
              </div>
              {radiusMode === "all" ? (
                <Slider
                  min={0}
                  max={50}
                  value={cornerRadius.tl}
                  onChange={val => setCornerRadius(r => ({ tl: val, tr: val, br: val, bl: val }))}
                  tooltip={{ open: false }}
                  size="small"
                />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs">Top Left</span>
                    <Slider
                      min={0}
                      max={50}
                      value={cornerRadius.tl}
                      onChange={val => setCornerRadius(r => ({ ...r, tl: val }))}
                      tooltip={{ open: false }}
                      size="small"
                    />
                  </div>
                  <div>
                    <span className="text-xs">Top Right</span>
                    <Slider
                      min={0}
                      max={50}
                      value={cornerRadius.tr}
                      onChange={val => setCornerRadius(r => ({ ...r, tr: val }))}
                      tooltip={{ open: false }}
                      size="small"
                    />
                  </div>
                  <div>
                    <span className="text-xs">Bottom Right</span>
                    <Slider
                      min={0}
                      max={50}
                      value={cornerRadius.br}
                      onChange={val => setCornerRadius(r => ({ ...r, br: val }))}
                      tooltip={{ open: false }}
                      size="small"
                    />
                  </div>
                  <div>
                    <span className="text-xs">Bottom Left</span>
                    <Slider
                      min={0}
                      max={50}
                      value={cornerRadius.bl}
                      onChange={val => setCornerRadius(r => ({ ...r, bl: val }))}
                      tooltip={{ open: false }}
                      size="small"
                    />
                  </div>
                </div>
              )}
            </Form.Item>

            <Form.Item>
  <Button
  danger
  icon={<DeleteOutlined />}
 onClick={() => actions.delete(id)}
  block
  style={{ marginTop: 8 }}
>
  Delete
</Button>
</Form.Item>
          </Form>
        </div>,
        document.body
      )
    : null;

  return (
    <div
    ref={ref}
    className={`absolute ${hasSelectedNode ? "border-2 border-blue-500" : ""} shadow`}
    style={{
      left: imgState.x,
      top: imgState.y,
      width: imgState.width,
      height: imgState.height,
      border: border,
      borderRadius: typeof borderRadius === "number"
      ? `${borderRadius}px`
      : borderRadius,
      userSelect: "none",
      background: "#fff",
      zIndex: zIndex,
      transition: "box-shadow 0.2s",
      display: display,
      position:  position,
    }}
    onContextMenu={e => {
  e.preventDefault();
  handleMenuOpen(e);
}}
  >
       <img
      src={src || 'https://plus.unsplash.com/premium_photo-1687173116184-c972fec1be54?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'}
      alt={alt}
      style={{
        width: "100%",
        height: "100%",
        objectFit,
        borderRadius: "inherit",
        pointerEvents: "none",
      }}
    />
  {handles.map(handle => (
  <div
    key={handle.key}
    ref={el => handleRefs.current[handle.key] = el}
    className="absolute"
    style={{
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
      background: "red",
      border: "2px solid white",
      borderRadius: "50%",
      zIndex: 20,
      ...handle.style,
    }}
    onMouseDown={e => e.stopPropagation()}
  />
))}
 <div
  ref={dragIconRef}
  style={{
    position: "absolute",
    left: "50%",
    bottom: -HANDLE_SIZE * 3,
    transform: "translateX(-50%)",
    cursor: "grab",
    zIndex: 30,
    background: "#fff",
    borderRadius: "50%",
    boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
    padding: 2,
    border: "1px solid #ccc"
  }}
  onMouseDown={e => {
    setIsCraftDrag(true); // Disable interact.js drag
    e.stopPropagation();
  }}
  onMouseUp={() => setIsCraftDrag(false)} // Re-enable interact.js drag after drag
  title="Drag to move to another container"
>
  <DragOutlined style={{ fontSize: 18, color: "#555" }} />
</div>
      {isClient && menuOpen && (
  <StyleMenu
    nodeId={id}
    props={{
    src,
    alt,
    width,
    height,
    border,
    objectFit,
    borderRadius,
    link,
    position,
    display,
    x,
    y,
    zIndex,
    menuX: menuDragPos.x,
    menuY: menuDragPos.y,
  }}
    setProp={setProp}
    supportedProps={['src','alt',
      "width", "height", "border", "borderRadius", "boxShadow", "backgroundColor", "backgroundImage", "objectFit",
      "position", "display", "zIndex", "overflow", "margin", "padding", "float", "transition", "transform"
    ]}
    onClose={() => setMenuOpen(false)}
    onDelete={() => actions.delete(id)}
  />
)}
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
    position: "relative",
    display: "block",
    x: 0,
    y: 0,
    zIndex: 1,
  },
  rules: {
    canDrag: () => true,
  }
};