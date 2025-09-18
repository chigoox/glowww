'use client'

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Tooltip } from 'antd';
import { DragOutlined, EditOutlined, AimOutlined, SlidersOutlined } from '@ant-design/icons';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
// Use the editor variant of SnapPositionHandle; the support variant handles container auto-position and can interfere with size
import SnapPositionHandle from '../../editor/SnapPositionHandle';
import ResizeHandles from './ResizeHandles';

/**
 * Reusable portal controls for Craft.js elements.
 *
 * Designed using Box/Text/ShopFlexBox as references so existing components can swap in with minimal changes.
 *
 * Props
 * - boxPosition: {top:number,left:number,width:number,height:number} absolute page coords for the target box
 * - nodeId: string (required for POS handle)
 * - dragRef: ref to attach Craft drag (MOVE segment). Optional; if missing, MOVE segment is disabled
 * - onEditClick: function to open modal or toggle editing. Optional; if missing, EDIT segment is hidden when showEditIfProvided is true
 * - handleResizeStart: function(e, direction) -> void for corner/edge resize. Optional; if missing, resize handles are not rendered
 * - order: array of 'MOVE'|'EDIT'|'POS' determining segment order in the pill
 * - show: object to toggle features { move:boolean, edit:boolean, pos:boolean, corners:boolean, edges:boolean }
 * - labels: optional labels for segments { move:'MOVE', edit:'EDIT', pos:'POS' }
 * - offsetY: number offset in px from the top of the box to position the pill (default -28)
 * - offsetX: number horizontal offset in px (default 0)
 * - zIndex: number z-index for the overlay (default 99999)
 * - styleOverrides: { pill?:CSSProperties, segment?:CSSProperties, colors?:{ move:string, edit:string, pos:string } }
 */
