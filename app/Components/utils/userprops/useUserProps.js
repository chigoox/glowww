'use client';

import React, { createContext, useContext, useCallback } from 'react';
// Phase 2 template & reorder support
import * as userPropTemplates from './userPropTemplates.js';
import { reorderArrayItem, setExpressionAtPath as engineSetExpressionAtPath, createNode } from './userPropsEngine';
// Global + alias support
import {
  loadGlobalUserProps,
  listGlobalPropPaths,
  createOrSetGlobalPrimitive,
  promoteLocalNodeToGlobal,
  createAliasToGlobal,
  syncAliasNodes,
  isGlobalLoaded,
  getGlobalRoot,
  subscribeGlobalUserProps
} from './globalUserPropsStore';
import {
  renameGlobalPath,
  deleteGlobalPath,
  undoGlobalUserProps,
  redoGlobalUserProps,
  countAliasesReferencing
} from './globalUserPropsStore';
import { detachAliasNode } from './globalUserPropsStore';
import { useEditor } from '@craftjs/core';
import {
  ensureTree,
  touchLegacyMap,
  getNodeAtPath,
  setPrimitiveValueAtPath,
  deleteAtPath,
  listPaths,
  addChildToObject,
  pushItemToArray,
  setGlobalFlag,
  setPrimitiveSmart,
  inferTypeFromString,
  coerceToType,
  searchPaths,
  setExpressionAtPath,
  clearExpressionAtPath,
  clearValidationAtPath,
  extractExpressionDeps,
  validateTree,
  traverseAndSyncReferences,
  evaluatePipeline
} from './userPropsEngine';

const UserPropsContext = createContext();

export const UserPropsProvider = ({ children }) => {
  return (
    <UserPropsContext.Provider value={{}}>
      {children}
    </UserPropsContext.Provider>
  );
};

/**
 * Hook for managing user props
 * Provides utilities for getting, setting, and managing user-defined properties
 */
