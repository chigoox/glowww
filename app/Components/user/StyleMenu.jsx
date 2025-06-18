import React, { useEffect, useRef, useState } from "react";
import interact from "interactjs";
import { Button, Input, Slider, Space, Select } from "antd";
import { DeleteOutlined, CloseOutlined, FontColorsOutlined, PictureOutlined } from '@ant-design/icons';

const fontWeights = [400, 500, 600, 700, 800, 900];
const textAligns = ["left", "center", "right", "justify"];
const displays = ["block", "inline-block", "inline", "flex", "grid", "none"];
const positions = ["static", "relative", "absolute", "fixed", "sticky"];
const overflows = ["visible", "hidden", "scroll", "auto"];
const floats = ["none", "left", "right"];
const textDecorations = ["none", "underline", "line-through", "overline"];
const textTransforms = ["none", "uppercase", "lowercase", "capitalize"];
const whiteSpaces = ["normal", "nowrap", "pre", "pre-line", "pre-wrap"];
const flexDirections = ["row", "row-reverse", "column", "column-reverse"];
const alignItems = ["stretch", "flex-start", "center", "flex-end", "baseline"];
const justifyContents = ["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"];


// Google Fonts list (expand as needed)
const googleFonts = [
  "Roboto", "Open Sans", "Lato", "Montserrat", "Oswald",
  "Raleway", "Merriweather", "Poppins", "Nunito", "Inter",
  "Playfair Display", "Source Sans Pro", "Work Sans", "Rubik"
];