export default function PortalControls({
  boxPosition,
  targetRef,
  editorActions,
  craftQuery,
  minWidth,
  minHeight,
  onResize,
  onResizeEnd,
  nodeId,
  dragRef,
  onEditClick,
  handleResizeStart,
  order = ["MOVE", "POS", "EDIT", "UPM"],
  show = { move: true, edit: true, pos: true, upm: true, corners: true },
  labels = { move: "MOVE", edit: "EDIT", pos: "POS", upm: "User Props" },
  offsetY = -36,
  offsetX = 0,
  zIndex = 99999,
  styleOverrides = {},
  // Optional callback that the portal can call to request a position refresh
  // Keep the name compatible with other code: updateBoxPosition
  updateBoxPosition,
}) {
  const isClient = typeof window !== 'undefined';
  const prefersReducedMotion = useReducedMotion();
  const motionCfg = prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } }
    : {
        initial: { opacity: 0, y: 6, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 6, scale: 0.98 },
        transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] }
      };

  const { top = 0, left = 0, width = 0, height = 0 } = boxPosition || {};
  const showMove = show?.move && !!dragRef;
  // Show Edit control even if no handler; clicking will no-op if missing
  const showEdit = show?.edit !== false;
  const showPos = show?.pos && !!nodeId;
  const showUPM = show?.upm !== false; // allow toggle, default true

  const colors = {
    move: styleOverrides.colors?.move || "#52c41a",
    edit: styleOverrides.colors?.edit || "#722ed1",
    pos: styleOverrides.colors?.pos || "#1890ff",
  };

  // Build icon-only controls
  const iconButtonBase = {
    width: 28,
    height: 28,
    minWidth: 28,
    padding: 0,
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
  };

  const segments = [];

  const makeMove = () => (
    <Tooltip key="MOVE" title="Drag to move between containers">
      <div
        ref={dragRef}
  className="move-handle"
  data-cy="move-handle"
        data-handle-type="move"
        data-craft-node-id={nodeId}
  role="button"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          ...iconButtonBase,
          background: colors.move,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: dragRef ? 'grab' : 'not-allowed'
          ,
          ...(styleOverrides.segment || {})
        }}
        aria-label={labels.move}
      >
        <DragOutlined style={{ color: '#fff', fontSize: 14 }} />
      </div>
    </Tooltip>
  );

  const makeEdit = () => (
    <Tooltip key="EDIT" title="Edit">
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onEditClick?.(e); }}
        style={{
          ...iconButtonBase,
          background: colors.edit,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: onEditClick ? 'pointer' : 'default',
          ...(styleOverrides.segment || {})
        }}
        aria-label={labels.edit}
        role="button"
      >
        <EditOutlined style={{ color: '#fff' }} />
      </div>
    </Tooltip>
  );

  const makePos = () => (
    <Tooltip key="POS" title="Position (drag)">
    <SnapPositionHandle
        nodeId={nodeId}
        style={{
          ...iconButtonBase,
          background: colors.pos,
          cursor: 'move',
          display: 'flex',
          alignItems: 'center',
      justifyContent: 'center',
      ...(styleOverrides.segment || {})
        }}
      >
        <AimOutlined style={{ color: '#fff' }} />
      </SnapPositionHandle>
    </Tooltip>
  );

  const makeUPM = () => (
    <Tooltip key="UPM" title="User Prop Manager">
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          try {
            if (nodeId && editorActions?.selectNode) {
              editorActions.selectNode(nodeId);
            }
            // Defer to next frame to ensure selection state is applied
            const open = () => {
              const evt = new CustomEvent('open-props-manager', { detail: { target: 'component', nodeId } });
              window.dispatchEvent(evt);
            };
            if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
              window.requestAnimationFrame(open);
            } else {
              setTimeout(open, 0);
            }
          } catch {/* noop */}
        }}
        style={{
          ...iconButtonBase,
          background: '#6f42c1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          ...(styleOverrides.segment || {})
        }}
        aria-label={labels.upm}
        role="button"
      >
        <SlidersOutlined style={{ color: '#fff' }} />
      </div>
    </Tooltip>
  );

  const factory = {
    MOVE: () => showMove && makeMove(),
    EDIT: () => showEdit && makeEdit(),
    POS: () => showPos && makePos(),
    UPM: () => showUPM && makeUPM(),
  };

  order.forEach((seg) => {
    const el = factory[seg]?.();
    if (el) segments.push(el);
  });

  const showAnySegment = segments.length > 0;
  const showCorners = show?.corners !== false; // allow toggle via props

  // Keep the portal positioned during nested/container scrolling and style changes.
  // If a consumer passes `updateBoxPosition` it will be called (throttled via rAF).
  // This logic is intentionally opt-in (only runs when nodeId is provided).
  const rafRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    if (!nodeId) return;

    const scheduleUpdate = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        try {
          updateBoxPosition?.();
        } catch (e) {
          /* swallow */
        }
      });
    };

    // Find the target element; prefer a provided ref (more reliable), fallback to craft data attribute
    let targetEl = null;
    try {
      if (targetRef && targetRef.current) {
        targetEl = targetRef.current;
      } else {
        targetEl = document.querySelector(`[data-craft-node-id="${nodeId}"]`);
      }
    } catch (e) {
      targetEl = null;
    }

    // collect scrollable ancestor elements
    const scrollParents = [];
    try {
      let el = targetEl?.parentElement || null;
      while (el && el !== document.body) {
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY || "";
        const isScrollable =
          /(auto|scroll)/.test(overflowY) || el.scrollHeight > el.clientHeight;
        if (isScrollable) scrollParents.push(el);
        el = el.parentElement;
      }
    } catch (e) {
      /* ignore */
    }

    const onScroll = () => scheduleUpdate();

    scrollParents.forEach((sp) =>
      sp.addEventListener("scroll", onScroll, { passive: true })
    );
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    try {
      const mo = new MutationObserver(() => scheduleUpdate());
      observerRef.current = mo;
      if (targetEl)
        mo.observe(targetEl, {
          attributes: true,
          attributeFilter: ["style", "class"],
        });
      scrollParents.slice(0, 5).forEach((a) => {
        try {
          mo.observe(a, {
            attributes: true,
            attributeFilter: ["style", "class"],
          });
        } catch (e) {}
      });
    } catch (e) {
      /* ignore */
    }

    // initial
    scheduleUpdate();

    return () => {
      try {
        scrollParents.forEach((sp) =>
          sp.removeEventListener("scroll", onScroll)
        );
      } catch (e) {}
      try {
        window.removeEventListener("scroll", onScroll);
      } catch (e) {}
      try {
        window.removeEventListener("resize", onScroll);
      } catch (e) {}
      try {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      } catch (e) {}
      try {
        observerRef.current && observerRef.current.disconnect();
      } catch (e) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    nodeId,
    boxPosition?.top,
    boxPosition?.left,
    boxPosition?.width,
    boxPosition?.height,
    updateBoxPosition,
  ]);
  if (!isClient || !boxPosition) return null;
  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex,
      }}
    >
      <AnimatePresence>
        {showAnySegment && (
          <motion.div
            key="controls"
            {...motionCfg}
            style={{
              position: 'absolute',
              top: top + offsetY,
              left: left + offsetX,
              display: 'flex',
              gap: 6,
              background: 'transparent',
              userSelect: 'none',
              pointerEvents: 'auto',
              ...(styleOverrides.pill || {})
            }}
          >
            {segments}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resize handles */}
      {showCorners && (
        <ResizeHandles
          boxPosition={boxPosition}
          nodeId={nodeId}
          targetRef={targetRef}
          editorActions={editorActions}
          craftQuery={craftQuery}
          minWidth={minWidth}
          minHeight={minHeight}
          onResize={onResize}
          onResizeEnd={onResizeEnd}
        />
      )}
    </div>,
    document.body
  );
}

export { PortalControls as NamedPortalControls };
