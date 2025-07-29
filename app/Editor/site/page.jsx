'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { getSite, updateSite, saveSiteData, getSiteData } from '../../../lib/sites';
import { Spin, message, Button, Space, Typography, Alert, Switch, Dropdown, Tooltip } from 'antd';
import { SaveOutlined, EyeOutlined, ArrowLeftOutlined, UndoOutlined, RedoOutlined, HistoryOutlined } from '@ant-design/icons';

// Import existing editor components
import { Toolbox } from '../../Components/ToolBox';
import { TopBar } from '../../Components/TopBar';
import { Editor, Element, Frame, useEditor } from "@craftjs/core";
import { Box } from '../../Components/user/Box';
import { StyleMenu } from '../../Components/StyleMenu';
import { FlexBox } from '../../Components/user/FlexBox';
import { Text } from '../../Components/user/Text';
import { GridBox } from '../../Components/user/GridBox';
import { Image } from '../../Components/user/Image';
import { Button as CraftButton } from '../../Components/user/Button';
import { Link } from '../../Components/user/Link';
import { Paragraph } from '../../Components/user/Paragraph';
import { Video } from '../../Components/user/Video';
import { ShopFlexBox, ShopImage, ShopText } from '../../Components/user/Advanced/ShopFlexBox';
import { FormInput } from '../../Components/user/Input';
import EditorLayers from '../../Components/EditorLayers';
import { Form, FormInputDropArea } from '../../Components/user/Advanced/Form';
import { Carousel } from '../../Components/user/Carousel';
import { NavBar, NavItem } from '../../Components/user/Nav/NavBar';
import { Root } from '../../Components/Root';
import { MultiSelectProvider } from '../../Components/support/MultiSelectContext';
import SnapGridControls from '../../Components/support/SnapGridControls';
import SitePageSelector from '../../Components/support/SitePageSelector';

const { Title, Text: AntText } = Typography;

