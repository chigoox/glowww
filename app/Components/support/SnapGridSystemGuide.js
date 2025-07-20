/**
 * Snap and Grid System Integration Guide
 * 
 * This system provides professional snap and grid functionality similar to Figma and Adobe XD.
 * 
 * ## Features Implemented:
 * 
 * ### 1. Visual Grid System
 * - Dotted grid overlay for precise alignment
 * - Multiple grid sizes: 8px, 16px, 24px, 32px
 * - Adjustable grid opacity
 * - Zoom-aware grid rendering
 * 
 * ### 2. Smart Snapping
 * - Snap to grid points
 * - Element-to-element snapping (edges, centers)
 * - Canvas edge snapping
 * - Visual snap guides with red lines
 * - Distance indicators with measurements
 * 
 * ### 3. Professional UI Controls
 * - Grid toggle button in TopBar
 * - Snap toggle button in TopBar
 * - Comprehensive settings panel
 * - Keyboard shortcuts (G for grid, Ctrl+; for snap)
 * - Real-time visual feedback
 * 
 * ### 4. Integration with Craft.js
 * - Enhanced drag connectors with snap functionality
 * - Automatic element registration for snapping
 * - Performance optimized with throttling
 * - Seamless integration with existing components
 * 
 * ## How to Use:
 * 
 * ### For Users:
 * 1. Use the grid toggle button in the top toolbar to enable/disable grid
 * 2. Use the snap toggle button to enable/disable snapping
 * 3. Click the settings gear to customize grid size, opacity, and snap sensitivity
 * 4. Drag elements around - they will automatically snap to grid and other elements
 * 5. Visual feedback shows snap points and distances
 * 
 * ### For Developers:
 * 1. Components using snap functionality should import and use `useCraftSnap`
 * 2. Replace regular craft connectors with snap connectors:
 *    - `connect` -> `snapConnect`
 *    - `drag` -> `snapDrag`
 * 3. The canvas (Root component) automatically has grid overlay
 * 4. All settings are managed centrally by SnapGridSystem
 * 
 * ### Integration Example:
 * ```jsx
 * import { useCraftSnap } from "../support/useCraftSnap";
 * 
 * const MyComponent = ({ nodeId }) => {
 *   const { connectors: { snapConnect, snapDrag } } = useCraftSnap(nodeId);
 *   
 *   useEffect(() => {
 *     if (elementRef.current) {
 *       snapConnect(elementRef.current);
 *     }
 *     if (dragHandleRef.current) {
 *       snapDrag(dragHandleRef.current);
 *     }
 *   }, [snapConnect, snapDrag]);
 *   
 *   // ... rest of component
 * };
 * ```
 * 
 * ## Keyboard Shortcuts:
 * - **G**: Toggle grid visibility
 * - **Ctrl/Cmd + '**: Toggle grid visibility
 * - **Ctrl/Cmd + ;**: Toggle snap functionality
 * 
 * ## Technical Details:
 * 
 * ### Core Files:
 * - `SnapGridSystem.js`: Core snap and grid logic
 * - `SnapGridOverlay.jsx`: Visual grid and snap indicators
 * - `SnapGridControls.jsx`: UI controls for settings
 * - `useCraftSnap.js`: React hooks for Craft.js integration
 * 
 * ### Performance Features:
 * - Throttled updates (~60fps)
 * - Cached snap calculations
 * - Optimized element tracking
 * - Automatic cleanup of unused elements
 * 
 * ### Visual Feedback:
 * - Red dashed lines for snap guides
 * - Blue lines with measurements for distances
 * - Animated snap indicators
 * - Professional typography and styling
 * 
 * This system brings professional design tool functionality to your editor,
 * making it easy to create precisely aligned layouts with visual feedback
 * that matches industry standards like Figma and Adobe XD.
 */

console.log('Snap and Grid System loaded successfully! 🎯');
console.log('Features: Grid overlay, Smart snapping, Visual feedback, Keyboard shortcuts');
console.log('Try: G (toggle grid), Ctrl+; (toggle snap), or use the toolbar buttons');
