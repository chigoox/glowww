'use client'

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  order = ["MOVE", "EDIT", "POS"],
  show = { move: true, edit: true, pos: true, corners: true},
  labels = { move: "MOVE", edit: "EDIT", pos: "POS" },
  offsetY = -28,
  offsetX = 0,
  zIndex = 999,
  styleOverrides = {},
  // Optional callback that the portal can call to request a position refresh
  // Keep the name compatible with other code: updateBoxPosition
  updateBoxPosition,
}) {
  if (typeof window === "undefined" || !boxPosition) return null;

  const { top = 0, left = 0, width = 0, height = 0 } = boxPosition || {};
  const showMove = show?.move && !!dragRef;
  const showEdit = show?.edit && !!onEditClick;
  const showPos = show?.pos && !!nodeId;

  const colors = {
    move: styleOverrides.colors?.move || "#52c41a",
    edit: styleOverrides.colors?.edit || "#722ed1",
    pos: styleOverrides.colors?.pos || "#1890ff",
  };

  const baseSegmentStyle = {
    color: "white",
    padding: "4px 10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    minWidth: 56,
    cursor: "pointer",
    transition: "background 0.2s ease",
    ...styleOverrides.segment,
  };

  const segments = [];

  const makeMove = () => (
    <div
      key="MOVE"
      className="move-handle"
      ref={dragRef}
      data-handle-type="move"
      data-craft-node-id={nodeId}
      style={{
        ...baseSegmentStyle,
        background: colors.move,
        cursor: dragRef ? "grab" : "not-allowed",
        borderRight: "1px solid rgba(255,255,255,0.6)",
      }}
      title="Drag to move between containers"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {labels.move}
    </div>
  );

  const makeEdit = () => (
    <div
      key="EDIT"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        // Forward the original event to the consumer so handlers that expect (e)
        // (for example to call preventDefault()) won't receive undefined.
        onEditClick?.(e);
      }}
      style={{
        ...baseSegmentStyle,
        background: colors.edit,
        borderRight: "1px solid rgba(255,255,255,0.6)",
      }}
      title="Edit"
    >
      {labels.edit}
    </div>
  );

  const makePos = () => (
    <SnapPositionHandle
      key="POS"
      nodeId={nodeId}
      style={{
        ...baseSegmentStyle,
        background: colors.pos,
        cursor: "move",
      }}
    >
      {labels.pos}
    </SnapPositionHandle>
  );

  const factory = {
    MOVE: () => showMove && makeMove(),
    EDIT: () => showEdit && makeEdit(),
    POS: () => showPos && makePos(),
  };

  order.forEach((seg, idx) => {
    const el = factory[seg]?.();
    if (el) segments.push(el);
  });

  const showAnySegment = segments.length > 0;
  const showCorners = true; // Always show resize handles

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
      {showAnySegment && (
        <div
          style={{
            position: "absolute",
            top: top + offsetY,
            left: left + width / 2 + offsetX,
            transform: "translateX(-50%)",
            display: "flex",
            background: "white",
            borderRadius: "16px",
            border: "2px solid #d9d9d9",
            overflow: "hidden",
            fontSize: "10px",
            fontWeight: 600,
            userSelect: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            pointerEvents: "auto",
            ...styleOverrides.pill,
          }}
        >
          {segments}
        </div>
      )}

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
