'use client'
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import interact from "interactjs";
import { Button, Input, Slider, Space, Select, Tooltip, Form } from "antd";
import {
  DeleteOutlined,
  CloseOutlined,
  BgColorsOutlined,
  FontColorsOutlined,
  PictureOutlined,
  BorderOutlined,
  RadiusUpleftOutlined,
  RadiusUprightOutlined,
  RadiusBottomleftOutlined,
  RadiusBottomrightOutlined,
  LinkOutlined,
  UploadOutlined
} from "@ant-design/icons";

const fontWeights = [400, 500, 600, 700, 800, 900];
const textAligns = ["left", "center", "right", "justify"];
const displays = ["block", "inline-block", "inline", "flex", "grid", "none"];
const positions = ["static", "relative", "absolute", "fixed", "sticky"];
const overflows = ["visible", "hidden", "scroll", "auto"];
const floats = ["none", "left", "right"];
const textDecorations = ["none", "underline", "line-through", "overline"];
const textTransforms = ["none", "uppercase", "lowercase", "capitalize"];
const whiteSpaces = ["normal", "nowrap", "pre", "pre-line", "pre-wrap"];
const flexDirections = [
  "row",
  "row-reverse",
  "column",
  "column-reverse",
];
const alignItems = [
  "stretch",
  "flex-start",
  "center",
  "flex-end",
  "baseline",
];
const justifyContents = [
  "flex-start",
  "center",
  "flex-end",
  "space-between",
  "space-around",
  "space-evenly",
];

const googleFonts = [
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Oswald",
  "Raleway",
  "Merriweather",
  "Poppins",
  "Nunito",
  "Inter",
  "Playfair Display",
  "Source Sans Pro",
  "Work Sans",
  "Rubik",
];

