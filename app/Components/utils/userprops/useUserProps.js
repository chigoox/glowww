'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { useEditor } from '@craftjs/core';
import {
  ensureTree,
  touchLegacyMap,
  getNodeAtPath,
  setNodeAtPath,
  setPrimitiveValueAtPath,
  deleteAtPath,
  listPaths,
  addChildToObject,
  pushItemToArray,
  setGlobalFlag
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

  // Get user props for a specific node
  const getUserProps = useCallback((targetNodeId = nodeId) => {
    if (!targetNodeId) return {};
    
    try {
      const node = query.node(targetNodeId);
      const props = node.get().data.props;
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
    // Omit root path itself
    return listPaths(tree, options);
  }, [getUserPropsTree, nodeId]);

  const getValueAtPath = useCallback((path, targetNodeId = nodeId) => {
    if (!path) return undefined;
    const tree = getUserPropsTree(targetNodeId);
    if (!tree) return undefined;
    const node = getNodeAtPath(tree, path);
    if (!node) return undefined;
    // primitives -> value; containers -> structured JS
    if (node.type === 'object' || node.type === 'array') return undefined; // explicit: container has no direct value
    return node.value;
  }, [getUserPropsTree, nodeId]);

  const setPrimitiveAtPath = useCallback((path, value, typeHint, targetNodeId = nodeId) => {
    if (!path) return;
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      setPrimitiveValueAtPath(tree, path, value, typeHint);
      touchLegacyMap(props);
    });
  }, [actions, nodeId]);

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

  const toggleGlobalFlag = useCallback((path, isGlobal, targetNodeId = nodeId) => {
    actions.setProp(targetNodeId, (props) => {
      const tree = ensureTree(props);
      setGlobalFlag(tree, path, isGlobal);
      touchLegacyMap(props);
    });
  }, [actions, nodeId]);

  const getNodeMeta = useCallback((path, targetNodeId = nodeId) => {
    const tree = getUserPropsTree(targetNodeId);
    if (!tree) return null;
    const node = getNodeAtPath(tree, path);
    if (!node) return null;
    return { type: node.type, global: !!node.global, isLeaf: !['object','array'].includes(node.type) };
  }, [getUserPropsTree, nodeId]);

  return {
    // Core functions
    getUserProps,
    getGlobalUserProps,
    getAllUserProps,
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
  getValueAtPath,
  setPrimitiveAtPath,
  deletePath,
  addObjectChild,
  pushArrayItem,
  toggleGlobalFlag,
  getNodeMeta
  };
};

export { UserPropsContext };
