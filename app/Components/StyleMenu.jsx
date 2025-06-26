'use client'
import {
  AlignCenterOutlined, AlignLeftOutlined, AlignRightOutlined, AppstoreOutlined,
  ArrowDownOutlined, ArrowLeftOutlined, ArrowRightOutlined, ArrowUpOutlined,
  BgColorsOutlined, BlockOutlined, BoldOutlined, BorderBottomOutlined,
  BorderHorizontalOutlined, BorderInnerOutlined, BorderLeftOutlined,
  BorderlessTableOutlined, BorderOuterOutlined, BorderOutlined,
  BorderRightOutlined, BorderTopOutlined, BorderVerticleOutlined,
  CaretDownOutlined, CloseOutlined, ColumnHeightOutlined, ColumnWidthOutlined,
  DashOutlined, DeleteOutlined, ExpandOutlined, EyeInvisibleOutlined, EyeOutlined,
  FontColorsOutlined, FontFamilyOutlined, FontSizeOutlined, ItalicOutlined,
  MenuOutlined, MinusOutlined, PictureOutlined, PlusOutlined, PushpinOutlined,
  RadiusBottomleftOutlined, RadiusBottomrightOutlined, RadiusUpleftOutlined,
  RadiusUprightOutlined, SettingOutlined, ShrinkOutlined, StrikethroughOutlined,
  TableOutlined, UnderlineOutlined, UploadOutlined, VerticalAlignBottomOutlined,
  VerticalAlignMiddleOutlined, VerticalAlignTopOutlined, LinkOutlined
} from "@ant-design/icons";
import { Button, Collapse, ColorPicker, Divider, Form, Input, Select, Slider, Space, Tooltip, Switch, InputNumber, Typography, Tag } from "antd";
import { useEditor } from "@craftjs/core";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";

// Debounce utility
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// --- Complete Option Arrays ---
const displays = [
  { value: "block", label: "Block", icon: <BlockOutlined /> },
  { value: "inline", label: "Inline", icon: <MinusOutlined /> },
  { value: "inline-block", label: "Inline Block", icon: <BorderOutlined /> },
  { value: "flex", label: "Flex", icon: <AppstoreOutlined /> },
  { value: "inline-flex", label: "Inline Flex", icon: <AppstoreOutlined /> },
  { value: "grid", label: "Grid", icon: <BorderlessTableOutlined /> },
  { value: "inline-grid", label: "Inline Grid", icon: <BorderlessTableOutlined /> },
  { value: "table", label: "Table", icon: <TableOutlined /> },
  { value: "table-cell", label: "Table Cell", icon: <TableOutlined /> },
  { value: "table-row", label: "Table Row", icon: <TableOutlined /> },
  { value: "list-item", label: "List Item", icon: <MenuOutlined /> },
  { value: "none", label: "Hidden", icon: <EyeInvisibleOutlined /> }
];

const positions = [
  { value: "static", label: "Static", icon: <BorderOuterOutlined /> },
  { value: "relative", label: "Relative", icon: <BorderInnerOutlined /> },
  { value: "absolute", label: "Absolute", icon: <BorderVerticleOutlined /> },
  { value: "fixed", label: "Fixed", icon: <BorderHorizontalOutlined /> },
  { value: "sticky", label: "Sticky", icon: <PushpinOutlined /> }
];

const overflows = [
  { value: "visible", label: "Visible", icon: <EyeOutlined /> },
  { value: "hidden", label: "Hidden", icon: <EyeInvisibleOutlined /> },
  { value: "scroll", label: "Scroll", icon: <MenuOutlined /> },
  { value: "auto", label: "Auto", icon: <SettingOutlined /> },
  { value: "clip", label: "Clip", icon: <ShrinkOutlined /> }
];

const cursors = [
  { value: "auto", label: "Auto" }, { value: "default", label: "Default" },
  { value: "pointer", label: "Pointer" }, { value: "text", label: "Text" },
  { value: "move", label: "Move" }, { value: "grab", label: "Grab" },
  { value: "grabbing", label: "Grabbing" }, { value: "not-allowed", label: "Not Allowed" },
  { value: "wait", label: "Wait" }, { value: "help", label: "Help" },
  { value: "crosshair", label: "Crosshair" }, { value: "zoom-in", label: "Zoom In" },
  { value: "zoom-out", label: "Zoom Out" }, { value: "copy", label: "Copy" },
  { value: "alias", label: "Alias" }, { value: "context-menu", label: "Context Menu" },
  { value: "cell", label: "Cell" }, { value: "vertical-text", label: "Vertical Text" },
  { value: "no-drop", label: "No Drop" }, { value: "progress", label: "Progress" },
  { value: "e-resize", label: "E Resize" }, { value: "n-resize", label: "N Resize" },
  { value: "ne-resize", label: "NE Resize" }, { value: "nw-resize", label: "NW Resize" },
  { value: "s-resize", label: "S Resize" }, { value: "se-resize", label: "SE Resize" },
  { value: "sw-resize", label: "SW Resize" }, { value: "w-resize", label: "W Resize" },
  { value: "ew-resize", label: "EW Resize" }, { value: "ns-resize", label: "NS Resize" },
  { value: "nesw-resize", label: "NESW Resize" }, { value: "nwse-resize", label: "NWSE Resize" },
  { value: "col-resize", label: "Col Resize" }, { value: "row-resize", label: "Row Resize" },
  { value: "all-scroll", label: "All Scroll" }
];

const fontFamilies = [
  "Arial", "Arial Black", "Helvetica", "Helvetica Neue", "Times", "Times New Roman",
  "Georgia", "Verdana", "Geneva", "Courier", "Courier New", "Monaco", "Lucida Console",
  "Trebuchet MS", "Tahoma", "Impact", "Comic Sans MS", "Palatino", "Garamond",
  "Bookman", "Avant Garde", "Arial Narrow", "Century Gothic", "Franklin Gothic Medium",
  "Lucida Sans Unicode", "MS Sans Serif", "MS Serif", "New York", "Symbol", "Webdings",
  "Wingdings", "Roboto", "Open Sans", "Lato", "Montserrat", "Oswald", "Raleway",
  "Source Sans Pro", "Nunito", "PT Sans", "Ubuntu", "Playfair Display", "Merriweather",
  "Poppins", "Inter", "Fira Sans", "Work Sans", "Barlow", "DM Sans", "Rubik",
  "Kanit", "Mulish", "Heebo", "Quicksand", "Karla", "IBM Plex Sans", "Noto Sans",
  "Oxygen", "Libre Franklin", "Crimson Text", "Libre Baskerville", "Cormorant Garamond",
  "Abril Fatface", "Dancing Script", "Pacifico", "Lobster", "Great Vibes"
];

const fontWeights = [
  { value: "100", label: "100 - Thin" }, { value: "200", label: "200 - Extra Light" },
  { value: "300", label: "300 - Light" }, { value: "400", label: "400 - Normal" },
  { value: "500", label: "500 - Medium" }, { value: "600", label: "600 - Semi Bold" },
  { value: "700", label: "700 - Bold" }, { value: "800", label: "800 - Extra Bold" },
  { value: "900", label: "900 - Black" }, { value: "normal", label: "Normal" },
  { value: "bold", label: "Bold" }, { value: "bolder", label: "Bolder" },
  { value: "lighter", label: "Lighter" }
];

const fontStyles = [
  { value: "normal", label: "Normal" },
  { value: "italic", label: "Italic", icon: <ItalicOutlined /> },
  { value: "oblique", label: "Oblique" }
];

const textAligns = [
  { value: "left", icon: <AlignLeftOutlined /> },
  { value: "center", icon: <AlignCenterOutlined /> },
  { value: "right", icon: <AlignRightOutlined /> },
  { value: "justify", icon: <VerticalAlignMiddleOutlined /> },
  { value: "start", label: "Start" },
  { value: "end", label: "End" }
];

const textDecorations = [
  { value: "none", label: "None" },
  { value: "underline", label: "Underline", icon: <UnderlineOutlined /> },
  { value: "overline", label: "Overline" },
  { value: "line-through", label: "Strike", icon: <StrikethroughOutlined /> },
  { value: "underline overline", label: "Under + Over" },
  { value: "underline line-through", label: "Under + Strike" }
];

const textTransforms = [
  { value: "none", label: "None" },
  { value: "uppercase", label: "UPPERCASE" },
  { value: "lowercase", label: "lowercase" },
  { value: "capitalize", label: "Capitalize" },
  { value: "full-width", label: "Full Width" }
];

const verticalAligns = [
  { value: "baseline", label: "Baseline" },
  { value: "top", label: "Top", icon: <VerticalAlignTopOutlined /> },
  { value: "middle", label: "Middle", icon: <VerticalAlignMiddleOutlined /> },
  { value: "bottom", label: "Bottom", icon: <VerticalAlignBottomOutlined /> },
  { value: "text-top", label: "Text Top" },
  { value: "text-bottom", label: "Text Bottom" },
  { value: "sub", label: "Sub" },
  { value: "super", label: "Super" }
];

const whiteSpaces = [
  { value: "normal", label: "Normal" },
  { value: "nowrap", label: "No Wrap" },
  { value: "pre", label: "Pre" },
  { value: "pre-wrap", label: "Pre Wrap" },
  { value: "pre-line", label: "Pre Line" },
  { value: "break-spaces", label: "Break Spaces" }
];

const wordBreaks = [
  { value: "normal", label: "Normal" },
  { value: "break-all", label: "Break All" },
  { value: "keep-all", label: "Keep All" },
  { value: "break-word", label: "Break Word" }
];

