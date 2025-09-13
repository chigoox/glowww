'use client';

import React, { useState, useEffect } from "react";
import { Switch, Button, Dropdown, Tooltip } from "antd";
import { UndoOutlined, RedoOutlined, HistoryOutlined, ClockCircleOutlined, SettingOutlined, SlidersOutlined } from "@ant-design/icons";
import { useEditor } from "@craftjs/core";
import LoadProject from "./LoadProject";
import ExportManager from "./ExportManager";
import PageManager from "./PageManager";
import PreviewButton from "./PreviewButton";
import SnapGridControls from "../utils/grid/SnapGridControls";
import EditorSettingsModal from "../ui/EditorSettingsModal";
import { useEditorSettings } from "../utils/context/EditorSettingsContext";
import TopPropsManager from './TopPropsManager';

export const TopBar = () => {
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
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [propsModalOpen, setPropsModalOpen] = useState(false);
  // Listen for global open-props-manager requests (from FigmaStyleMenu)
  useEffect(() => {
    const handler = (e) => {
      try { setPropsModalOpen(true); } catch {/* ignore */}
    };
    window.addEventListener('open-props-manager', handler);
    return () => window.removeEventListener('open-props-manager', handler);
  }, []);

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
        <div className={`flex items-center justify-between py-3 px-4 min-w-[320px] rounded-lg transition-all duration-200 ${
          isCurrent 
            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 shadow-sm' 
            : 'hover:bg-slate-50 hover:shadow-sm'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-2.5 h-2.5 rounded-full transition-colors ${
              isCurrent ? 'bg-blue-500 shadow-sm' : 'bg-slate-300'
            }`} />
            <div className="flex flex-col">
              <span className={`text-sm transition-colors ${
                isCurrent ? 'font-semibold text-blue-700' : 'font-medium text-slate-700'
              }`}>
                {entry.description}
              </span>
              {isCurrent && (
                <span className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-0.5 rounded-full mt-1 w-fit">
                  Current
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 font-medium">
              {entry.timestamp}
            </span>
            <div className="text-xs text-slate-400 mt-0.5">
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
          <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Edit History</span>
              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full font-medium">
                {historyEntries.length} entries
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Click any entry to jump to that point in time
            </div>
          </div>
        ),
        disabled: true
      },
      ...historyMenuItems
    ] : [{
      key: 'empty',
      label: (
        <div className="text-center py-12 text-slate-500">
          <HistoryOutlined className="text-3xl mb-3 opacity-40" />
          <div className="text-sm font-medium mb-1">No history available</div>
          <div className="text-xs text-slate-400">Start editing to build your history</div>
        </div>
      ),
      disabled: true
    }]
  };

  const { settings, updateSetting } = useEditorSettings();
  const bp = settings?.breakpoints || { current: 'auto', widths: {} };

  const setBreakpoint = (key) => {
    updateSetting('breakpoints.current', key);
  };

  return (
    <>
      <div className="w-full bg-gray-50 border-b border-slate-200 shadow-lg px-2 py-0.5">
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-3 py-1.5">
          
          {/* Left Section - Editor Controls */}
          <div className="flex items-center space-x-3">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center space-x-3 bg-white rounded-lg px-2.5 py-1 shadow-sm border border-slate-200">
              <Switch 
                checked={enabled} 
                onChange={(value) => {
                  console.log('Toggling enabled state to:', value);
                  actions.setOptions(options => {
                    options.enabled = value;
                  });
                }}
                className="data-[state=checked]:bg-emerald-500"
              />
              <span className="text-sm font-medium text-slate-700">
                {enabled ? 'Editor On' : 'Editor Off'}
              </span>
            </div>

            {/* History Controls */}
            <div className="flex items-center space-x-2 bg-white rounded-lg px-2.5 py-1 shadow-sm border border-slate-200">
              {/* Undo Button */}
              <Tooltip title={canUndo ? "Undo last action (Ctrl+Z)" : "Nothing to undo"}>
                <Button
                  icon={<UndoOutlined className="text-base" />}
                  size="middle"
                  disabled={!canUndo}
                  onClick={handleUndo}
                  className={`h-6 w-6 flex items-center justify-center rounded-lg border-0 transition-all duration-200 ${
                    canUndo 
                      ? 'hover:bg-blue-50 hover:text-blue-600 hover:shadow-sm text-slate-600' 
                      : 'text-slate-300'
                  }`}
                  type="text"
                />
              </Tooltip>

              {/* Redo Button */}
              <Tooltip title={canRedo ? "Redo last action (Ctrl+Y)" : "Nothing to redo"}>
                <Button
                  icon={<RedoOutlined className="text-base" />}
                  size="middle"
                  disabled={!canRedo}
                  onClick={handleRedo}
                  className={`h-6 w-6 flex items-center justify-center rounded-lg border-0 transition-all duration-200 ${
                    canRedo 
                      ? 'hover:bg-emerald-50 hover:text-emerald-600 hover:shadow-sm text-slate-600' 
                      : 'text-slate-300'
                  }`}
                  type="text"
                />
              </Tooltip>

              {/* Divider */}
              <div className="w-px h-5 bg-slate-200 mx-1"></div>

              {/* History Dropdown */}
              <Dropdown
                menu={historyDropdownMenu}
                placement="bottomLeft"
                trigger={['click']}
                overlayClassName="shadow-xl border border-slate-200 rounded-xl overflow-hidden"
              >
                <Tooltip title="View and navigate edit history">
                  <Button
                    icon={<HistoryOutlined className="text-base" />}
                    size="middle"
                    type="text"
                    className="h-6 flex items-center space-x-2 px-2.5 rounded-lg border-0 hover:bg-purple-50 hover:text-purple-600 hover:shadow-sm transition-all duration-200 text-slate-600"
                  >
                    <span className="text-sm font-medium hidden sm:inline">History</span>
                  </Button>
                </Tooltip>
              </Dropdown>
            </div>

            {/* Snap & Grid Controls */}
            <div className="flex items-center space-x-2 bg-white rounded-lg px-2.5 py-1 shadow-sm border border-slate-200">
              <SnapGridControls />
            </div>

            {/* Breakpoint Selector */}
            <div className="flex items-center space-x-2 bg-white rounded-lg px-2.5 py-1 shadow-sm border border-slate-200">
              <div className="text-xs font-medium text-slate-600 mr-2 hidden sm:inline">Viewport</div>
              <div className="flex items-center space-x-1">
                {['auto','sm','regular','lg','xl'].map(k => (
                  <button
                    key={k}
                    onClick={() => setBreakpoint(k)}
                    className={`px-2 py-0.5 text-xs rounded ${bp.current === k ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                    title={k === 'auto' ? 'Auto (no forced width)' : `${k} - ${bp.widths?.[k] || ''}px`}
                  >
                    {k === 'auto' ? 'Auto' : k.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Settings Button */}
            <div className="flex items-center space-x-2 bg-white rounded-lg px-2.5 py-1 shadow-sm border border-slate-200">
              <Tooltip title="Editor Settings & Preferences">
                <Button
                  icon={<SettingOutlined className="text-base" />}
                  size="middle"
                  type="text"
                  onClick={() => setSettingsModalOpen(true)}
                  className="h-6 flex items-center space-x-2 px-2.5 rounded-lg border-0 hover:bg-orange-50 hover:text-orange-600 hover:shadow-sm transition-all duration-200 text-slate-600"
                >
                  <span className="text-sm font-medium hidden sm:inline">Settings</span>
                </Button>
              </Tooltip>
            </div>
          </div>

          {/* Center Section - Branding/Logo Space (optional) */}
          <div className="hidden md:flex items-center">
            <div className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Glowww Editor
            <div className="text-xs text-center">Made by ED5</div>
            </div>
          </div>

          {/* Right Section - Management Controls */}
          <div className="flex items-center space-x-1.5">
            <div className="flex items-center space-x-1.5 bg-white rounded-lg px-1.5 py-1 shadow-sm border border-slate-200">
              <PageManager />
              <PreviewButton />
            </div>
            
            <div className="flex items-center space-x-1.5 bg-white rounded-lg px-1.5 py-1 shadow-sm border border-slate-200">
              <LoadProject />
              <ExportManager />
              <Tooltip title="Props Manager">
                <Button
                  icon={<SlidersOutlined />}
                  size="middle"
                  type="text"
                  onClick={() => setPropsModalOpen(true)}
                  className="h-6 flex items-center space-x-2 px-2.5 rounded-lg border-0 hover:bg-violet-50 hover:text-violet-600 hover:shadow-sm transition-all duration-200 text-slate-600"
                >
                  <span className="text-sm font-medium hidden sm:inline">Props</span>
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Settings Modal */}
      <EditorSettingsModal 
        visible={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
  <TopPropsManager open={propsModalOpen} onClose={() => setPropsModalOpen(false)} />
    </>
  );
};