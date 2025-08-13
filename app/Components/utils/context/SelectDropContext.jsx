'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useEditor } from '@craftjs/core';
import useIsMobile from '../../../Hooks/useIsMobile';
import { useEditorSettings } from './EditorSettingsContext';

/**
 * SelectDropContext
 * Tap-to-select then tap-to-place workflow.
 * Mobile: auto-enabled, relative append.
 * Desktop: toggleable, positions using existing dropPosition mode (center/topLeft).
 */

const SelectDropContext = createContext(null);

export const useSelectDrop = () => {
  const ctx = useContext(SelectDropContext);
  if (!ctx) throw new Error('useSelectDrop must be used within a SelectDropProvider');
  return ctx;
};

// Lazy component map
const componentMapCache = {};
const getComponentMap = () => {
  if (Object.keys(componentMapCache).length) return componentMapCache;
  try {
    componentMapCache.Box = require('../../user/Layout/Box').Box;
    componentMapCache.FlexBox = require('../../user/Layout/FlexBox').FlexBox;
    componentMapCache.GridBox = require('../../user/Layout/GridBox').GridBox;
    componentMapCache.Text = require('../../user/Text/Text').Text;
    componentMapCache.Paragraph = require('../../user/Text/Paragraph').Paragraph;
    componentMapCache.Button = require('../../user/Interactive/Button').Button;
    componentMapCache.Link = require('../../user/Interactive/Link').Link;
    componentMapCache.Image = require('../../user/Media/Image').Image;
    componentMapCache.Video = require('../../user/Media/Video').Video;
    componentMapCache.Carousel = require('../../user/Media/Carousel').Carousel;
    componentMapCache.FormInput = require('../../user/Input').FormInput;
    componentMapCache.Form = require('../../user/Advanced/Form').Form;
    componentMapCache.NavBar = require('../../user/Nav/NavBar').NavBar;
    componentMapCache.ShopFlexBox = require('../../user/Advanced/ShopFlexBox').ShopFlexBox;
  } catch (e) {}
  return componentMapCache;
};