const borderStyles = [
  { value: "none", label: "None" },
  { value: "solid", label: "Solid", icon: <BorderOutlined /> },
  { value: "dashed", label: "Dashed", icon: <DashOutlined /> },
  { value: "dotted", label: "Dotted", icon: <PlusOutlined /> },
  { value: "double", label: "Double" },
  { value: "groove", label: "Groove" },
  { value: "ridge", label: "Ridge" },
  { value: "inset", label: "Inset" },
  { value: "outset", label: "Outset" },
  { value: "hidden", label: "Hidden" }
];

const flexDirections = [
  { value: "row", label: "Row →", icon: <ArrowRightOutlined /> },
  { value: "row-reverse", label: "Row ←", icon: <ArrowLeftOutlined /> },
  { value: "column", label: "Column ↓", icon: <ArrowDownOutlined /> },
  { value: "column-reverse", label: "Column ↑", icon: <ArrowUpOutlined /> }
];

const flexWraps = [
  { value: "nowrap", label: "No Wrap" },
  { value: "wrap", label: "Wrap" },
  { value: "wrap-reverse", label: "Wrap Reverse" }
];

const justifyContents = [
  { value: "flex-start", label: "Start", icon: <AlignLeftOutlined /> },
  { value: "flex-end", label: "End", icon: <AlignRightOutlined /> },
  { value: "center", label: "Center", icon: <AlignCenterOutlined /> },
  { value: "space-between", label: "Space Between" },
  { value: "space-around", label: "Space Around" },
  { value: "space-evenly", label: "Space Evenly" },
  { value: "stretch", label: "Stretch" }
];

const alignItems = [
  { value: "stretch", label: "Stretch", icon: <ExpandOutlined /> },
  { value: "flex-start", label: "Start", icon: <VerticalAlignTopOutlined /> },
  { value: "flex-end", label: "End", icon: <VerticalAlignBottomOutlined /> },
  { value: "center", label: "Center", icon: <VerticalAlignMiddleOutlined /> },
  { value: "baseline", label: "Baseline" }
];

const alignContents = [
  { value: "stretch", label: "Stretch" },
  { value: "flex-start", label: "Start" },
  { value: "flex-end", label: "End" },
  { value: "center", label: "Center" },
  { value: "space-between", label: "Space Between" },
  { value: "space-around", label: "Space Around" },
  { value: "space-evenly", label: "Space Evenly" }
];

const alignSelfs = [
  { value: "auto", label: "Auto" },
  { value: "stretch", label: "Stretch" },
  { value: "flex-start", label: "Start" },
  { value: "flex-end", label: "End" },
  { value: "center", label: "Center" },
  { value: "baseline", label: "Baseline" }
];

const gridAutoFlows = [
  { value: "row", label: "Row" },
  { value: "column", label: "Column" },
  { value: "row dense", label: "Row Dense" },
  { value: "column dense", label: "Column Dense" }
];

const justifySelfs = [
  { value: "auto", label: "Auto" },
  { value: "start", label: "Start" },
  { value: "end", label: "End" },
  { value: "center", label: "Center" },
  { value: "stretch", label: "Stretch" }
];

const objectFits = [
  { value: "fill", label: "Fill" },
  { value: "contain", label: "Contain" },
  { value: "cover", label: "Cover" },
  { value: "none", label: "None" },
  { value: "scale-down", label: "Scale Down" }
];

const objectPositions = [
  { value: "center", label: "Center" },
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "top left", label: "Top Left" },
  { value: "top right", label: "Top Right" },
  { value: "bottom left", label: "Bottom Left" },
  { value: "bottom right", label: "Bottom Right" }
];

const backgroundSizes = [
  { value: "auto", label: "Auto" },
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
  { value: "100%", label: "100%" },
  { value: "100% 100%", label: "100% 100%" }
];

const backgroundRepeats = [
  { value: "repeat", label: "Repeat" },
  { value: "no-repeat", label: "No Repeat" },
  { value: "repeat-x", label: "Repeat X" },
  { value: "repeat-y", label: "Repeat Y" },
  { value: "space", label: "Space" },
  { value: "round", label: "Round" }
];

const backgroundAttachments = [
  { value: "scroll", label: "Scroll" },
  { value: "fixed", label: "Fixed" },
  { value: "local", label: "Local" }
];

const listStyleTypes = [
  { value: "none", label: "None" },
  { value: "disc", label: "Disc" },
  { value: "circle", label: "Circle" },
  { value: "square", label: "Square" },
  { value: "decimal", label: "Decimal" },
  { value: "decimal-leading-zero", label: "Decimal Leading Zero" },
  { value: "lower-roman", label: "Lower Roman" },
  { value: "upper-roman", label: "Upper Roman" },
  { value: "lower-alpha", label: "Lower Alpha" },
  { value: "upper-alpha", label: "Upper Alpha" },
  { value: "lower-greek", label: "Lower Greek" },
  { value: "lower-latin", label: "Lower Latin" },
  { value: "upper-latin", label: "Upper Latin" }
];

const listStylePositions = [
  { value: "inside", label: "Inside" },
  { value: "outside", label: "Outside" }
];

const tableLayouts = [
  { value: "auto", label: "Auto" },
  { value: "fixed", label: "Fixed" }
];

const borderCollapses = [
  { value: "separate", label: "Separate" },
  { value: "collapse", label: "Collapse" }
];

const captionSides = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" }
];

const emptyCells = [
  { value: "show", label: "Show" },
  { value: "hide", label: "Hide" }
];

const visibilities = [
  { value: "visible", label: "Visible", icon: <EyeOutlined /> },
  { value: "hidden", label: "Hidden", icon: <EyeInvisibleOutlined /> },
  { value: "collapse", label: "Collapse" }
];

