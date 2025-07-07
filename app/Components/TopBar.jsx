'use client';

import React, { useState, useEffect } from "react";
import { Switch, Button, Dropdown, Menu, Tooltip } from "antd";
import { UndoOutlined, RedoOutlined, HistoryOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { useEditor } from "@craftjs/core";
import SaveLoad from "./support/SaveLoad";

export const Topbar = () => {
  const { actions, query, enabled, canUndo, canRedo, editorState } = useEditor((state, query) => ({
    enabled: state.options.enabled,
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo(),
    // Monitor the actual state to trigger history updates
    editorState: state
  }));

  // Track history for dropdown - using Craft.js's internal history
  const [historyEntries, setHistoryEntries] = useState([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);
  const [lastStateSnapshot, setLastStateSnapshot] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Helper function to detect what changed between states
  const detectChanges = (previousState, currentState) => {
    try {
      if (!previousState || !currentState) return 'State change';
      
      const prev = typeof previousState === 'string' ? JSON.parse(previousState) : previousState;
      const curr = typeof currentState === 'string' ? JSON.parse(currentState) : currentState;
      
      // Compare node counts
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
        // Check for property changes
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
          }
        }
        return 'Layout updated';
      }
    } catch (error) {
      console.warn('Error detecting changes:', error);
      return 'Made changes';
    }
  };

  // Handle undo with history sync
  const handleUndo = () => {
    if (canUndo) {
      actions.history.undo();
      setCurrentHistoryIndex(prev => Math.max(0, prev - 1));
    }
  };

  // Handle redo with history sync
  const handleRedo = () => {
    if (canRedo) {
      actions.history.redo();
      setCurrentHistoryIndex(prev => Math.min(historyEntries.length - 1, prev + 1));
    }
  };

  // Listen to state changes to build history entries
  useEffect(() => {
    const updateHistory = () => {
      try {
        const currentState = query.serialize();
        const timestamp = new Date().toLocaleTimeString();
        
        // Initialize history if not done yet
        if (!isInitialized) {
          const initialEntry = {
            id: 0,
            description: 'Initial state',
            timestamp: timestamp,
            state: currentState
          };
          setHistoryEntries([initialEntry]);
          setCurrentHistoryIndex(0);
          setLastStateSnapshot(currentState);
          setIsInitialized(true);
          console.log('History initialized');
          return;
        }

        // Check if state actually changed
        if (lastStateSnapshot && lastStateSnapshot !== currentState) {
          const changeDescription = detectChanges(lastStateSnapshot, currentState);
          
          // Add new entry
          const newEntry = {
            id: Date.now(), // Use timestamp for unique ID
            description: changeDescription,
            timestamp: timestamp,
            state: currentState
          };
          
          setHistoryEntries(prev => [...prev, newEntry]);
          setCurrentHistoryIndex(prev => prev + 1);
          setLastStateSnapshot(currentState);
          
          console.log('History entry added:', changeDescription);
        }
      } catch (error) {
        console.warn('Could not update history:', error);
      }
    };

    // Throttle updates to avoid excessive entries
    const timeoutId = setTimeout(updateHistory, 300);
    return () => clearTimeout(timeoutId);
  }, [editorState, isInitialized]); // Monitor editor state changes

  // Sync history index with undo/redo state
  useEffect(() => {
    if (isInitialized && historyEntries.length > 0) {
      const currentState = query.serialize();
      
      // Find matching state in history
      const matchingIndex = historyEntries.findIndex(entry => entry.state === currentState);
      if (matchingIndex !== -1 && matchingIndex !== currentHistoryIndex) {
        setCurrentHistoryIndex(matchingIndex);
        console.log(`History index synced to: ${matchingIndex}`);
      }
    }
  }, [canUndo, canRedo, isInitialized]);

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
  }, [canUndo, canRedo]);

  // Jump to specific history point using Craft.js undo/redo
  const jumpToHistoryPoint = (targetIndex) => {
    const currentIndex = currentHistoryIndex;
    const diff = targetIndex - currentIndex;
    
    if (diff === 0) return;
    
    if (diff > 0) {
      // Need to redo
      for (let i = 0; i < diff; i++) {
        if (query.history.canRedo()) {
          actions.history.redo();
        }
      }
    } else {
      // Need to undo
      for (let i = 0; i < Math.abs(diff); i++) {
        if (query.history.canUndo()) {
          actions.history.undo();
        }
      }
    }
    
    setCurrentHistoryIndex(targetIndex);
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

        {/* Save/Load/Export and Serialize Controls */}
        <div className="flex items-center space-x-2">
          <SaveLoad />
          
          <div className="border-l border-gray-300 pl-2">
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
    </div>
  );
};