export const SelectDropProvider = ({ children }) => {
  const isMobile = useIsMobile();
  const { actions, query } = useEditor();
  const { settings } = useEditorSettings();

  const [selectDropMode, setSelectDropMode] = useState(false);
  const [armedComponent, setArmedComponent] = useState(null);
  const lastAddRef = useRef(0);

  useEffect(() => {
    if (isMobile) setSelectDropMode(true); else setSelectDropMode(false);
  }, [isMobile]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setArmedComponent(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Compute initial desktop position (rough) – will refine after mount for center mode
  const computeDesktopPosition = (containerEl, clickEvent, componentName) => {
    try {
      const rect = containerEl.getBoundingClientRect();
      const defaultDims = {
        Box: { w: 200, h: 200 },
        FlexBox: { w: 300, h: 150 },
        GridBox: { w: 300, h: 200 },
        Text: { w: 100, h: 24 },
        Paragraph: { w: 300, h: 80 },
        Button: { w: 120, h: 40 },
        Image: { w: 200, h: 150 },
        Video: { w: 300, h: 200 },
        Carousel: { w: 400, h: 250 },
        NavBar: { w: 400, h: 60 },
        Form: { w: 300, h: 200 },
        FormInput: { w: 200, h: 40 },
        ShopFlexBox: { w: 250, h: 300 }
      };
      const dims = defaultDims[componentName] || { w: 200, h: 200 };
      const mode = settings?.dropPosition?.mode || 'center';
      let x = clickEvent.clientX - rect.left;
      let y = clickEvent.clientY - rect.top;
      if (mode === 'center') { x -= dims.w / 2; y -= dims.h / 2; }
      if (x < 0) x = 0; if (y < 0) y = 0;
      return { left: Math.round(x), top: Math.round(y), position: 'absolute' };
    } catch { return { left: 50, top: 50, position: 'absolute' }; }
  };

  // Alias names (toolbox labels) -> real component keys
  const aliasMap = {
    Frame: 'Box',
    Flex: 'FlexBox',
    Grid: 'GridBox',
    Product: 'ShopFlexBox'
  };

  // Elements to ignore when clicking (menus, drawers etc.)
  const ignoreSelectors = [
    '.ant-drawer', '.ant-dropdown', '.ant-tooltip', '.ant-select', '.ant-modal',
    '.toolbox-wrapper', '[data-select-drop-ignore]', '.editor-toolbar', '.ant-popover',
    // Common app-specific panels
    '.figma-component-drawer',
    '.bg-white.border-r', // left sidebar
    '.bg-white.border-l', // right sidebar
    '.border-b.shadow-sm', // top bar
    '.layers-panel',
    '.style-menu',
    '.ant-menu',
    '.ant-collapse',
    '.ant-slider',
    '.ant-tabs',
    '.ant-select-dropdown'
  ];

  // Track pointer down to differentiate click vs drag
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const pointerDownHandler = useCallback((e) => {
    if (e.button !== 0) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  }, []);
  useEffect(() => {
    document.addEventListener('pointerdown', pointerDownHandler, true);
    return () => document.removeEventListener('pointerdown', pointerDownHandler, true);
  }, [pointerDownHandler]);

  const handleCanvasClick = useCallback((e) => {
    if (!selectDropMode || !armedComponent) return;
    if (!actions || !query) return;
    if (e.button !== 0) return; // left only

    // Ignore UI overlays
    for (const sel of ignoreSelectors) {
      if (e.target.closest(sel)) return;
    }

    // Drag movement threshold skip
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    if (Math.hypot(dx, dy) > 6) return; // treat as drag, not click-tap

    const now = Date.now();
    if (now - lastAddRef.current < 60) return; // throttle rapid placements
    lastAddRef.current = now;

    const resolvedName = aliasMap[armedComponent] || armedComponent;

    // Ascend DOM to find canvas container; ensure click actually occurred inside editor canvas area
    let el = e.target;
    let containerNodeId = 'ROOT';
    let insideCanvas = false;
    while (el) {
      if (el.getAttribute) {
        if (el.getAttribute('data-craft-node-id')) {
          const nid = el.getAttribute('data-craft-node-id');
          try {
            const node = query.node(nid);
            if (node) {
              insideCanvas = true;
              if (node.isCanvas()) { containerNodeId = nid; break; }
            }
          } catch {}
        }
        if (el.getAttribute('data-cy') === 'editor-root') { insideCanvas = true; containerNodeId = 'ROOT'; break; }
      }
      el = el.parentNode;
    }
    if (!insideCanvas) return; // Click outside editor canvas; ignore

    const map = getComponentMap();
    const Component = map[resolvedName];
    if (!Component) return;

    let props = {};
    if (Component.craft?.props) props = { ...Component.craft.props };
    if (['Box', 'FlexBox', 'GridBox', 'ShopFlexBox', 'Form'].includes(resolvedName)) props.canvas = true;

    let initialPos = null;
    if (!isMobile) {
      const containerEl = containerNodeId === 'ROOT'
        ? document.querySelector('[data-cy="editor-root"]') || document.querySelector('[data-editor="true"]') || document.body
        : document.querySelector(`[data-craft-node-id="${containerNodeId}"]`);
      initialPos = computeDesktopPosition(containerEl, e, resolvedName);
      props = { ...props, ...initialPos };
    }

    try {
      const before = new Set(Object.keys(query.getNodes()));
      const reactEl = React.createElement(Component, props);
      const nodeTree = query.parseReactElement(reactEl).toNodeTree();
      actions.addNodeTree(nodeTree, containerNodeId);
      const afterNodes = Object.keys(query.getNodes());
      const newId = afterNodes.find(id => !before.has(id));
      if (!isMobile && newId && props.position === 'absolute') {
        // Initial positioning
        actions.setProp(newId, p => { p.position = 'absolute'; p.left = props.left; p.top = props.top; });
        // Refine for exact center using actual DOM size if center mode
        const mode = settings?.dropPosition?.mode;
        if (mode === 'center') {
          setTimeout(() => {
            try {
              const node = query.node(newId);
              if (node && node.dom) {
                const rect = node.dom.getBoundingClientRect();
                const containerEl2 = containerNodeId === 'ROOT'
                  ? (document.querySelector('[data-cy="editor-root"]') || document.querySelector('[data-editor="true"]') || document.body)
                  : document.querySelector(`[data-craft-node-id="${containerNodeId}"]`);
                if (containerEl2) {
                  const cRect = containerEl2.getBoundingClientRect();
                  const targetLeft = e.clientX - cRect.left - rect.width / 2;
                  const targetTop = e.clientY - cRect.top - rect.height / 2;
                  actions.setProp(newId, p => { p.left = Math.round(targetLeft); p.top = Math.round(targetTop); });
                }
              }
            } catch {}
          }, 30);
        }
      }
    } catch {}
  }, [selectDropMode, armedComponent, isMobile, actions, query, settings]);

  useEffect(() => {
    document.addEventListener('click', handleCanvasClick, true);
    return () => document.removeEventListener('click', handleCanvasClick, true);
  }, [handleCanvasClick]);

  const value = {
    selectDropMode,
    setSelectDropMode: (v) => { setSelectDropMode(v); if (!v) setArmedComponent(null); },
    armedComponent,
    setArmedComponent,
    isMobile
  };

  return <SelectDropContext.Provider value={value}>{children}</SelectDropContext.Provider>;
};

export default SelectDropContext;