// Enhanced Editor Layout with Site Context
const SiteEditorLayout = ({ siteId, siteData, siteContent }) => {
  const { user } = useAuth();
  const [site, setSite] = useState(siteData);
  const [openMenuNodeId, setOpenMenuNodeId] = useState(null);
  const [activeDrawer, setActiveDrawer] = useState(null);
  const [useFigmaStyle, setUseFigmaStyle] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSaveFrequency, setAutoSaveFrequency] = useState(3000); // 3 seconds default
  const [currentPageId, setCurrentPageId] = useState('home'); // Track current page

  const { enabled, query, actions, canUndo, canRedo, editorState } = useEditor((state, query) => ({
    enabled: state.options.enabled,
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo(),
    // Monitor the actual state to trigger history updates
    editorState: state
  }));

  // History tracking state
  const [historyEntries, setHistoryEntries] = useState([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);
  const [lastStateSnapshot, setLastStateSnapshot] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load existing content into editor when component mounts
  useEffect(() => {
    if (siteContent?.editorState && siteContent.editorState !== '{}' && actions && !isInitialized) {
      try {
        actions.deserialize(siteContent.editorState);
        console.log('Loaded existing site content');
      } catch (error) {
        console.error('Error loading existing content:', error);
      }
    }
  }, [siteContent, actions, isInitialized]);

  // Helper function to detect changes
  const detectChanges = (previousState, currentState) => {
    try {
      if (!previousState || !currentState) return 'State change';
      
      const prev = typeof previousState === 'string' ? JSON.parse(previousState) : previousState;
      const curr = typeof currentState === 'string' ? JSON.parse(currentState) : currentState;
      
      const prevNodes = Object.keys(prev).length;
      const currNodes = Object.keys(curr).length;
      
      if (currNodes > prevNodes) {
        const newNodeIds = Object.keys(curr).filter(id => !prev[id]);
        if (newNodeIds.length > 0) {
          const newNode = curr[newNodeIds[0]];
          const componentName = newNode.displayName || newNode.type?.resolvedName || 'Component';
          return `Added ${componentName}`;
        }
        return 'Added component';
      } else if (currNodes < prevNodes) {
        const deletedNodeIds = Object.keys(prev).filter(id => !curr[id]);
        if (deletedNodeIds.length > 0) {
          const deletedNode = prev[deletedNodeIds[0]];
          const componentName = deletedNode.displayName || deletedNode.type?.resolvedName || 'Component';
          return `Deleted ${componentName}`;
        }
        return 'Deleted component';
      } else {
        return 'Modified content';
      }
    } catch (error) {
      return 'Made changes';
    }
  };

  // History tracking - improved to prevent infinite loops
  useEffect(() => {
    if (!query || !isInitialized) return;
    
    const updateHistory = () => {
      try {
        const currentStateStr = query.serialize();
        const timestamp = new Date().toLocaleTimeString();
        
        // Skip if state hasn't actually changed
        if (lastStateSnapshot === currentStateStr) return;
        
        const changeDescription = detectChanges(lastStateSnapshot, currentStateStr);
        
        const newEntry = {
          id: Date.now(),
          description: changeDescription,
          timestamp: timestamp,
          state: currentStateStr
        };
        
        setHistoryEntries(prev => [...prev, newEntry]);
        setCurrentHistoryIndex(prev => prev + 1);
        setLastStateSnapshot(currentStateStr);
      } catch (error) {
        console.warn('Could not update history:', error);
      }
    };

    // Throttle history updates more aggressively 
    const timeoutId = setTimeout(updateHistory, 1000);
    return () => clearTimeout(timeoutId);
  }, [query?.serialize()]); // Only depend on serialized state, not the entire editorState

  // Initialize history separately
  useEffect(() => {
    if (!query || isInitialized) return;
    
    try {
      const currentState = query.serialize();
      const timestamp = new Date().toLocaleTimeString();
      
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
    } catch (error) {
      console.warn('Could not initialize history:', error);
    }
  }, [query, isInitialized]);

  // Handle undo/redo
  const handleUndo = () => {
    if (canUndo) {
      actions.history.undo();
      setCurrentHistoryIndex(prev => Math.max(0, prev - 1));
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      actions.history.redo();
      setCurrentHistoryIndex(prev => Math.min(historyEntries.length - 1, prev + 1));
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) handleUndo();
      } else if (((e.ctrlKey || e.metaKey) && e.key === 'y') || 
                 ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        if (canRedo) handleRedo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo]);

  // History dropdown
  const historyMenuItems = historyEntries.map((entry, index) => {
    const isCurrent = index === currentHistoryIndex;
    return {
      key: entry.id.toString(),
      label: (
        <div className={`flex items-center justify-between py-2 px-3 min-w-[280px] ${
          isCurrent ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'
        }`}>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-blue-500' : 'bg-gray-300'}`} />
            <span className={`text-sm ${isCurrent ? 'font-semibold text-blue-700' : 'text-gray-700'}`}>
              {entry.description}
            </span>
          </div>
          <span className="text-xs text-gray-500">{entry.timestamp}</span>
        </div>
      ),
      disabled: isCurrent
    };
  });

  const historyDropdownMenu = {
    items: historyMenuItems.length > 0 ? historyMenuItems : [{
      key: 'empty',
      label: <span className="text-gray-500">No history available</span>,
      disabled: true
    }]
  };

  // Auto-save functionality with better state management
  const autoSave = useCallback(async () => {
    if (!user || !siteId || !query || isSaving) return;
    
    try {
      setIsSaving(true);
      
      // Get current editor state
      const editorState = query.serialize();
      
      // Only save if there's actually content and it's different
      if (editorState && editorState !== '{}') {
        await saveSiteData(user.uid, siteId, {
          editorState,
          lastModified: new Date(),
          pages: [
            {
              id: 'home',
              name: 'Home',
              path: '/',
              editorState
            }
          ]
        });
        
        setLastSaved(new Date());
      }
      
    } catch (error) {
      console.error('Auto-save failed:', error);
      message.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [user, siteId, query, isSaving]);

  // Auto-save on editor changes (debounced)
  useEffect(() => {
    if (!enabled || !query || !user || !siteId) return;
    
    const saveTimeout = setTimeout(() => {
      autoSave();
    }, autoSaveFrequency); // Use configurable frequency

    return () => clearTimeout(saveTimeout);
  }, [query?.serialize(), enabled, autoSaveFrequency]); // Include frequency in dependencies

  // Preview function
  const handlePreview = () => {
    if (!user?.username || !site?.name) {
      message.error('Cannot preview: missing user or site information');
      return;
    }
    
    // Open preview in new tab
    const previewUrl = `/u/${user.username}/${site.name}`;
    window.open(previewUrl, '_blank');
  };

  // Publish/Unpublish function
  const handleTogglePublish = async () => {
    try {
      const newPublishState = !site.isPublished;
      
      await updateSite(user.uid, siteId, {
        isPublished: newPublishState,
        publishedAt: newPublishState ? new Date() : null
      });
      
      setSite(prev => ({
        ...prev,
        isPublished: newPublishState
      }));
      
      message.success(newPublishState ? 'Site published!' : 'Site unpublished');
      
    } catch (error) {
      console.error('Error toggling publish state:', error);
      message.error('Failed to update publish state');
    }
  };

  // Handle page changes (for future multi-page support)
  const handlePageChange = (pageId) => {
    console.log('Page changed to:', pageId);
    setCurrentPageId(pageId);
    // TODO: Load different page content when multi-page support is added
    message.info('Multi-page editing will be available in a future update');
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Enhanced Single-Line TopBar */}
      <div className="bg-white border-b border-gray-200 shadow-sm px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Left Section - Navigation & Site Info */}
          <div className="flex items-center space-x-4">
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />}
              onClick={() => window.location.href = '/dashboard'}
              size="small"
            >
              Dashboard
            </Button>
            
            <div className="border-l border-gray-200 pl-4">
              <div className="flex items-center space-x-3">
                <div>
                  <span className="text-sm font-semibold text-gray-800">
                    {site?.name || 'Untitled Site'}
                  </span>
                  <div className="flex items-center space-x-2 text-xs">
                    {site?.isPublished ? (
                      <span className="text-green-600">● Published</span>
                    ) : (
                      <span className="text-orange-500">● Draft</span>
                    )}
                    {lastSaved && (
                      <span className="text-gray-500">
                        • Saved {lastSaved.toLocaleTimeString()}
                      </span>
                    )}
                    {isSaving && (
                      <span className="text-blue-500">• Saving...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Site Page Selector - Non-interfering */}
          <div className="bg-gray-50 rounded-lg px-3 py-1.5">
            <SitePageSelector 
              siteId={siteId} 
              currentPageId={currentPageId}
              onPageChange={handlePageChange}
            />
          </div>
          
          {/* Center Section - Editor Controls */}
          <div className="flex items-center space-x-3">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-1.5">
              <Switch 
                checked={enabled} 
                onChange={(value) => {
                  actions.setOptions(options => {
                    options.enabled = value;
                  });
                }}
                size="small"
              />
              <span className="text-xs font-medium text-gray-700">
                {enabled ? 'Editor' : 'Preview'}
              </span>
            </div>

            {/* History Controls */}
            <div className="flex items-center space-x-1 bg-gray-50 rounded-lg px-2 py-1.5">
              <Tooltip title={canUndo ? "Undo (Ctrl+Z)" : "Nothing to undo"}>
                <Button
                  icon={<UndoOutlined />}
                  size="small"
                  disabled={!canUndo}
                  onClick={handleUndo}
                  type="text"
                  className={canUndo ? 'hover:bg-blue-50 hover:text-blue-600' : ''}
                />
              </Tooltip>

              <Tooltip title={canRedo ? "Redo (Ctrl+Y)" : "Nothing to redo"}>
                <Button
                  icon={<RedoOutlined />}
                  size="small"
                  disabled={!canRedo}
                  onClick={handleRedo}
                  type="text"
                  className={canRedo ? 'hover:bg-green-50 hover:text-green-600' : ''}
                />
              </Tooltip>

              <Dropdown
                menu={historyDropdownMenu}
                placement="bottomLeft"
                trigger={['click']}
              >
                <Tooltip title="View edit history">
                  <Button
                    icon={<HistoryOutlined />}
                    size="small"
                    type="text"
                    className="hover:bg-purple-50 hover:text-purple-600"
                  />
                </Tooltip>
              </Dropdown>
            </div>

            {/* Snap & Grid Controls */}
            <div className="bg-gray-50 rounded-lg px-2 py-1.5">
              <SnapGridControls />
            </div>

            {/* Style Toggle & Auto-save Settings */}
            <div className="flex items-center space-x-2">
              <Dropdown
                menu={{
                  items: [
                    {
                      key: '1000',
                      label: 'Auto-save: 1 second',
                      onClick: () => setAutoSaveFrequency(1000)
                    },
                    {
                      key: '3000',
                      label: 'Auto-save: 3 seconds',
                      onClick: () => setAutoSaveFrequency(3000)
                    },
                    {
                      key: '5000',
                      label: 'Auto-save: 5 seconds',
                      onClick: () => setAutoSaveFrequency(5000)
                    },
                    {
                      key: '10000',
                      label: 'Auto-save: 10 seconds',
                      onClick: () => setAutoSaveFrequency(10000)
                    }
                  ]
                }}
                placement="bottomRight"
                trigger={['click']}
              >
                <button className="text-xs px-2 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors">
                  ⚙️ {autoSaveFrequency / 1000}s
                </button>
              </Dropdown>
              
              <button
                onClick={() => setUseFigmaStyle(!useFigmaStyle)}
                className="text-xs px-2 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors"
                title="Toggle style menu"
              >
                {useFigmaStyle ? '🎨' : '📋'}
              </button>
            </div>
          </div>

          {/* Right Section - Site Actions */}
          <div className="flex items-center space-x-2">
            <Button 
              icon={<EyeOutlined />}
              onClick={handlePreview}
              size="small"
            >
              Preview
            </Button>
            <Button 
              type={site?.isPublished ? 'default' : 'primary'}
              onClick={handleTogglePublish}
              size="small"
            >
              {site?.isPublished ? 'Unpublish' : 'Publish'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Toolbox */}
        {enabled && (
          <div className={`${activeDrawer ? 'w-64' : 'w-64'} bg-white border-r border-gray-200 shadow-sm flex-shrink-0 h-full flex flex-col`}>
            <Toolbox 
              activeDrawer={activeDrawer}
              setActiveDrawer={setActiveDrawer}
              openMenuNodeId={openMenuNodeId}
              setOpenMenuNodeId={setOpenMenuNodeId}
            />
            <div className='border-2 h-full flex-1 min-h-0'>
              <EditorLayers />
            </div>
          </div>
        )}

        {/* Main Editor Canvas */}
        <div className="flex-1 flex">
          <div className="flex-1 p-4 overflow-auto bg-gray-100">
            <div className="w-full max-w-none">
              <Frame className="w-full min-h-[600px] pb-8">
                <Element 
                  is={Root} 
                  padding={0} 
                  maxWidth='90%'
                  minWidth='99%'
                  paddingBottom='2rem'
                  background="#ffffff" 
                  canvas
                  className="min-h-[600px] w-full min-w-[99%] max-w-[90%] pb-8"
                >
                  {/* Canvas content goes here */}
                </Element>
              </Frame>
            </div>
          </div>

          {/* Right Sidebar - Style Menu */}
          {enabled && (
            <div className="w-80 bg-white border-l border-gray-200 shadow-sm min-w-48 flex-shrink-0">
              <div className="h-full overflow-y-auto">
                <StyleMenu useFigmaStyle={useFigmaStyle} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Site Editor Component
export default function SiteEditor() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const siteId = searchParams.get('site');
  
  const [site, setSite] = useState(null);
  const [siteContent, setSiteContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load site data
  useEffect(() => {
    const loadSiteData = async () => {
      if (!user || !siteId) return;
      
      try {
        setLoading(true);
        
        // Get site metadata
        const siteData = await getSite(user.uid, siteId);
        if (!siteData) {
          setError('Site not found');
          return;
        }
        setSite(siteData);
        
        // Get site content
        const contentData = await getSiteData(user.uid, siteId);
        setSiteContent(contentData);
        
      } catch (error) {
        console.error('Error loading site:', error);
        setError('Failed to load site');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      loadSiteData();
    }
  }, [user, siteId, authLoading]);

  // Redirect if no site ID
  if (!siteId) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Alert
          message="No Site Selected"
          description="Please select a site from your dashboard to edit."
          type="warning"
          action={
            <Button type="primary" href="/dashboard">
              Go to Dashboard
            </Button>
          }
        />
      </div>
    );
  }

  // Loading state
  if (authLoading || loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  // Auth required
  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Alert
          message="Authentication Required"
          description="Please sign in to edit your site."
          type="error"
          action={
            <Button type="primary" href="/Login">
              Sign In
            </Button>
          }
        />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Alert
          message="Error Loading Site"
          description={error}
          type="error"
          action={
            <Button type="primary" href="/dashboard">
              Back to Dashboard
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <Editor 
      resolver={{
        Box, FlexBox, GridBox, Text, Image, CraftButton, Link, FormInputDropArea, Root,
        Paragraph, Video, ShopFlexBox, ShopText, ShopImage, FormInput, Form, Carousel, NavBar, NavItem
      }}
    > 
      <MultiSelectProvider>
        <SiteEditorLayout siteId={siteId} siteData={site} siteContent={siteContent} />
      </MultiSelectProvider>
    </Editor>
  );
}
