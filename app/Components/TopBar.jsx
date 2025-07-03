'use client';

import React, { useState, useEffect } from "react";
import { Switch, Button, Dropdown, Menu, Tooltip } from "antd";
import { UndoOutlined, RedoOutlined, HistoryOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { useEditor } from "@craftjs/core";

export const Topbar = () => {
  const { actions, query, enabled, canUndo, canRedo } = useEditor((state, query) => ({
    enabled: state.options.enabled,
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo()
  }));

  // Track history for dropdown
  const [historyEntries, setHistoryEntries] = useState([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [lastKnownState, setLastKnownState] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Enhanced helper function to detect what changed
  const detectChanges = (previousState, currentState) => {
    try {
      const prev = previousState ? JSON.parse(previousState) : {};
      const curr = JSON.parse(currentState);
      
      // Compare node counts first
      const prevNodes = Object.keys(prev).length;
      const currNodes = Object.keys(curr).length;
      
      if (currNodes > prevNodes) {
        // Find the new node
        const newNodeIds = Object.keys(curr).filter(id => !prev[id]);
        if (newNodeIds.length > 0) {
          const newNode = curr[newNodeIds[0]];
          const componentName = newNode.displayName || newNode.type?.resolvedName || 'Component';
          return `Added ${componentName}`;
        }
        return 'Added component';
      } else if (currNodes < prevNodes) {
        // Find the deleted node
        const deletedNodeIds = Object.keys(prev).filter(id => !curr[id]);
        if (deletedNodeIds.length > 0) {
          const deletedNode = prev[deletedNodeIds[0]];
          const componentName = deletedNode.displayName || deletedNode.type?.resolvedName || 'Component';
          return `Deleted ${componentName}`;
        }
        return 'Deleted component';
      } else {
        // Check for property changes more thoroughly
        for (const nodeId in curr) {
          if (prev[nodeId]) {
            const prevNode = prev[nodeId];
            const currNode = curr[nodeId];
            
            // Check props changes
            const prevProps = JSON.stringify(prevNode.props || {});
            const currProps = JSON.stringify(currNode.props || {});
            
            if (prevProps !== currProps) {
              const componentName = currNode.displayName || currNode.type?.resolvedName || 'Component';
              
              // Try to identify specific property changes
              const prevPropsObj = prevNode.props || {};
              const currPropsObj = currNode.props || {};
              
              const changedProps = [];
              for (const prop in currPropsObj) {
                if (JSON.stringify(prevPropsObj[prop]) !== JSON.stringify(currPropsObj[prop])) {
                  changedProps.push(prop);
                }
              }
              
              if (changedProps.length > 0) {
                const propsList = changedProps.slice(0, 2).join(', ');
                const more = changedProps.length > 2 ? ` +${changedProps.length - 2} more` : '';
                return `Modified ${componentName} (${propsList}${more})`;
              }
              
              return `Modified ${componentName}`;
            }
            
            // Check for parent/child relationship changes
            const prevParent = prevNode.parent;
            const currParent = currNode.parent;
            if (prevParent !== currParent) {
              const componentName = currNode.displayName || currNode.type?.resolvedName || 'Component';
              return `Moved ${componentName}`;
            }
          }
        }
        return 'Updated layout';
      }
    } catch (error) {
      console.warn('Error detecting changes:', error);
      return 'Made changes';
    }
  };

  // Helper function to get a human-readable action description
  const getActionDescription = (actionType, nodeId, props) => {
    const actionMap = {
      'ADD_NODE': 'Added component',
      'DELETE_NODE': 'Deleted component', 
      'MOVE_NODE': 'Moved component',
      'SET_PROP': 'Modified properties',
      'SET_CUSTOM_PROP': 'Updated styling',
      'REPLACE_NODES': 'Replaced component'
    };

    const baseDescription = actionMap[actionType] || 'Performed action';
    
    // Try to get component name from nodeId if available
    try {
      const node = query.node(nodeId).get();
      const componentName = node.data?.displayName || node.data?.name || 'Component';
      return `${baseDescription} (${componentName})`;
    } catch {
      return baseDescription;
    }
  };

  // Handle undo with history tracking
  const handleUndo = () => {
    if (canUndo) {
      actions.history.undo();
      
      // Don't add undo/redo actions to our custom history
      // The state change will be detected by the main history listener
    }
  };

  // Handle redo with history tracking  
  const handleRedo = () => {
    if (canRedo) {
      actions.history.redo();
      
      // Don't add undo/redo actions to our custom history
      // The state change will be detected by the main history listener
    }
  };

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Undo: Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          handleUndo();
        }
      }
      // Redo: Ctrl+Y (Windows/Linux) or Cmd+Shift+Z (Mac) or Ctrl+Shift+Z
      else if (((e.ctrlKey || e.metaKey) && e.key === 'y') || 
               ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        if (canRedo) {
          handleRedo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, handleUndo, handleRedo]);

  // Listen to editor state changes to build history
  useEffect(() => {
    const updateHistory = () => {
      try {
        const currentState = query.serialize();
        const timestamp = new Date().toLocaleTimeString();
        
        // Initialize with current state
        if (!isInitialized) {
          const initialEntry = {
            id: 0,
            description: 'Initial state',
            timestamp: timestamp,
            state: currentState
          };
          setHistoryEntries([initialEntry]);
          setCurrentHistoryIndex(0);
          setLastKnownState(currentState);
          setIsInitialized(true);
          return;
        }

        // Only track changes if state actually changed
        if (lastKnownState && lastKnownState !== currentState) {
          const changeDescription = detectChanges(lastKnownState, currentState);
          
          // Create new history entry
          const newEntry = {
            id: Date.now(), // Use timestamp as unique ID
            description: changeDescription,
            timestamp: timestamp,
            state: currentState
          };
          
          setHistoryEntries(prev => {
            // Remove any future entries when making a new change
            const currentEntries = prev.slice(0, currentHistoryIndex + 1);
            return [...currentEntries, newEntry];
          });
          
          setCurrentHistoryIndex(prev => prev + 1);
          setLastKnownState(currentState);
          
          console.log('History updated:', changeDescription);
        }
      } catch (error) {
        console.warn('Could not update history:', error);
      }
    };

    // Debounce the history updates to avoid too many entries
    const timeoutId = setTimeout(updateHistory, 500);
    return () => clearTimeout(timeoutId);
  }, [query, lastKnownState, detectChanges, isInitialized, currentHistoryIndex]);

  // Separate effect to monitor undo/redo state changes
  useEffect(() => {
    if (isInitialized) {
      const currentState = query.serialize();
      
      // If the current state matches a previous history entry, update the index
      const matchingEntryIndex = historyEntries.findIndex(entry => entry.state === currentState);
      if (matchingEntryIndex !== -1 && matchingEntryIndex !== currentHistoryIndex) {
        setCurrentHistoryIndex(matchingEntryIndex);
        setLastKnownState(currentState);
      }
    }
  }, [canUndo, canRedo, query, isInitialized, historyEntries, currentHistoryIndex]);

  // Jump to a specific point in history
  const jumpToHistoryPoint = (targetIndex) => {
    if (targetIndex < 0 || targetIndex >= historyEntries.length) return;
    
    const targetEntry = historyEntries[targetIndex];
    if (!targetEntry.state) return;
    
    try {
      // Deserialize and load the target state
      actions.deserialize(targetEntry.state);
      setCurrentHistoryIndex(targetIndex);
      setLastKnownState(targetEntry.state);
      
      console.log(`Jumped to history point: ${targetEntry.description}`);
    } catch (error) {
      console.error('Failed to jump to history point:', error);
    }
  };

  // Create history dropdown menu items
  const historyMenuItems = historyEntries.map((entry, index) => {
    const isCurrent = index === currentHistoryIndex;
    
    return {
      key: entry.id.toString(),
      label: (
        <div className={`flex items-center justify-between py-2 px-3 min-w-[280px] rounded-md transition-colors ${
          isCurrent ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-2 h-2 rounded-full ${
              isCurrent ? 'bg-blue-500' : 'bg-gray-300'
            }`} />
            <div className="flex flex-col">
              <span className={`text-sm ${
                isCurrent ? 'font-semibold text-blue-700' : 'text-gray-700'
              }`}>
                {entry.description}
              </span>
              {isCurrent && (
                <span className="text-xs text-blue-500 font-medium">Current</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500">
              {entry.timestamp}
            </span>
            <div className="text-xs text-gray-400">
              #{index}
            </div>
          </div>
        </div>
      ),
      onClick: () => jumpToHistoryPoint(index),
      disabled: isCurrent
    };
  });

  const historyDropdownMenu = {
    items: historyMenuItems.length > 0 ? [
      {
        key: 'header',
        label: (
          <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Edit History</span>
              <span className="text-xs text-gray-500">{historyEntries.length} entries</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Click any entry to jump to that point
            </div>
          </div>
        ),
        disabled: true
      },
      ...historyMenuItems
    ] : [{
      key: 'empty',
      label: (
        <div className="text-center py-8 text-gray-500">
          <HistoryOutlined className="text-2xl mb-2 opacity-50" />
          <div className="text-sm">No history available</div>
          <div className="text-xs mt-1">Start editing to build history</div>
        </div>
      ),
      disabled: true
    }]
  };

  return (
    <div className="bg-[#cbe8e7] mb-2 px-2 py-2 rounded">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center space-x-2">
            <Switch 
              checked={enabled} 
              onChange={(value) => {
                console.log('Toggling enabled state to:', value);
                actions.setOptions(options => {
                  options.enabled = value;
                });
              }} 
            />
            <span className="text-sm">Enable</span>
          </div>

          {/* History Controls */}
          <div className="flex items-center space-x-1 border-l border-gray-300 pl-4 ">
            {/* Undo Button */}
            <Tooltip title={canUndo ? "Undo last action (Ctrl+Z)" : "Nothing to undo"}>
              <Button
                icon={<UndoOutlined />}
                size="small"
                disabled={!canUndo}
                onClick={handleUndo}
                className={`flex items-center justify-center transition-colors ${
                  canUndo ? 'hover:bg-blue-50 hover:text-blue-600' : ''
                }`}
                type="text"
              />
            </Tooltip>

            {/* Redo Button */}
            <Tooltip title={canRedo ? "Redo last action (Ctrl+Y)" : "Nothing to redo"}>
              <Button
                icon={<RedoOutlined />}
                size="small"
                disabled={!canRedo}
                onClick={handleRedo}
                className={`flex items-center justify-center transition-colors ${
                  canRedo ? 'hover:bg-green-50 hover:text-green-600' : ''
                }`}
                type="text"
              />
            </Tooltip>

            {/* History Dropdown */}
            <Dropdown
              menu={historyDropdownMenu}
              placement="bottomLeft"
              trigger={['click']}
              overlayClassName="shadow-lg border border-gray-200 rounded-lg"
              
            >
              <Tooltip title="View and navigate edit history">
                <Button
                  icon={<HistoryOutlined />}
                  size="small"
                  type="text"
                  className="flex items-center space-x-1 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                >
                  <span className="text-xs hidden sm:inline ml-1">History</span>
                </Button>
              </Tooltip>
            </Dropdown>
          </div>
        </div>

        {/* Serialize Button */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-600 hidden md:inline">
            History: {historyEntries.length} entries
          </span>
          <Button 
            onClick={() => {
              try {
                const serialized = query.serialize();
                console.log('Serialized JSON:', serialized);
                console.log('Current history entries:', historyEntries);
              } catch (error) {
                console.error('Error serializing:', error);
              }
            }}
            size="small" 
            type="default" 
            danger
          >
            Serialize JSON to console
          </Button>
        </div>
      </div>
    </div>
  );
};