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
  TableOutlined, UnderlineOutlined, UploadOutlined, VerticalAlignBottomOutlined,FormOutlined  ,
  VerticalAlignMiddleOutlined, VerticalAlignTopOutlined, LinkOutlined, ShoppingCartOutlined
} from "@ant-design/icons";
import { Button, Collapse, ColorPicker, Divider, Form, Input, Select, Slider, Space, Tooltip, Switch, InputNumber, Typography, Tag, Radio } from "antd";
import { useEditor } from "@craftjs/core";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";

const { TextArea } = Input;
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
      const node = state.nodes[currentNodeId];
      selected = {
        id: currentNodeId,
        name: node.data.name,
        displayName: node.data.displayName,
        props: node.data.props,
        isDeletable: node.data.name !== 'ROOT',
        supportedProps: node.data.custom?.styleMenu?.supportedProps || 
                        node.related?.craft?.styleMenu?.supportedProps ||
                        supportedProps
      };
    }

    return { selected };
  });
console.log(selected?.supportedProps)
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

  const shouldShow = useCallback((section) => {
  const propsToCheck = selected?.supportedProps || supportedProps;
  
  // If no restrictions, show everything
  if (propsToCheck.length === 0) return true;
  
  // Check if the section itself is supported
  if (propsToCheck.includes(section)) return true;

    // Special handling for borderRadius section
  if (section === 'borderRadius') {
    const radiusProps = ['borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius'];
    return radiusProps.some(prop => propsToCheck.includes(prop));
  }
  
  // Check individual property mappings to sections
  const propertyToSectionMap = {
    // Basic properties
    'src': 'basic',
    'alt': 'basic', 
    'href': 'basic',
    'placeholder': 'basic',
    'title': 'basic',
    'id': 'basic',
    'className': 'basic',
    'target': 'basic',
    'rel': 'basic',
    'type': 'basic',
    'value': 'basic',
    'name': 'basic',

    // Form properties
'formTitle': 'form',
'formDescription': 'form',
'submitButtonText': 'form',
'successMessage': 'form',
'databaseName': 'form',
'keyField': 'form',
'resetAfterSubmit': 'form',
'showSuccessMessage': 'form',
'redirectAfterSubmit': 'form',
'redirectUrl': 'form',
'linkStyles': 'form',
'submitButtonColor': 'form',
'submitButtonSize': 'form',
'submitButtonWidth': 'form',
    
    // Layout properties
    'display': 'layout',
    'position': 'layout',
    'width': 'layout',
    'height': 'layout',
    'minWidth': 'layout',
    'maxWidth': 'layout',
    'minHeight': 'layout',
    'maxHeight': 'layout',
    'zIndex': 'layout',
    'visibility': 'layout',
    'float': 'layout',
    'clear': 'layout',
    'boxSizing': 'layout',
    'top': 'layout',
    'right': 'layout',
    'bottom': 'layout',
    'left': 'layout',
    
    // Spacing properties
    'margin': 'spacing',
    'padding': 'spacing',
    'marginTop': 'spacing',
    'marginRight': 'spacing',
    'marginBottom': 'spacing',
    'marginLeft': 'spacing',
    'paddingTop': 'spacing',
    'paddingRight': 'spacing',
    'paddingBottom': 'spacing',
    'paddingLeft': 'spacing',
    
    // Typography properties
    'fontFamily': 'typography',
    'fontSize': 'typography',
    'fontWeight': 'typography',
    'fontStyle': 'typography',
    'lineHeight': 'typography',
    'letterSpacing': 'typography',
    'wordSpacing': 'typography',
    'textAlign': 'typography',
    'textDecoration': 'typography',
    'textTransform': 'typography',
    'textIndent': 'typography',
    'textShadow': 'typography',
    'verticalAlign': 'typography',
    'whiteSpace': 'typography',
    'wordBreak': 'typography',
    'wordWrap': 'typography',
    
    // Color properties
    'color': 'colors',
    'backgroundColor': 'colors',
    'backgroundImage': 'colors',
    'backgroundSize': 'colors',
    'backgroundRepeat': 'colors',
    'backgroundPosition': 'colors',
    'backgroundAttachment': 'colors',

    
    // Border properties
    'border': 'border',
    'borderWidth': 'border',
    'borderStyle': 'border',
    'borderColor': 'border',
    'borderRadius': 'border',
    'borderTopWidth': 'border',
    'borderRightWidth': 'border',
    'borderBottomWidth': 'border',
    'borderLeftWidth': 'border',
    'borderTopStyle': 'border',
    'borderRightStyle': 'border',
    'borderBottomStyle': 'border',
    'borderLeftStyle': 'border',
    'borderTopColor': 'border',
    'borderRightColor': 'border',
    'borderBottomColor': 'border',
    'borderLeftColor': 'border',
    'borderTopLeftRadius': 'border',
    'borderTopRightRadius': 'border',
    'borderBottomLeftRadius': 'border',
    'borderBottomRightRadius': 'border',
    
    // Flexbox properties
    'flexDirection': 'flexbox',
    'flexWrap': 'flexbox',
    'justifyContent': 'flexbox',
    'alignItems': 'flexbox',
    'alignContent': 'flexbox',
    'gap': 'flexbox',
    'rowGap': 'flexbox',
    'columnGap': 'flexbox',
    'flex': 'flexbox',
    'flexGrow': 'flexbox',
    'flexShrink': 'flexbox',
    'flexBasis': 'flexbox',
    'alignSelf': 'flexbox',
    'order': 'flexbox',
    
    // Effects properties
    'opacity': 'effects',
    'filter': 'effects',
    'backdropFilter': 'effects',
    'boxShadow': 'effects',
    'clipPath': 'effects',
    'mask': 'effects',
    'mixBlendMode': 'effects',
    'backgroundBlendMode': 'effects',
    
    // Overflow properties
    'overflow': 'overflow',
    'overflowX': 'overflow',
    'overflowY': 'overflow',
    'resize': 'overflow',
    'scrollBehavior': 'overflow',
    
    // Grid properties
    'gridTemplateColumns': 'grid',
    'gridTemplateRows': 'grid',
    'gridTemplateAreas': 'grid',
    'gridAutoFlow': 'grid',
    'gridAutoColumns': 'grid',
    'gridAutoRows': 'grid',
    'gridColumn': 'grid',
    'gridRow': 'grid',
    'gridColumnStart': 'grid',
    'gridColumnEnd': 'grid',
    'gridRowStart': 'grid',
    'gridRowEnd': 'grid',
    'gridArea': 'grid',
    'justifySelf': 'grid',
    'placeSelf': 'grid',
    'placeItems': 'grid',
    'placeContent': 'grid',
    
    // Interaction properties
    'cursor': 'interaction',
    'pointerEvents': 'interaction',
    'userSelect': 'interaction',
    'touchAction': 'interaction',
    
    // Object properties
    'objectFit': 'object',
    'objectPosition': 'object',
    
    // Transform properties
    'transform': 'transform',
    'transformOrigin': 'transform',
    'transition': 'transform',
    'animation': 'transform',
    
    // List properties
    'listStyleType': 'lists',
    'listStylePosition': 'lists',
    'listStyleImage': 'lists',
    
    // Table properties
    'tableLayout': 'tables',
    'captionSide': 'tables',
    'emptyCells': 'tables',
    'borderCollapse': 'tables',
    'borderSpacing': 'tables',
    
    // Content properties
    'content': 'content',
    'quotes': 'content',
    'counterReset': 'content',
    'counterIncrement': 'content',
    
    // Scroll properties
    'scrollSnapType': 'scroll',
    'scrollSnapAlign': 'scroll',
    
    // Attribute properties
    'disabled': 'attributes',
    'required': 'attributes',
    'readonly': 'attributes',
    'multiple': 'attributes',
    'checked': 'attributes',
    'selected': 'attributes',
    'hidden': 'attributes',
    'tabIndex': 'attributes',
    'accessKey': 'attributes',
    'contentEditable': 'attributes',
    'draggable': 'attributes',
    'spellCheck': 'attributes',
    'translate': 'attributes',
    'dir': 'attributes',
    'lang': 'attributes',
    'role': 'attributes',
    'ariaLabel': 'attributes',
    'ariaDescribedBy': 'attributes',
    'ariaLabelledBy': 'attributes',

    //shop
    'selectedProducts': 'shop',
'selectedCategories': 'shop',
'selectedCollections': 'shop',
'baseUrl': 'shop',
'linkType': 'shop',
'showDiscount': 'shop',
'showQuickAdd': 'shop',
'showWishlist': 'shop',
'carouselImages': 'shop',
'autoSlide': 'shop',
'slideInterval': 'shop',
  };
  
  // If it's an individual property, check if its parent section is supported
  if (propertyToSectionMap[section]) {
    return propsToCheck.includes(propertyToSectionMap[section]);
  }
  
  // Check if any individual property in this section is supported
  const sectionProperties = Object.entries(propertyToSectionMap)
    .filter(([prop, sect]) => sect === section)
    .map(([prop]) => prop);
  
  return sectionProperties.some(prop => propsToCheck.includes(prop));
}, [selected?.supportedProps, supportedProps]);


