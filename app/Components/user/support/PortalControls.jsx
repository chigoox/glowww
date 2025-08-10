'use client'

import React from 'react';
import { createPortal } from 'react-dom';
import SnapPositionHandle from '../../editor/SnapPositionHandle';

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
  nodeId,
  dragRef,
  onEditClick,
  handleResizeStart,
  order = ['MOVE', 'EDIT', 'POS'],
  show = { move: true, edit: true, pos: true, corners: true, edges: true },
  labels = { move: 'MOVE', edit: 'EDIT', pos: 'POS' },
  offsetY = -28,
  offsetX = 0,
  zIndex = 99999,
  styleOverrides = {}
}) {
  if (typeof window === 'undefined' || !boxPosition) return null;

  const { top = 0, left = 0, width = 0, height = 0 } = boxPosition || {};
  const showMove = show?.move && !!dragRef;
  const showEdit = show?.edit && !!onEditClick;
  const showPos = show?.pos && !!nodeId;

  const colors = {
    move: styleOverrides.colors?.move || '#52c41a',
    edit: styleOverrides.colors?.edit || '#722ed1',
    pos: styleOverrides.colors?.pos || '#1890ff'
  };

  const baseSegmentStyle = {
    color: 'white',
    padding: '4px 10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    minWidth: 56,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    ...styleOverrides.segment
  };

  const segments = [];

  const makeMove = () => (
    <div
      key="MOVE"
      ref={dragRef}
      data-handle-type="move"
      data-craft-node-id={nodeId}
      style={{
        ...baseSegmentStyle,
        background: colors.move,
        cursor: dragRef ? 'grab' : 'not-allowed',
        borderRight: '1px solid rgba(255,255,255,0.6)'
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
      onClick={(e) => { e.stopPropagation(); onEditClick?.(); }}
      style={{
        ...baseSegmentStyle,
        background: colors.edit,
        borderRight: '1px solid rgba(255,255,255,0.6)'
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
        cursor: 'move'
      }}
    >
      {labels.pos}
    </SnapPositionHandle>
  );

  const factory = {
    MOVE: () => showMove && makeMove(),
    EDIT: () => showEdit && makeEdit(),
    POS: () => showPos && makePos()
  };

  order.forEach((seg, idx) => {
    const el = factory[seg]?.();
    if (el) segments.push(el);
  });

  const showAnySegment = segments.length > 0;
  const showCorners = !!handleResizeStart && show?.corners !== false;
  const showEdges = !!handleResizeStart && show?.edges !== false;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex
      }}
    >
      {showAnySegment && (
        <div
          style={{
            position: 'absolute',
            top: top + offsetY,
            left: left + width / 2 + offsetX,
            transform: 'translateX(-50%)',
            display: 'flex',
            background: 'white',
            borderRadius: '16px',
            border: '2px solid #d9d9d9',
            overflow: 'hidden',
            fontSize: '10px',
            fontWeight: 600,
            userSelect: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            pointerEvents: 'auto',
            ...styleOverrides.pill
          }}
        >
          {segments}
        </div>
      )}

      {/* Resize handles */}
      {showCorners && (
        <>
          {/* Top-left */}
          <div
            style={{ position: 'absolute', top: top - 4, left: left - 4, width: 8, height: 8, background: 'white', border: '2px solid #1890ff', borderRadius: 2, cursor: 'nw-resize', pointerEvents: 'auto' }}
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
            title="Resize"
          />
          {/* Top-right */}
          <div
            style={{ position: 'absolute', top: top - 4, left: left + width - 4, width: 8, height: 8, background: 'white', border: '2px solid #1890ff', borderRadius: 2, cursor: 'ne-resize', pointerEvents: 'auto' }}
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
            title="Resize"
          />
          {/* Bottom-left */}
          <div
            style={{ position: 'absolute', top: top + height - 4, left: left - 4, width: 8, height: 8, background: 'white', border: '2px solid #1890ff', borderRadius: 2, cursor: 'sw-resize', pointerEvents: 'auto' }}
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
            title="Resize"
          />
          {/* Bottom-right */}
          <div
            style={{ position: 'absolute', top: top + height - 4, left: left + width - 4, width: 8, height: 8, background: 'white', border: '2px solid #1890ff', borderRadius: 2, cursor: 'se-resize', pointerEvents: 'auto' }}
            onMouseDown={(e) => handleResizeStart(e, 'se')}
            title="Resize"
          />
        </>
      )}

      {showEdges && (
        <>
          {/* Top edge */}
          <div
            style={{ position: 'absolute', top: top - 4, left: left + width / 2 - 10, width: 20, height: 8, background: 'rgba(24, 144, 255, 0.3)', cursor: 'n-resize', borderRadius: 4, pointerEvents: 'auto' }}
            onMouseDown={(e) => handleResizeStart(e, 'n')}
            title="Resize height"
          />
          {/* Bottom edge */}
          <div
            style={{ position: 'absolute', top: top + height - 4, left: left + width / 2 - 10, width: 20, height: 8, background: 'rgba(24, 144, 255, 0.3)', cursor: 's-resize', borderRadius: 4, pointerEvents: 'auto' }}
            onMouseDown={(e) => handleResizeStart(e, 's')}
            title="Resize height"
          />
          {/* Left edge */}
          <div
            style={{ position: 'absolute', left: left - 4, top: top + height / 2 - 10, width: 8, height: 20, background: 'rgba(24, 144, 255, 0.3)', cursor: 'w-resize', borderRadius: 4, pointerEvents: 'auto' }}
            onMouseDown={(e) => handleResizeStart(e, 'w')}
            title="Resize width"
          />
          {/* Right edge */}
          <div
            style={{ position: 'absolute', left: left + width - 4, top: top + height / 2 - 10, width: 8, height: 20, background: 'rgba(24, 144, 255, 0.3)', cursor: 'e-resize', borderRadius: 4, pointerEvents: 'auto' }}
            onMouseDown={(e) => handleResizeStart(e, 'e')}
            title="Resize width"
          />
        </>
      )}
    </div>,
    document.body
  );
}

export { PortalControls as NamedPortalControls };