export function StyleMenu({
  nodeId,
  props,
  setProp,
  supportedProps,
  onClose,
  onDelete,
}) {
  // Initialize local state from props
  // These local states prevent focus loss during editing
  const [src, setSrc] = useState(props.src || "");
  const [alt, setAlt] = useState(props.alt || "");
  const [text, setText] = useState(props.text || "");
  const [fontFamily, setFontFamily] = useState(props.fontFamily || "");
  const [fontSize, setFontSize] = useState(props.fontSize || 14);
  const [fontWeight, setFontWeight] = useState(props.fontWeight || 400);
  const [color, setColor] = useState(props.color || "#000000");
  const [textAlign, setTextAlign] = useState(props.textAlign || "left");
  const [width, setWidth] = useState(props.width || 200);
  const [height, setHeight] = useState(props.height || 200);
  const [margin, setMargin] = useState(props.margin || "");
  const [padding, setPadding] = useState(props.padding || "");
  const [border, setBorder] = useState(props.border || "");
  const [boxShadow, setBoxShadow] = useState(props.boxShadow || "");
  const [display, setDisplay] = useState(props.display || "block");
  const [position, setPosition] = useState(props.position || "static");
  const [float, setFloat] = useState(props.float || "none");
  const [zIndex, setZIndex] = useState(props.zIndex || 1);
  const [overflow, setOverflow] = useState(props.overflow || "visible");
  const [backgroundColor, setBackgroundColor] = useState(props.backgroundColor || "#ffffff");
  const [backgroundImage, setBackgroundImage] = useState(props.backgroundImage || "");
  const [flexDirection, setFlexDirection] = useState(props.flexDirection || "row");
  const [alignItems, setAlignItems] = useState(props.alignItems || "stretch");
  const [justifyContent, setJustifyContent] = useState(props.justifyContent || "flex-start");
  const [gridTemplateColumns, setGridTemplateColumns] = useState(props.gridTemplateColumns || "");
  const [transition, setTransition] = useState(props.transition || "");
  const [transform, setTransform] = useState(props.transform || "");
  const [animation, setAnimation] = useState(props.animation || "");
  const [objectFit, setObjectFit] = useState(props.objectFit || "cover");
  const [link, setLink] = useState(props.link || "");

  // Draggable menu
  const menuRef = useRef(null);
  const [dragPos, setDragPos] = useState({
    x: props.menuX || 100,
    y: props.menuY || 100,
  });

  // Border radius state
  const [radiusMode, setRadiusMode] = useState("all");
  const [cornerRadius, setCornerRadius] = useState({
    tl: typeof props.borderRadius === "number"
      ? props.borderRadius
      : parseInt((props.borderRadius || "0").split(" ")[0]) || 0,
    tr: typeof props.borderRadius === "number"
      ? props.borderRadius
      : parseInt((props.borderRadius || "0").split(" ")[1]) || 0,
    br: typeof props.borderRadius === "number"
      ? props.borderRadius
      : parseInt((props.borderRadius || "0").split(" ")[2]) || 0,
    bl: typeof props.borderRadius === "number"
      ? props.borderRadius
      : parseInt((props.borderRadius || "0").split(" ")[3]) || 0,
  });

  // Update borderRadius when cornerRadius changes
  useEffect(() => {
    if (!supportedProps.includes("borderRadius")) return;
    if (radiusMode === "all") {
      setProp((p) => {
        p.borderRadius = cornerRadius.tl;
      });
    } else {
      setProp((p) => {
        p.borderRadius = `${cornerRadius.tl}px ${cornerRadius.tr}px ${cornerRadius.br}px ${cornerRadius.bl}px`;
      });
    }
    // eslint-disable-next-line
  }, [cornerRadius, radiusMode]);

  // Google Fonts loader
  useEffect(() => {
    if (!fontFamily) return;
    const linkId = "google-font-" + fontFamily.replace(/\s+/g, "-");
    if (document.getElementById(linkId)) return;
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css?family=${fontFamily.replace(/\s+/g, "+")}:400,700&display=swap`;
    document.head.appendChild(link);
  }, [fontFamily]);

  // Make menu draggable with interact.js
  useEffect(() => {
    if (!menuRef.current) return;
    interact(menuRef.current).draggable({
      allowFrom: ".drag-handle",
      listeners: {
        move(event) {
          setDragPos((pos) => ({
            x: pos.x + event.dx,
            y: pos.y + event.dy,
          }));
        },
      },
    });
    return () => {
      if (menuRef.current) interact(menuRef.current).unset();
    };
  }, []);

  // Prevent drag bubbling to main component
  const stopAll = (e) => e.stopPropagation();

  // Button group helper (like in Image component)
  const ButtonGroup = ({ options, value, onChange, icons }) => (
    <Space.Compact block>
      {options.map((opt, i) => (
        <Tooltip title={opt} key={opt}>
          <Button
            type={value === opt ? "primary" : "default"}
            size="small"
            style={{
              minWidth: 32,
              padding: 0,
              fontWeight: 500,
              ...(value === opt
                ? { borderColor: "#1677ff", color: "#1677ff" }
                : {}),
            }}
            onClick={() => {
              onChange(opt);
              // Also update parent immediately for button selections
              if (options === fontWeights) setProp(p => { p.fontWeight = opt; });
              if (options === textAligns) setProp(p => { p.textAlign = opt; });
              if (options === displays) setProp(p => { p.display = opt; });
              if (options === positions) setProp(p => { p.position = opt; });
              if (options === overflows) setProp(p => { p.overflow = opt; });
              if (options === floats) setProp(p => { p.float = opt; });
              if (options === flexDirections) setProp(p => { p.flexDirection = opt; });
              if (options === alignItems) setProp(p => { p.alignItems = opt; });
              if (options === justifyContents) setProp(p => { p.justifyContent = opt; });
            }}
            icon={icons ? icons[i] : undefined}
          >
            {!icons && opt}
          </Button>
        </Tooltip>
      ))}
    </Space.Compact>
  );

  // Create portal for menu
  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      
      style={{
        position: "fixed",
        zIndex: 9999,
        top: 0,
        left: 0,
        transform: `translate(${dragPos.x}px, ${dragPos.y}px)`,
        background: "#fff",
        boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
        borderRadius: 16,
        minWidth: 260,
        maxWidth: 380,
        fontSize: 13,
        cursor: "default",
        border: "1px solid #eee",
        padding: 0,
      }}
    >
      {/* Header - similar to editorMenu */}
      <div
        className="drag-handle"
        style={{
          fontWeight: 700,
          padding: "16px 20px 10px 20px",
          userSelect: "none",
          letterSpacing: 0.5,
          fontSize: 16,
          color: "#222",
          cursor: "move",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          background: "#f8fafd",
          borderBottom: "1px solid #f0f0f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>Style</span>
        <span>
          <Tooltip title="Delete">
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={onDelete}
              size="small"
              style={{ marginRight: 4 }}
            />
          </Tooltip>
          <Tooltip title="Close">
            <Button
              size="small"
              type="text"
              icon={<CloseOutlined />}
              onClick={onClose}
            />
          </Tooltip>
        </span>
      </div>

      {/* Content - Using Form like editorMenu */}
      <Form 
      onPointerDown={stopAll}
      onPointerMove={stopAll}
      onPointerUp={stopAll}
        className="overflow-y-auto"
        layout="vertical" 
        size="small" 
        style={{ 
          height: "24rem",
          padding: "18px 20px 18px 20px",
          overflowY: "auto" 
        }}
      >
        {/* Media Section */}
        {(supportedProps.includes("src") ||
          supportedProps.includes("alt") ||
          supportedProps.includes("link")) && (
          <Form.Item 
            label={<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <PictureOutlined />
              <span style={{ fontWeight: 600, fontSize: 13 }}>Media</span>
            </div>}
          >
            {supportedProps.includes("src") && (
              <Form.Item label="Source" style={{ marginBottom: 8 }}>
                <Input
                  value={src}
                  onChange={e => setSrc(e.target.value)}
                  onBlur={() => setProp(p => { p.src = src; })}
                  size="small"
                  placeholder="Image or video URL"
                />
              </Form.Item>
            )}
            {supportedProps.includes("alt") && (
              <Form.Item label="Alt Text" style={{ marginBottom: 8 }}>
                <Input
                  value={alt}
                  onChange={e => setAlt(e.target.value)}
                  onBlur={() => setProp(p => { p.alt = alt; })}
                  size="small"
                  placeholder="Alt text"
                />
              </Form.Item>
            )}
            {supportedProps.includes("link") && (
              <Form.Item label="Link" style={{ marginBottom: 8 }}>
                <Input
                  value={link}
                  onChange={e => setLink(e.target.value)}
                  onBlur={() => setProp(p => { p.link = link; })}
                  size="small"
                  placeholder="Link URL"
                  prefix={<LinkOutlined />}
                />
              </Form.Item>
            )}
          </Form.Item>
        )}

        {/* Text Section */}
        {(supportedProps.includes("text") ||
          supportedProps.includes("fontFamily") ||
          supportedProps.includes("fontSize") ||
          supportedProps.includes("fontWeight") ||
          supportedProps.includes("color") ||
          supportedProps.includes("textAlign")) && (
          <Form.Item 
            label={<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FontColorsOutlined />
              <span style={{ fontWeight: 600, fontSize: 13 }}>Text</span>
            </div>}
          >
            {supportedProps.includes("text") && (
              <Form.Item label="Text" style={{ marginBottom: 8 }}>
                <Input.TextArea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onBlur={() => setProp(p => { p.text = text; })}
                  size="small"
                  autoSize={{ minRows: 2, maxRows: 4 }}
                />
              </Form.Item>
            )}
            {supportedProps.includes("fontFamily") && (
              <Form.Item label="Font" style={{ marginBottom: 8 }}>
                <Select
  showSearch
  value={fontFamily}
  onChange={val => {
    setFontFamily(val);
    setProp(p => { p.fontFamily = val; });
  }}
  options={googleFonts.map((f) => ({
    value: f,
    label: f,
  }))}
  size="small"
  style={{ width: "100%" }}
  dropdownStyle={{ zIndex: 99999 }}  // Add this line to fix z-index
  getPopupContainer={triggerNode => triggerNode.parentNode} // Ensure dropdown renders in the right container
  placeholder="Font"
  optionFilterProp="label"
/>                     
              </Form.Item>
            )}
            {supportedProps.includes("fontSize") && (
              <Form.Item label="Size" style={{ marginBottom: 8 }}>
                <Slider
                  min={7}
                  max={72}
                  value={fontSize}
                  onChange={val => setFontSize(val)}
                  onAfterChange={val => setProp(p => { p.fontSize = val; })}
                  size="small"
                />
              </Form.Item>
            )}
            {supportedProps.includes("fontWeight") && (
              <Form.Item label="Weight" style={{ marginBottom: 8 }}>
                <ButtonGroup
                  options={fontWeights}
                  value={fontWeight}
                  onChange={setFontWeight}
                />
              </Form.Item>
            )}
            {supportedProps.includes("color") && (
              <Form.Item label="Color" style={{ marginBottom: 8 }}>
                <Input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  onBlur={() => setProp(p => { p.color = color; })}
                  size="small"
                  style={{ width: 40, height: 32, padding: 2 }}
                />
              </Form.Item>
            )}
            {supportedProps.includes("textAlign") && (
              <Form.Item label="Align" style={{ marginBottom: 8 }}>
                <ButtonGroup
                  options={textAligns}
                  value={textAlign}
                  onChange={setTextAlign}
                />
              </Form.Item>
            )}
          </Form.Item>
        )}
      
        {/* Box Model */}
        {(supportedProps.includes("width") ||
          supportedProps.includes("height") ||
          supportedProps.includes("margin") ||
          supportedProps.includes("padding") ||
          supportedProps.includes("border") ||
          supportedProps.includes("borderRadius") ||
          supportedProps.includes("boxShadow")) && (
          <Form.Item 
            label={<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BorderOutlined />
              <span style={{ fontWeight: 600, fontSize: 13 }}>Box</span>
            </div>}
          >
            {supportedProps.includes("width") && (
              <Form.Item label="Width" style={{ marginBottom: 8 }}>
                <Slider
                  min={10}
                  max={1200}
                  value={width}
                  onChange={val => setWidth(val)}
                  onAfterChange={val => setProp(p => { p.width = val; })}
                  size="small"
                />
              </Form.Item>
            )}
            {supportedProps.includes("height") && (
              <Form.Item label="Height" style={{ marginBottom: 8 }}>
                <Slider
                  min={10}
                  max={800}
                  value={height}
                  onChange={val => setHeight(val)}
                  onAfterChange={val => setProp(p => { p.height = val; })}
                  size="small"
                />
              </Form.Item>
            )}
            {supportedProps.includes("margin") && (
              <Form.Item label="Margin" style={{ marginBottom: 8 }}>
                <Input
                  value={margin}
                  onChange={e => setMargin(e.target.value)}
                  onBlur={() => setProp(p => { p.margin = margin; })}
                  size="small"
                  placeholder="e.g. 10px 20px"
                />
              </Form.Item>
            )}
            {supportedProps.includes("padding") && (
              <Form.Item label="Padding" style={{ marginBottom: 8 }}>
                <Input
                  value={padding}
                  onChange={e => setPadding(e.target.value)}
                  onBlur={() => setProp(p => { p.padding = padding; })}
                  size="small"
                  placeholder="e.g. 10px 20px"
                />
              </Form.Item>
            )}
            {supportedProps.includes("border") && (
              <Form.Item label="Border" style={{ marginBottom: 8 }}>
                <Input
                  value={border}
                  onChange={e => setBorder(e.target.value)}
                  onBlur={() => setProp(p => { p.border = border; })}
                  size="small"
                  placeholder="e.g. 1px solid #000"
                />
              </Form.Item>
            )}
            {/* Border radius */}
            {supportedProps.includes("borderRadius") && (
              <Form.Item label="Radius" style={{ marginBottom: 8 }}>
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
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <RadiusUpleftOutlined />
    <Slider
      min={0}
      max={100}
      value={cornerRadius.tl}
      onChange={(val) =>
        setCornerRadius((r) => ({
          tl: val,
          tr: val,
          br: val,
          bl: val,
        }))
      }
      onAfterChange={(val) => 
        setProp(p => { p.borderRadius = val; })
      }
      size="small"
    />
  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#444" }}>
                        <RadiusUpleftOutlined /> TL
                      </span>
                      <Slider
                        min={0}
                        max={100}
                        value={cornerRadius.tl}
                        onChange={(val) =>
                          setCornerRadius((r) => ({ ...r, tl: val }))
                        }
                        size="small"
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#444" }}>
                        <RadiusUprightOutlined /> TR
                      </span>
                      <Slider
                        min={0}
                        max={100}
                        value={cornerRadius.tr}
                        onChange={(val) =>
                          setCornerRadius((r) => ({ ...r, tr: val }))
                        }
                        size="small"
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#444" }}>
                        <RadiusBottomrightOutlined /> BR
                      </span>
                      <Slider
                        min={0}
                        max={100}
                        value={cornerRadius.br}
                        onChange={(val) =>
                          setCornerRadius((r) => ({ ...r, br: val }))
                        }
                        size="small"
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#444" }}>
                        <RadiusBottomleftOutlined /> BL
                      </span>
                      <Slider
                        min={0}
                        max={100}
                        value={cornerRadius.bl}
                        onChange={(val) =>
                          setCornerRadius((r) => ({ ...r, bl: val }))
                        }
                        size="small"
                      />
                    </div>
                  </div>
                )}
              </Form.Item>
            )}
            {supportedProps.includes("boxShadow") && (
              <Form.Item label="Shadow" style={{ marginBottom: 8 }}>
                <Input
                  value={boxShadow}
                  onChange={e => setBoxShadow(e.target.value)}
                  onBlur={() => setProp(p => { p.boxShadow = boxShadow; })}
                  size="small"
                  placeholder="e.g. 0 2px 8px #0003"
                />
              </Form.Item>
            )}
          </Form.Item>
        )}

        {/* Layout */}
        {(supportedProps.includes("display") ||
          supportedProps.includes("position") ||
          supportedProps.includes("float") ||
          supportedProps.includes("zIndex") ||
          supportedProps.includes("overflow")) && (
          <Form.Item 
            label={<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BgColorsOutlined />
              <span style={{ fontWeight: 600, fontSize: 13 }}>Layout</span>
            </div>}
          >
            {supportedProps.includes("display") && (
              <Form.Item label="Display" style={{ marginBottom: 8 }}>
                <ButtonGroup
                  options={displays}
                  value={display}
                  onChange={setDisplay}
                />
              </Form.Item>
            )}
            {supportedProps.includes("position") && (
              <Form.Item label="Position" style={{ marginBottom: 8 }}>
                <ButtonGroup
                  options={positions}
                  value={position}
                  onChange={setPosition}
                />
              </Form.Item>
            )}
            {supportedProps.includes("float") && (
              <Form.Item label="Float" style={{ marginBottom: 8 }}>
                <ButtonGroup
                  options={floats}
                  value={float}
                  onChange={setFloat}
                />
              </Form.Item>
            )}
            {supportedProps.includes("zIndex") && (
              <Form.Item label="Z-Index" style={{ marginBottom: 8 }}>
                <Slider
                  min={0}
                  max={100}
                  value={zIndex}
                  onChange={val => setZIndex(val)}
                  onAfterChange={val => setProp(p => { p.zIndex = val; })}
                  size="small"
                />
              </Form.Item>
            )}
            {supportedProps.includes("overflow") && (
              <Form.Item label="Overflow" style={{ marginBottom: 8 }}>
                <ButtonGroup
                  options={overflows}
                  value={overflow}
                  onChange={setOverflow}
                />
              </Form.Item>
            )}
          </Form.Item>
        )}

        {/* Background */}
        {(supportedProps.includes("backgroundColor") ||
          supportedProps.includes("backgroundImage")) && (
          <Form.Item 
            label={<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BgColorsOutlined />
              <span style={{ fontWeight: 600, fontSize: 13 }}>Background</span>
            </div>}
          >
            {supportedProps.includes("backgroundColor") && (
              <Form.Item label="Color" style={{ marginBottom: 8 }}>
                <Input
                  type="color"
                  value={backgroundColor}
                  onChange={e => setBackgroundColor(e.target.value)}
                  onBlur={() => setProp(p => { p.backgroundColor = backgroundColor; })}
                  size="small"
                  style={{ width: 40, height: 32, padding: 2 }}
                />
              </Form.Item>
            )}
            {supportedProps.includes("backgroundImage") && (
              <Form.Item label="Image" style={{ marginBottom: 8 }}>
                <Input
                  value={backgroundImage}
                  onChange={e => setBackgroundImage(e.target.value)}
                  onBlur={() => setProp(p => { p.backgroundImage = backgroundImage; })}
                  size="small"
                  placeholder="URL or CSS"
                  prefix={<PictureOutlined />}
                />
              </Form.Item>
            )}
          </Form.Item>
        )}

        {/* Object Fit (for images) */}
        {supportedProps.includes("objectFit") && (
          <Form.Item label="Object Fit">
            <Space.Compact block>
              {["fill", "contain", "cover", "none", "scale-down"].map(opt => (
                <Button
                  key={opt}
                  type={objectFit === opt ? "primary" : "default"}
                  size="small"
                  onClick={() => {
                    setObjectFit(opt);
                    setProp(p => { p.objectFit = opt; });
                  }}
                >
                  {opt}
                </Button>
              ))}
            </Space.Compact>
          </Form.Item>
        )}

        {/* Flexbox */}
        {(supportedProps.includes("flexDirection") ||
          supportedProps.includes("alignItems") ||
          supportedProps.includes("justifyContent")) && (
          <Form.Item 
            label={<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BorderOutlined />
              <span style={{ fontWeight: 600, fontSize: 13 }}>Flexbox</span>
            </div>}
          >
            {supportedProps.includes("flexDirection") && (
              <Form.Item label="Direction" style={{ marginBottom: 8 }}>
                <ButtonGroup
                  options={flexDirections}
                  value={flexDirection}
                  onChange={setFlexDirection}
                />
              </Form.Item>
            )}
            {supportedProps.includes("alignItems") && (
              <Form.Item label="Align Items" style={{ marginBottom: 8 }}>
                <ButtonGroup
                  options={alignItems}
                  value={alignItems}
                  onChange={setAlignItems}
                />
              </Form.Item>
            )}
            {supportedProps.includes("justifyContent") && (
              <Form.Item label="Justify" style={{ marginBottom: 8 }}>
                <ButtonGroup
                  options={justifyContents}
                  value={justifyContent}
                  onChange={setJustifyContent}
                />
              </Form.Item>
            )}
          </Form.Item>
        )}

        {/* Grid */}
        {supportedProps.includes("gridTemplateColumns") && (
          <Form.Item 
            label={<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BorderOutlined />
              <span style={{ fontWeight: 600, fontSize: 13 }}>Grid</span>
            </div>}
          >
            <Form.Item label="Columns" style={{ marginBottom: 8 }}>
              <Input
                value={gridTemplateColumns}
                onChange={e => setGridTemplateColumns(e.target.value)}
                onBlur={() => setProp(p => { p.gridTemplateColumns = gridTemplateColumns; })}
                size="small"
                placeholder="e.g. 1fr 1fr"
              />
            </Form.Item>
          </Form.Item>
        )}

        {/* Animation/Transition */}
        {(supportedProps.includes("transition") ||
          supportedProps.includes("transform") ||
          supportedProps.includes("animation")) && (
          <Form.Item 
            label={<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BgColorsOutlined />
              <span style={{ fontWeight: 600, fontSize: 13 }}>Animation</span>
            </div>}
          >
            {supportedProps.includes("transition") && (
              <Form.Item label="Transition" style={{ marginBottom: 8 }}>
                <Input
                  value={transition}
                  onChange={e => setTransition(e.target.value)}
                  onBlur={() => setProp(p => { p.transition = transition; })}
                  size="small"
                  placeholder="e.g. all 0.3s"
                />
              </Form.Item>
            )}
            {supportedProps.includes("transform") && (
              <Form.Item label="Transform" style={{ marginBottom: 8 }}>
                <Input
                  value={transform}
                  onChange={e => setTransform(e.target.value)}
                  onBlur={() => setProp(p => { p.transform = transform; })}
                  size="small"
                  placeholder="e.g. rotate(10deg)"
                />
              </Form.Item>
            )}
            {supportedProps.includes("animation") && (
              <Form.Item label="Animation" style={{ marginBottom: 8 }}>
                <Input
                  value={animation}
                  onChange={e => setAnimation(e.target.value)}
                  onBlur={() => setProp(p => { p.animation = animation; })}
                  size="small"
                  placeholder="e.g. fadeIn 1s"
                />
              </Form.Item>
            )}
          </Form.Item>
        )}

        <Form.Item>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={onDelete}
            block
            style={{ marginTop: 8 }}
          >
            Delete
          </Button>
        </Form.Item>
      </Form>
    </div>,
    document.body
  );
}