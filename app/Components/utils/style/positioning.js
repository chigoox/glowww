'use client';
/**
 * Shared helpers for sizing and positional style normalization.
 * - Preserves percentage values.
 * - Appends 'px' to numeric values for dimensional & positional properties.
 * - Leaves unitless CSS properties untouched.
 * - Provides guard helpers for POS drag state / recent commit cooldown.
 */

const UNITLESS = new Set([
  'opacity','zIndex','lineHeight','fontWeight','flexGrow','flexShrink','order'
]);

const DIMENSION_PROPS = new Set([
  'width','height','minWidth','maxWidth','minHeight','maxHeight',
  'top','right','bottom','left','margin','marginTop','marginRight','marginBottom','marginLeft',
  'padding','paddingTop','paddingRight','paddingBottom','paddingLeft','gap','rowGap','columnGap','fontSize','letterSpacing','wordSpacing','textIndent','borderRadius','borderWidth','flexBasis'
]);

export function normalizeUnit(value, property){
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'string') {
    // preserve % / px / rem / em / vh / vw etc. Just return as-is.
    return value;
  }
  if (typeof value === 'number') {
    if (UNITLESS.has(property)) return value; // leave numeric
    if (DIMENSION_PROPS.has(property)) return `${value}px`;
  }
  return value;
}

export function positionalStyles({ position, top, right, bottom, left }){
  return {
    position,
    top: normalizeUnit(top,'top'),
    right: normalizeUnit(right,'right'),
    bottom: normalizeUnit(bottom,'bottom'),
    left: normalizeUnit(left,'left')
  };
}

export function sizeStyles({ width, height, minWidth, minHeight, maxWidth, maxHeight }){
  return {
    width: normalizeUnit(width,'width'),
    height: normalizeUnit(height,'height'),
    minWidth: normalizeUnit(minWidth,'minWidth'),
    minHeight: normalizeUnit(minHeight,'minHeight'),
    maxWidth: normalizeUnit(maxWidth,'maxWidth'),
    maxHeight: normalizeUnit(maxHeight,'maxHeight')
  };
}

export function isPosDragActive(){
  if (typeof window === 'undefined') return false;
  return !!window.__GLOW_POS_DRAGGING;
}

export function isRecentPosCommit(nodeId){
  if (typeof window === 'undefined') return false;
  if (!window.__GLOW_POS_RECENT) return false;
  return !!window.__GLOW_POS_RECENT[nodeId];
}

/** Guard to skip container-move resets while POS drag or recent commit cool-down. */
export function shouldSkipPositionReset(nodeId){
  return isPosDragActive() || isRecentPosCommit(nodeId);
}