const floats = [
  { value: "none", label: "None" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" }
];

const clears = [
  { value: "none", label: "None" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "both", label: "Both" }
];

const resizes = [
  { value: "none", label: "None" },
  { value: "both", label: "Both" },
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" }
];

const pointerEvents = [
  { value: "auto", label: "Auto" },
  { value: "none", label: "None" },
  { value: "visiblePainted", label: "Visible Painted" },
  { value: "visibleFill", label: "Visible Fill" },
  { value: "visibleStroke", label: "Visible Stroke" },
  { value: "visible", label: "Visible" },
  { value: "painted", label: "Painted" },
  { value: "fill", label: "Fill" },
  { value: "stroke", label: "Stroke" },
  { value: "all", label: "All" }
];

const userSelects = [
  { value: "auto", label: "Auto" },
  { value: "none", label: "None" },
  { value: "text", label: "Text" },
  { value: "all", label: "All" }
];

const boxSizings = [
  { value: "content-box", label: "Content Box" },
  { value: "border-box", label: "Border Box" }
];

const sides = [
  { value: "all", icon: <BorderOuterOutlined /> },
  { value: "top", icon: <BorderTopOutlined /> },
  { value: "right", icon: <BorderRightOutlined /> },
  { value: "bottom", icon: <BorderBottomOutlined /> },
  { value: "left", icon: <BorderLeftOutlined /> }
];

const spacingSides = [
  { value: "all", icon: <BorderOuterOutlined /> },
  { value: "top", icon: <BorderTopOutlined /> },
  { value: "right", icon: <BorderRightOutlined /> },
  { value: "bottom", icon: <BorderBottomOutlined /> },
  { value: "left", icon: <BorderLeftOutlined /> },
  { value: "x", icon: <ColumnWidthOutlined /> },
  { value: "y", icon: <ColumnHeightOutlined /> }
];

const radiusCorners = [
  { value: "all", icon: <BorderOutlined /> },
  { value: "tl", icon: <RadiusUpleftOutlined /> },
  { value: "tr", icon: <RadiusUprightOutlined /> },
  { value: "br", icon: <RadiusBottomrightOutlined /> },
  { value: "bl", icon: <RadiusBottomleftOutlined /> }
];

// Memoized ButtonGroup
const IconButtonGroup = React.memo(({ options, value, onChange }) => (
  <Space.Compact block>
    {options.map(opt => (
      <Tooltip 
        title={opt.label || opt.value} 
        key={opt.value}
        getPopupContainer={(triggerNode) => triggerNode.parentNode}
      >
        <Button
          type={value === opt.value ? "primary" : "default"}
          size="small"
          style={{ minWidth: 32, padding: 0 }}
          onClick={() => onChange(opt.value)}
          icon={opt.icon}
        />
      </Tooltip>
    ))}
  </Space.Compact>
));


export function StyleMenu({
  nodeId,
  props,
  setProp,
  supportedProps = [],
  onClose,
  onDelete,
}) {

  // Use useEditor to get selected node and actions
  const { selected, actions } = useEditor((state) => {
    const [currentNodeId] = state.events.selected;
    let selected;

    if (currentNodeId) {
      selected = {
        id: currentNodeId,
        name: state.nodes[currentNodeId].data.name,
        displayName: state.nodes[currentNodeId].data.displayName,
        props: state.nodes[currentNodeId].data.props,
        isDeletable: state.nodes[currentNodeId].data.name !== 'ROOT'
      };
    }

    return { selected };
  });

  // Initialize default local style structure
  const getDefaultLocalStyle = useCallback(() => ({
    // Position & Layout
    x: 0, y: 0, zIndex: 1,
    position: "static",
    top: "", right: "", bottom: "", left: "",
    
    // Display & Box Model  
    display: "block",
    visibility: "visible",
    float: "none", clear: "none",
    width: "", height: "",
    minWidth: "", maxWidth: "",
    minHeight: "", maxHeight: "",
    boxSizing: "content-box",
    
    // Overflow & Scroll
    overflow: "visible",
    overflowX: "visible", overflowY: "visible",
    resize: "none",
    
    // Margin & Padding with proper structure
    marginMode: "all", 
    margin: "",
    marginSidesVals: {
      top: "", right: "", bottom: "", left: "", x: "", y: ""
    },
    paddingMode: "all", 
    padding: "",
    paddingSidesVals: {
      top: "", right: "", bottom: "", left: "", x: "", y: ""
    },
    
    // Border
    borderMode: "all",
    borderWidth: 0, borderStyle: "solid", borderColor: "#000000",
    borderTopWidth: 0, borderRightWidth: 0, borderBottomWidth: 0, borderLeftWidth: 0,
    borderTopStyle: "solid", borderRightStyle: "solid", borderBottomStyle: "solid", borderLeftStyle: "solid",
    borderTopColor: "#000000", borderRightColor: "#000000", borderBottomColor: "#000000", borderLeftColor: "#000000",
    borderCollapse: "separate", borderSpacing: "0",
    
    // Border Radius
    radiusMode: "all",
    borderRadius: 0,
    borderTopLeftRadius: 0, borderTopRightRadius: 0,
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
    
    // Typography
    fontFamily: "Arial", fontSize: 16,
    fontWeight: "400", fontStyle: "normal",
    fontVariant: "normal", fontStretch: "normal",
    lineHeight: 1.4, letterSpacing: 0,
    wordSpacing: 0, textAlign: "left",
    textDecoration: "none", textTransform: "none",
    textIndent: 0, textShadow: "",
    verticalAlign: "baseline", whiteSpace: "normal",
    wordBreak: "normal", wordWrap: "normal",
    
    // Colors & Backgrounds
    color: "#000000", backgroundColor: "transparent",
    backgroundImage: "", backgroundSize: "auto",
    backgroundRepeat: "repeat", backgroundPosition: "0% 0%",
    backgroundAttachment: "scroll", backgroundClip: "border-box",
    backgroundOrigin: "padding-box",
    
    // Non-CSS Properties
    src: "", alt: "", href: "",
    placeholder: "", title: "",
    id: "", className: "",
    target: "", rel: "",
    type: "", value: "",
    name: "", disabled: false,
    required: false, readonly: false,
    multiple: false, checked: false,
    selected: false, hidden: false,
    tabIndex: 0, accessKey: "",
    contentEditable: false, draggable: false,
    spellCheck: true, translate: true,
    dir: "auto", lang: "",
    role: "", ariaLabel: "",
    ariaDescribedBy: "", ariaLabelledBy: "",
    dataAttributes: {}
  }), []);

  // Local state for immediate UI updates
  const [localStyle, setLocalStyle] = useState({
    // Position & Layout
    x: props?.x || 0, y: props?.y || 0, zIndex: props?.zIndex || 1,
    position: props?.position || "static",
    top: props?.top || "", right: props?.right || "", bottom: props?.bottom || "", left: props?.left || "",
    
    // Display & Box Model  
    display: props?.display || "block",
    visibility: props?.visibility || "visible",
    float: props?.float || "none", clear: props?.clear || "none",
    width: props?.width || "", height: props?.height || "",
    minWidth: props?.minWidth || "", maxWidth: props?.maxWidth || "",
    minHeight: props?.minHeight || "", maxHeight: props?.maxHeight || "",
    boxSizing: props?.boxSizing || "content-box",
    
    // Overflow & Scroll
    overflow: props?.overflow || "visible",
    overflowX: props?.overflowX || "visible", overflowY: props?.overflowY || "visible",
    resize: props?.resize || "none",
    
    // Margin & Padding
    marginMode: "all", margin: props?.margin || "",
    marginSidesVals: {
      top: props?.marginTop || "", right: props?.marginRight || "",
      bottom: props?.marginBottom || "", left: props?.marginLeft || "",
      x: props?.marginX || "", y: props?.marginY || ""
    },
    paddingMode: "all", padding: props?.padding || "",
    paddingSidesVals: {
      top: props?.paddingTop || "", right: props?.paddingRight || "",
      bottom: props?.paddingBottom || "", left: props?.paddingLeft || "",
      x: props?.paddingX || "", y: props?.paddingY || ""
    },
    
    // Border
    borderMode: "all",
    borderWidth: props?.borderWidth || 0, borderStyle: props?.borderStyle || "solid",
    borderColor: props?.borderColor || "#000000",
    borderTopWidth: props?.borderTopWidth || 0, borderRightWidth: props?.borderRightWidth || 0,
    borderBottomWidth: props?.borderBottomWidth || 0, borderLeftWidth: props?.borderLeftWidth || 0,
    borderTopStyle: props?.borderTopStyle || "solid", borderRightStyle: props?.borderRightStyle || "solid",
    borderBottomStyle: props?.borderBottomStyle || "solid", borderLeftStyle: props?.borderLeftStyle || "solid",
    borderTopColor: props?.borderTopColor || "#000000", borderRightColor: props?.borderRightColor || "#000000",
    borderBottomColor: props?.borderBottomColor || "#000000", borderLeftColor: props?.borderLeftColor || "#000000",
    borderCollapse: props?.borderCollapse || "separate", borderSpacing: props?.borderSpacing || "0",
    
    // Border Radius
    radiusMode: "all",
    borderRadius: props?.borderRadius || 0,
    borderTopLeftRadius: props?.borderTopLeftRadius || 0, borderTopRightRadius: props?.borderTopRightRadius || 0,
    borderBottomLeftRadius: props?.borderBottomLeftRadius || 0, borderBottomRightRadius: props?.borderBottomRightRadius || 0,
    
    // Typography
    fontFamily: props?.fontFamily || "Arial", fontSize: props?.fontSize || 16,
    fontWeight: props?.fontWeight || "400", fontStyle: props?.fontStyle || "normal",
    fontVariant: props?.fontVariant || "normal", fontStretch: props?.fontStretch || "normal",
    lineHeight: props?.lineHeight || 1.4, letterSpacing: props?.letterSpacing || 0,
    wordSpacing: props?.wordSpacing || 0, textAlign: props?.textAlign || "left",
    textDecoration: props?.textDecoration || "none", textTransform: props?.textTransform || "none",
    textIndent: props?.textIndent || 0, textShadow: props?.textShadow || "",
    verticalAlign: props?.verticalAlign || "baseline", whiteSpace: props?.whiteSpace || "normal",
    wordBreak: props?.wordBreak || "normal", wordWrap: props?.wordWrap || "normal",
    
    // Colors & Backgrounds
    color: props?.color || "#000000", backgroundColor: props?.backgroundColor || "transparent",
    backgroundImage: props?.backgroundImage || "", backgroundSize: props?.backgroundSize || "auto",
    backgroundRepeat: props?.backgroundRepeat || "repeat", backgroundPosition: props?.backgroundPosition || "0% 0%",
    backgroundAttachment: props?.backgroundAttachment || "scroll", backgroundClip: props?.backgroundClip || "border-box",
    backgroundOrigin: props?.backgroundOrigin || "padding-box",
    
    // Flexbox
    flexDirection: props?.flexDirection || "row", flexWrap: props?.flexWrap || "nowrap",
    justifyContent: props?.justifyContent || "flex-start", alignItems: props?.alignItems || "stretch",
    alignContent: props?.alignContent || "stretch", gap: props?.gap || "",
    rowGap: props?.rowGap || "", columnGap: props?.columnGap || "",
    flex: props?.flex || "", flexGrow: props?.flexGrow || 0,
    flexShrink: props?.flexShrink || 1, flexBasis: props?.flexBasis || "auto",
    alignSelf: props?.alignSelf || "auto", order: props?.order || 0,
    
    // Grid
    gridTemplateColumns: props?.gridTemplateColumns || "", gridTemplateRows: props?.gridTemplateRows || "",
    gridTemplateAreas: props?.gridTemplateAreas || "", gridAutoFlow: props?.gridAutoFlow || "row",
    gridAutoColumns: props?.gridAutoColumns || "", gridAutoRows: props?.gridAutoRows || "",
    gridColumn: props?.gridColumn || "", gridRow: props?.gridRow || "",
    gridColumnStart: props?.gridColumnStart || "", gridColumnEnd: props?.gridColumnEnd || "",
    gridRowStart: props?.gridRowStart || "", gridRowEnd: props?.gridRowEnd || "",
    gridArea: props?.gridArea || "", justifySelf: props?.justifySelf || "auto",
    placeSelf: props?.placeSelf || "auto", placeItems: props?.placeItems || "auto",
    placeContent: props?.placeContent || "auto",
    
    // List Styles
    listStyleType: props?.listStyleType || "disc", listStylePosition: props?.listStylePosition || "outside",
    listStyleImage: props?.listStyleImage || "none",
    
    // Table Styles
    tableLayout: props?.tableLayout || "auto", captionSide: props?.captionSide || "top",
    emptyCells: props?.emptyCells || "show",
    
    // Transform & Animation
    transform: props?.transform || "", transformOrigin: props?.transformOrigin || "50% 50%",
    transition: props?.transition || "", animation: props?.animation || "",
    
    // Effects & Filters
    opacity: props?.opacity || 1, filter: props?.filter || "",
    backdropFilter: props?.backdropFilter || "", boxShadow: props?.boxShadow || "",
    textShadow: props?.textShadow || "", clipPath: props?.clipPath || "",
    mask: props?.mask || "", mixBlendMode: props?.mixBlendMode || "normal",
    backgroundBlendMode: props?.backgroundBlendMode || "normal",
    
    // Interaction
    cursor: props?.cursor || "auto", pointerEvents: props?.pointerEvents || "auto",
    userSelect: props?.userSelect || "auto", touchAction: props?.touchAction || "auto",
    
    // Content & Generated Content
    content: props?.content || "", quotes: props?.quotes || "",
    counterReset: props?.counterReset || "", counterIncrement: props?.counterIncrement || "",
    
    // Object Fitting (for images/videos)
    objectFit: props?.objectFit || "fill", objectPosition: props?.objectPosition || "50% 50%",
    
    // Scroll Behavior
    scrollBehavior: props?.scrollBehavior || "auto", scrollSnapType: props?.scrollSnapType || "none",
    scrollSnapAlign: props?.scrollSnapAlign || "none",
    
    // Non-CSS Properties
    src: props?.src || "", alt: props?.alt || "", href: props?.href || "",
    placeholder: props?.placeholder || "", title: props?.title || "",
    id: props?.id || "", className: props?.className || "",
    target: props?.target || "", rel: props?.rel || "",
    type: props?.type || "", value: props?.value || "",
    name: props?.name || "", disabled: props?.disabled || false,
    required: props?.required || false, readonly: props?.readonly || false,
    multiple: props?.multiple || false, checked: props?.checked || false,
    selected: props?.selected || false, hidden: props?.hidden || false,
    tabIndex: props?.tabIndex || 0, accessKey: props?.accessKey || "",
    contentEditable: props?.contentEditable || false, draggable: props?.draggable || false,
    spellCheck: props?.spellCheck || true, translate: props?.translate || true,
    dir: props?.dir || "auto", lang: props?.lang || "",
    role: props?.role || "", ariaLabel: props?.ariaLabel || "",
    ariaDescribedBy: props?.ariaDescribedBy || "", ariaLabelledBy: props?.ariaLabelledBy || "",
    dataAttributes: props?.dataAttributes || {}
  });

// Sync local state with selected node props when selection changes
  useEffect(() => {
    if (selected?.props) {
      const defaultStyle = getDefaultLocalStyle();
      
      setLocalStyle({
        ...defaultStyle,
        // Override with actual props from selected node
        ...selected.props,
        // Ensure nested objects are properly structured
        marginSidesVals: {
          top: selected.props?.marginTop || "",
          right: selected.props?.marginRight || "",
          bottom: selected.props?.marginBottom || "",
          left: selected.props?.marginLeft || "",
          x: selected.props?.marginX || "",
          y: selected.props?.marginY || ""
        },
        paddingSidesVals: {
          top: selected.props?.paddingTop || "",
          right: selected.props?.paddingRight || "",
          bottom: selected.props?.paddingBottom || "",
          left: selected.props?.paddingLeft || "",
          x: selected.props?.paddingX || "",
          y: selected.props?.paddingY || ""
        }
      });
    } else {
      setLocalStyle(getDefaultLocalStyle());
    }
  }, [selected, getDefaultLocalStyle]);

  // Debounced sync to selected node
  const debouncedSync = useCallback(
    debounce((key, value) => {
      if (selected) {
        actions.setProp(selected.id, (props) => {
          // Handle nested properties
          if (key.includes('.')) {
            const keys = key.split('.');
            let current = props;
            for (let i = 0; i < keys.length - 1; i++) {
              if (!current[keys[i]]) current[keys[i]] = {};
              current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
          } else {
            props[key] = value;
          }
        });
      }
    }, 300),
    [selected, actions]
  );

// Delete handler
  const handleDelete = useCallback(() => {
    if (selected && selected.isDeletable) {
      actions.delete(selected.id);
    }
  }, [selected, actions]);

  // Optimized handlers with safety checks
  const handleInputChange = useCallback((key) => ({
    value: localStyle[key] || "",
    onChange: (e) => {
      const value = e.target.value;
      setLocalStyle(prev => ({ ...prev, [key]: value }));
    },
    onBlur: (e) => debouncedSync(key, e.target.value)
  }), [localStyle, debouncedSync]);

  const handleSelectChange = useCallback((key) => ({
    value: localStyle[key],
    onChange: (val) => {
      setLocalStyle(prev => ({ ...prev, [key]: val }));
      debouncedSync(key, val);
    }
  }), [localStyle, debouncedSync]);

  const handleSliderChange = useCallback((key) => ({
    value: localStyle[key] || 0,
    onChange: (val) => {
      setLocalStyle(prev => ({ ...prev, [key]: val }));
      debouncedSync(key, val);
    }
  }), [localStyle, debouncedSync]);

  const handleColorChange = useCallback((key) => ({
    value: localStyle[key],
    onChange: (color) => {
      const hexValue = color.toHexString();
      setLocalStyle(prev => ({ ...prev, [key]: hexValue }));
      debouncedSync(key, hexValue);
    }
  }), [localStyle, debouncedSync]);

  const handleButtonGroupChange = useCallback((key) => ({
    value: localStyle[key],
    onChange: (val) => {
      setLocalStyle(prev => ({ ...prev, [key]: val }));
      debouncedSync(key, val);
    }
  }), [localStyle, debouncedSync]);

  const handleSwitchChange = useCallback((key) => ({
    checked: localStyle[key] || false,
    onChange: (checked) => {
      setLocalStyle(prev => ({ ...prev, [key]: checked }));
      debouncedSync(key, checked);
    }
  }), [localStyle, debouncedSync]);

  const handleNumberChange = useCallback((key) => ({
    value: localStyle[key] || 0,
    onChange: (val) => {
      setLocalStyle(prev => ({ ...prev, [key]: val }));
      debouncedSync(key, val);
    }
  }), [localStyle, debouncedSync]);

  const shouldShow = useCallback((section) => 
    supportedProps.length === 0 || supportedProps.includes(section), 
    [supportedProps]
  );

  // Shared styles
  const sharedStyles = useMemo(() => ({
    popup: { root: { zIndex: 10000 } },
    formItem: { marginBottom: 12 }
  }), []);

  // Complete collapse items with safety checks
  const collapseItems = useMemo(() => {
    const items = [];

    // Basic Properties
    if (shouldShow('basic')) {
      items.push({
        key: 'basic',
        label: <span><SettingOutlined /> Basic Properties</span>,
        children: (
          <div style={{ padding: '0 20px 16px 20px' }}>
            {shouldShow('src') && (
              <Form.Item label="Image Source" style={sharedStyles.formItem}>
                <Input {...handleInputChange("src")} placeholder="https://example.com/image.jpg" size="small" />
              </Form.Item>
            )}
            {shouldShow('alt') && (
              <Form.Item label="Alt Text" style={sharedStyles.formItem}>
                <Input {...handleInputChange("alt")} placeholder="Image description" size="small" />
              </Form.Item>
            )}
            {shouldShow('href') && (
              <Form.Item label="Link URL" style={sharedStyles.formItem}>
                <Input {...handleInputChange("href")} placeholder="https://example.com" size="small" />
              </Form.Item>
            )}
            {shouldShow('placeholder') && (
              <Form.Item label="Placeholder" style={sharedStyles.formItem}>
                <Input {...handleInputChange("placeholder")} placeholder="Enter placeholder text" size="small" />
              </Form.Item>
            )}
            {shouldShow('title') && (
              <Form.Item label="Title" style={sharedStyles.formItem}>
                <Input {...handleInputChange("title")} placeholder="Tooltip text" size="small" />
              </Form.Item>
            )}
            {shouldShow('id') && (
              <Form.Item label="ID" style={sharedStyles.formItem}>
                <Input {...handleInputChange("id")} placeholder="unique-id" size="small" />
              </Form.Item>
            )}
            {shouldShow('className') && (
              <Form.Item label="CSS Classes" style={sharedStyles.formItem}>
                <Input {...handleInputChange("className")} placeholder="class1 class2" size="small" />
              </Form.Item>
            )}
          </div>
        )
      });
    }

    // Layout & Position
    if (shouldShow('layout')) {
      items.push({
        key: "layout",
        label: <span><AppstoreOutlined /> Layout & Position</span>,
        children: (
          <div style={{ padding: '0 20px 16px 20px' }}>
            <Form.Item label="Display" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("display")} options={displays} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Position" style={sharedStyles.formItem}>
              <IconButtonGroup options={positions} {...handleButtonGroupChange("position")} />
            </Form.Item>
            <Form.Item label="Visibility" style={sharedStyles.formItem}>
              <IconButtonGroup options={visibilities} {...handleButtonGroupChange("visibility")} />
            </Form.Item>
            <Form.Item label="Float" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("float")} options={floats} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Clear" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("clear")} options={clears} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            
            <Divider orientation="left" plain>Dimensions</Divider>
            <Form.Item label={<span><ColumnWidthOutlined /> Width</span>} style={sharedStyles.formItem}>
              <Input {...handleInputChange("width")} placeholder="e.g. 100px, 50%, auto" size="small" />
            </Form.Item>
            <Form.Item label={<span><ColumnHeightOutlined /> Height</span>} style={sharedStyles.formItem}>
              <Input {...handleInputChange("height")} placeholder="e.g. 100px, 50%, auto" size="small" />
            </Form.Item>
            <Form.Item label="Min Width" style={sharedStyles.formItem}>
              <Input {...handleInputChange("minWidth")} placeholder="e.g. 100px" size="small" />
            </Form.Item>
            <Form.Item label="Max Width" style={sharedStyles.formItem}>
              <Input {...handleInputChange("maxWidth")} placeholder="e.g. 500px" size="small" />
            </Form.Item>
            <Form.Item label="Min Height" style={sharedStyles.formItem}>
              <Input {...handleInputChange("minHeight")} placeholder="e.g. 100px" size="small" />
            </Form.Item>
            <Form.Item label="Max Height" style={sharedStyles.formItem}>
              <Input {...handleInputChange("maxHeight")} placeholder="e.g. 500px" size="small" />
            </Form.Item>
            <Form.Item label="Box Sizing" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("boxSizing")} options={boxSizings} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            
            <Divider orientation="left" plain>Position Values</Divider>
            <Form.Item label="Top" style={sharedStyles.formItem}>
              <Input {...handleInputChange("top")} placeholder="e.g. 10px" size="small" />
            </Form.Item>
            <Form.Item label="Right" style={sharedStyles.formItem}>
              <Input {...handleInputChange("right")} placeholder="e.g. 10px" size="small" />
            </Form.Item>
            <Form.Item label="Bottom" style={sharedStyles.formItem}>
              <Input {...handleInputChange("bottom")} placeholder="e.g. 10px" size="small" />
            </Form.Item>
            <Form.Item label="Left" style={sharedStyles.formItem}>
              <Input {...handleInputChange("left")} placeholder="e.g. 10px" size="small" />
            </Form.Item>
            <Form.Item label={<span><VerticalAlignMiddleOutlined /> Z-index</span>} style={sharedStyles.formItem}>
              <Slider {...handleSliderChange("zIndex")} min={-100} max={100} />
            </Form.Item>
          </div>
        ),
      });
    }

    // Overflow & Scroll
    if (shouldShow('overflow')) {
      items.push({
        key: 'overflow',
        label: <span><EyeOutlined /> Overflow & Scroll</span>,
        children: (
          <div style={{ padding: '0 20px 16px 20px' }}>
            <Form.Item label="Overflow" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("overflow")} options={overflows} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Overflow X" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("overflowX")} options={overflows} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Overflow Y" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("overflowY")} options={overflows} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Resize" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("resize")} options={resizes} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Scroll Behavior" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("scrollBehavior")} options={[
                { value: "auto", label: "Auto" },
                { value: "smooth", label: "Smooth" }
              ]} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
          </div>
        )
      });
    }

    // Typography
    if (shouldShow('typography')) {
      items.push({
        key: 'typography',
        label: <span><FontColorsOutlined /> Typography</span>,
        children: (
          <div style={{ padding: '0 20px 16px 20px' }}>
            <Form.Item label="Font Family" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("fontFamily")} options={fontFamilies.map(font => ({ value: font, label: font }))} size="small" showSearch styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Font Size" style={sharedStyles.formItem}>
              <Slider {...handleSliderChange("fontSize")} min={6} max={120} tooltip={{ formatter: (val) => `${val}px` }} />
            </Form.Item>
            <Form.Item label="Font Weight" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("fontWeight")} options={fontWeights} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Font Style" style={sharedStyles.formItem}>
              <IconButtonGroup options={fontStyles} {...handleButtonGroupChange("fontStyle")} />
            </Form.Item>
            <Form.Item label="Line Height" style={sharedStyles.formItem}>
              <Slider {...handleSliderChange("lineHeight")} min={0.5} max={4} step={0.1} tooltip={{ formatter: (val) => `${val}` }} />
            </Form.Item>
            <Form.Item label="Letter Spacing" style={sharedStyles.formItem}>
              <Slider {...handleSliderChange("letterSpacing")} min={-5} max={20} step={0.1} tooltip={{ formatter: (val) => `${val}px` }} />
            </Form.Item>
            <Form.Item label="Word Spacing" style={sharedStyles.formItem}>
              <Slider {...handleSliderChange("wordSpacing")} min={-10} max={50} step={0.5} tooltip={{ formatter: (val) => `${val}px` }} />
            </Form.Item>
            
            <Divider orientation="left" plain>Text Alignment</Divider>
            <Form.Item label="Text Align" style={sharedStyles.formItem}>
              <IconButtonGroup options={textAligns} {...handleButtonGroupChange("textAlign")} />
            </Form.Item>
            <Form.Item label="Vertical Align" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("verticalAlign")} options={verticalAligns} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Text Indent" style={sharedStyles.formItem}>
              <Slider {...handleSliderChange("textIndent")} min={-100} max={100} tooltip={{ formatter: (val) => `${val}px` }} />
            </Form.Item>
            
            <Divider orientation="left" plain>Text Decoration</Divider>
            <Form.Item label="Text Decoration" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("textDecoration")} options={textDecorations} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Text Transform" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("textTransform")} options={textTransforms} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="White Space" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("whiteSpace")} options={whiteSpaces} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Word Break" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("wordBreak")} options={wordBreaks} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Text Shadow" style={sharedStyles.formItem}>
              <Input {...handleInputChange("textShadow")} placeholder="e.g. 2px 2px 4px rgba(0,0,0,0.5)" size="small" />
            </Form.Item>
          </div>
        )
      });
    }

    // Colors & Backgrounds
    if (shouldShow('colors')) {
      items.push({
        key: 'colors',
        label: <span><BgColorsOutlined /> Colors & Backgrounds</span>,
        children: (
          <div style={{ padding: '0 20px 16px 20px' }}>
            <Form.Item label="Text Color" style={sharedStyles.formItem}>
              <ColorPicker {...handleColorChange("color")} size="small" showText getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Background Color" style={sharedStyles.formItem}>
              <ColorPicker {...handleColorChange("backgroundColor")} size="small" showText allowClear getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            
            <Divider orientation="left" plain>Background Image</Divider>
            <Form.Item label="Background Image" style={sharedStyles.formItem}>
              <Input {...handleInputChange("backgroundImage")} placeholder="url(image.jpg) or linear-gradient(...)" size="small" />
            </Form.Item>
            <Form.Item label="Background Size" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("backgroundSize")} options={backgroundSizes} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Background Repeat" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("backgroundRepeat")} options={backgroundRepeats} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Background Position" style={sharedStyles.formItem}>
              <Input {...handleInputChange("backgroundPosition")} placeholder="e.g. center, 50% 50%" size="small" />
            </Form.Item>
            <Form.Item label="Background Attachment" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("backgroundAttachment")} options={backgroundAttachments} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
          </div>
        )
      });
    }

    // Spacing (Margin & Padding)
    if (shouldShow('spacing')) {
      items.push({
        key: 'spacing',
        label: <span><BorderOuterOutlined /> Spacing</span>,
        children: (
          <div style={{ padding: '0 20px 16px 20px' }}>
            <Divider orientation="left" plain>Margin</Divider>
            <Space>
              {spacingSides.map(opt => (
                <Tooltip title={opt.value} key={opt.value} getPopupContainer={(triggerNode) => triggerNode.parentNode}>
                  <Button
                    type={localStyle.marginMode === opt.value ? "primary" : "default"}
                    icon={opt.icon}
                    size="small"
                    onClick={() => {
                      setLocalStyle(prev => ({ ...prev, marginMode: opt.value }));
                      debouncedSync("marginMode", opt.value);
                    }}
                  />
                </Tooltip>
              ))}
            </Space>
            <Form.Item style={sharedStyles.formItem}>
              {localStyle.marginMode === "all" ? (
                <Input {...handleInputChange("margin")} placeholder="e.g. 10px" size="small" />
              ) : (
                <Input
                  value={localStyle.marginSidesVals[localStyle.marginMode]}
                  onChange={e => setLocalStyle(prev => ({
                    ...prev,
                    marginSidesVals: { ...prev.marginSidesVals, [localStyle.marginMode]: e.target.value }
                  }))}
                  onBlur={e => debouncedSync(`marginSidesVals.${localStyle.marginMode}`, e.target.value)}
                  placeholder={`${localStyle.marginMode} margin`}
                  size="small"
                />
              )}
            </Form.Item>

            <Divider orientation="left" plain>Padding</Divider>
            <Space>
              {spacingSides.map(opt => (
                <Tooltip title={opt.value} key={opt.value} getPopupContainer={(triggerNode) => triggerNode.parentNode}>
                  <Button
                    type={localStyle.paddingMode === opt.value ? "primary" : "default"}
                    icon={opt.icon}
                    size="small"
                    onClick={() => {
                      setLocalStyle(prev => ({ ...prev, paddingMode: opt.value }));
                      debouncedSync("paddingMode", opt.value);
                    }}
                  />
                </Tooltip>
              ))}
            </Space>
            <Form.Item style={sharedStyles.formItem}>
              {localStyle.paddingMode === "all" ? (
                <Input {...handleInputChange("padding")} placeholder="e.g. 10px" size="small" />
              ) : (
                <Input
                  value={localStyle.paddingSidesVals[localStyle.paddingMode]}
                  onChange={e => setLocalStyle(prev => ({
                    ...prev,
                    paddingSidesVals: { ...prev.paddingSidesVals, [localStyle.paddingMode]: e.target.value }
                  }))}
                  onBlur={e => debouncedSync(`paddingSidesVals.${localStyle.paddingMode}`, e.target.value)}
                  placeholder={`${localStyle.paddingMode} padding`}
                  size="small"
                />
              )}
            </Form.Item>
          </div>
        )
      });
    }

    // Border & Radius
    if (shouldShow('border')) {
      items.push({
        key: 'border',
        label: <span><BorderOutlined /> Border & Radius</span>,
        children: (
          <div style={{ padding: '0 20px 16px 20px' }}>
            <Divider orientation="left" plain>Border</Divider>
            <Space>
              {sides.map(opt => (
                <Tooltip title={opt.value} key={opt.value} getPopupContainer={(triggerNode) => triggerNode.parentNode}>
                  <Button
                    type={localStyle.borderMode === opt.value ? "primary" : "default"}
                    icon={opt.icon}
                    size="small"
                    onClick={() => {
                      setLocalStyle(prev => ({ ...prev, borderMode: opt.value }));
                      debouncedSync("borderMode", opt.value);
                    }}
                  />
                </Tooltip>
              ))}
            </Space>
            
            <Form.Item label="Border Width" style={sharedStyles.formItem}>
              <Slider {...handleSliderChange("borderWidth")} min={0} max={20} tooltip={{ formatter: (val) => `${val}px` }} />
            </Form.Item>
            <Form.Item label="Border Style" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("borderStyle")} options={borderStyles} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Border Color" style={sharedStyles.formItem}>
              <ColorPicker {...handleColorChange("borderColor")} size="small" showText getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>



            <Divider orientation="left" plain>Individual Sides</Divider>
            <Form.Item label="Top Border Width" style={sharedStyles.formItem}>
              <Slider {...handleSliderChange("borderTopWidth")} min={0} max={20} tooltip={{ formatter: (val) => `${val}px` }} />
            </Form.Item>
            <Form.Item label="Right Border Width" style={sharedStyles.formItem}>
              <Slider {...handleSliderChange("borderRightWidth")} min={0} max={20} tooltip={{ formatter: (val) => `${val}px` }} />
            </Form.Item>
            <Form.Item label="Bottom Border Width" style={sharedStyles.formItem}>
              <Slider {...handleSliderChange("borderBottomWidth")} min={0} max={20} tooltip={{ formatter: (val) => `${val}px` }} />
            </Form.Item>
            <Form.Item label="Left Border Width" style={sharedStyles.formItem}>
              <Slider {...handleSliderChange("borderLeftWidth")} min={0} max={20} tooltip={{ formatter: (val) => `${val}px` }} />
            </Form.Item>

            <Divider orientation="left" plain>Individual Border Styles</Divider>
            <Form.Item label="Top Border Style" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("borderTopStyle")} options={borderStyles} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Right Border Style" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("borderRightStyle")} options={borderStyles} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Bottom Border Style" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("borderBottomStyle")} options={borderStyles} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Left Border Style" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("borderLeftStyle")} options={borderStyles} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>

            <Divider orientation="left" plain>Individual Border Colors</Divider>
            <Form.Item label="Top Border Color" style={sharedStyles.formItem}>
              <ColorPicker {...handleColorChange("borderTopColor")} size="small" showText getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Right Border Color" style={sharedStyles.formItem}>
              <ColorPicker {...handleColorChange("borderRightColor")} size="small" showText getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Bottom Border Color" style={sharedStyles.formItem}>
              <ColorPicker {...handleColorChange("borderBottomColor")} size="small" showText getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Left Border Color" style={sharedStyles.formItem}>
              <ColorPicker {...handleColorChange("borderLeftColor")} size="small" showText getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>

            <Divider orientation="left" plain>Border Radius</Divider>
            <Space>
              {radiusCorners.map(opt => (
                <Tooltip title={opt.value} key={opt.value} getPopupContainer={(triggerNode) => triggerNode.parentNode}>
                  <Button
                    type={localStyle.radiusMode === opt.value ? "primary" : "default"}
                    icon={opt.icon}
                    size="small"
                    onClick={() => {
                      setLocalStyle(prev => ({ ...prev, radiusMode: opt.value }));
                      debouncedSync("radiusMode", opt.value);
                    }}
                  />
                </Tooltip>
              ))}
            </Space>
            
            {localStyle.radiusMode === "all" ? (
              <Form.Item label="Border Radius" style={sharedStyles.formItem}>
                <Slider {...handleSliderChange("borderRadius")} min={0} max={100} tooltip={{ formatter: (val) => `${val}px` }} />
              </Form.Item>
            ) : (
              <>
                <Form.Item label="Top Left Radius" style={sharedStyles.formItem}>
                  <Slider {...handleSliderChange("borderTopLeftRadius")} min={0} max={100} tooltip={{ formatter: (val) => `${val}px` }} />
                </Form.Item>
                <Form.Item label="Top Right Radius" style={sharedStyles.formItem}>
                  <Slider {...handleSliderChange("borderTopRightRadius")} min={0} max={100} tooltip={{ formatter: (val) => `${val}px` }} />
                </Form.Item>
                <Form.Item label="Bottom Left Radius" style={sharedStyles.formItem}>
                  <Slider {...handleSliderChange("borderBottomLeftRadius")} min={0} max={100} tooltip={{ formatter: (val) => `${val}px` }} />
                </Form.Item>
                <Form.Item label="Bottom Right Radius" style={sharedStyles.formItem}>
                  <Slider {...handleSliderChange("borderBottomRightRadius")} min={0} max={100} tooltip={{ formatter: (val) => `${val}px` }} />
                </Form.Item>
              </>
            )}
            
            <Divider orientation="left" plain>Table Borders</Divider>
            <Form.Item label="Border Collapse" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("borderCollapse")} options={borderCollapses} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Border Spacing" style={sharedStyles.formItem}>
              <Input {...handleInputChange("borderSpacing")} placeholder="e.g. 2px" size="small" />
            </Form.Item>
          </div>
        )
      });
    }

    // Flexbox
    if (shouldShow('flexbox')) {
      items.push({
        key: 'flexbox',
        label: <span><AppstoreOutlined /> Flexbox</span>,
        children: (
          <div style={{ padding: '0 20px 16px 20px' }}>
            <Form.Item label="Flex Direction" style={sharedStyles.formItem}>
              <IconButtonGroup options={flexDirections} {...handleButtonGroupChange("flexDirection")} />
            </Form.Item>
            <Form.Item label="Flex Wrap" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("flexWrap")} options={flexWraps} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Justify Content" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("justifyContent")} options={justifyContents} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Align Items" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("alignItems")} options={alignItems} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Align Content" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("alignContent")} options={alignContents} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            
            <Divider orientation="left" plain>Flex Items</Divider>
            <Form.Item label="Flex" style={sharedStyles.formItem}>
              <Input {...handleInputChange("flex")} placeholder="e.g. 1, 1 1 auto" size="small" />
            </Form.Item>
            <Form.Item label="Flex Grow" style={sharedStyles.formItem}>
              <Slider {...handleSliderChange("flexGrow")} min={0} max={10} tooltip={{ formatter: (val) => val }} />
            </Form.Item>
            <Form.Item label="Flex Shrink" style={sharedStyles.formItem}>
              <Slider {...handleSliderChange("flexShrink")} min={0} max={10} tooltip={{ formatter: (val) => val }} />
            </Form.Item>
            <Form.Item label="Flex Basis" style={sharedStyles.formItem}>
              <Input {...handleInputChange("flexBasis")} placeholder="e.g. auto, 200px, 50%" size="small" />
            </Form.Item>
            <Form.Item label="Align Self" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("alignSelf")} options={alignSelfs} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Order" style={sharedStyles.formItem}>
              <Slider {...handleSliderChange("order")} min={-10} max={10} tooltip={{ formatter: (val) => val }} />
            </Form.Item>
            
            <Divider orientation="left" plain>Gap</Divider>
            <Form.Item label="Gap" style={sharedStyles.formItem}>
              <Input {...handleInputChange("gap")} placeholder="e.g. 10px" size="small" />
            </Form.Item>
            <Form.Item label="Row Gap" style={sharedStyles.formItem}>
              <Input {...handleInputChange("rowGap")} placeholder="e.g. 10px" size="small" />
            </Form.Item>
            <Form.Item label="Column Gap" style={sharedStyles.formItem}>
              <Input {...handleInputChange("columnGap")} placeholder="e.g. 10px" size="small" />
            </Form.Item>
          </div>
        )
      });
    }

    // Grid
    if (shouldShow('grid')) {
      items.push({
        key: 'grid',
        label: <span><BorderlessTableOutlined /> CSS Grid</span>,
        children: (
          <div style={{ padding: '0 20px 16px 20px' }}>
            <Divider orientation="left" plain>Grid Container</Divider>
            <Form.Item label="Grid Template Columns" style={sharedStyles.formItem}>
              <Input {...handleInputChange("gridTemplateColumns")} placeholder="e.g. 1fr 2fr 1fr, repeat(3, 1fr)" size="small" />
            </Form.Item>
            <Form.Item label="Grid Template Rows" style={sharedStyles.formItem}>
              <Input {...handleInputChange("gridTemplateRows")} placeholder="e.g. 100px auto 200px" size="small" />
            </Form.Item>
            <Form.Item label="Grid Template Areas" style={sharedStyles.formItem}>
              <Input {...handleInputChange("gridTemplateAreas")} placeholder='e.g. "header header" "sidebar main"' size="small" />
            </Form.Item>
            <Form.Item label="Grid Auto Flow" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("gridAutoFlow")} options={gridAutoFlows} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Grid Auto Columns" style={sharedStyles.formItem}>
              <Input {...handleInputChange("gridAutoColumns")} placeholder="e.g. minmax(100px, auto)" size="small" />
            </Form.Item>
            <Form.Item label="Grid Auto Rows" style={sharedStyles.formItem}>
              <Input {...handleInputChange("gridAutoRows")} placeholder="e.g. minmax(100px, auto)" size="small" />
            </Form.Item>
            
            <Divider orientation="left" plain>Grid Items</Divider>
            <Form.Item label="Grid Column" style={sharedStyles.formItem}>
              <Input {...handleInputChange("gridColumn")} placeholder="e.g. 1 / 3, span 2" size="small" />
            </Form.Item>
            <Form.Item label="Grid Row" style={sharedStyles.formItem}>
              <Input {...handleInputChange("gridRow")} placeholder="e.g. 1 / 3, span 2" size="small" />
            </Form.Item>
            <Form.Item label="Grid Column Start" style={sharedStyles.formItem}>
              <Input {...handleInputChange("gridColumnStart")} placeholder="e.g. 1, span 2" size="small" />
            </Form.Item>
            <Form.Item label="Grid Column End" style={sharedStyles.formItem}>
              <Input {...handleInputChange("gridColumnEnd")} placeholder="e.g. 3, span 2" size="small" />
            </Form.Item>
            <Form.Item label="Grid Row Start" style={sharedStyles.formItem}>
              <Input {...handleInputChange("gridRowStart")} placeholder="e.g. 1, span 2" size="small" />
            </Form.Item>
            <Form.Item label="Grid Row End" style={sharedStyles.formItem}>
              <Input {...handleInputChange("gridRowEnd")} placeholder="e.g. 3, span 2" size="small" />
            </Form.Item>
            <Form.Item label="Grid Area" style={sharedStyles.formItem}>
              <Input {...handleInputChange("gridArea")} placeholder="e.g. header, 1 / 1 / 2 / 3" size="small" />
            </Form.Item>
            <Form.Item label="Justify Self" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("justifySelf")} options={justifySelfs} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Place Self" style={sharedStyles.formItem}>
              <Input {...handleInputChange("placeSelf")} placeholder="e.g. center, start end" size="small" />
            </Form.Item>
            <Form.Item label="Place Items" style={sharedStyles.formItem}>
              <Input {...handleInputChange("placeItems")} placeholder="e.g. center, start end" size="small" />
            </Form.Item>
            <Form.Item label="Place Content" style={sharedStyles.formItem}>
              <Input {...handleInputChange("placeContent")} placeholder="e.g. center, start end" size="small" />
            </Form.Item>
            
            <Divider orientation="left" plain>Grid Gap</Divider>
            <Form.Item label="Gap" style={sharedStyles.formItem}>
              <Input {...handleInputChange("gap")} placeholder="e.g. 10px" size="small" />
            </Form.Item>
            <Form.Item label="Row Gap" style={sharedStyles.formItem}>
              <Input {...handleInputChange("rowGap")} placeholder="e.g. 10px" size="small" />
            </Form.Item>
            <Form.Item label="Column Gap" style={sharedStyles.formItem}>
              <Input {...handleInputChange("columnGap")} placeholder="e.g. 10px" size="small" />
            </Form.Item>
          </div>
        )
      });
    }

    // Lists
    if (shouldShow('lists')) {
      items.push({
        key: 'lists',
        label: <span><MenuOutlined /> Lists</span>,
        children: (
          <div style={{ padding: '0 20px 16px 20px' }}>
            <Form.Item label="List Style Type" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("listStyleType")} options={listStyleTypes} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="List Style Position" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("listStylePosition")} options={listStylePositions} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="List Style Image" style={sharedStyles.formItem}>
              <Input {...handleInputChange("listStyleImage")} placeholder="url(bullet.png)" size="small" />
            </Form.Item>
          </div>
        )
      });
    }

    // Tables
    if (shouldShow('tables')) {
      items.push({
        key: 'tables',
        label: <span><TableOutlined /> Tables</span>,
        children: (
          <div style={{ padding: '0 20px 16px 20px' }}>
            <Form.Item label="Table Layout" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("tableLayout")} options={tableLayouts} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Caption Side" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("captionSide")} options={captionSides} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Empty Cells" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("emptyCells")} options={emptyCells} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Border Collapse" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("borderCollapse")} options={borderCollapses} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Border Spacing" style={sharedStyles.formItem}>
              <Input {...handleInputChange("borderSpacing")} placeholder="e.g. 2px" size="small" />
            </Form.Item>
          </div>
        )
      });
    }

    // Transform & Animation
    if (shouldShow('transform')) {
      items.push({
        key: 'transform',
        label: <span><ExpandOutlined /> Transform & Animation</span>,
        children: (
          <div style={{ padding: '0 20px 16px 20px' }}>
            <Form.Item label="Transform" style={sharedStyles.formItem}>
              <Input {...handleInputChange("transform")} placeholder="e.g. rotate(45deg) scale(1.2)" size="small" />
            </Form.Item>
            <Form.Item label="Transform Origin" style={sharedStyles.formItem}>
              <Input {...handleInputChange("transformOrigin")} placeholder="e.g. center, top left, 50% 50%" size="small" />
            </Form.Item>
            <Form.Item label="Transition" style={sharedStyles.formItem}>
              <Input {...handleInputChange("transition")} placeholder="e.g. all 0.3s ease" size="small" />
            </Form.Item>
            <Form.Item label="Animation" style={sharedStyles.formItem}>
              <Input {...handleInputChange("animation")} placeholder="e.g. slideIn 0.5s ease-in-out" size="small" />
            </Form.Item>
          </div>
        )
      });
    }

    // Effects & Filters
    if (shouldShow('effects')) {
      items.push({
        key: 'effects',
        label: <span><PictureOutlined /> Effects & Filters</span>,
        children: (
          <div style={{ padding: '0 20px 16px 20px' }}>
            <Form.Item label="Opacity" style={sharedStyles.formItem}>
              <Slider {...handleSliderChange("opacity")} min={0} max={1} step={0.01} tooltip={{ formatter: (val) => `${(val * 100).toFixed(0)}%` }} />
            </Form.Item>
            <Form.Item label="Filter" style={sharedStyles.formItem}>
              <Input {...handleInputChange("filter")} placeholder="e.g. blur(5px) brightness(1.2)" size="small" />
            </Form.Item>
            <Form.Item label="Backdrop Filter" style={sharedStyles.formItem}>
              <Input {...handleInputChange("backdropFilter")} placeholder="e.g. blur(10px)" size="small" />
            </Form.Item>
            <Form.Item label="Box Shadow" style={sharedStyles.formItem}>
              <Input {...handleInputChange("boxShadow")} placeholder="e.g. 0 4px 8px rgba(0,0,0,0.1)" size="small" />
            </Form.Item>
            <Form.Item label="Text Shadow" style={sharedStyles.formItem}>
              <Input {...handleInputChange("textShadow")} placeholder="e.g. 2px 2px 4px rgba(0,0,0,0.5)" size="small" />
            </Form.Item>
            <Form.Item label="Clip Path" style={sharedStyles.formItem}>
              <Input {...handleInputChange("clipPath")} placeholder="e.g. circle(50%)" size="small" />
            </Form.Item>
            <Form.Item label="Mask" style={sharedStyles.formItem}>
              <Input {...handleInputChange("mask")} placeholder="e.g. url(mask.svg)" size="small" />
            </Form.Item>
            <Form.Item label="Mix Blend Mode" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("mixBlendMode")} options={[
                { value: "normal", label: "Normal" },
                { value: "multiply", label: "Multiply" },
                { value: "screen", label: "Screen" },
                { value: "overlay", label: "Overlay" },
                { value: "darken", label: "Darken" },
                { value: "lighten", label: "Lighten" },
                { value: "color-dodge", label: "Color Dodge" },
                { value: "color-burn", label: "Color Burn" },
                { value: "hard-light", label: "Hard Light" },
                { value: "soft-light", label: "Soft Light" },
                { value: "difference", label: "Difference" },
                { value: "exclusion", label: "Exclusion" },
                { value: "hue", label: "Hue" },
                { value: "saturation", label: "Saturation" },
                { value: "color", label: "Color" },
                { value: "luminosity", label: "Luminosity" }
              ]} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Background Blend Mode" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("backgroundBlendMode")} options={[
                { value: "normal", label: "Normal" },
                { value: "multiply", label: "Multiply" },
                { value: "screen", label: "Screen" },
                { value: "overlay", label: "Overlay" },
                { value: "darken", label: "Darken" },
                { value: "lighten", label: "Lighten" },
                { value: "color-dodge", label: "Color Dodge" },
                { value: "color-burn", label: "Color Burn" },
                { value: "hard-light", label: "Hard Light" },
                { value: "soft-light", label: "Soft Light" },
                { value: "difference", label: "Difference" },
                { value: "exclusion", label: "Exclusion" },
                { value: "hue", label: "Hue" },
                { value: "saturation", label: "Saturation" },
                { value: "color", label: "Color" },
                { value: "luminosity", label: "Luminosity" }
              ]} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
          </div>
        )
      });
    }

    // Interaction
    if (shouldShow('interaction')) {
      items.push({
        key: 'interaction',
        label: <span><LinkOutlined /> Interaction</span>,
        children: (
          <div style={{ padding: '0 20px 16px 20px' }}>
            <Form.Item label="Cursor" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("cursor")} options={cursors} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Pointer Events" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("pointerEvents")} options={pointerEvents} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="User Select" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("userSelect")} options={userSelects} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Touch Action" style={sharedStyles.formItem}>
              <Input {...handleInputChange("touchAction")} placeholder="e.g. auto, manipulation" size="small" />
            </Form.Item>
          </div>
        )
      });
    }

    // Content & Generated Content
    if (shouldShow('content')) {
      items.push({
        key: 'content',
        label: <span><FontColorsOutlined /> Content & Generated</span>,
        children: (
          <div style={{ padding: '0 20px 16px 20px' }}>
            <Form.Item label="Content" style={sharedStyles.formItem}>
              <Input {...handleInputChange("content")} placeholder='e.g. "text", attr(title)' size="small" />
            </Form.Item>
            <Form.Item label="Quotes" style={sharedStyles.formItem}>
              <Input {...handleInputChange("quotes")} placeholder='e.g. text' size="small" />
            </Form.Item>
            <Form.Item label="Counter Reset" style={sharedStyles.formItem}>
              <Input {...handleInputChange("counterReset")} placeholder="e.g. counter-name 0" size="small" />
            </Form.Item>
            <Form.Item label="Counter Increment" style={sharedStyles.formItem}>
              <Input {...handleInputChange("counterIncrement")} placeholder="e.g. counter-name 1" size="small" />
            </Form.Item>
          </div>
        )
      });
    }

    // Object Fitting (for images/videos)
    if (shouldShow('object')) {
      items.push({
        key: 'object',
        label: <span><PictureOutlined /> Object Fitting</span>,
        children: (
          <div style={{ padding: '0 20px 16px 20px' }}>
            <Form.Item label="Object Fit" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("objectFit")} options={objectFits} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Object Position" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("objectPosition")} options={objectPositions} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
          </div>
        )
      });
    }

    // Scroll Behavior
    if (shouldShow('scroll')) {
      items.push({
        key: 'scroll',
        label: <span><MenuOutlined /> Scroll Behavior</span>,
        children: (
          <div style={{ padding: '0 20px 16px 20px' }}>
            <Form.Item label="Scroll Behavior" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("scrollBehavior")} options={[
                { value: "auto", label: "Auto" },
                { value: "smooth", label: "Smooth" }
              ]} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Scroll Snap Type" style={sharedStyles.formItem}>
              <Input {...handleInputChange("scrollSnapType")} placeholder="e.g. x mandatory, y proximity" size="small" />
            </Form.Item>
            <Form.Item label="Scroll Snap Align" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("scrollSnapAlign")} options={[
                { value: "none", label: "None" },
                { value: "start", label: "Start" },
                { value: "end", label: "End" },
                { value: "center", label: "Center" }
              ]} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
          </div>
        )
      });
    }

    // HTML Attributes
    if (shouldShow('attributes')) {
      items.push({
        key: 'attributes',
        label: <span><SettingOutlined /> HTML Attributes</span>,
        children: (
          <div style={{ padding: '0 20px 16px 20px' }}>
            <Divider orientation="left" plain>Form Attributes</Divider>
            <Form.Item label="Type" style={sharedStyles.formItem}>
              <Input {...handleInputChange("type")} placeholder="e.g. text, email, password" size="small" />
            </Form.Item>
            <Form.Item label="Value" style={sharedStyles.formItem}>
              <Input {...handleInputChange("value")} placeholder="Default value" size="small" />
            </Form.Item>
            <Form.Item label="Name" style={sharedStyles.formItem}>
              <Input {...handleInputChange("name")} placeholder="Form field name" size="small" />
            </Form.Item>
            <Form.Item label="Target" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("target")} options={[
                { value: "_self", label: "_self" },
                { value: "_blank", label: "_blank" },
                { value: "_parent", label: "_parent" },
                { value: "_top", label: "_top" }
              ]} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Rel" style={sharedStyles.formItem}>
              <Input {...handleInputChange("rel")} placeholder="e.g. noopener, noreferrer" size="small" />
            </Form.Item>
            
            <Divider orientation="left" plain>Boolean Attributes</Divider>
            <Form.Item label="Disabled" style={sharedStyles.formItem}>
              <Switch {...handleSwitchChange("disabled")} size="small" />
            </Form.Item>
            <Form.Item label="Required" style={sharedStyles.formItem}>
              <Switch {...handleSwitchChange("required")} size="small" />
            </Form.Item>
            <Form.Item label="Readonly" style={sharedStyles.formItem}>
              <Switch {...handleSwitchChange("readonly")} size="small" />
            </Form.Item>
            <Form.Item label="Multiple" style={sharedStyles.formItem}>
              <Switch {...handleSwitchChange("multiple")} size="small" />
            </Form.Item>
            <Form.Item label="Checked" style={sharedStyles.formItem}>
              <Switch {...handleSwitchChange("checked")} size="small" />
            </Form.Item>
            <Form.Item label="Selected" style={sharedStyles.formItem}>
              <Switch {...handleSwitchChange("selected")} size="small" />
            </Form.Item>
            <Form.Item label="Hidden" style={sharedStyles.formItem}>
              <Switch {...handleSwitchChange("hidden")} size="small" />
            </Form.Item>
            <Form.Item label="Content Editable" style={sharedStyles.formItem}>
              <Switch {...handleSwitchChange("contentEditable")} size="small" />
            </Form.Item>
            <Form.Item label="Draggable" style={sharedStyles.formItem}>
              <Switch {...handleSwitchChange("draggable")} size="small" />
            </Form.Item>
            <Form.Item label="Spell Check" style={sharedStyles.formItem}>
              <Switch {...handleSwitchChange("spellCheck")} size="small" />
            </Form.Item>
            <Form.Item label="Translate" style={sharedStyles.formItem}>
              <Switch {...handleSwitchChange("translate")} size="small" />
            </Form.Item>
            
            <Divider orientation="left" plain>Other Attributes</Divider>
            <Form.Item label="Tab Index" style={sharedStyles.formItem}>
              <InputNumber {...handleNumberChange("tabIndex")} size="small" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Access Key" style={sharedStyles.formItem}>
              <Input {...handleInputChange("accessKey")} placeholder="Single character" size="small" maxLength={1} />
            </Form.Item>
            <Form.Item label="Dir" style={sharedStyles.formItem}>
              <Select {...handleSelectChange("dir")} options={[
                { value: "auto", label: "Auto" },
                { value: "ltr", label: "Left to Right" },
                { value: "rtl", label: "Right to Left" }
              ]} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
            </Form.Item>
            <Form.Item label="Lang" style={sharedStyles.formItem}>
              <Input {...handleInputChange("lang")} placeholder="e.g. en, en-US, fr" size="small" />
            </Form.Item>
            
            <Divider orientation="left" plain>ARIA Attributes</Divider>
            <Form.Item label="Role" style={sharedStyles.formItem}>
              <Input {...handleInputChange("role")} placeholder="e.g. button, navigation" size="small" />
            </Form.Item>
            <Form.Item label="ARIA Label" style={sharedStyles.formItem}>
              <Input {...handleInputChange("ariaLabel")} placeholder="Accessibility label" size="small" />
            </Form.Item>
            <Form.Item label="ARIA Described By" style={sharedStyles.formItem}>
              <Input {...handleInputChange("ariaDescribedBy")} placeholder="ID of describing element" size="small" />
            </Form.Item>
            <Form.Item label="ARIA Labelled By" style={sharedStyles.formItem}>
              <Input {...handleInputChange("ariaLabelledBy")} placeholder="ID of labelling element" size="small" />
            </Form.Item>
          </div>
        )
      });
    }

    return items;
  }, [localStyle, shouldShow, handleInputChange, handleSelectChange, handleSliderChange, handleColorChange, handleButtonGroupChange, handleNumberChange, handleSwitchChange, sharedStyles, debouncedSync]);