export function StyleMenu({
  nodeId,
  props,
  setProp,
  supportedProps,
  onClose,
  onDelete
}) {

  const [radiusMode, setRadiusMode] = useState("all");
const [cornerRadius, setCornerRadius] = useState({
  tl: props.borderRadius || 0,
  tr: props.borderRadius || 0,
  br: props.borderRadius || 0,
  bl: props.borderRadius || 0,
});


  // Helper to render a button group for a property
  const ButtonGroup = ({ options, value, onChange }) => (
    <Space.Compact block>
      {options.map(opt => (
        <Button
          key={opt}
          type={value === opt ? "primary" : "default"}
          size="small"
          style={{ minWidth: 32, padding: 0 }}
          onClick={() => onChange(opt)}
        >
          {opt}
        </Button>
      ))}
    </Space.Compact>
  );

  // Dynamically load Google Font if selected
  useEffect(() => {
    if (!props.fontFamily) return;
    const linkId = "google-font-" + props.fontFamily.replace(/\s+/g, "-");
    if (document.getElementById(linkId)) return;
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css?family=${props.fontFamily.replace(/\s+/g, "+")}:400,700&display=swap`;
    document.head.appendChild(link);
    // No cleanup: keep font loaded for performance
  }, [props.fontFamily]);

  //
  useEffect(() => {
  if (!supportedProps.includes("borderRadius")) return;
  if (radiusMode === "all") {
    setProp(p => { p.borderRadius = cornerRadius.tl; });
  } else {
    setProp(p => {
      p.borderRadius = `${cornerRadius.tl}px ${cornerRadius.tr}px ${cornerRadius.br}px ${cornerRadius.bl}px`;
    });
  }
  // eslint-disable-next-line
}, [cornerRadius, radiusMode]);

  // Make menu draggable
  const menuRef = useRef(null);
  useEffect(() => {
    if (!menuRef.current) return;
    interact(menuRef.current).draggable({
      allowFrom: '.drag-handle',
      listeners: {
        move(event) {
          const target = event.target;
          const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
          const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
          target.style.transform = `translate(${x}px, ${y}px)`;
          target.setAttribute('data-x', x);
          target.setAttribute('data-y', y);
        }
      }
    });
    return () => {
      if (menuRef.current) interact(menuRef.current).unset();
    };
  }, []);

  return (
    <div
      ref={menuRef}
        onPointerDown={e => e.stopPropagation()}
  onPointerMove={e => e.stopPropagation()}
  onPointerUp={e => e.stopPropagation()}
  onMouseDown={e => e.stopPropagation()}
      style={{
        position: "fixed",
        zIndex: 9999,
        top: props.menuY || 100,
        left: props.menuX || 100,
        background: "#fff",
        boxShadow: "0 2px 16px rgba(0,0,0,0.18)",
        borderRadius: 12,
        minWidth: 220,
        maxWidth: 340,
        fontSize: 13,
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
        Style
        <Button
          size="small"
          type="text"
          style={{ float: "right" }}
          icon={<CloseOutlined />}
          onClick={onClose}
        />
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={onDelete}
          size="small"
          style={{ float: "right", marginRight: 4 }}
        />
      </div>
      <div
        className="flex flex-col gap-2 p-4"
        style={{
          height: "24rem", // h-96
          overflowY: "auto"
        }}
      >

        {supportedProps.includes("src") && (
  <div>
    <span className="text-xs">Source (src)</span>
    <Input
      value={props.src}
      onChange={e => setProp(p => { p.src = e.target.value; })}
      size="small"
      placeholder="Image or video URL"
    />
  </div>
)}
{supportedProps.includes("alt") && (
  <div>
    <span className="text-xs">Alt Text</span>
    <Input
      value={props.alt}
      onChange={e => setProp(p => { p.alt = e.target.value; })}
      size="small"
      placeholder="Alt text"
    />
  </div>
)}
        {/* Text Properties */}
        {supportedProps.includes("color") && (
          <div>
            <span className="text-xs">Text Color</span>
            <Input
              type="color"
              value={props.color}
              onChange={e => setProp(p => { p.color = e.target.value; })}
              prefix={<FontColorsOutlined />}
              size="small"
            />
          </div>
        )}
        {supportedProps.includes("fontFamily") && (
          <div>
            <span className="text-xs">Font Family</span>
            <Select
              showSearch
              value={props.fontFamily}
              style={{ width: "100%" }}
              onChange={val => setProp(p => { p.fontFamily = val; })}
              options={googleFonts.map(f => ({ value: f, label: f }))}
              size="small"
              placeholder="Select font"
              optionFilterProp="label"
            />
          </div>
        )}
        {supportedProps.includes("fontSize") && (
          <div>
            <span className="text-xs">Font Size</span>
            <Slider
              min={7}
              max={72}
              value={props.fontSize}
              onChange={val => setProp(p => { p.fontSize = val; })}
              size="small"
            />
          </div>
        )}
        {supportedProps.includes("fontWeight") && (
          <div>
            <span className="text-xs">Font Weight</span>
            <ButtonGroup
              options={fontWeights}
              value={props.fontWeight}
              onChange={val => setProp(p => { p.fontWeight = val; })}
            />
          </div>
        )}
        {supportedProps.includes("textAlign") && (
          <div>
            <span className="text-xs">Text Align</span>
            <ButtonGroup
              options={textAligns}
              value={props.textAlign}
              onChange={val => setProp(p => { p.textAlign = val; })}
            />
          </div>
        )}
        {supportedProps.includes("textDecoration") && (
          <div>
            <span className="text-xs">Text Decoration</span>
            <ButtonGroup
              options={textDecorations}
              value={props.textDecoration}
              onChange={val => setProp(p => { p.textDecoration = val; })}
            />
          </div>
        )}
        {supportedProps.includes("lineHeight") && (
          <div>
            <span className="text-xs">Line Height</span>
            <Slider
              min={0.8}
              max={3}
              step={0.05}
              value={props.lineHeight}
              onChange={val => setProp(p => { p.lineHeight = val; })}
              size="small"
            />
          </div>
        )}
        {supportedProps.includes("letterSpacing") && (
          <div>
            <span className="text-xs">Letter Spacing</span>
            <Slider
              min={-2}
              max={10}
              step={0.1}
              value={props.letterSpacing}
              onChange={val => setProp(p => { p.letterSpacing = val; })}
              size="small"
            />
          </div>
        )}
        {supportedProps.includes("textTransform") && (
          <div>
            <span className="text-xs">Text Transform</span>
            <ButtonGroup
              options={textTransforms}
              value={props.textTransform}
              onChange={val => setProp(p => { p.textTransform = val; })}
            />
          </div>
        )}
        {supportedProps.includes("whiteSpace") && (
          <div>
            <span className="text-xs">White Space</span>
            <ButtonGroup
              options={whiteSpaces}
              value={props.whiteSpace}
              onChange={val => setProp(p => { p.whiteSpace = val; })}
            />
          </div>
        )}

        {/* Box Model */}
        {supportedProps.includes("width") && (
          <div>
            <span className="text-xs">Width</span>
            <Slider
              min={10}
              max={1200}
              value={props.width}
              onChange={val => setProp(p => { p.width = val; })}
              size="small"
            />
          </div>
        )}
        {supportedProps.includes("height") && (
          <div>
            <span className="text-xs">Height</span>
            <Slider
              min={10}
              max={800}
              value={props.height}
              onChange={val => setProp(p => { p.height = val; })}
              size="small"
            />
          </div>
        )}
        {supportedProps.includes("margin") && (
          <div>
            <span className="text-xs">Margin</span>
            <Input
              value={props.margin}
              onChange={e => setProp(p => { p.margin = e.target.value; })}
              size="small"
              placeholder="e.g. 10px 20px"
            />
          </div>
        )}
        {supportedProps.includes("padding") && (
          <div>
            <span className="text-xs">Padding</span>
            <Input
              value={props.padding}
              onChange={e => setProp(p => { p.padding = e.target.value; })}
              size="small"
              placeholder="e.g. 10px 20px"
            />
          </div>
        )}
        {supportedProps.includes("border") && (
          <div>
            <span className="text-xs">Border</span>
            <Input
              value={props.border}
              onChange={e => setProp(p => { p.border = e.target.value; })}
              size="small"
              placeholder="e.g. 1px solid #000"
            />
          </div>
        )}
        {supportedProps.includes("borderColor") && (
          <div>
            <span className="text-xs">Border Color</span>
            <Input
              type="color"
              value={props.borderColor}
              onChange={e => setProp(p => { p.borderColor = e.target.value; })}
              size="small"
            />
          </div>
        )}
        {supportedProps.includes("borderRadius") && (
  <div>
    <span className="text-xs">Border Radius</span>
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
        max={100}
        value={cornerRadius.tl}
        onChange={val => setCornerRadius(r => ({ tl: val, tr: val, br: val, bl: val }))}
        size="small"
      />
    ) : (
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-xs">Top Left</span>
          <Slider
            min={0}
            max={100}
            value={cornerRadius.tl}
            onChange={val => setCornerRadius(r => ({ ...r, tl: val }))}
            size="small"
          />
        </div>
        <div>
          <span className="text-xs">Top Right</span>
          <Slider
            min={0}
            max={100}
            value={cornerRadius.tr}
            onChange={val => setCornerRadius(r => ({ ...r, tr: val }))}
            size="small"
          />
        </div>
        <div>
          <span className="text-xs">Bottom Right</span>
          <Slider
            min={0}
            max={100}
            value={cornerRadius.br}
            onChange={val => setCornerRadius(r => ({ ...r, br: val }))}
            size="small"
          />
        </div>
        <div>
          <span className="text-xs">Bottom Left</span>
          <Slider
            min={0}
            max={100}
            value={cornerRadius.bl}
            onChange={val => setCornerRadius(r => ({ ...r, bl: val }))}
            size="small"
          />
        </div>
      </div>
    )}
  </div>
)}
        {supportedProps.includes("boxShadow") && (
          <div>
            <span className="text-xs">Box Shadow</span>
            <Input
              value={props.boxShadow}
              onChange={e => setProp(p => { p.boxShadow = e.target.value; })}
              size="small"
              placeholder="e.g. 0 2px 8px #0003"
            />
          </div>
        )}

        {/* Layout */}
        {supportedProps.includes("display") && (
          <div>
            <span className="text-xs">Display</span>
            <ButtonGroup
              options={displays}
              value={props.display}
              onChange={val => setProp(p => { p.display = val; })}
            />
          </div>
        )}
        {supportedProps.includes("position") && (
          <div>
            <span className="text-xs">Position</span>
            <ButtonGroup
              options={positions}
              value={props.position}
              onChange={val => setProp(p => { p.position = val; })}
            />
          </div>
        )}
        {supportedProps.includes("float") && (
          <div>
            <span className="text-xs">Float</span>
            <ButtonGroup
              options={floats}
              value={props.float}
              onChange={val => setProp(p => { p.float = val; })}
            />
          </div>
        )}
        {supportedProps.includes("zIndex") && (
          <div>
            <span className="text-xs">Z-Index</span>
            <Slider
              min={0}
              max={100}
              value={props.zIndex}
              onChange={val => setProp(p => { p.zIndex = val; })}
              size="small"
            />
          </div>
        )}
        {supportedProps.includes("overflow") && (
          <div>
            <span className="text-xs">Overflow</span>
            <ButtonGroup
              options={overflows}
              value={props.overflow}
              onChange={val => setProp(p => { p.overflow = val; })}
            />
          </div>
        )}

        {/* Background */}
        {supportedProps.includes("backgroundColor") && (
          <div>
            <span className="text-xs">Background Color</span>
            <Input
              type="color"
              value={props.backgroundColor}
              onChange={e => setProp(p => { p.backgroundColor = e.target.value; })}
              size="small"
            />
          </div>
        )}
        {supportedProps.includes("backgroundImage") && (
          <div>
            <span className="text-xs">Background Image</span>
            <Input
              value={props.backgroundImage}
              onChange={e => setProp(p => { p.backgroundImage = e.target.value; })}
              size="small"
              placeholder="URL or CSS"
              prefix={<PictureOutlined />}
            />
          </div>
        )}

        {/* Flexbox */}
        {supportedProps.includes("flexDirection") && (
          <div>
            <span className="text-xs">Flex Direction</span>
            <ButtonGroup
              options={flexDirections}
              value={props.flexDirection}
              onChange={val => setProp(p => { p.flexDirection = val; })}
            />
          </div>
        )}
        {supportedProps.includes("alignItems") && (
          <div>
            <span className="text-xs">Align Items</span>
            <ButtonGroup
              options={alignItems}
              value={props.alignItems}
              onChange={val => setProp(p => { p.alignItems = val; })}
            />
          </div>
        )}
        {supportedProps.includes("justifyContent") && (
          <div>
            <span className="text-xs">Justify Content</span>
            <ButtonGroup
              options={justifyContents}
              value={props.justifyContent}
              onChange={val => setProp(p => { p.justifyContent = val; })}
            />
          </div>
        )}

        {/* Grid */}
        {supportedProps.includes("gridTemplateColumns") && (
          <div>
            <span className="text-xs">Grid Columns</span>
            <Input
              value={props.gridTemplateColumns}
              onChange={e => setProp(p => { p.gridTemplateColumns = e.target.value; })}
              size="small"
              placeholder="e.g. 1fr 1fr"
            />
          </div>
        )}

        {/* Animation/Transition */}
        {supportedProps.includes("transition") && (
          <div>
            <span className="text-xs">Transition</span>
            <Input
              value={props.transition}
              onChange={e => setProp(p => { p.transition = e.target.value; })}
              size="small"
              placeholder="e.g. all 0.3s"
            />
          </div>
        )}
        {supportedProps.includes("transform") && (
          <div>
            <span className="text-xs">Transform</span>
            <Input
              value={props.transform}
              onChange={e => setProp(p => { p.transform = e.target.value; })}
              size="small"
              placeholder="e.g. rotate(10deg)"
            />
          </div>
        )}
        {supportedProps.includes("animation") && (
          <div>
            <span className="text-xs">Animation</span>
            <Input
              value={props.animation}
              onChange={e => setProp(p => { p.animation = e.target.value; })}
              size="small"
              placeholder="e.g. fadeIn 1s"
            />
          </div>
        )}
      </div>
    </div>
  );
}