//  // Check if a specific property should be shown, considering fallbacks
const shouldShowProperty = useCallback((property, fallbackSection) => {
  const propsToCheck = selected?.supportedProps || supportedProps;
  
  // If no restrictions, show everything
  if (propsToCheck.length === 0) return true;
  
  // Check if the individual property is directly supported
  if (propsToCheck.includes(property)) return true;
  
  // Check if the fallback section is supported
  if (propsToCheck.includes(fallbackSection)) return true;
  
  return false;
}, [selected?.supportedProps, supportedProps]);


  // Shared styles
  const sharedStyles = useMemo(() => ({
    popup: { root: { zIndex: 10000 } },
    formItem: { marginBottom: 12 }
  }), []);

  // Complete collapse items with safety checks
  const collapseItems = useMemo(() => {
    const items = [];


// Shop Configuration (Custom Section)
if (shouldShow('selectedProducts') || shouldShow('selectedCategories') || shouldShow('selectedCollections')) {
  const shopItems = [];
  
  if (shouldShowProperty('selectedProducts', 'shop')) {
    shopItems.push(
      <Form.Item key="selectedProducts" label="Selected Products" style={sharedStyles.formItem}>
        <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
          Use the edit button on the component to configure products
        </Typography.Text>
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('baseUrl', 'shop')) {
    shopItems.push(
      <Form.Item key="baseUrl" label="Base URL" style={sharedStyles.formItem}>
        <Input {...handleInputChange("baseUrl")} placeholder="shop.com/shop" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('linkType', 'shop')) {
    shopItems.push(
      <Form.Item key="linkType" label="Link Type" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("linkType")} options={[
          { label: 'Product Name', value: 'name' },
          { label: 'Product ID', value: 'id' }
        ]} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('showDiscount', 'shop')) {
    shopItems.push(
      <Form.Item key="showDiscount" label="Show Discount Badges" style={sharedStyles.formItem}>
        <Switch {...handleSwitchChange("showDiscount")} size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('showQuickAdd', 'shop')) {
    shopItems.push(
      <Form.Item key="showQuickAdd" label="Show Quick Add Button" style={sharedStyles.formItem}>
        <Switch {...handleSwitchChange("showQuickAdd")} size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('showWishlist', 'shop')) {
    shopItems.push(
      <Form.Item key="showWishlist" label="Show Wishlist Button" style={sharedStyles.formItem}>
        <Switch {...handleSwitchChange("showWishlist")} size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('autoSlide', 'shop')) {
    shopItems.push(
      <Form.Item key="autoSlide" label="Auto-slide Images" style={sharedStyles.formItem}>
        <Switch {...handleSwitchChange("autoSlide")} size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('slideInterval', 'shop') && localStyle.autoSlide) {
    shopItems.push(
      <Form.Item key="slideInterval" label="Slide Interval (ms)" style={sharedStyles.formItem}>
        <Slider {...handleSliderChange("slideInterval")} min={1000} max={10000} step={500} 
          tooltip={{ formatter: (val) => `${val}ms` }} />
      </Form.Item>
    );
  }
  
  // Only add the section if it has items to show
  if (shopItems.length > 0) {
    items.push({
      key: 'shop',
      label: <span><ShoppingCartOutlined /> Shop Configuration</span>,
      children: (
        <div style={{ padding: '0 20px 16px 20px' }}>
          {shopItems}
        </div>
      )
    });
  }
}


// Form Configuration (Custom Section)
if (shouldShow('formTitle') || shouldShow('formDescription') || shouldShow('submitButtonText') || shouldShow('databaseName')) {
  const formItems = [];
  
  if (shouldShowProperty('formTitle', 'form')) {
    formItems.push(
      <Form.Item key="formTitle" label="Form Title" style={sharedStyles.formItem}>
        <Input {...handleInputChange("formTitle")} placeholder="Contact Form" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('formDescription', 'form')) {
    formItems.push(
      <Form.Item key="formDescription" label="Form Description" style={sharedStyles.formItem}>
        <TextArea {...handleInputChange("formDescription")} placeholder="Please fill out the form below" rows={2} size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('submitButtonText', 'form')) {
    formItems.push(
      <Form.Item key="submitButtonText" label="Submit Button Text" style={sharedStyles.formItem}>
        <Input {...handleInputChange("submitButtonText")} placeholder="Submit" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('successMessage', 'form')) {
    formItems.push(
      <Form.Item key="successMessage" label="Success Message" style={sharedStyles.formItem}>
        <Input {...handleInputChange("successMessage")} placeholder="Form submitted successfully!" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('databaseName', 'form')) {
    formItems.push(
      <Form.Item key="databaseName" label="Database Name" style={sharedStyles.formItem}>
        <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
          Use the edit button on the component to configure database settings
        </Typography.Text>
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('keyField', 'form')) {
    formItems.push(
      <Form.Item key="keyField" label="Key Field" style={sharedStyles.formItem}>
        <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
          Configure in component edit menu
        </Typography.Text>
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('resetAfterSubmit', 'form')) {
    formItems.push(
      <Form.Item key="resetAfterSubmit" label="Reset After Submit" style={sharedStyles.formItem}>
        <Switch {...handleSwitchChange("resetAfterSubmit")} size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('showSuccessMessage', 'form')) {
    formItems.push(
      <Form.Item key="showSuccessMessage" label="Show Success Message" style={sharedStyles.formItem}>
        <Switch {...handleSwitchChange("showSuccessMessage")} size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('redirectAfterSubmit', 'form')) {
    formItems.push(
      <Form.Item key="redirectAfterSubmit" label="Redirect After Submit" style={sharedStyles.formItem}>
        <Switch {...handleSwitchChange("redirectAfterSubmit")} size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('redirectUrl', 'form') && localStyle.redirectAfterSubmit) {
    formItems.push(
      <Form.Item key="redirectUrl" label="Redirect URL" style={sharedStyles.formItem}>
        <Input {...handleInputChange("redirectUrl")} placeholder="https://example.com/thank-you" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('linkStyles', 'form')) {
    formItems.push(
      <Form.Item key="linkStyles" label="Link Input Styles" style={sharedStyles.formItem}>
        <Switch {...handleSwitchChange("linkStyles")} size="small" />
      </Form.Item>
    );
  }
  
  // Submit Button Styling
  const hasSubmitButtonProps = shouldShowProperty('submitButtonColor', 'form') || shouldShowProperty('submitButtonSize', 'form') || shouldShowProperty('submitButtonWidth', 'form');
  
  if (hasSubmitButtonProps) {
    formItems.push(
      <Divider key="submit-button-divider" orientation="left" plain>Submit Button</Divider>
    );
  }
  
  if (shouldShowProperty('submitButtonColor', 'form')) {
    formItems.push(
      <Form.Item key="submitButtonColor" label="Button Color" style={sharedStyles.formItem}>
        <ColorPicker {...handleColorChange("submitButtonColor")} size="small" showText getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('submitButtonSize', 'form')) {
    formItems.push(
      <Form.Item key="submitButtonSize" label="Button Size" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("submitButtonSize")} options={[
          { label: 'Small', value: 'small' },
          { label: 'Medium', value: 'middle' },
          { label: 'Large', value: 'large' }
        ]} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('submitButtonWidth', 'form')) {
    formItems.push(
      <Form.Item key="submitButtonWidth" label="Button Width" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("submitButtonWidth")} options={[
          { label: 'Auto', value: 'auto' },
          { label: '50%', value: '50%' },
          { label: 'Full Width', value: '100%' }
        ]} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  // Only add the section if it has items to show
  if (formItems.length > 0) {
    items.push({
      key: 'form',
      label: <span><FormOutlined /> Form Configuration</span>,
      children: (
        <div style={{ padding: '0 20px 16px 20px' }}>
          {formItems}
        </div>
      )
    });
  }
}


    // Basic Properties
    if (shouldShow('basic')) {
  const basicItems = [];
  
  if (shouldShowProperty('src', 'basic')) {
    basicItems.push(
      <Form.Item key="src" label="Image Source" style={sharedStyles.formItem}>
        <Input {...handleInputChange("src")} placeholder="https://example.com/image.jpg" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('alt', 'basic')) {
    basicItems.push(
      <Form.Item key="alt" label="Alt Text" style={sharedStyles.formItem}>
        <Input {...handleInputChange("alt")} placeholder="Image description" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('href', 'basic')) {
    basicItems.push(
      <Form.Item key="href" label="Link URL" style={sharedStyles.formItem}>
        <Input {...handleInputChange("href")} placeholder="https://example.com" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('placeholder', 'basic')) {
    basicItems.push(
      <Form.Item key="placeholder" label="Placeholder" style={sharedStyles.formItem}>
        <Input {...handleInputChange("placeholder")} placeholder="Enter placeholder text" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('title', 'basic')) {
    basicItems.push(
      <Form.Item key="title" label="Title" style={sharedStyles.formItem}>
        <Input {...handleInputChange("title")} placeholder="Tooltip text" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('id', 'basic')) {
    basicItems.push(
      <Form.Item key="id" label="ID" style={sharedStyles.formItem}>
        <Input {...handleInputChange("id")} placeholder="unique-id" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('className', 'basic')) {
    basicItems.push(
      <Form.Item key="className" label="CSS Classes" style={sharedStyles.formItem}>
        <Input {...handleInputChange("className")} placeholder="class1 class2" size="small" />
      </Form.Item>
    );
  }
  
  // Only add the section if it has items to show
  if (basicItems.length > 0) {
    items.push({
      key: 'basic',
      label: <span><SettingOutlined /> Basic Properties</span>,
      children: (
        <div style={{ padding: '0 20px 16px 20px' }}>
          {basicItems}
        </div>
      )
    });
  }
}






    // Layout & Position
    // Replace the layout section:

// Layout & Position
if (shouldShow('layout')) {
  const layoutItems = [];
  
  if (shouldShowProperty('display', 'layout')) {
    layoutItems.push(
      <Form.Item key="display" label="Display" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("display")} options={displays} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('position', 'layout')) {
    layoutItems.push(
      <Form.Item key="position" label="Position" style={sharedStyles.formItem}>
        <IconButtonGroup options={positions} {...handleButtonGroupChange("position")} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('visibility', 'layout')) {
    layoutItems.push(
      <Form.Item key="visibility" label="Visibility" style={sharedStyles.formItem}>
        <IconButtonGroup options={visibilities} {...handleButtonGroupChange("visibility")} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('float', 'layout')) {
    layoutItems.push(
      <Form.Item key="float" label="Float" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("float")} options={floats} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('clear', 'layout')) {
    layoutItems.push(
      <Form.Item key="clear" label="Clear" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("clear")} options={clears} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  // Add dimensions divider if any dimension property exists
  const hasDimensions = shouldShowProperty('width', 'layout') || shouldShowProperty('height', 'layout') || 
                       shouldShowProperty('minWidth', 'layout') || shouldShowProperty('maxWidth', 'layout') ||
                       shouldShowProperty('minHeight', 'layout') || shouldShowProperty('maxHeight', 'layout') ||
                       shouldShowProperty('boxSizing', 'layout');
  
  if (hasDimensions) {
    layoutItems.push(
      <Divider key="dimensions-divider" orientation="left" plain>Dimensions</Divider>
    );
  }
  
  if (shouldShowProperty('width', 'layout')) {
    layoutItems.push(
      <Form.Item key="width" label={<span><ColumnWidthOutlined /> Width</span>} style={sharedStyles.formItem}>
        <Input {...handleInputChange("width")} placeholder="e.g. 100px, 50%, auto" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('height', 'layout')) {
    layoutItems.push(
      <Form.Item key="height" label={<span><ColumnHeightOutlined /> Height</span>} style={sharedStyles.formItem}>
        <Input {...handleInputChange("height")} placeholder="e.g. 100px, 50%, auto" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('minWidth', 'layout')) {
    layoutItems.push(
      <Form.Item key="minWidth" label="Min Width" style={sharedStyles.formItem}>
        <Input {...handleInputChange("minWidth")} placeholder="e.g. 100px" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('maxWidth', 'layout')) {
    layoutItems.push(
      <Form.Item key="maxWidth" label="Max Width" style={sharedStyles.formItem}>
        <Input {...handleInputChange("maxWidth")} placeholder="e.g. 500px" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('minHeight', 'layout')) {
    layoutItems.push(
      <Form.Item key="minHeight" label="Min Height" style={sharedStyles.formItem}>
        <Input {...handleInputChange("minHeight")} placeholder="e.g. 100px" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('maxHeight', 'layout')) {
    layoutItems.push(
      <Form.Item key="maxHeight" label="Max Height" style={sharedStyles.formItem}>
        <Input {...handleInputChange("maxHeight")} placeholder="e.g. 500px" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('boxSizing', 'layout')) {
    layoutItems.push(
      <Form.Item key="boxSizing" label="Box Sizing" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("boxSizing")} options={boxSizings} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  // Add position values divider if any position property exists
  const hasPositionValues = shouldShowProperty('top', 'layout') || shouldShowProperty('right', 'layout') || 
                           shouldShowProperty('bottom', 'layout') || shouldShowProperty('left', 'layout') ||
                           shouldShowProperty('zIndex', 'layout');
  
  if (hasPositionValues) {
    layoutItems.push(
      <Divider key="position-divider" orientation="left" plain>Position Values</Divider>
    );
  }
  
  if (shouldShowProperty('top', 'layout')) {
    layoutItems.push(
      <Form.Item key="top" label="Top" style={sharedStyles.formItem}>
        <Input {...handleInputChange("top")} placeholder="e.g. 10px" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('right', 'layout')) {
    layoutItems.push(
      <Form.Item key="right" label="Right" style={sharedStyles.formItem}>
        <Input {...handleInputChange("right")} placeholder="e.g. 10px" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('bottom', 'layout')) {
    layoutItems.push(
      <Form.Item key="bottom" label="Bottom" style={sharedStyles.formItem}>
        <Input {...handleInputChange("bottom")} placeholder="e.g. 10px" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('left', 'layout')) {
    layoutItems.push(
      <Form.Item key="left" label="Left" style={sharedStyles.formItem}>
        <Input {...handleInputChange("left")} placeholder="e.g. 10px" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('zIndex', 'layout')) {
    layoutItems.push(
      <Form.Item key="zIndex" label={<span><VerticalAlignMiddleOutlined /> Z-index</span>} style={sharedStyles.formItem}>
        <Slider {...handleSliderChange("zIndex")} min={-100} max={100} />
      </Form.Item>
    );
  }
  
  // Only add the section if it has items to show
  if (layoutItems.length > 0) {
    items.push({
      key: 'layout',
      label: <span><AppstoreOutlined /> Layout & Position</span>,
      children: (
        <div style={{ padding: '0 20px 16px 20px' }}>
          {layoutItems}
        </div>
      )
    });
  }
}

    // Overflow & Scroll
    // Replace the overflow section:

// Overflow & Scroll
if (shouldShow('overflow')) {
  const overflowItems = [];
  
  if (shouldShowProperty('overflow', 'overflow')) {
    overflowItems.push(
      <Form.Item key="overflow" label="Overflow" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("overflow")} options={overflows} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('overflowX', 'overflow')) {
    overflowItems.push(
      <Form.Item key="overflowX" label="Overflow X" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("overflowX")} options={overflows} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('overflowY', 'overflow')) {
    overflowItems.push(
      <Form.Item key="overflowY" label="Overflow Y" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("overflowY")} options={overflows} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('resize', 'overflow')) {
    overflowItems.push(
      <Form.Item key="resize" label="Resize" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("resize")} options={resizes} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('scrollBehavior', 'overflow')) {
    overflowItems.push(
      <Form.Item key="scrollBehavior" label="Scroll Behavior" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("scrollBehavior")} options={[
          { value: "auto", label: "Auto" },
          { value: "smooth", label: "Smooth" }
        ]} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  // Only add the section if it has items to show
  if (overflowItems.length > 0) {
    items.push({
      key: 'overflow',
      label: <span><EyeOutlined /> Overflow & Scroll</span>,
      children: (
        <div style={{ padding: '0 20px 16px 20px' }}>
          {overflowItems}
        </div>
      )
    });
  }
}


// Typography

if (shouldShow('typography')) {
  const typographyItems = [];

  if (shouldShowProperty('fontFamily', 'typography')) {
    typographyItems.push(
      <Form.Item key="fontFamily" label="Font Family" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("fontFamily")} options={fontFamilies.map(font => ({ value: font, label: font }))} size="small" showSearch styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('fontSize', 'typography')) {
    typographyItems.push(
      <Form.Item key="fontSize" label="Font Size" style={sharedStyles.formItem}>
        <Slider {...handleSliderChange("fontSize")} min={6} max={120} tooltip={{ formatter: (val) => `${val}px` }} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('fontWeight', 'typography')) {
    typographyItems.push(
      <Form.Item key="fontWeight" label="Font Weight" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("fontWeight")} options={fontWeights} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('fontStyle', 'typography')) {
    typographyItems.push(
      <Form.Item key="fontStyle" label="Font Style" style={sharedStyles.formItem}>
        <IconButtonGroup options={fontStyles} {...handleButtonGroupChange("fontStyle")} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('lineHeight', 'typography')) {
    typographyItems.push(
      <Form.Item key="lineHeight" label="Line Height" style={sharedStyles.formItem}>
        <Slider {...handleSliderChange("lineHeight")} min={0.5} max={4} step={0.1} tooltip={{ formatter: (val) => `${val}` }} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('letterSpacing', 'typography')) {
    typographyItems.push(
      <Form.Item key="letterSpacing" label="Letter Spacing" style={sharedStyles.formItem}>
        <Slider {...handleSliderChange("letterSpacing")} min={-5} max={20} step={0.1} tooltip={{ formatter: (val) => `${val}px` }} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('wordSpacing', 'typography')) {
    typographyItems.push(
      <Form.Item key="wordSpacing" label="Word Spacing" style={sharedStyles.formItem}>
        <Slider {...handleSliderChange("wordSpacing")} min={-10} max={50} step={0.5} tooltip={{ formatter: (val) => `${val}px` }} />
      </Form.Item>
    );
  }
  
  // Text Alignment section
  const hasTextAlignment = shouldShowProperty('textAlign', 'typography') || shouldShowProperty('verticalAlign', 'typography') || shouldShowProperty('textIndent', 'typography');
  
  if (hasTextAlignment) {
    typographyItems.push(
      <Divider key="text-alignment-divider" orientation="left" plain>Text Alignment</Divider>
    );
  }
  
  if (shouldShowProperty('textAlign', 'typography')) {
    typographyItems.push(
      <Form.Item key="textAlign" label="Text Align" style={sharedStyles.formItem}>
        <IconButtonGroup options={textAligns} {...handleButtonGroupChange("textAlign")} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('verticalAlign', 'typography')) {
    typographyItems.push(
      <Form.Item key="verticalAlign" label="Vertical Align" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("verticalAlign")} options={verticalAligns} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('textIndent', 'typography')) {
    typographyItems.push(
      <Form.Item key="textIndent" label="Text Indent" style={sharedStyles.formItem}>
        <Slider {...handleSliderChange("textIndent")} min={-100} max={100} tooltip={{ formatter: (val) => `${val}px` }} />
      </Form.Item>
    );
  }
  
  // Text Decoration section
  const hasTextDecoration = shouldShowProperty('textDecoration', 'typography') || shouldShowProperty('textTransform', 'typography') || 
                           shouldShowProperty('whiteSpace', 'typography') || shouldShowProperty('wordBreak', 'typography') || 
                           shouldShowProperty('textShadow', 'typography');
  
  if (hasTextDecoration) {
    typographyItems.push(
      <Divider key="text-decoration-divider" orientation="left" plain>Text Decoration</Divider>
    );
  }
  
  if (shouldShowProperty('textDecoration', 'typography')) {
    typographyItems.push(
      <Form.Item key="textDecoration" label="Text Decoration" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("textDecoration")} options={textDecorations} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('textTransform', 'typography')) {
    typographyItems.push(
      <Form.Item key="textTransform" label="Text Transform" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("textTransform")} options={textTransforms} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('whiteSpace', 'typography')) {
    typographyItems.push(
      <Form.Item key="whiteSpace" label="White Space" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("whiteSpace")} options={whiteSpaces} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('wordBreak', 'typography')) {
    typographyItems.push(
      <Form.Item key="wordBreak" label="Word Break" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("wordBreak")} options={wordBreaks} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('textShadow', 'typography')) {
    typographyItems.push(
      <Form.Item key="textShadow" label="Text Shadow" style={sharedStyles.formItem}>
        <Input {...handleInputChange("textShadow")} placeholder="e.g. 2px 2px 4px rgba(0,0,0,0.5)" size="small" />
      </Form.Item>
    );
  }
  
  // Only add the section if it has items to show
  if (typographyItems.length > 0) {
    items.push({
      key: 'typography',
      label: <span><FontColorsOutlined /> Typography</span>,
      children: (
        <div style={{ padding: '0 20px 16px 20px' }}>
          {typographyItems}
        </div>
      )
    });
  }
}

// Colors & Backgrounds
if (shouldShow('colors')) {
  const colorsItems = [];
  
  if (shouldShowProperty('color', 'colors')) {
    colorsItems.push(
      <Form.Item key="color" label="Text Color" style={sharedStyles.formItem}>
        <ColorPicker {...handleColorChange("color")} size="small" showText getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('backgroundColor', 'colors')) {
    colorsItems.push(
      <Form.Item key="backgroundColor" label="Background Color" style={sharedStyles.formItem}>
        <ColorPicker {...handleColorChange("backgroundColor")} size="small" showText allowClear getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  // Background Image section
  const hasBackgroundImage = shouldShowProperty('backgroundImage', 'colors') || shouldShowProperty('backgroundSize', 'colors') || 
                             shouldShowProperty('backgroundRepeat', 'colors') || shouldShowProperty('backgroundPosition', 'colors') || 
                             shouldShowProperty('backgroundAttachment', 'colors');
  
  if (hasBackgroundImage) {
    colorsItems.push(
      <Divider key="background-image-divider" orientation="left" plain>Background Image</Divider>
    );
  }
  
  if (shouldShowProperty('backgroundImage', 'colors')) {
    colorsItems.push(
      <Form.Item key="backgroundImage" label="Background Image" style={sharedStyles.formItem}>
        <Input {...handleInputChange("backgroundImage")} placeholder="url(image.jpg) or linear-gradient(...)" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('backgroundSize', 'colors')) {
    colorsItems.push(
      <Form.Item key="backgroundSize" label="Background Size" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("backgroundSize")} options={backgroundSizes} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('backgroundRepeat', 'colors')) {
    colorsItems.push(
      <Form.Item key="backgroundRepeat" label="Background Repeat" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("backgroundRepeat")} options={backgroundRepeats} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('backgroundPosition', 'colors')) {
    colorsItems.push(
      <Form.Item key="backgroundPosition" label="Background Position" style={sharedStyles.formItem}>
        <Input {...handleInputChange("backgroundPosition")} placeholder="e.g. center, 50% 50%" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('backgroundAttachment', 'colors')) {
    colorsItems.push(
      <Form.Item key="backgroundAttachment" label="Background Attachment" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("backgroundAttachment")} options={backgroundAttachments} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  // Only add the section if it has items to show
  if (colorsItems.length > 0) {
    items.push({
      key: 'colors',
      label: <span><BgColorsOutlined /> Colors & Backgrounds</span>,
      children: (
        <div style={{ padding: '0 20px 16px 20px' }}>
          {colorsItems}
        </div>
      )
    });
  }
}

    // Spacing (Margin & Padding)
    if (shouldShow('spacing')) {
  const spacingItems = [];
  
  // Margin section
  const hasMargin = shouldShowProperty('margin', 'spacing') || shouldShowProperty('marginTop', 'spacing') || 
                   shouldShowProperty('marginRight', 'spacing') || shouldShowProperty('marginBottom', 'spacing') || 
                   shouldShowProperty('marginLeft', 'spacing');
  
  if (hasMargin) {
    spacingItems.push(
      <Divider key="margin-divider" orientation="left" plain>Margin</Divider>
    );
    
    spacingItems.push(
      <Space key="margin-modes">
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
    );
    
    spacingItems.push(
      <Form.Item key="margin-input" style={sharedStyles.formItem}>
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
    );
  }
  
  // Padding section
  const hasPadding = shouldShowProperty('padding', 'spacing') || shouldShowProperty('paddingTop', 'spacing') || 
                    shouldShowProperty('paddingRight', 'spacing') || shouldShowProperty('paddingBottom', 'spacing') || 
                    shouldShowProperty('paddingLeft', 'spacing');
  
  if (hasPadding) {
    spacingItems.push(
      <Divider key="padding-divider" orientation="left" plain>Padding</Divider>
    );
    
    spacingItems.push(
      <Space key="padding-modes">
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
    );
    
    spacingItems.push(
      <Form.Item key="padding-input" style={sharedStyles.formItem}>
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
    );
  }
  
  // Only add the section if it has items to show
  if (spacingItems.length > 0) {
    items.push({
      key: 'spacing',
      label: <span><BorderOuterOutlined /> Spacing</span>,
      children: (
        <div style={{ padding: '0 20px 16px 20px' }}>
          {spacingItems}
        </div>
      )
    });
  }
}

    // Border & Radius
    if (shouldShow('border')) {
  const borderItems = [];
  
  // Main border controls
  const hasMainBorder = shouldShowProperty('borderWidth', 'border') || shouldShowProperty('borderStyle', 'border') || 
                       shouldShowProperty('borderColor', 'border');
  
  if (hasMainBorder) {
    borderItems.push(
      <Divider key="border-divider" orientation="left" plain>Border</Divider>
    );
    
    borderItems.push(
      <Space key="border-modes">
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
    );
    
    if (shouldShowProperty('borderWidth', 'border')) {
      borderItems.push(
        <Form.Item key="borderWidth" label="Border Width" style={sharedStyles.formItem}>
          <Slider {...handleSliderChange("borderWidth")} min={0} max={20} tooltip={{ formatter: (val) => `${val}px` }} />
        </Form.Item>
      );
    }
    
    if (shouldShowProperty('borderStyle', 'border')) {
      borderItems.push(
        <Form.Item key="borderStyle" label="Border Style" style={sharedStyles.formItem}>
          <Select {...handleSelectChange("borderStyle")} options={borderStyles} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
        </Form.Item>
      );
    }
    
    if (shouldShowProperty('borderColor', 'border')) {
      borderItems.push(
        <Form.Item key="borderColor" label="Border Color" style={sharedStyles.formItem}>
          <ColorPicker {...handleColorChange("borderColor")} size="small" showText getPopupContainer={(trigger) => trigger.parentNode} />
        </Form.Item>
      );
    }
  }
  
  // Individual sides
  const hasIndividualSides = shouldShowProperty('borderTopWidth', 'border') || shouldShowProperty('borderRightWidth', 'border') || 
                            shouldShowProperty('borderBottomWidth', 'border') || shouldShowProperty('borderLeftWidth', 'border') ||
                            shouldShowProperty('borderTopStyle', 'border') || shouldShowProperty('borderRightStyle', 'border') ||
                            shouldShowProperty('borderBottomStyle', 'border') || shouldShowProperty('borderLeftStyle', 'border') ||
                            shouldShowProperty('borderTopColor', 'border') || shouldShowProperty('borderRightColor', 'border') ||
                            shouldShowProperty('borderBottomColor', 'border') || shouldShowProperty('borderLeftColor', 'border');
  
  if (hasIndividualSides) {
    // Individual widths
    const hasIndividualWidths = shouldShowProperty('borderTopWidth', 'border') || shouldShowProperty('borderRightWidth', 'border') || 
                               shouldShowProperty('borderBottomWidth', 'border') || shouldShowProperty('borderLeftWidth', 'border');
    
    if (hasIndividualWidths) {
      borderItems.push(
        <Divider key="individual-sides-divider" orientation="left" plain>Individual Sides</Divider>
      );
      
      if (shouldShowProperty('borderTopWidth', 'border')) {
        borderItems.push(
          <Form.Item key="borderTopWidth" label="Top Border Width" style={sharedStyles.formItem}>
            <Slider {...handleSliderChange("borderTopWidth")} min={0} max={20} tooltip={{ formatter: (val) => `${val}px` }} />
          </Form.Item>
        );
      }
      
      if (shouldShowProperty('borderRightWidth', 'border')) {
        borderItems.push(
          <Form.Item key="borderRightWidth" label="Right Border Width" style={sharedStyles.formItem}>
            <Slider {...handleSliderChange("borderRightWidth")} min={0} max={20} tooltip={{ formatter: (val) => `${val}px` }} />
          </Form.Item>
        );
      }
      
      if (shouldShowProperty('borderBottomWidth', 'border')) {
        borderItems.push(
          <Form.Item key="borderBottomWidth" label="Bottom Border Width" style={sharedStyles.formItem}>
            <Slider {...handleSliderChange("borderBottomWidth")} min={0} max={20} tooltip={{ formatter: (val) => `${val}px` }} />
          </Form.Item>
        );
      }
      
      if (shouldShowProperty('borderLeftWidth', 'border')) {
        borderItems.push(
          <Form.Item key="borderLeftWidth" label="Left Border Width" style={sharedStyles.formItem}>
            <Slider {...handleSliderChange("borderLeftWidth")} min={0} max={20} tooltip={{ formatter: (val) => `${val}px` }} />
          </Form.Item>
        );
      }
    }
    
    // Individual styles
    const hasIndividualStyles = shouldShowProperty('borderTopStyle', 'border') || shouldShowProperty('borderRightStyle', 'border') ||
                               shouldShowProperty('borderBottomStyle', 'border') || shouldShowProperty('borderLeftStyle', 'border');
    
    if (hasIndividualStyles) {
      borderItems.push(
        <Divider key="individual-styles-divider" orientation="left" plain>Individual Border Styles</Divider>
      );
      
      if (shouldShowProperty('borderTopStyle', 'border')) {
        borderItems.push(
          <Form.Item key="borderTopStyle" label="Top Border Style" style={sharedStyles.formItem}>
            <Select {...handleSelectChange("borderTopStyle")} options={borderStyles} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
          </Form.Item>
        );
      }
      
      if (shouldShowProperty('borderRightStyle', 'border')) {
        borderItems.push(
          <Form.Item key="borderRightStyle" label="Right Border Style" style={sharedStyles.formItem}>
            <Select {...handleSelectChange("borderRightStyle")} options={borderStyles} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
          </Form.Item>
        );
      }
      
      if (shouldShowProperty('borderBottomStyle', 'border')) {
        borderItems.push(
          <Form.Item key="borderBottomStyle" label="Bottom Border Style" style={sharedStyles.formItem}>
            <Select {...handleSelectChange("borderBottomStyle")} options={borderStyles} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
          </Form.Item>
        );
      }
      
      if (shouldShowProperty('borderLeftStyle', 'border')) {
        borderItems.push(
          <Form.Item key="borderLeftStyle" label="Left Border Style" style={sharedStyles.formItem}>
            <Select {...handleSelectChange("borderLeftStyle")} options={borderStyles} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
          </Form.Item>
        );
      }
    }
    
    // Individual colors
    const hasIndividualColors = shouldShowProperty('borderTopColor', 'border') || shouldShowProperty('borderRightColor', 'border') ||
                               shouldShowProperty('borderBottomColor', 'border') || shouldShowProperty('borderLeftColor', 'border');
    
    if (hasIndividualColors) {
      borderItems.push(
        <Divider key="individual-colors-divider" orientation="left" plain>Individual Border Colors</Divider>
      );
      
      if (shouldShowProperty('borderTopColor', 'border')) {
        borderItems.push(
          <Form.Item key="borderTopColor" label="Top Border Color" style={sharedStyles.formItem}>
            <ColorPicker {...handleColorChange("borderTopColor")} size="small" showText getPopupContainer={(trigger) => trigger.parentNode} />
          </Form.Item>
        );
      }
      
      if (shouldShowProperty('borderRightColor', 'border')) {
        borderItems.push(
          <Form.Item key="borderRightColor" label="Right Border Color" style={sharedStyles.formItem}>
            <ColorPicker {...handleColorChange("borderRightColor")} size="small" showText getPopupContainer={(trigger) => trigger.parentNode} />
          </Form.Item>
        );
      }
      
      if (shouldShowProperty('borderBottomColor', 'border')) {
        borderItems.push(
          <Form.Item key="borderBottomColor" label="Bottom Border Color" style={sharedStyles.formItem}>
            <ColorPicker {...handleColorChange("borderBottomColor")} size="small" showText getPopupContainer={(trigger) => trigger.parentNode} />
          </Form.Item>
        );
      }
      
      if (shouldShowProperty('borderLeftColor', 'border')) {
        borderItems.push(
          <Form.Item key="borderLeftColor" label="Left Border Color" style={sharedStyles.formItem}>
            <ColorPicker {...handleColorChange("borderLeftColor")} size="small" showText getPopupContainer={(trigger) => trigger.parentNode} />
          </Form.Item>
        );
      }
    }
  }
  
// Border Radius Section (separate from border)
if (shouldShow('borderRadius')) {
  const borderRadiusItems = [];
  
  // Radius mode toggle
  borderRadiusItems.push(
    <Form.Item key="radiusMode" label="Radius Mode" style={sharedStyles.formItem}>
      <Radio.Group 
        value={localStyle.radiusMode || "all"} 
        onChange={(e) => setLocalStyle(prev => ({ ...prev, radiusMode: e.target.value }))}
        size="small"
      >
        <Radio.Button value="all">All</Radio.Button>
        <Radio.Button value="individual">Individual</Radio.Button>
      </Radio.Group>
    </Form.Item>
  );

  if (localStyle.radiusMode === "all" && shouldShowProperty('borderRadius', 'borderRadius')) {
    borderRadiusItems.push(
      <Form.Item key="borderRadius" label="Border Radius" style={sharedStyles.formItem}>
        <Slider {...handleSliderChange("borderRadius")} min={0} max={100} tooltip={{ formatter: (val) => `${val}px` }} />
      </Form.Item>
    );
  } else if (localStyle.radiusMode !== "all") {
    if (shouldShowProperty('borderTopLeftRadius', 'borderRadius')) {
      borderRadiusItems.push(
        <Form.Item key="borderTopLeftRadius" label="Top Left" style={sharedStyles.formItem}>
          <Slider {...handleSliderChange("borderTopLeftRadius")} min={0} max={100} tooltip={{ formatter: (val) => `${val}px` }} />
        </Form.Item>
      );
    }
    if (shouldShowProperty('borderTopRightRadius', 'borderRadius')) {
      borderRadiusItems.push(
        <Form.Item key="borderTopRightRadius" label="Top Right" style={sharedStyles.formItem}>
          <Slider {...handleSliderChange("borderTopRightRadius")} min={0} max={100} tooltip={{ formatter: (val) => `${val}px` }} />
        </Form.Item>
      );
    }
    if (shouldShowProperty('borderBottomLeftRadius', 'borderRadius')) {
      borderRadiusItems.push(
        <Form.Item key="borderBottomLeftRadius" label="Bottom Left" style={sharedStyles.formItem}>
          <Slider {...handleSliderChange("borderBottomLeftRadius")} min={0} max={100} tooltip={{ formatter: (val) => `${val}px` }} />
        </Form.Item>
      );
    }
    if (shouldShowProperty('borderBottomRightRadius', 'borderRadius')) {
      borderRadiusItems.push(
        <Form.Item key="borderBottomRightRadius" label="Bottom Right" style={sharedStyles.formItem}>
          <Slider {...handleSliderChange("borderBottomRightRadius")} min={0} max={100} tooltip={{ formatter: (val) => `${val}px` }} />
        </Form.Item>
      );
    }
  }

  if (borderRadiusItems.length > 0) {
    items.push({
      key: 'borderRadius',
      label: <span><BorderOutlined /> Border Radius</span>,
      children: (
        <div style={{ padding: '0 20px 16px 20px' }}>
          {borderRadiusItems}
        </div>
      )
    });
  }
}
  // Table borders
  const hasTableBorders = shouldShowProperty('borderCollapse', 'border') || shouldShowProperty('borderSpacing', 'border');
  
  if (hasTableBorders) {
    borderItems.push(
      <Divider key="table-borders-divider" orientation="left" plain>Table Borders</Divider>
    );
    
    if (shouldShowProperty('borderCollapse', 'border')) {
      borderItems.push(
        <Form.Item key="borderCollapse" label="Border Collapse" style={sharedStyles.formItem}>
          <Select {...handleSelectChange("borderCollapse")} options={borderCollapses} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
        </Form.Item>
      );
    }
    
    if (shouldShowProperty('borderSpacing', 'border')) {
      borderItems.push(
        <Form.Item key="borderSpacing" label="Border Spacing" style={sharedStyles.formItem}>
          <Input {...handleInputChange("borderSpacing")} placeholder="e.g. 2px" size="small" />
        </Form.Item>
      );
    }
  }
  
  // Only add the section if it has items to show
  if (borderItems.length > 0) {
    items.push({
      key: 'border',
      label: <span><BorderOutlined /> Border</span>,
      children: (
        <div style={{ padding: '0 20px 16px 20px' }}>
          {borderItems}
        </div>
      )
    });
  }
}

// Flexbox
if (shouldShow('flexbox')) {
  const flexboxItems = [];
  
  // Main flex container properties
  const hasContainerProps = shouldShowProperty('flexDirection', 'flexbox') || shouldShowProperty('flexWrap', 'flexbox') ||
                            shouldShowProperty('justifyContent', 'flexbox') || shouldShowProperty('alignItems', 'flexbox') ||
                            shouldShowProperty('alignContent', 'flexbox');
  
  if (hasContainerProps) {
    flexboxItems.push(
      <Divider key="flex-container-divider" orientation="left" plain>Flex Container</Divider>
    );
  }
  
  if (shouldShowProperty('flexDirection', 'flexbox')) {
    flexboxItems.push(
      <Form.Item key="flexDirection" label="Flex Direction" style={sharedStyles.formItem}>
        <IconButtonGroup options={flexDirections} {...handleButtonGroupChange("flexDirection")} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('flexWrap', 'flexbox')) {
    flexboxItems.push(
      <Form.Item key="flexWrap" label="Flex Wrap" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("flexWrap")} options={flexWraps} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('justifyContent', 'flexbox')) {
    flexboxItems.push(
      <Form.Item key="justifyContent" label="Justify Content" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("justifyContent")} options={justifyContents} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('alignItems', 'flexbox')) {
    flexboxItems.push(
      <Form.Item key="alignItems" label="Align Items" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("alignItems")} options={alignItems} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('alignContent', 'flexbox')) {
    flexboxItems.push(
      <Form.Item key="alignContent" label="Align Content" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("alignContent")} options={alignContents} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  // Flex items properties
  const hasItemProps = shouldShowProperty('flex', 'flexbox') || shouldShowProperty('flexGrow', 'flexbox') ||
                       shouldShowProperty('flexShrink', 'flexbox') || shouldShowProperty('flexBasis', 'flexbox') ||
                       shouldShowProperty('alignSelf', 'flexbox') || shouldShowProperty('order', 'flexbox');
  
  if (hasItemProps) {
    flexboxItems.push(
      <Divider key="flex-items-divider" orientation="left" plain>Flex Items</Divider>
    );
  }
  
  if (shouldShowProperty('flex', 'flexbox')) {
    flexboxItems.push(
      <Form.Item key="flex" label="Flex" style={sharedStyles.formItem}>
        <Input {...handleInputChange("flex")} placeholder="e.g. 1, 1 1 auto" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('flexGrow', 'flexbox')) {
    flexboxItems.push(
      <Form.Item key="flexGrow" label="Flex Grow" style={sharedStyles.formItem}>
        <Slider {...handleSliderChange("flexGrow")} min={0} max={10} tooltip={{ formatter: (val) => val }} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('flexShrink', 'flexbox')) {
    flexboxItems.push(
      <Form.Item key="flexShrink" label="Flex Shrink" style={sharedStyles.formItem}>
        <Slider {...handleSliderChange("flexShrink")} min={0} max={10} tooltip={{ formatter: (val) => val }} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('flexBasis', 'flexbox')) {
    flexboxItems.push(
      <Form.Item key="flexBasis" label="Flex Basis" style={sharedStyles.formItem}>
        <Input {...handleInputChange("flexBasis")} placeholder="e.g. auto, 200px, 50%" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('alignSelf', 'flexbox')) {
    flexboxItems.push(
      <Form.Item key="alignSelf" label="Align Self" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("alignSelf")} options={alignSelfs} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('order', 'flexbox')) {
    flexboxItems.push(
      <Form.Item key="order" label="Order" style={sharedStyles.formItem}>
        <Slider {...handleSliderChange("order")} min={-10} max={10} tooltip={{ formatter: (val) => val }} />
      </Form.Item>
    );
  }
  
  // Gap properties
  const hasGap = shouldShowProperty('gap', 'flexbox') || shouldShowProperty('rowGap', 'flexbox') || shouldShowProperty('columnGap', 'flexbox');
  
  if (hasGap) {
    flexboxItems.push(
      <Divider key="gap-divider" orientation="left" plain>Gap</Divider>
    );
  }
  
  if (shouldShowProperty('gap', 'flexbox')) {
    flexboxItems.push(
      <Form.Item key="gap" label="Gap" style={sharedStyles.formItem}>
        <Input {...handleInputChange("gap")} placeholder="e.g. 10px" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('rowGap', 'flexbox')) {
    flexboxItems.push(
      <Form.Item key="rowGap" label="Row Gap" style={sharedStyles.formItem}>
        <Input {...handleInputChange("rowGap")} placeholder="e.g. 10px" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('columnGap', 'flexbox')) {
    flexboxItems.push(
      <Form.Item key="columnGap" label="Column Gap" style={sharedStyles.formItem}>
        <Input {...handleInputChange("columnGap")} placeholder="e.g. 10px" size="small" />
      </Form.Item>
    );
  }
  
  // Only add the section if it has items to show
  if (flexboxItems.length > 0) {
    items.push({
      key: 'flexbox',
      label: <span><AppstoreOutlined /> Flexbox</span>,
      children: (
        <div style={{ padding: '0 20px 16px 20px' }}>
          {flexboxItems}
        </div>
      )
    });
  }
}

// Grid
if (shouldShow('grid')) {
  const gridItems = [];
  
  // Grid container properties
  const hasContainerProps = shouldShowProperty('gridTemplateColumns', 'grid') || shouldShowProperty('gridTemplateRows', 'grid') ||
                            shouldShowProperty('gridTemplateAreas', 'grid') || shouldShowProperty('gridAutoFlow', 'grid') ||
                            shouldShowProperty('gridAutoColumns', 'grid') || shouldShowProperty('gridAutoRows', 'grid');
  
  if (hasContainerProps) {
    gridItems.push(
      <Divider key="grid-container-divider" orientation="left" plain>Grid Container</Divider>
    );
  }
  
  if (shouldShowProperty('gridTemplateColumns', 'grid')) {
    gridItems.push(
      <Form.Item key="gridTemplateColumns" label="Grid Template Columns" style={sharedStyles.formItem}>
        <Input {...handleInputChange("gridTemplateColumns")} placeholder="e.g. 1fr 2fr 1fr, repeat(3, 1fr)" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('gridTemplateRows', 'grid')) {
    gridItems.push(
      <Form.Item key="gridTemplateRows" label="Grid Template Rows" style={sharedStyles.formItem}>
        <Input {...handleInputChange("gridTemplateRows")} placeholder="e.g. 100px auto 200px" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('gridTemplateAreas', 'grid')) {
    gridItems.push(
      <Form.Item key="gridTemplateAreas" label="Grid Template Areas" style={sharedStyles.formItem}>
        <Input {...handleInputChange("gridTemplateAreas")} placeholder='e.g. "header header" "sidebar main"' size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('gridAutoFlow', 'grid')) {
    gridItems.push(
      <Form.Item key="gridAutoFlow" label="Grid Auto Flow" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("gridAutoFlow")} options={gridAutoFlows} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('gridAutoColumns', 'grid')) {
    gridItems.push(
      <Form.Item key="gridAutoColumns" label="Grid Auto Columns" style={sharedStyles.formItem}>
        <Input {...handleInputChange("gridAutoColumns")} placeholder="e.g. minmax(100px, auto)" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('gridAutoRows', 'grid')) {
    gridItems.push(
      <Form.Item key="gridAutoRows" label="Grid Auto Rows" style={sharedStyles.formItem}>
        <Input {...handleInputChange("gridAutoRows")} placeholder="e.g. minmax(100px, auto)" size="small" />
      </Form.Item>
    );
  }
  
  // Grid items properties
  const hasItemProps = shouldShowProperty('gridColumn', 'grid') || shouldShowProperty('gridRow', 'grid') ||
                       shouldShowProperty('gridColumnStart', 'grid') || shouldShowProperty('gridColumnEnd', 'grid') ||
                       shouldShowProperty('gridRowStart', 'grid') || shouldShowProperty('gridRowEnd', 'grid') ||
                       shouldShowProperty('gridArea', 'grid');
  
  if (hasItemProps) {
    gridItems.push(
      <Divider key="grid-items-divider" orientation="left" plain>Grid Items</Divider>
    );
  }
  
  if (shouldShowProperty('gridColumn', 'grid')) {
    gridItems.push(
      <Form.Item key="gridColumn" label="Grid Column" style={sharedStyles.formItem}>
        <Input {...handleInputChange("gridColumn")} placeholder="e.g. 1 / 3, span 2" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('gridRow', 'grid')) {
    gridItems.push(
      <Form.Item key="gridRow" label="Grid Row" style={sharedStyles.formItem}>
        <Input {...handleInputChange("gridRow")} placeholder="e.g. 1 / 3, span 2" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('gridColumnStart', 'grid')) {
    gridItems.push(
      <Form.Item key="gridColumnStart" label="Grid Column Start" style={sharedStyles.formItem}>
        <Input {...handleInputChange("gridColumnStart")} placeholder="e.g. 1, span 2" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('gridColumnEnd', 'grid')) {
    gridItems.push(
      <Form.Item key="gridColumnEnd" label="Grid Column End" style={sharedStyles.formItem}>
        <Input {...handleInputChange("gridColumnEnd")} placeholder="e.g. 3, span 2" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('gridRowStart', 'grid')) {
    gridItems.push(
      <Form.Item key="gridRowStart" label="Grid Row Start" style={sharedStyles.formItem}>
        <Input {...handleInputChange("gridRowStart")} placeholder="e.g. 1, span 2" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('gridRowEnd', 'grid')) {
    gridItems.push(
      <Form.Item key="gridRowEnd" label="Grid Row End" style={sharedStyles.formItem}>
        <Input {...handleInputChange("gridRowEnd")} placeholder="e.g. 3, span 2" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('gridArea', 'grid')) {
    gridItems.push(
      <Form.Item key="gridArea" label="Grid Area" style={sharedStyles.formItem}>
        <Input {...handleInputChange("gridArea")} placeholder="e.g. header, 1 / 1 / 2 / 3" size="small" />
      </Form.Item>
    );
  }
  
  // Grid alignment properties
  const hasAlignment = shouldShowProperty('justifySelf', 'grid') || shouldShowProperty('placeSelf', 'grid') ||
                       shouldShowProperty('placeItems', 'grid') || shouldShowProperty('placeContent', 'grid');
  
  if (hasAlignment) {
    gridItems.push(
      <Divider key="grid-alignment-divider" orientation="left" plain>Grid Alignment</Divider>
    );
  }
  
  if (shouldShowProperty('justifySelf', 'grid')) {
    gridItems.push(
      <Form.Item key="justifySelf" label="Justify Self" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("justifySelf")} options={justifySelfs} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('placeSelf', 'grid')) {
    gridItems.push(
      <Form.Item key="placeSelf" label="Place Self" style={sharedStyles.formItem}>
        <Input {...handleInputChange("placeSelf")} placeholder="e.g. center, start end" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('placeItems', 'grid')) {
    gridItems.push(
      <Form.Item key="placeItems" label="Place Items" style={sharedStyles.formItem}>
        <Input {...handleInputChange("placeItems")} placeholder="e.g. center, start end" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('placeContent', 'grid')) {
    gridItems.push(
      <Form.Item key="placeContent" label="Place Content" style={sharedStyles.formItem}>
        <Input {...handleInputChange("placeContent")} placeholder="e.g. center, start end" size="small" />
      </Form.Item>
    );
  }
  
  // Grid gap properties
  const hasGap = shouldShowProperty('gap', 'grid') || shouldShowProperty('rowGap', 'grid') || shouldShowProperty('columnGap', 'grid');
  
  if (hasGap) {
    gridItems.push(
      <Divider key="grid-gap-divider" orientation="left" plain>Grid Gap</Divider>
    );
  }
  
  if (shouldShowProperty('gap', 'grid')) {
    gridItems.push(
      <Form.Item key="gap" label="Gap" style={sharedStyles.formItem}>
        <Input {...handleInputChange("gap")} placeholder="e.g. 10px" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('rowGap', 'grid')) {
    gridItems.push(
      <Form.Item key="rowGap" label="Row Gap" style={sharedStyles.formItem}>
        <Input {...handleInputChange("rowGap")} placeholder="e.g. 10px" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('columnGap', 'grid')) {
    gridItems.push(
      <Form.Item key="columnGap" label="Column Gap" style={sharedStyles.formItem}>
        <Input {...handleInputChange("columnGap")} placeholder="e.g. 10px" size="small" />
      </Form.Item>
    );
  }
  
  // Only add the section if it has items to show
  if (gridItems.length > 0) {
    items.push({
      key: 'grid',
      label: <span><BorderlessTableOutlined /> CSS Grid</span>,
      children: (
        <div style={{ padding: '0 20px 16px 20px' }}>
          {gridItems}
        </div>
      )
    });
  }
}

// Lists
if (shouldShow('lists')) {
  const listsItems = [];
  
  if (shouldShowProperty('listStyleType', 'lists')) {
    listsItems.push(
      <Form.Item key="listStyleType" label="List Style Type" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("listStyleType")} options={listStyleTypes} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('listStylePosition', 'lists')) {
    listsItems.push(
      <Form.Item key="listStylePosition" label="List Style Position" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("listStylePosition")} options={listStylePositions} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('listStyleImage', 'lists')) {
    listsItems.push(
      <Form.Item key="listStyleImage" label="List Style Image" style={sharedStyles.formItem}>
        <Input {...handleInputChange("listStyleImage")} placeholder="url(bullet.png)" size="small" />
      </Form.Item>
    );
  }
  
  // Only add the section if it has items to show
  if (listsItems.length > 0) {
    items.push({
      key: 'lists',
      label: <span><MenuOutlined /> Lists</span>,
      children: (
        <div style={{ padding: '0 20px 16px 20px' }}>
          {listsItems}
        </div>
      )
    });
  }
}

// Tables
if (shouldShow('tables')) {
  const tablesItems = [];
  
  if (shouldShowProperty('tableLayout', 'tables')) {
    tablesItems.push(
      <Form.Item key="tableLayout" label="Table Layout" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("tableLayout")} options={tableLayouts} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('captionSide', 'tables')) {
    tablesItems.push(
      <Form.Item key="captionSide" label="Caption Side" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("captionSide")} options={captionSides} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('emptyCells', 'tables')) {
    tablesItems.push(
      <Form.Item key="emptyCells" label="Empty Cells" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("emptyCells")} options={emptyCells} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('borderCollapse', 'tables')) {
    tablesItems.push(
      <Form.Item key="borderCollapse" label="Border Collapse" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("borderCollapse")} options={borderCollapses} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('borderSpacing', 'tables')) {
    tablesItems.push(
      <Form.Item key="borderSpacing" label="Border Spacing" style={sharedStyles.formItem}>
        <Input {...handleInputChange("borderSpacing")} placeholder="e.g. 2px" size="small" />
      </Form.Item>
    );
  }
  
  // Only add the section if it has items to show
  if (tablesItems.length > 0) {
    items.push({
      key: 'tables',
      label: <span><TableOutlined /> Tables</span>,
      children: (
        <div style={{ padding: '0 20px 16px 20px' }}>
          {tablesItems}
        </div>
      )
    });
  }
}


// Transform & Animation
if (shouldShow('transform')) {
  const transformItems = [];
  
  if (shouldShowProperty('transform', 'transform')) {
    transformItems.push(
      <Form.Item key="transform" label="Transform" style={sharedStyles.formItem}>
        <Input {...handleInputChange("transform")} placeholder="e.g. rotate(45deg) scale(1.2)" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('transformOrigin', 'transform')) {
    transformItems.push(
      <Form.Item key="transformOrigin" label="Transform Origin" style={sharedStyles.formItem}>
        <Input {...handleInputChange("transformOrigin")} placeholder="e.g. center, top left, 50% 50%" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('transition', 'transform')) {
    transformItems.push(
      <Form.Item key="transition" label="Transition" style={sharedStyles.formItem}>
        <Input {...handleInputChange("transition")} placeholder="e.g. all 0.3s ease" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('animation', 'transform')) {
    transformItems.push(
      <Form.Item key="animation" label="Animation" style={sharedStyles.formItem}>
        <Input {...handleInputChange("animation")} placeholder="e.g. slideIn 0.5s ease-in-out" size="small" />
      </Form.Item>
    );
  }
  
  // Only add the section if it has items to show
  if (transformItems.length > 0) {
    items.push({
      key: 'transform',
      label: <span><ExpandOutlined /> Transform & Animation</span>,
      children: (
        <div style={{ padding: '0 20px 16px 20px' }}>
          {transformItems}
        </div>
      )
    });
  }
}


// Effects & Filters
if (shouldShow('effects')) {
  const effectsItems = [];
  
  if (shouldShowProperty('opacity', 'effects')) {
    effectsItems.push(
      <Form.Item key="opacity" label="Opacity" style={sharedStyles.formItem}>
        <Slider {...handleSliderChange("opacity")} min={0} max={1} step={0.01} tooltip={{ formatter: (val) => `${(val * 100).toFixed(0)}%` }} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('filter', 'effects')) {
    effectsItems.push(
      <Form.Item key="filter" label="Filter" style={sharedStyles.formItem}>
        <Input {...handleInputChange("filter")} placeholder="e.g. blur(5px) brightness(1.2)" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('backdropFilter', 'effects')) {
    effectsItems.push(
      <Form.Item key="backdropFilter" label="Backdrop Filter" style={sharedStyles.formItem}>
        <Input {...handleInputChange("backdropFilter")} placeholder="e.g. blur(10px)" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('boxShadow', 'effects')) {
    effectsItems.push(
      <Form.Item key="boxShadow" label="Box Shadow" style={sharedStyles.formItem}>
        <Input {...handleInputChange("boxShadow")} placeholder="e.g. 0 4px 8px rgba(0,0,0,0.1)" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('textShadow', 'effects')) {
    effectsItems.push(
      <Form.Item key="textShadow" label="Text Shadow" style={sharedStyles.formItem}>
        <Input {...handleInputChange("textShadow")} placeholder="e.g. 2px 2px 4px rgba(0,0,0,0.5)" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('clipPath', 'effects')) {
    effectsItems.push(
      <Form.Item key="clipPath" label="Clip Path" style={sharedStyles.formItem}>
        <Input {...handleInputChange("clipPath")} placeholder="e.g. circle(50%)" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('mask', 'effects')) {
    effectsItems.push(
      <Form.Item key="mask" label="Mask" style={sharedStyles.formItem}>
        <Input {...handleInputChange("mask")} placeholder="e.g. url(mask.svg)" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('mixBlendMode', 'effects')) {
    effectsItems.push(
      <Form.Item key="mixBlendMode" label="Mix Blend Mode" style={sharedStyles.formItem}>
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
    );
  }
  
  if (shouldShowProperty('backgroundBlendMode', 'effects')) {
    effectsItems.push(
      <Form.Item key="backgroundBlendMode" label="Background Blend Mode" style={sharedStyles.formItem}>
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
    );
  }
  
  // Only add the section if it has items to show
  if (effectsItems.length > 0) {
    items.push({
      key: 'effects',
      label: <span><PictureOutlined /> Effects & Filters</span>,
      children: (
        <div style={{ padding: '0 20px 16px 20px' }}>
          {effectsItems}
        </div>
      )
    });
  }
}


// Interaction
if (shouldShow('interaction')) {
  const interactionItems = [];
  
  if (shouldShowProperty('cursor', 'interaction')) {
    interactionItems.push(
      <Form.Item key="cursor" label="Cursor" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("cursor")} options={cursors} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('pointerEvents', 'interaction')) {
    interactionItems.push(
      <Form.Item key="pointerEvents" label="Pointer Events" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("pointerEvents")} options={pointerEvents} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('userSelect', 'interaction')) {
    interactionItems.push(
      <Form.Item key="userSelect" label="User Select" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("userSelect")} options={userSelects} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('touchAction', 'interaction')) {
    interactionItems.push(
      <Form.Item key="touchAction" label="Touch Action" style={sharedStyles.formItem}>
        <Input {...handleInputChange("touchAction")} placeholder="e.g. auto, manipulation" size="small" />
      </Form.Item>
    );
  }
  
  // Only add the section if it has items to show
  if (interactionItems.length > 0) {
    items.push({
      key: 'interaction',
      label: <span><LinkOutlined /> Interaction</span>,
      children: (
        <div style={{ padding: '0 20px 16px 20px' }}>
          {interactionItems}
        </div>
      )
    });
  }
}


// Content & Generated Content
if (shouldShow('content')) {
  const contentItems = [];
  
  if (shouldShowProperty('content', 'content')) {
    contentItems.push(
      <Form.Item key="content" label="Content" style={sharedStyles.formItem}>
        <Input {...handleInputChange("content")} placeholder='e.g. "text", attr(title)' size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('quotes', 'content')) {
    contentItems.push(
      <Form.Item key="quotes" label="Quotes" style={sharedStyles.formItem}>
        <Input {...handleInputChange("quotes")} placeholder='e.g. text' size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('counterReset', 'content')) {
    contentItems.push(
      <Form.Item key="counterReset" label="Counter Reset" style={sharedStyles.formItem}>
        <Input {...handleInputChange("counterReset")} placeholder="e.g. counter-name 0" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('counterIncrement', 'content')) {
    contentItems.push(
      <Form.Item key="counterIncrement" label="Counter Increment" style={sharedStyles.formItem}>
        <Input {...handleInputChange("counterIncrement")} placeholder="e.g. counter-name 1" size="small" />
      </Form.Item>
    );
  }
  
  // Only add the section if it has items to show
  if (contentItems.length > 0) {
    items.push({
      key: 'content',
      label: <span><FontColorsOutlined /> Content & Generated</span>,
      children: (
        <div style={{ padding: '0 20px 16px 20px' }}>
          {contentItems}
        </div>
      )
    });
  }
}


// Object Fitting (for images/videos)
if (shouldShow('object')) {
  const objectItems = [];
  
  if (shouldShowProperty('objectFit', 'object')) {
    objectItems.push(
      <Form.Item key="objectFit" label="Object Fit" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("objectFit")} options={objectFits} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('objectPosition', 'object')) {
    objectItems.push(
      <Form.Item key="objectPosition" label="Object Position" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("objectPosition")} options={objectPositions} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  // Only add the section if it has items to show
  if (objectItems.length > 0) {
    items.push({
      key: 'object',
      label: <span><PictureOutlined /> Object Fitting</span>,
      children: (
        <div style={{ padding: '0 20px 16px 20px' }}>
          {objectItems}
        </div>
      )
    });
  }
}


// Scroll Behavior
if (shouldShow('scroll')) {
  const scrollItems = [];
  
  if (shouldShowProperty('scrollBehavior', 'scroll')) {
    scrollItems.push(
      <Form.Item key="scrollBehavior" label="Scroll Behavior" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("scrollBehavior")} options={[
          { value: "auto", label: "Auto" },
          { value: "smooth", label: "Smooth" }
        ]} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('scrollSnapType', 'scroll')) {
    scrollItems.push(
      <Form.Item key="scrollSnapType" label="Scroll Snap Type" style={sharedStyles.formItem}>
        <Input {...handleInputChange("scrollSnapType")} placeholder="e.g. x mandatory, y proximity" size="small" />
      </Form.Item>
    );
  }
  
  if (shouldShowProperty('scrollSnapAlign', 'scroll')) {
    scrollItems.push(
      <Form.Item key="scrollSnapAlign" label="Scroll Snap Align" style={sharedStyles.formItem}>
        <Select {...handleSelectChange("scrollSnapAlign")} options={[
          { value: "none", label: "None" },
          { value: "start", label: "Start" },
          { value: "end", label: "End" },
          { value: "center", label: "Center" }
        ]} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
      </Form.Item>
    );
  }
  
  // Only add the section if it has items to show
  if (scrollItems.length > 0) {
    items.push({
      key: 'scroll',
      label: <span><MenuOutlined /> Scroll Behavior</span>,
      children: (
        <div style={{ padding: '0 20px 16px 20px' }}>
          {scrollItems}
        </div>
      )
    });
  }
}

// HTML Attributes
if (shouldShow('attributes')) {
  const attributesItems = [];
  
  // Form Attributes section
  const hasFormAttributes = shouldShowProperty('type', 'attributes') || shouldShowProperty('value', 'attributes') ||
                            shouldShowProperty('name', 'attributes') || shouldShowProperty('target', 'attributes') ||
                            shouldShowProperty('rel', 'attributes');
  
  if (hasFormAttributes) {
    attributesItems.push(
      <Divider key="form-attributes-divider" orientation="left" plain>Form Attributes</Divider>
    );
    
    if (shouldShowProperty('type', 'attributes')) {
      attributesItems.push(
        <Form.Item key="type" label="Type" style={sharedStyles.formItem}>
          <Input {...handleInputChange("type")} placeholder="e.g. text, email, password" size="small" />
        </Form.Item>
      );
    }
    
    if (shouldShowProperty('value', 'attributes')) {
      attributesItems.push(
        <Form.Item key="value" label="Value" style={sharedStyles.formItem}>
          <Input {...handleInputChange("value")} placeholder="Default value" size="small" />
        </Form.Item>
      );
    }
    
    if (shouldShowProperty('name', 'attributes')) {
      attributesItems.push(
        <Form.Item key="name" label="Name" style={sharedStyles.formItem}>
          <Input {...handleInputChange("name")} placeholder="Form field name" size="small" />
        </Form.Item>
      );
    }
    
    if (shouldShowProperty('target', 'attributes')) {
      attributesItems.push(
        <Form.Item key="target" label="Target" style={sharedStyles.formItem}>
          <Select {...handleSelectChange("target")} options={[
            { value: "_self", label: "_self" },
            { value: "_blank", label: "_blank" },
            { value: "_parent", label: "_parent" },
            { value: "_top", label: "_top" }
          ]} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
        </Form.Item>
      );
    }
    
    if (shouldShowProperty('rel', 'attributes')) {
      attributesItems.push(
        <Form.Item key="rel" label="Rel" style={sharedStyles.formItem}>
          <Input {...handleInputChange("rel")} placeholder="e.g. noopener, noreferrer" size="small" />
        </Form.Item>
      );
    }
  }
  
  // Boolean Attributes section
  const hasBooleanAttributes = shouldShowProperty('disabled', 'attributes') || shouldShowProperty('required', 'attributes') ||
                              shouldShowProperty('readonly', 'attributes') || shouldShowProperty('multiple', 'attributes') ||
                              shouldShowProperty('checked', 'attributes') || shouldShowProperty('selected', 'attributes') ||
                              shouldShowProperty('hidden', 'attributes') || shouldShowProperty('contentEditable', 'attributes') ||
                              shouldShowProperty('draggable', 'attributes') || shouldShowProperty('spellCheck', 'attributes') ||
                              shouldShowProperty('translate', 'attributes');
  
  if (hasBooleanAttributes) {
    attributesItems.push(
      <Divider key="boolean-attributes-divider" orientation="left" plain>Boolean Attributes</Divider>
    );
    
    if (shouldShowProperty('disabled', 'attributes')) {
      attributesItems.push(
        <Form.Item key="disabled" label="Disabled" style={sharedStyles.formItem}>
          <Switch {...handleSwitchChange("disabled")} size="small" />
        </Form.Item>
      );
    }
    
    if (shouldShowProperty('required', 'attributes')) {
      attributesItems.push(
        <Form.Item key="required" label="Required" style={sharedStyles.formItem}>
          <Switch {...handleSwitchChange("required")} size="small" />
        </Form.Item>
      );
    }
    
    if (shouldShowProperty('readonly', 'attributes')) {
      attributesItems.push(
        <Form.Item key="readonly" label="Readonly" style={sharedStyles.formItem}>
          <Switch {...handleSwitchChange("readonly")} size="small" />
        </Form.Item>
      );
    }
    
    if (shouldShowProperty('multiple', 'attributes')) {
      attributesItems.push(
        <Form.Item key="multiple" label="Multiple" style={sharedStyles.formItem}>
          <Switch {...handleSwitchChange("multiple")} size="small" />
        </Form.Item>
      );
    }
    
    if (shouldShowProperty('checked', 'attributes')) {
      attributesItems.push(
        <Form.Item key="checked" label="Checked" style={sharedStyles.formItem}>
          <Switch {...handleSwitchChange("checked")} size="small" />
        </Form.Item>
      );
    }
    
    if (shouldShowProperty('selected', 'attributes')) {
      attributesItems.push(
        <Form.Item key="selected" label="Selected" style={sharedStyles.formItem}>
          <Switch {...handleSwitchChange("selected")} size="small" />
        </Form.Item>
      );
    }
    
    if (shouldShowProperty('hidden', 'attributes')) {
      attributesItems.push(
        <Form.Item key="hidden" label="Hidden" style={sharedStyles.formItem}>
          <Switch {...handleSwitchChange("hidden")} size="small" />
        </Form.Item>
      );
    }
    
    if (shouldShowProperty('contentEditable', 'attributes')) {
      attributesItems.push(
        <Form.Item key="contentEditable" label="Content Editable" style={sharedStyles.formItem}>
          <Switch {...handleSwitchChange("contentEditable")} size="small" />
        </Form.Item>
      );
    }
    
    if (shouldShowProperty('draggable', 'attributes')) {
      attributesItems.push(
        <Form.Item key="draggable" label="Draggable" style={sharedStyles.formItem}>
          <Switch {...handleSwitchChange("draggable")} size="small" />
        </Form.Item>
      );
    }
    
    if (shouldShowProperty('spellCheck', 'attributes')) {
      attributesItems.push(
        <Form.Item key="spellCheck" label="Spell Check" style={sharedStyles.formItem}>
          <Switch {...handleSwitchChange("spellCheck")} size="small" />
        </Form.Item>
      );
    }
    
    if (shouldShowProperty('translate', 'attributes')) {
      attributesItems.push(
        <Form.Item key="translate" label="Translate" style={sharedStyles.formItem}>
          <Switch {...handleSwitchChange("translate")} size="small" />
        </Form.Item>
      );
    }
  }
  
  // Other Attributes section
  const hasOtherAttributes = shouldShowProperty('tabIndex', 'attributes') || shouldShowProperty('accessKey', 'attributes') ||
                            shouldShowProperty('dir', 'attributes') || shouldShowProperty('lang', 'attributes');
  
  if (hasOtherAttributes) {
    attributesItems.push(
      <Divider key="other-attributes-divider" orientation="left" plain>Other Attributes</Divider>
    );
    
    if (shouldShowProperty('tabIndex', 'attributes')) {
      attributesItems.push(
        <Form.Item key="tabIndex" label="Tab Index" style={sharedStyles.formItem}>
          <InputNumber {...handleNumberChange("tabIndex")} size="small" style={{ width: '100%' }} />
        </Form.Item>
      );
    }
    
    if (shouldShowProperty('accessKey', 'attributes')) {
      attributesItems.push(
        <Form.Item key="accessKey" label="Access Key" style={sharedStyles.formItem}>
          <Input {...handleInputChange("accessKey")} placeholder="Single character" size="small" maxLength={1} />
        </Form.Item>
      );
    }
    
    if (shouldShowProperty('dir', 'attributes')) {
      attributesItems.push(
        <Form.Item key="dir" label="Dir" style={sharedStyles.formItem}>
          <Select {...handleSelectChange("dir")} options={[
            { value: "auto", label: "Auto" },
            { value: "ltr", label: "Left to Right" },
            { value: "rtl", label: "Right to Left" }
          ]} size="small" styles={sharedStyles} getPopupContainer={(trigger) => trigger.parentNode} />
        </Form.Item>
      );
    }
    
    if (shouldShowProperty('lang', 'attributes')) {
      attributesItems.push(
        <Form.Item key="lang" label="Lang" style={sharedStyles.formItem}>
          <Input {...handleInputChange("lang")} placeholder="e.g. en, en-US, fr" size="small" />
        </Form.Item>
      );
    }
  }
  
  // ARIA Attributes section
  const hasAriaAttributes = shouldShowProperty('role', 'attributes') || shouldShowProperty('ariaLabel', 'attributes') ||
                           shouldShowProperty('ariaDescribedBy', 'attributes') || shouldShowProperty('ariaLabelledBy', 'attributes');
  
  if (hasAriaAttributes) {
    attributesItems.push(
      <Divider key="aria-attributes-divider" orientation="left" plain>ARIA Attributes</Divider>
    );
    
    if (shouldShowProperty('role', 'attributes')) {
      attributesItems.push(
        <Form.Item key="role" label="Role" style={sharedStyles.formItem}>
          <Input {...handleInputChange("role")} placeholder="e.g. button, navigation" size="small" />
        </Form.Item>
      );
    }
    
    if (shouldShowProperty('ariaLabel', 'attributes')) {
      attributesItems.push(
        <Form.Item key="ariaLabel" label="ARIA Label" style={sharedStyles.formItem}>
          <Input {...handleInputChange("ariaLabel")} placeholder="Accessibility label" size="small" />
        </Form.Item>
      );
    }
    
    if (shouldShowProperty('ariaDescribedBy', 'attributes')) {
      attributesItems.push(
        <Form.Item key="ariaDescribedBy" label="ARIA Described By" style={sharedStyles.formItem}>
          <Input {...handleInputChange("ariaDescribedBy")} placeholder="ID of describing element" size="small" />
        </Form.Item>
      );
    }
    
    if (shouldShowProperty('ariaLabelledBy', 'attributes')) {
      attributesItems.push(
        <Form.Item key="ariaLabelledBy" label="ARIA Labelled By" style={sharedStyles.formItem}>
          <Input {...handleInputChange("ariaLabelledBy")} placeholder="ID of labelling element" size="small" />
        </Form.Item>
      );
    }
  }
  
  // Only add the section if it has items to show
  if (attributesItems.length > 0) {
    items.push({
      key: 'attributes',
      label: <span><SettingOutlined /> HTML Attributes</span>,
      children: (
        <div style={{ padding: '0 20px 16px 20px' }}>
          {attributesItems}
        </div>
      )
    });
  }
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
      minWidth: 'auto',
      maxWidth: 'auto',
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