// If no node is selected, show placeholder
  if (!selected) {
    return (
      <div
        style={{
          background: "#f5f5f5",
          borderRadius: 8,
          padding: "40px 20px",
          textAlign: "center",
          color: "#999",
          minWidth: 320,
          maxWidth: 450,
          border: "1px solid #eee",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <SettingOutlined style={{ fontSize: 48, marginBottom: 16 }} />
        <Typography.Text type="secondary">
          Select an element to edit its properties
        </Typography.Text>
      </div>
    );
  }

  return (
    <div
    style={{
      background: "#fff",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      borderRadius: 8,
      minWidth: 320,
      maxWidth: 450,
      fontSize: 13,
      border: "1px solid #eee",
      height: "89vh", // Change from "100%" to "100vh"
      maxHeight: "89vh", // Add max height constraint
      display: "flex",
      flexDirection: "column",
      overflow: "hidden" // Prevent overflow on the main container
    }}
  >
      {/* Header */}
      <div
        style={{
          fontWeight: 700,
          padding: "16px 20px 10px 20px",
          userSelect: "none",
          fontSize: 16,
          color: "#222",
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          background: "#f8fafd",
          borderBottom: "1px solid #f0f0f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Typography.Text strong>Selected:</Typography.Text>
          <Tag color="blue" style={{ margin: 0 }}>
            {selected.displayName || selected.name}
          </Tag>
        </div>
        {selected.isDeletable && (
          <Tooltip title="Delete" getPopupContainer={(triggerNode) => triggerNode.parentNode}>
            <Button 
              danger 
              icon={<DeleteOutlined />} 
              onClick={handleDelete} 
              size="small" 
            />
          </Tooltip>
        )}
      </div>

      <div
        style={{
        flex: 1,
        padding: "0",
        overflowY: "auto",
        minHeight: 0,
        maxHeight: "calc(100vh - 60px)" // Subtract header height
      }}
      >
        <Collapse
          items={collapseItems}
          defaultActiveKey={[]}
          expandIcon={({ isActive }) => <CaretDownOutlined rotate={isActive ? 90 : 0} />}
          ghost
          accordion={false}
        />

        {selected.isDeletable && (
          <div style={{ padding: "0 20px 20px 20px" }}>
            <Button danger icon={<DeleteOutlined />} onClick={handleDelete} block style={{ marginTop: 16 }}>
              Delete Element
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}