export const useUserProps = (nodeId = null) => {
  const { actions, query } = useEditor();
  const [globalVersion, setGlobalVersion] = React.useState(0);
  // Placeholder for site / user context (Phase 1 assumption: provided on window or ROOT props)
  // Attempt to derive userId & siteId from ROOT node props if present
  const deriveIds = () => {
    try {
      const root = query.node('ROOT').get();
      const rProps = root?.data?.props || {};
      const userId = rProps.currentUserId || (typeof window !== 'undefined' && window.__editorUserId) || null;
      const siteId = rProps.currentSiteId || (typeof window !== 'undefined' && window.__editorSiteId) || null;
      return { userId, siteId };
    } catch { return { userId: null, siteId: null }; }
  };

  const ensureGlobalLoaded = useCallback(async () => {
    if (isGlobalLoaded()) return true;
    const { userId, siteId } = deriveIds();
    if (!userId || !siteId) {
      // Attempt dev fallback: try to read from window fallback stash or environment
      try {
        if (typeof window !== 'undefined') {
          const w = window;
          if (!userId && w.__editorUserIdFallback) w.__editorUserId = w.__editorUserIdFallback;
          if (!siteId && w.__editorSiteIdFallback) w.__editorSiteId = w.__editorSiteIdFallback;
        }
      } catch {/* ignore */}
      const retry = deriveIds();
      if (!retry.userId || !retry.siteId) {
        // Auto-bootstrap ephemeral IDs in dev so UI can function
        try {
          if (typeof window !== 'undefined') {
            const host = window.location?.host || '';
            const isDevHost = /localhost|127\.0\.0\.1/.test(host);
            const isDevEnv = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production');
            if (isDevHost || isDevEnv) {
              window.__editorUserId = 'devUser';
              window.__editorSiteId = 'devSite';
              console.warn('[UserProps] Using ephemeral devUser/devSite. Provide currentUserId/currentSiteId on ROOT for persistence.');
              await loadGlobalUserProps('devUser','devSite');
              return true;
            }
          }
        } catch {/* ignore */}
        return false;
      }
      try { await loadGlobalUserProps(retry.userId, retry.siteId); return true; } catch { return false; }
    }
    try { await loadGlobalUserProps(userId, siteId); return true; } catch { return false; }
  }, [query]);

  // Subscribe to remote global updates to sync aliases & evaluate
  // (moved subscription effect below scheduleEvaluation definition)

  // scheduleEvaluation moved earlier to avoid TDZ in dependency arrays
  const scheduleEvaluation = useCallback((targetNodeId = nodeId) => {
    setTimeout(async () => {
      try {
  if (!targetNodeId) return; // silently ignore when no node context
  let craftNode;
  try { craftNode = query.node(targetNodeId).get(); } catch { return; }
        const props = craftNode.data.props;
        const tree = props.userPropsTree;
        if (!tree) return;
        try { syncAliasNodes(tree); } catch {/* ignore alias sync errors */}
        const cloned = JSON.parse(JSON.stringify(tree));
        const prevSnap = props.userPropsWatcherSnapshot || null;
        const { exprChanges, validationErrors, watcherResult, metrics } = await evaluatePipeline(cloned, prevSnap);
        actions.setProp(targetNodeId, (p) => {
          const liveTree = ensureTree(p);
          exprChanges.forEach(pt => {
            try {
              const src = getNodeAtPath(cloned, pt);
              const dst = getNodeAtPath(liveTree, pt);
              if (src && dst) {
                dst.type = src.type;
                if (dst.hasOwnProperty('value')) dst.value = src.value;
                if (dst.meta && dst.meta.expressionError) delete dst.meta.expressionError;
                if (src.meta && src.meta.expressionError) {
                  dst.meta = dst.meta || {}; dst.meta.expressionError = src.meta.expressionError;
                }
              }
            } catch {/* ignore individual path errors */}
          });
          function propagateErrors(node, path='') {
            if (!node) return;
            if (node.meta && node.meta.expression && node.meta.expressionError) {
              const dst = getNodeAtPath(liveTree, path);
              if (dst) { dst.meta = dst.meta || {}; dst.meta.expressionError = node.meta.expressionError; }
            } else if (node.meta && node.meta && node.meta.expression && !node.meta.expressionError) {
              const dst = getNodeAtPath(liveTree, path); if (dst && dst.meta && dst.meta.expressionError) delete dst.meta.expressionError;
            }
            if (node.type === 'object') Object.entries(node.children||{}).forEach(([k,c])=>propagateErrors(c, path? path+'.'+k : k));
            else if (node.type === 'array') (node.items||[]).forEach((c,i)=>propagateErrors(c, path? path+'.'+i : String(i)));
          }
          propagateErrors(cloned);
          p.userPropsValidationErrors = validationErrors;
          p.userPropsWatcherSnapshot = watcherResult.snapshot;
          p.userPropsLastMetrics = metrics;
          if (watcherResult.logs && watcherResult.logs.length) {
            p.userPropsWatcherLogs = (p.userPropsWatcherLogs || []).concat(watcherResult.logs).slice(-200);
          }
          p.userPropsUndoStack = (p.userPropsUndoStack || []).slice(-19);
          p.userPropsUndoStack.push(JSON.stringify(liveTree));
          p.userPropsRedoStack = [];
          touchLegacyMap(p);
        });
      } catch (e) {
        console.warn('Deferred evaluation failed', e);
      }
    }, 0);
  }, [actions, query, nodeId]);

  // Define syncAliasesNow early to avoid TDZ when used in subscription effect deps
  const syncAliasesNow = useCallback((targetNodeId = nodeId) => {
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      const changed = syncAliasNodes(tree);
      if (changed) {
        touchLegacyMap(props);
        props.userPropsUndoStack = (props.userPropsUndoStack || []).slice(-19);
        props.userPropsUndoStack.push(JSON.stringify(tree));
        props.userPropsRedoStack = [];
      }
    });
  }, [actions, nodeId]);

  // Get user props for a specific node
  const getUserProps = useCallback((targetNodeId = nodeId) => {
    if (!targetNodeId) return {};
    
    try {
  const data = query.node(targetNodeId).get();
  const props = data?.data?.props || {};
  return props.userProps || {};
    } catch (error) {
      console.warn('Failed to get user props:', error);
      return {};
    }
  }, [query, nodeId]);
  // Internal: get or initialize nested tree for a node (mutates props in craft store)
  const getUserPropsTree = useCallback((targetNodeId = nodeId) => {
    if (!targetNodeId) return null;
    try {
      const node = query.node(targetNodeId);
      const data = node.get();
      const currentProps = data.data.props;
      // ensure tree; must use actions.setProp to persist modifications
      let tree = currentProps.userPropsTree;
      if (!tree) {
        // Need to initialize via setProp to keep craft state immutable contract
        actions.setProp(targetNodeId, (p) => {
          tree = ensureTree(p);
        });
      }
      return tree;
    } catch (e) {
      console.warn('Failed to get user props tree:', e);
      return null;
    }
  }, [query, actions, nodeId]);

  // Get global user props (from ROOT)
  const getGlobalUserProps = useCallback(() => {
    return getUserProps('ROOT');
  }, [getUserProps]);

  // Direct access to global store tree (distinct from ROOT local props)
  const getGlobalTree = useCallback(() => {
    try { return getGlobalRoot(); } catch { return null; }
  }, []);

  // Get all available user props (local + global)
  const getAllUserProps = useCallback((targetNodeId = nodeId) => {
    const localProps = getUserProps(targetNodeId);
    const globalProps = getGlobalUserProps();
    
    // Merge global and local props, with local taking precedence
    const allProps = {};
    
    // Add global props first
    Object.entries(globalProps).forEach(([key, data]) => {
      allProps[key] = { ...data, isGlobal: true };
    });
    
    // Add local props (overwrites global if same key)
    Object.entries(localProps).forEach(([key, data]) => {
      allProps[key] = { ...data, isGlobal: false };
    });
    
    return allProps;
  }, [getUserProps, getGlobalUserProps]);

  // Set user props for a node
  const setUserProps = useCallback((targetNodeId = nodeId, userProps) => {
    if (!targetNodeId) return;
    
    try {
      actions.setProp(targetNodeId, (props) => {
        props.userProps = { ...userProps };
      });
    } catch (error) {
      console.error('Failed to set user props:', error);
    }
  }, [actions, nodeId]);

  // Update a specific user prop value
  const updateUserProp = useCallback((key, value, targetNodeId = nodeId) => {
    if (!targetNodeId || !key) return;
    
    const currentProps = getUserProps(targetNodeId);
    const propData = currentProps[key];
    
    if (!propData) {
      console.warn(`User prop '${key}' does not exist on node ${targetNodeId}`);
      return;
    }

    const updatedProps = {
      ...currentProps,
      [key]: {
        ...propData,
        value: value
      }
    };

    setUserProps(targetNodeId, updatedProps);
  }, [getUserProps, setUserProps]);

  // Get a specific user prop value (checks local first, then global)
  const getUserPropValue = useCallback((key, targetNodeId = nodeId) => {
    const allProps = getAllUserProps(targetNodeId);
    const propData = allProps[key];
    return propData ? propData.value : undefined;
  }, [getAllUserProps]);

  // Check if a user prop exists
  const hasUserProp = useCallback((key, targetNodeId = nodeId) => {
    const allProps = getAllUserProps(targetNodeId);
    return key in allProps;
  }, [getAllUserProps]);

  // Get all available user prop keys
  const getUserPropKeys = useCallback((targetNodeId = nodeId, includeGlobal = true) => {
    if (includeGlobal) {
      const allProps = getAllUserProps(targetNodeId);
      return Object.keys(allProps);
    } else {
      const localProps = getUserProps(targetNodeId);
      return Object.keys(localProps);
    }
  }, [getAllUserProps, getUserProps]);

  // Get user prop data (value + metadata)
  const getUserPropData = useCallback((key, targetNodeId = nodeId) => {
    const allProps = getAllUserProps(targetNodeId);
    return allProps[key] || null;
  }, [getAllUserProps]);

  // Get all nodes that have user props
  const getNodesWithUserProps = useCallback(() => {
    try {
      const allNodes = query.getNodes();
      const nodesWithProps = {};
      
      Object.entries(allNodes).forEach(([nodeId, nodeData]) => {
        const userProps = nodeData.data.props.userProps;
        if (userProps && Object.keys(userProps).length > 0) {
          nodesWithProps[nodeId] = {
            displayName: nodeData.data.displayName || nodeData.data.type || 'Unknown',
            userProps: userProps
          };
        }
      });
      
      return nodesWithProps;
    } catch (error) {
      console.warn('Failed to get nodes with user props:', error);
      return {};
    }
  }, [query]);

  // --- New Nested APIs ---

  const listUserPropPaths = useCallback((options = {}, targetNodeId = nodeId) => {
    const tree = getUserPropsTree(targetNodeId);
    if (!tree) return [];
    return listPaths(tree, options);
  }, [getUserPropsTree, nodeId]);

  const searchUserPropPaths = useCallback((queryStr, options = {}, targetNodeId = nodeId) => {
    const tree = getUserPropsTree(targetNodeId);
    if (!tree) return [];
    return searchPaths(tree, queryStr, options);
  }, [getUserPropsTree, nodeId]);

  const getValueAtPath = useCallback((path, targetNodeId = nodeId) => {
    if (!path) return undefined;
    const tree = getUserPropsTree(targetNodeId);
    if (!tree) return undefined;
    const node = getNodeAtPath(tree, path);
    if (!node) return undefined;
    // If this node is an alias to a Site Global, read the live global value directly to avoid staleness
    try {
      if (node.meta && (node.meta.aliasGlobalPath || node.meta.aliasGlobalId)) {
        if (isGlobalLoaded()) {
          const globalRoot = getGlobalRoot();
          const gPath = node.meta.aliasGlobalPath;
          if (gPath) {
            const gNode = getNodeAtPath(globalRoot, gPath);
            if (gNode && gNode.type !== 'object' && gNode.type !== 'array') return gNode.value;
          }
        }
      }
    } catch {/* ignore */}
    // primitives -> value; containers -> structured JS
    if (node.type === 'object' || node.type === 'array') return undefined; // explicit: container has no direct value
    return node.value;
  }, [getUserPropsTree, nodeId]);

  // Explicit global value lookup (bypasses local tree) for components that have not yet created an alias
  const getGlobalValue = useCallback((path) => {
    try {
      if (!path) return undefined;
      // Use actual global store root (bug fix: previously used getUserProps('ROOT') which is editor root props, not global store)
      if (!isGlobalLoaded()) return undefined;
      const globalRoot = getGlobalRoot();
      const node = getNodeAtPath(globalRoot, path);
      if (!node) return undefined;
      if (node.type === 'object' || node.type === 'array') return undefined;
      return node.value;
    } catch { return undefined; }
  }, []);


  const setPrimitiveAtPath = useCallback((path, value, typeHint, targetNodeId = nodeId) => {
    if (!path) return;
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      const node = getNodeAtPath(tree, path);
      if (node && node.meta && node.meta.ref) return; // ignore edits to bound props
      setPrimitiveValueAtPath(tree, path, value, typeHint);
      touchLegacyMap(props);
    });
    scheduleEvaluation(targetNodeId);
  }, [actions, nodeId, scheduleEvaluation]);

  // Subscription to global store events (placed after scheduleEvaluation to avoid temporal dead zone)
  React.useEffect(() => {
    let unsub = subscribeGlobalUserProps((evt) => {
      if (!evt) return;
  setGlobalVersion(v => v + 1);
      if (evt.type === 'remote-update' || evt.type === 'undo' || evt.type === 'redo') {
        try { syncAliasesNow(nodeId); } catch {/* ignore */}
        scheduleEvaluation(nodeId);
      } else if (evt.type === 'rename') {
        actions.setProp(nodeId, (props) => { try { syncAliasesNow(nodeId); touchLegacyMap(props); } catch {/* ignore */} });
        scheduleEvaluation(nodeId);
      } else if (evt.type === 'delete') {
        // On delete: sync aliases (some may now point to missing node) then evaluate
        actions.setProp(nodeId, (props) => { try { syncAliasesNow(nodeId); touchLegacyMap(props); } catch {/* ignore */} });
        scheduleEvaluation(nodeId);
      }
    });
    return () => { try { unsub && unsub(); } catch {/* ignore */} };
  }, [nodeId, scheduleEvaluation, syncAliasesNow, actions]);

  const setPrimitiveSmartAtPath = useCallback((path, rawValue, options = {}, targetNodeId = nodeId) => {
    if (!path) return;
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      const node = getNodeAtPath(tree, path);
      if (node && node.meta && node.meta.ref) return;
      setPrimitiveSmart(tree, path, rawValue, options);
      touchLegacyMap(props);
    });
    scheduleEvaluation(targetNodeId);
  }, [actions, nodeId, scheduleEvaluation]);

  const deletePath = useCallback((path, targetNodeId = nodeId) => {
    if (!path) return;
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      deleteAtPath(tree, path);
      touchLegacyMap(props);
    });
  }, [actions, nodeId]);

  const addObjectChild = useCallback((parentPath, key, type, initialValue, isGlobal, targetNodeId = nodeId) => {
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      const path = parentPath || '';
      addChildToObject(tree, path, key, type, initialValue, isGlobal);
      touchLegacyMap(props);
    });
  }, [actions, nodeId]);

  const pushArrayItem = useCallback((arrayPath, type, initialValue, isGlobal, targetNodeId = nodeId) => {
    let index = -1;
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      index = pushItemToArray(tree, arrayPath, type, initialValue, isGlobal);
      touchLegacyMap(props);
    });
    return index;
  }, [actions, nodeId]);

  const toggleGlobalFlag = useCallback((path, makeGlobal, targetNodeId = nodeId) => {
    if (!path) return;
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      const node = getNodeAtPath(tree, path);
      if (!node) return;
      if (makeGlobal) {
        // If already an alias, nothing to do
        if (node.meta && node.meta.aliasGlobalId) return;
        try {
          // Promote inline (reuse underlying promote util)
          const result = promoteLocalNodeToGlobal(tree, path, path);
          if (result && node.meta) {
            // node meta now includes alias markers; clear legacy flag
            if (node.global) delete node.global;
          }
        } catch (e) {
          // fallback: mark legacy flag so user sees something (will not sync though)
          setGlobalFlag(tree, path, true);
        }
      } else {
        // Unset global: if alias -> detach to local copy
        if (node.meta && node.meta.aliasGlobalId) {
          delete node.meta.aliasGlobalId; delete node.meta.aliasGlobalPath; node.meta.detachedManually = Date.now();
        }
        if (node.global) delete node.global; // remove legacy flag
      }
      touchLegacyMap(props);
    });
    // After promotion or detach, evaluate to pull current global value or finalize local
    scheduleEvaluation(targetNodeId);
  }, [actions, nodeId, scheduleEvaluation]);

  // ---- Global & Alias APIs (Phase 1) ----
  const listSiteGlobalPropPaths = useCallback(async (options = {}) => {
    const ok = await ensureGlobalLoaded(); if (!ok) return [];
    return listGlobalPropPaths(options);
  }, [ensureGlobalLoaded]);

  const createGlobalPrimitive = useCallback(async (path, type, value) => {
    const ok = await ensureGlobalLoaded(); if (!ok) throw new Error('Global store not loaded');
    createOrSetGlobalPrimitive(path, type, value);
  }, [ensureGlobalLoaded]);

  const promoteLocalToGlobal = useCallback(async (localPath, desiredGlobalPath, targetNodeId = nodeId) => {
    if (!localPath || !desiredGlobalPath) return null;
    const ok = await ensureGlobalLoaded(); if (!ok) throw new Error('Global store not loaded');
    let result = null;
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      try { result = promoteLocalNodeToGlobal(tree, localPath, desiredGlobalPath); touchLegacyMap(props); } catch (e) { /* eslint-disable-next-line no-console */ console.warn('promoteLocalToGlobal failed', e); }
    });
    scheduleEvaluation(targetNodeId);
    return result;
  }, [actions, nodeId, ensureGlobalLoaded, scheduleEvaluation]);

  const createAliasToGlobalPath = useCallback(async (localPath, globalPathOrId, targetNodeId = nodeId) => {
    if (!localPath || !globalPathOrId) return null;
    const ok = await ensureGlobalLoaded(); if (!ok) throw new Error('Global store not loaded');
    let result = null;
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      try { result = createAliasToGlobal(tree, localPath, globalPathOrId); touchLegacyMap(props); } catch (e) { /* eslint-disable-next-line no-console */ console.warn('createAliasToGlobal failed', e); }
    });
    scheduleEvaluation(targetNodeId);
    return result;
  }, [actions, nodeId, ensureGlobalLoaded, scheduleEvaluation]);


  const getNodeMeta = useCallback((path, targetNodeId = nodeId) => {
    const tree = getUserPropsTree(targetNodeId);
    if (!tree) return null;
    const node = getNodeAtPath(tree, path);
    if (!node) return null;
    return { type: node.type, global: !!node.global, isLeaf: !['object','array'].includes(node.type), meta: node.meta || {} };
  }, [getUserPropsTree, nodeId]);

  const detachAlias = useCallback((path, targetNodeId = nodeId) => {
    if (!path) return;
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      const node = getNodeAtPath(tree, path);
      if (node && node.meta && node.meta.aliasGlobalId) {
        detachAliasNode(node);
        node.meta.detachedManually = Date.now();
        touchLegacyMap(props);
      }
    });
    scheduleEvaluation(targetNodeId);
  }, [actions, nodeId, scheduleEvaluation]);

  const updateNodeMeta = useCallback((path, metaPatch, targetNodeId = nodeId) => {
    if (!path) return;
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      const node = getNodeAtPath(tree, path);
      if (node) {
        node.meta = { ...(node.meta||{}), ...metaPatch };
        touchLegacyMap(props);
      }
    });
  }, [actions, nodeId]);

  // Binding: copy & attach ref to component prop (live sync)
  const bindUserPropToProp = useCallback((targetPath, sourceNodeId, propName, targetNodeId = nodeId) => {
    if (!targetPath || !sourceNodeId || !propName) return;
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      const node = getNodeAtPath(tree, targetPath);
      // Disallow binding for container nodes (object/array)
      if (node && (node.type === 'object' || node.type === 'array')) {
        console.warn('Binding disallowed: cannot bind object/array user prop nodes to component props.');
        return; // abort
      }
      if (node) {
        let value;
        try { value = query.node(sourceNodeId).get().data.props[propName]; } catch { value = undefined; }
        if (value !== undefined) {
          // If source value itself is a container, disallow binding (must be primitive)
          if (value && typeof value === 'object') {
            console.warn('Binding disallowed: source component prop is an object/array; only primitive values can be bound.');
            return; // abort without setting ref
          }
          // primitive binding only
          let t = typeof value;
          if (!['string','number','boolean'].includes(t)) t = 'string';
          node.type = t;
          node.value = value;
        }
        node.meta = node.meta || {};
        node.meta.ref = { sourceNodeId, propName };
      }
      touchLegacyMap(props);
    });
  }, [actions, nodeId]);

  const unbindUserPropPath = useCallback((targetPath, targetNodeId = nodeId) => {
    if (!targetPath) return;
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      const node = getNodeAtPath(tree, targetPath);
      if (node && node.meta && node.meta.ref) delete node.meta.ref;
      touchLegacyMap(props);
    });
  }, [actions, nodeId]);

  // Sync any bound refs by reading live component props through query
  const syncBoundUserProps = useCallback((targetNodeId = nodeId) => {
    if (!targetNodeId) return;
    actions.setProp(targetNodeId, async (props) => {
      const tree = ensureTree(props);
      const changed = traverseAndSyncReferences(tree, (srcNodeId, propName) => {
        try {
          const n = query.node(srcNodeId).get();
          return n.data.props[propName];
        } catch { return undefined; }
      });
      const prevSnap = props.userPropsWatcherSnapshot || null;
  // Clone before async evaluation to avoid working on a revoked proxy
  const cloned = JSON.parse(JSON.stringify(tree));
  const { exprChanges, validationErrors, watcherResult, metrics } = await evaluatePipeline(cloned, prevSnap);
      props.userPropsValidationErrors = validationErrors;
      props.userPropsWatcherSnapshot = watcherResult.snapshot;
      props.userPropsLastMetrics = metrics;
      if (watcherResult.logs && watcherResult.logs.length) {
        props.userPropsWatcherLogs = (props.userPropsWatcherLogs || []).concat(watcherResult.logs).slice(-200);
      }
      if (changed || exprChanges.length || watcherResult.triggered.length) {
        props.userPropsUndoStack = (props.userPropsUndoStack || []).slice(-19);
        props.userPropsUndoStack.push(JSON.stringify(tree));
        props.userPropsRedoStack = [];
        touchLegacyMap(props);
      }
    });
  }, [actions, nodeId, query]);

  const evaluateAll = useCallback((targetNodeId = nodeId) => {
    scheduleEvaluation(targetNodeId);
  }, [scheduleEvaluation]);

  const getValidationErrors = useCallback((targetNodeId = nodeId) => {
    try {
      const node = query.node(targetNodeId).get();
      return node.data.props.userPropsValidationErrors || {};
    } catch { return {}; }
  }, [query, nodeId]);

  const addWatcher = useCallback((path, script, targetNodeId = nodeId) => {
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      const node = getNodeAtPath(tree, path);
      if (node) {
        node.meta = node.meta || {};
        node.meta.watchers = Array.isArray(node.meta.watchers) ? node.meta.watchers : [];
        node.meta.watchers.push({ script });
      }
    }, [actions, nodeId]);
  }, [actions, nodeId]);

  const removeWatcher = useCallback((path, index, targetNodeId = nodeId) => {
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      const node = getNodeAtPath(tree, path);
      if (node && node.meta && Array.isArray(node.meta.watchers)) {
        node.meta.watchers.splice(index,1);
      }
    }, [actions, nodeId]);
  }, [actions, nodeId]);

  const updateWatcher = useCallback((path, index, script, targetNodeId = nodeId) => {
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      const node = getNodeAtPath(tree, path);
      if (node && node.meta && Array.isArray(node.meta.watchers) && node.meta.watchers[index]) {
        node.meta.watchers[index].script = script;
      }
    }, [actions, nodeId]);
  }, [actions, nodeId]);

  const listWatchers = useCallback((path, targetNodeId = nodeId) => {
    try {
      const props = query.node(targetNodeId).get().data.props;
      const tree = ensureTree(props);
      const node = getNodeAtPath(tree, path);
      return node && node.meta && Array.isArray(node.meta.watchers) ? node.meta.watchers : [];
    } catch { return []; }
  }, [nodeId, query]);

  // Expression APIs
  const setExpression = useCallback((path, code, targetNodeId = nodeId) => {
    if (!path) return;
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      setExpressionAtPath(tree, path, code);
      props.userPropsExpressionHistory = props.userPropsExpressionHistory || {};
      const hist = props.userPropsExpressionHistory[path] || [];
      if (!hist.includes(code)) props.userPropsExpressionHistory[path] = [code, ...hist].slice(0,5);
      touchLegacyMap(props);
    });
    scheduleEvaluation(targetNodeId);
  }, [actions, nodeId, scheduleEvaluation]);

  const clearExpression = useCallback((path, targetNodeId = nodeId) => {
    if (!path) return;
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      clearExpressionAtPath(tree, path);
      touchLegacyMap(props);
    });
    scheduleEvaluation(targetNodeId);
  }, [actions, nodeId, scheduleEvaluation]);

  // Validation merge & clear
  const updateValidation = useCallback((path, partial, targetNodeId = nodeId) => {
    if (!path) return;
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      const node = getNodeAtPath(tree, path);
      if (node) {
        node.meta = node.meta || {};
        node.meta.validation = { ...(node.meta.validation||{}), ...partial };
      }
      const validation = validateTree(tree);
      props.userPropsValidationErrors = validation;
      touchLegacyMap(props);
    });
  }, [actions, nodeId]);

  const clearValidation = useCallback((path, targetNodeId = nodeId) => {
    if (!path) return;
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      clearValidationAtPath(tree, path);
      const validation = validateTree(tree);
      props.userPropsValidationErrors = validation;
      touchLegacyMap(props);
    });
  }, [actions, nodeId]);

  const listDependencies = useCallback((expressionCode) => {
    return Array.from(extractExpressionDeps(expressionCode || ''));
  }, []);

  const batchUpdate = useCallback((paths, mutator, targetNodeId = nodeId) => {
    if (!Array.isArray(paths) || !paths.length) return;
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      paths.forEach(p => { try { mutator(tree, p, getNodeAtPath(tree, p)); } catch {/* ignore */} });
      touchLegacyMap(props);
    });
    scheduleEvaluation(targetNodeId);
  }, [actions, nodeId, scheduleEvaluation]);

  const getExpressionHistory = useCallback((path, targetNodeId = nodeId) => {
    try {
      const node = query.node(targetNodeId).get();
      return (node.data.props.userPropsExpressionHistory || {})[path] || [];
    } catch { return []; }
  }, [query, nodeId]);

  const getJsValueAtPath = useCallback((path, targetNodeId = nodeId) => {
    const tree = getUserPropsTree(targetNodeId);
    if (!tree) return undefined;
    const node = getNodeAtPath(tree, path);
    if (!node) return undefined;
    if (node.type === 'object' || node.type === 'array') {
      // reconstruct JS manually
      try { return JSON.parse(JSON.stringify(node)); } catch { return undefined; }
    }
    return node.value;
  }, [getUserPropsTree, nodeId]);

  // Simple JSON diff leveraging last two undo snapshots; line-based diff for readability
  const getPathDiff = useCallback((path, targetNodeId = nodeId) => {
    try {
      const node = query.node(targetNodeId).get();
      const stack = node.data.props.userPropsUndoStack || [];
      if (stack.length < 2) return [];
      const prevTree = JSON.parse(stack[stack.length - 2]);
      const currTree = JSON.parse(stack[stack.length - 1]);
      // traverse to path in both
      const parts = path.split('.').filter(Boolean);
      function dive(root){
        let n = root; for(const p of parts){ if(!n) return undefined; if(n.type==='object') n = (n.children||{})[p]; else if(n.type==='array') n = (n.items||[])[Number(p)]; else return undefined; }
        if(!n) return undefined;
        if(n.type==='object' || n.type==='array') return JSON.parse(JSON.stringify(n));
        return n.value;
      }
      const prevVal = dive(prevTree);
      const currVal = dive(currTree);
      const prevJson = JSON.stringify(prevVal, null, 2).split('\n');
      const currJson = JSON.stringify(currVal, null, 2).split('\n');
      // classic LCS diff (simplified) for small sizes
      const m = prevJson.length, n2 = currJson.length;
      const dp = Array.from({length:m+1},()=>Array(n2+1).fill(0));
      for(let i=1;i<=m;i++) for(let j=1;j<=n2;j++) dp[i][j] = prevJson[i-1]===currJson[j-1]? dp[i-1][j-1]+1: Math.max(dp[i-1][j], dp[i][j-1]);
      const diff=[]; let i=m,j=n2; while(i>0 && j>0){ if(prevJson[i-1]===currJson[j-1]){ diff.push({type:'unchanged', line:prevJson[i-1]}); i--; j--; } else if(dp[i-1][j]>=dp[i][j-1]){ diff.push({type:'removed', line:prevJson[i-1]}); i--; } else { diff.push({type:'added', line:currJson[j-1]}); j--; } }
      while(i>0){ diff.push({type:'removed', line:prevJson[i-1]}); i--; }
      while(j>0){ diff.push({type:'added', line:currJson[j-1]}); j--; }
      return diff.reverse();
    } catch { return []; }
  }, [query, nodeId]);

  const setValidationForPath = useCallback((path, rules, targetNodeId = nodeId) => {
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      const node = getNodeAtPath(tree, path);
      if (node) {
        node.meta = node.meta || {};
        node.meta.validation = { ...(node.meta.validation||{}), ...rules };
      }
      const validation = validateTree(tree);
      props.userPropsValidationErrors = validation;
    });
  }, [actions, nodeId]);

  // Undo / Redo
  const undoUserProps = useCallback((targetNodeId = nodeId) => {
    actions.setProp(targetNodeId, (props) => {
      const stack = props.userPropsUndoStack || [];
      if (stack.length < 2) return; // nothing to undo (last is current)
      const current = stack.pop();
      props.userPropsRedoStack = props.userPropsRedoStack || [];
      props.userPropsRedoStack.push(current);
      const previousSerialized = stack[stack.length -1];
      try { props.userPropsTree = JSON.parse(previousSerialized); touchLegacyMap(props); } catch {/* ignore */}
    });
  }, [actions, nodeId]);

  const redoUserProps = useCallback((targetNodeId = nodeId) => {
    actions.setProp(targetNodeId, (props) => {
      const redo = props.userPropsRedoStack || [];
      if (!redo.length) return;
      const nextSerialized = redo.pop();
      props.userPropsUndoStack = props.userPropsUndoStack || [];
      props.userPropsUndoStack.push(nextSerialized);
      try { props.userPropsTree = JSON.parse(nextSerialized); touchLegacyMap(props); } catch {/* ignore */}
    });
  }, [actions, nodeId]);

  const getWatcherLogs = useCallback((targetNodeId = nodeId) => {
    try {
      const node = query.node(targetNodeId).get();
      return node.data.props.userPropsWatcherLogs || [];
    } catch { return []; }
  }, [query, nodeId]);

  // --- Templates & Bulk ---
  const applyExpressionTemplate = useCallback((path, templateKey, params = {}, targetNodeId = nodeId) => {
    if (!path || !templateKey) return;
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      const code = userPropTemplates.buildExpressionTemplate(templateKey, params);
      if (!code) return;
      let node = getNodeAtPath(tree, path);
      if (!node) {
        const parts = path.split('.');
        const key = parts.pop();
        const parentPath = parts.join('.');
        const parent = parentPath ? getNodeAtPath(tree, parentPath) : tree;
        if (parent && parent.type === 'object') parent.children[key] = createNode('string', { value: '' });
        node = getNodeAtPath(tree, path);
      }
      if (!node || node.type === 'object' || node.type === 'array') return;
      engineSetExpressionAtPath(tree, path, code);
      touchLegacyMap(props);
    });
    scheduleEvaluation(targetNodeId);
  }, [actions, nodeId, scheduleEvaluation]);

  const applyWatcherTemplate = useCallback((path, templateKey, params = {}, targetNodeId = nodeId) => {
    if (!path || !templateKey) return;
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      const node = getNodeAtPath(tree, path);
      if (!node) return;
      const code = userPropTemplates.buildWatcherTemplate(templateKey, params);
      if (!code) return;
      node.meta = node.meta || {};
      node.meta.watchers = Array.isArray(node.meta.watchers) ? node.meta.watchers : [];
      node.meta.watchers.push({ script: code });
      touchLegacyMap(props);
    });
  }, [actions, nodeId]);

  const bulkApplyExpressionTemplate = useCallback((paths, templateKey, params = {}, targetNodeId = nodeId) => {
    if (!Array.isArray(paths) || !paths.length || !templateKey) return;
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      const code = userPropTemplates.buildExpressionTemplate(templateKey, params);
      if (!code) return;
      paths.forEach(p => { try { const n = getNodeAtPath(tree, p); if (n && n.type !== 'object' && n.type !== 'array') engineSetExpressionAtPath(tree, p, code); } catch {/* ignore */} });
      touchLegacyMap(props);
    });
    scheduleEvaluation(targetNodeId);
  }, [actions, nodeId, scheduleEvaluation]);

  const reorderArray = useCallback((arrayPath, fromIndex, toIndex, targetNodeId = nodeId) => {
    if (!arrayPath) return;
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      try { reorderArrayItem(tree, arrayPath, fromIndex, toIndex); touchLegacyMap(props); } catch {/* ignore */}
    });
  }, [actions, nodeId]);

  return {
    // Core functions
    getUserProps,
    getGlobalUserProps,
  getGlobalTree,
    getAllUserProps,
  globalVersion,
    setUserProps,
    updateUserProp,
    
    // Utility functions
    getUserPropValue,
    hasUserProp,
    getUserPropKeys,
  getUserPropData,
  getNodesWithUserProps,

  // Tree functions
  getUserPropsTree,
  listUserPropPaths,
  searchUserPropPaths,
  getValueAtPath,
  getGlobalValue,
  setPrimitiveAtPath,
  setPrimitiveSmartAtPath,
  deletePath,
  addObjectChild,
  pushArrayItem,
  toggleGlobalFlag,
  getNodeMeta,
  updateNodeMeta,
  bindUserPropToProp,
  unbindUserPropPath,
  syncBoundUserProps,
  inferTypeFromString,
  coerceToType,
  // evaluation & validation
  evaluateAll,
  getValidationErrors,
  setValidationForPath,
  addWatcher
  ,removeWatcher
  ,updateWatcher
  ,listWatchers
  ,setExpression
  ,clearExpression
  ,updateValidation
  ,clearValidation
  ,listDependencies
  ,batchUpdate
  ,getExpressionHistory
  ,getJsValueAtPath
  ,getPathDiff
  ,undoUserProps
  ,redoUserProps
  ,getWatcherLogs
  ,applyExpressionTemplate
  ,applyWatcherTemplate
  ,bulkApplyExpressionTemplate
  ,reorderArray
  // Global & alias
  ,listSiteGlobalPropPaths
  ,createGlobalPrimitive
  ,promoteLocalToGlobal
  ,createAliasToGlobalPath
  ,syncAliasesNow
  ,ensureGlobalLoaded
  ,renameGlobalPath
  ,deleteGlobalPath
  ,undoGlobalUserProps
  ,redoGlobalUserProps
  ,countAliasesReferencing
  ,detachAlias
  };
};

export { UserPropsContext };
