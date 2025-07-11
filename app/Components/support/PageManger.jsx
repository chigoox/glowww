'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Button, 
  Modal, 
  Input, 
  Tree, 
  Dropdown, 
  message, 
  Tooltip, 
  Switch, 
  InputNumber,
  Space,
  Typography,
  Divider,
  Popconfirm,
  Card,
  Select
} from 'antd';
import {
  FileTextOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOutlined,
  HomeOutlined,
  CaretRightOutlined,
  CaretDownOutlined,
  ClockCircleOutlined,
  SettingOutlined,
  CodeOutlined,
  FileOutlined
} from '@ant-design/icons';
import { useEditor } from '@craftjs/core';
import pako from 'pako';
import useSaveOperations from './useSaveOperations';

const { Text, Title } = Typography;
const { Option } = Select;

/**
 * PageManager - Comprehensive page management system for the website builder
 * Features:
 * - Hierarchical page structure
 * - Project-based saving/loading
 * - Auto-save functionality
 * - Page navigation
 * - Folder structure for export
 */
const PageManager = () => {
  const { actions, query } = useEditor();
  
  // Use the shared save operations hook (auto-save only now)
  const { 
    projectName, setProjectName, 
    lastSaveTime, setLastSaveTime, 
    compressData, decompressData,
    autoSaveProject, loadProject
  } = useSaveOperations();
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [newPageModalVisible, setNewPageModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [confirmSwitchModalVisible, setConfirmSwitchModalVisible] = useState(false);
  const [loadPageModalVisible, setLoadPageModalVisible] = useState(false);
  const [pendingPageSwitch, setPendingPageSwitch] = useState(null);
  
  // Page management states
  const [pages, setPages] = useState([
    {
      key: 'home',
      title: 'Home',
      path: '/',
      folderPath: '', // Home page uses root app/page.js
      parentKey: null,
      isHome: true,
      serializedData: null,
      children: []
    }
  ]);
  
  const [currentPageKey, setCurrentPageKey] = useState('home');
  const [selectedPageKey, setSelectedPageKey] = useState(null);
  const [expandedKeys, setExpandedKeys] = useState(['home']);
  
  // New page form states
  const [newPageName, setNewPageName] = useState('');
  const [newPagePath, setNewPagePath] = useState('');
  
  // Unsaved changes tracking
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  
  // Auto-save states (updated range: 5 seconds to 5 minutes)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true); // Enable by default
  const [autoSaveInterval, setAutoSaveInterval] = useState(15); // Default to 15 seconds (5-300 range)
  const autoSaveTimerRef = useRef(null);
  
  // Load Page states
  const [loadPageInputData, setLoadPageInputData] = useState('');
  
  // Keep track of current page data
  const currentPageDataRef = useRef(null);

  // Utility functions from useSaveOperations hook

  // Generate path for Next.js App Router structure
  const generatePagePath = (pageKey, parentKey = null) => {
    if (pageKey === 'home') {
      return '/'; // Home page is always at root
    }
    
    if (!parentKey || parentKey === 'home') {
      // Top-level pages: /about, /shop
      return `/${pageKey}`;
    }
    
    // Nested pages: /about/creator1, /about/creator1/bio
    const findParentPath = (key) => {
      const parent = pages.find(p => p.key === key);
      if (!parent || parent.key === 'home') return '';
      if (parent.parentKey === 'home' || !parent.parentKey) {
        return `/${parent.key}`;
      }
      return findParentPath(parent.parentKey) + `/${parent.key}`;
    };
    
    const parentPath = findParentPath(parentKey);
    return `${parentPath}/${pageKey}`;
  };

  // Generate folder structure for Next.js App Router export
  const generateAppRouterFolderPath = (pageKey, parentKey = null) => {
    if (pageKey === 'home') {
      return ''; // Home page uses root app/page.js
    }
    
    if (!parentKey || parentKey === 'home') {
      // Top-level pages: app/about/page.js, app/shop/page.js
      return pageKey;
    }
    
    // Nested pages: app/about/creator1/page.js, app/about/creator1/bio/page.js
    const findParentFolderPath = (key) => {
      const parent = pages.find(p => p.key === key);
      if (!parent || parent.key === 'home') return '';
      if (parent.parentKey === 'home' || !parent.parentKey) {
        return parent.key;
      }
      return findParentFolderPath(parent.parentKey) + `/${parent.key}`;
    };
    
    const parentFolderPath = findParentFolderPath(parentKey);
    return `${parentFolderPath}/${pageKey}`;
  };

  // Convert flat pages array to tree structure
  const buildPageTree = (pagesList) => {
    const tree = [];
    const pageMap = {};
    
    // Create a map for quick lookup
    pagesList.forEach(page => {
      pageMap[page.key] = { ...page, children: [] };
    });
    
    // Build the tree
    pagesList.forEach(page => {
      if (page.parentKey && pageMap[page.parentKey]) {
        pageMap[page.parentKey].children.push(pageMap[page.key]);
      } else {
        tree.push(pageMap[page.key]);
      }
    });
    
    return tree;
  };

  // Find page in the tree structure
  const findPageInTree = (key, tree) => {
    for (const page of tree) {
      if (page.key === key) return page;
      if (page.children) {
        const found = findPageInTree(key, page.children);
        if (found) return found;
      }
    }
    return null;
  };

  // Save current page data
  const saveCurrentPageData = () => {
    try {
      const currentData = query.serialize();
      if (!currentData) {
        console.warn('No data to serialize');
        return false;
      }
      
      console.log('Saving current page data for page:', currentPageKey);
      
      // Update the pages state with new serialized data
      setPages(prevPages => {
        const updatedPages = prevPages.map(page => 
          page.key === currentPageKey 
            ? { ...page, serializedData: currentData }
            : page
        );
        
        console.log('Updated pages state - page count:', updatedPages.length);
        return updatedPages;
      });
      
      currentPageDataRef.current = currentData;
      setUnsavedChanges(false);
      setLastSaveTime(new Date());
      return true;
    } catch (error) {
      console.error('Save current page data error:', error);
      message.error('Failed to save page data: ' + error.message);
      return false;
    }
  };

  // Load page data
  const loadPageData = (pageKey, pagesOverride = null) => {
    const pagesArray = pagesOverride || pages;
    const page = pagesArray.find(p => p.key === pageKey);
    const defaultData = '{"ROOT":{"type":{"resolvedName":"Box"},"nodes":[],"props":{"canvas":true},"custom":{},"parent":null,"displayName":"Box","isCanvas":true}}';
    let dataToLoad = defaultData;
    let isEmpty = true;

    if (page && typeof page.serializedData === 'string' && page.serializedData.trim().length > 0) {
      dataToLoad = page.serializedData;
      isEmpty = false;
    }

    console.log('Loading page data:', { pageKey, isEmpty, hasPage: !!page, dataLength: dataToLoad.length });

    try {
      // Ensure CraftJS is ready and then deserialize with a small delay
      const deserializeWithDelay = () => {
        try {
          // Check if query is available and ready
          if (!query || !actions) {
            console.warn('CraftJS not ready, retrying...');
            setTimeout(deserializeWithDelay, 100);
            return;
          }
          
          actions.deserialize(dataToLoad);
          console.log('CraftJS deserialization successful for page:', pageKey);
          
          // Update state after successful deserialization
          setCurrentPageKey(pageKey);
          currentPageDataRef.current = isEmpty ? null : dataToLoad;
          setUnsavedChanges(false);
          
          if (isEmpty) {
            message.success(`Loaded empty page: ${page?.title || pageKey}`);
          } else {
            message.success(`Loaded page: ${page.title}`);
          }
          
        } catch (deserializeError) {
          console.error('CraftJS deserialization failed:', deserializeError);
          // Fallback to default data
          try {
            actions.deserialize(defaultData);
            setCurrentPageKey(pageKey);
            currentPageDataRef.current = null;
            setUnsavedChanges(false);
            message.success(`Loaded fallback empty page: ${page?.title || pageKey}`);
          } catch (fallbackError) {
            console.error('Failed to load fallback page:', fallbackError);
            message.error('Failed to load any page');
          }
        }
      };
      
      // Start the deserialization process
      setTimeout(deserializeWithDelay, 100);
      
    } catch (error) {
      console.error('Failed to load page data:', error, { dataToLoad });
      message.error('Failed to load page: ' + error.message);
    }
    
    // Note: We don't update active project here as this is just page navigation
  };

  // Switch between pages
  const switchToPage = (pageKey) => {
    if (pageKey === currentPageKey) return;
    
    console.log('switchToPage called:', { pageKey, unsavedChanges, currentPageKey });
    
    // Always save current page data before switching
    console.log('Saving current page data before switching');
    const saveSuccess = saveCurrentPageData();
    
    if (saveSuccess) {
      console.log('Current page saved successfully, switching to new page');
      loadPageData(pageKey);
    } else {
      console.warn('Failed to save current page data');
      // Still try to switch, but warn the user
      if (unsavedChanges) {
        setPendingPageSwitch(pageKey);
        setConfirmSwitchModalVisible(true);
      } else {
        loadPageData(pageKey);
      }
    }
  };

  // Add new page
  const addNewPage = () => {
    if (!newPageName.trim()) {
      message.error('Please enter a page name');
      return;
    }
    
    const pageKey = newPageName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    // Check if page already exists
    if (pages.find(p => p.key === pageKey)) {
      message.error('A page with this name already exists');
      return;
    }
    
    // If no parent selected, default to 'home' - all pages are under home
    const parentKey = selectedPageKey || 'home';
    const newPath = generatePagePath(pageKey, parentKey);
    const folderPath = generateAppRouterFolderPath(pageKey, parentKey);
    
    console.log('Creating new page:', {
      pageKey,
      parentKey,
      newPath,
      folderPath,
      selectedPageKey
    });
    
    const newPage = {
      key: pageKey,
      title: newPageName,
      path: newPath,
      folderPath: folderPath, // For Next.js App Router export
      parentKey: parentKey,
      isHome: false,
      serializedData: null,
      children: []
    };
    
    setPages(prevPages => [...prevPages, newPage]);
    setExpandedKeys(prev => [...prev, pageKey]);
    
    // Always expand parent when adding child
    if (parentKey) {
      setExpandedKeys(prev => [...prev, parentKey]);
    }
    
    message.success(`Page "${newPageName}" created successfully under "${pages.find(p => p.key === parentKey)?.title || parentKey}"`);
    setNewPageModalVisible(false);
    setNewPageName('');
    setNewPagePath('');
    setSelectedPageKey(null);
  };

  // Delete page
  const deletePage = (pageKey) => {
    const page = pages.find(p => p.key === pageKey);
    if (page?.isHome) {
      message.error('Cannot delete the home page');
      return;
    }
    
    // Check if page has children
    const hasChildren = pages.some(p => p.parentKey === pageKey);
    if (hasChildren) {
      message.error('Cannot delete a page that has sub-pages. Delete the sub-pages first.');
      return;
    }
    
    setPages(prevPages => prevPages.filter(p => p.key !== pageKey));
    
    // If deleting current page, switch to home directly without unsaved changes check
    if (pageKey === currentPageKey) {
      // Clear unsaved changes since we're deleting the page anyway
      setUnsavedChanges(false);
      currentPageDataRef.current = null;
      // Load home page directly
      loadPageData('home');
    }
    
    message.success(`Page "${page.title}" deleted`);
  };

  // Setup auto-save timer using the useSaveOperations hook
  useEffect(() => {
    if (autoSaveEnabled && autoSaveInterval > 0) {
      const performAutoSaveCallback = () => {
        if (!autoSaveEnabled) return;
        
        try {
          // Get current data directly from query
          const currentData = query.serialize();
          if (!currentData) return;
          
          // First update the current page data in the pages array
          setPages(prevPages => {
            const updatedPages = prevPages.map(page => 
              page.key === currentPageKey 
                ? { ...page, serializedData: currentData }
                : page
            );
            
            // Then auto-save using the hook function
            const projectData = {
              name: projectName,
              pages: updatedPages,
              currentPage: currentPageKey,
              autoSaveSettings: {
                enabled: autoSaveEnabled,
                interval: autoSaveInterval
              },
              timestamp: new Date().toISOString()
            };
            
            // Use the hook's autoSaveProject function
            autoSaveProject(projectData);
            
            return updatedPages;
          });
          
          currentPageDataRef.current = currentData;
          setUnsavedChanges(false);
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      };
      
      autoSaveTimerRef.current = setInterval(performAutoSaveCallback, autoSaveInterval * 1000);
    } else {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [autoSaveEnabled, autoSaveInterval, projectName, currentPageKey, autoSaveProject]);

  // Active project name is now managed by auto-save

  // Initialize with the last active project on component mount
  useEffect(() => {
    const storedActiveProject = localStorage.getItem('glow_active_project');
    console.log('PageManager: Stored active project on init:', storedActiveProject);
    
    if (storedActiveProject && storedActiveProject !== projectName) {
      console.log('PageManager: Setting project name to stored value:', storedActiveProject);
      setProjectName(storedActiveProject);
    }
    // Note: We no longer automatically set active project from available projects
    // The active project should only change when user manually saves
  }, []); // Run only on mount

  // Method to handle project loading from SaveLoad component
  const handleProjectLoad = (projectData) => {
    if (projectData.pages && Array.isArray(projectData.pages)) {
      // Update pages to include folderPath if missing (backward compatibility)
      const updatedPages = projectData.pages.map(page => {
        if (!page.folderPath) {
          page.folderPath = page.key === 'home' ? '' : generateAppRouterFolderPath(page.key, page.parentKey || 'home');
        }
        // Ensure all non-home pages have home as parent if no parent specified
        if (!page.isHome && (!page.parentKey || page.parentKey === null)) {
          page.parentKey = 'home';
        }
        return page;
      });
      
      console.log('Loading project:', projectData.name, 'with', updatedPages.length, 'pages');
      
      setPages(updatedPages);
      setProjectName(projectData.name || 'loaded-project');
      
      // Load auto-save settings from project data
      if (projectData.autoSaveSettings) {
        setAutoSaveEnabled(projectData.autoSaveSettings.enabled || false);
        setAutoSaveInterval(projectData.autoSaveSettings.interval || 30);
      } else {
        // Default auto-save settings if not in project
        setAutoSaveEnabled(false);
        setAutoSaveInterval(30);
      }
      
      // Load the current page or default to home
      const pageToLoad = projectData.currentPage || 'home';
      const pageExists = updatedPages.find(p => p.key === pageToLoad);
      
      console.log('Loading page:', pageToLoad, 'exists:', !!pageExists);
      
      // Use setTimeout to ensure state updates have been processed
      setTimeout(() => {
        if (pageExists) {
          loadPageData(pageToLoad, updatedPages);
        } else {
          loadPageData('home', updatedPages);
        }
      }, 200);
      
      // Expand all pages in the tree
      const allKeys = updatedPages.map(p => p.key);
      setExpandedKeys(allKeys);
      
      return true;
    }
    
    return false;
  };
  
  // Make handleProjectLoad available to parent components
  useEffect(() => {
    // Attach the load function to the component instance for external access
    if (window) {
      window.pageManagerLoad = handleProjectLoad;
    }
    
    return () => {
      // Clean up
      if (window) {
        delete window.pageManagerLoad;
      }
    };
  }, []);

  // Emit page updates for ExportManager
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('projectPagesUpdate', { 
      detail: { 
        pages: pages, 
        projectName: projectName,
        currentPage: currentPageKey 
      } 
    }));
  }, [pages, projectName, currentPageKey]);

  // Track changes for unsaved indicator
  useEffect(() => {
    const checkForChanges = () => {
      try {
        const currentData = query.serialize();
        const hasChanges = currentPageDataRef.current !== currentData;
        
        if (hasChanges !== unsavedChanges) {
          console.log('Unsaved changes state update:', { 
            hasChanges, 
            currentPage: currentPageKey,
            previousData: currentPageDataRef.current ? 'exists' : 'null',
            currentData: currentData ? 'exists' : 'null'
          });
          setUnsavedChanges(hasChanges);
        }
      } catch (error) {
        // Ignore serialization errors during transitions
        console.warn('Serialization error during change tracking:', error);
      }
    };
    
    const interval = setInterval(checkForChanges, 1000);
    return () => clearInterval(interval);
  }, [unsavedChanges, currentPageKey]);

  // Recursive function to build tree node with proper nesting
  const buildTreeNode = (page) => ({
    title: (
      <div className="flex items-center justify-between w-full group">
        <div className="flex items-center space-x-2">
          {page.isHome ? <HomeOutlined /> : <FileTextOutlined />}
          <div className="flex flex-col">
            <span className={page.key === currentPageKey ? 'font-bold text-blue-600' : ''}>
              {page.title}
            </span>
            <span className="text-xs text-gray-400">
              {page.folderPath ? `app/${page.folderPath}/` : 'app/'}
            </span>
          </div>
          {page.key === currentPageKey && unsavedChanges && (
            <span className="text-orange-500 text-xs">●</span>
          )}
        </div>
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip title="Add sub-page">
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPageKey(page.key);
                setNewPageModalVisible(true);
              }}
            />
          </Tooltip>
          {!page.isHome && (
            <Popconfirm
              title="Delete this page?"
              description="This action cannot be undone."
              onConfirm={(e) => {
                e.stopPropagation();
                deletePage(page.key);
              }}
              okText="Delete"
              cancelText="Cancel"
            >
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          )}
        </div>
      </div>
    ),
    key: page.key,
    children: page.children?.map(child => buildTreeNode(child))
  });

  // Page tree data for Ant Design Tree component (memoized for performance)
  const treeData = useMemo(() => {
    return buildPageTree(pages).map(page => buildTreeNode(page));
  }, [pages, currentPageKey, unsavedChanges]);

  // Output current page's serialized JSON to console
  const outputCurrentPageJSON = () => {
    try {
      const currentData = query.serialize();
      const currentPage = pages.find(p => p.key === currentPageKey);
      
      const pageJSON = {
        pageInfo: {
          key: currentPageKey,
          title: currentPage?.title || 'Unknown',
          path: currentPage?.path || '/',
          folderPath: currentPage?.folderPath || '',
          parentKey: currentPage?.parentKey || null,
          isHome: currentPage?.isHome || false
        },
        serializedData: currentData,
        timestamp: new Date().toISOString()
      };
      
      console.log('=== Current Page JSON ===');
      console.log(`Page: ${pageJSON.pageInfo.title} (${pageJSON.pageInfo.key})`);
      console.log(`Path: ${pageJSON.pageInfo.path}`);
      console.log(`Folder Path: app/${pageJSON.pageInfo.folderPath || 'page.js'}`);
      console.log('Full Page Data:', pageJSON);
      console.log('Serialized Data Only:', currentData);
      console.log('========================');
      
      message.success(`Page JSON output to console: ${pageJSON.pageInfo.title}`);
    } catch (error) {
      console.error('Failed to output page JSON:', error);
      message.error('Failed to output page JSON: ' + error.message);
    }
  };

  // Handle confirm switch modal actions
  const handleSaveAndSwitch = () => {
    console.log('User chose to save and switch to:', pendingPageSwitch);
    const saveSuccess = saveCurrentPageData();
    if (saveSuccess) {
      setConfirmSwitchModalVisible(false);
      loadPageData(pendingPageSwitch);
      setPendingPageSwitch(null);
    }
  };

  const handleSwitchWithoutSaving = () => {
    console.log('User chose to switch without saving to:', pendingPageSwitch);
    setConfirmSwitchModalVisible(false);
    loadPageData(pendingPageSwitch);
    setPendingPageSwitch(null);
  };

  const handleCancelSwitch = () => {
    console.log('User cancelled page switch');
    setConfirmSwitchModalVisible(false);
    setPendingPageSwitch(null);
  };

  // Load Page functionality (moved from SaveLoad)
  const handleLoadPage = () => {
    setLoadPageInputData('');
    setLoadPageModalVisible(true);
  };

  const loadPageToCurrentPage = () => {
    try {
      if (!loadPageInputData.trim()) {
        message.error('Please paste the page data or upload a .glow file');
        return;
      }
      
      let pageDataToLoad;
      
      try {
        // Try to decompress first (for .glow files or compressed data)
        pageDataToLoad = decompressData(loadPageInputData.trim());
      } catch (decompressError) {
        // If decompression fails, try to use as raw JSON
        try {
          JSON.parse(loadPageInputData.trim()); // Validate JSON
          pageDataToLoad = loadPageInputData.trim();
        } catch (jsonError) {
          throw new Error('Invalid format. Please provide a valid .glow file or serialized JSON data.');
        }
      }
      
      // Load the page data to current page with proper CraftJS readiness check
      const deserializeWithDelay = () => {
        try {
          // Check if query is available and ready
          if (!query || !actions) {
            console.warn('CraftJS not ready for manual page load, retrying...');
            setTimeout(deserializeWithDelay, 100);
            return;
          }
          
          actions.deserialize(pageDataToLoad);
          console.log('Page data loaded to current page successfully');
          
          // Mark current page as having unsaved changes
          setUnsavedChanges(true);
          
          message.success('Page loaded to current page successfully!');
          setLoadPageModalVisible(false);
          setLoadPageInputData('');
          
        } catch (deserializeError) {
          console.error('Failed to deserialize loaded page data:', deserializeError);
          message.error('Failed to load page data: ' + deserializeError.message);
        }
      };
      
      setTimeout(deserializeWithDelay, 100);
      
    } catch (error) {
      message.error('Failed to load page: ' + error.message);
    }
  };

  const handlePageFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLoadPageInputData(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  // Expose current page info to window for PreviewButton access
  useEffect(() => {
    const currentPage = pages.find(p => p.key === currentPageKey);
    if (window && currentPage) {
      window.currentPageInfo = {
        key: currentPage.key,
        title: currentPage.title,
        path: currentPage.path,
        folderPath: currentPage.folderPath,
        parentKey: currentPage.parentKey,
        isHome: currentPage.isHome
      };
    }
    
    return () => {
      if (window) {
        delete window.currentPageInfo;
      }
    };
  }, [currentPageKey, pages]);

  return (
    <>
      {/* Pages Button */}
      <Dropdown
        popupRender={() => (
          <div className="bg-white rounded-lg shadow-lg border p-4 min-w-[300px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <FolderOutlined />
                <Text strong>Pages</Text>
                <Text type="secondary">({pages.length})</Text>
              </div>
              <div className="flex items-center space-x-2">
                <Tooltip title="Auto-save settings">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<SettingOutlined />}
                    onClick={() => setSettingsModalVisible(true)}
                  />
                </Tooltip>
                <Tooltip title="Output page JSON to console">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<CodeOutlined />}
                    onClick={outputCurrentPageJSON}
                  />
                </Tooltip>
                <Tooltip title="Load page to current page">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<FileOutlined />}
                    onClick={handleLoadPage}
                  />
                </Tooltip>
              </div>
            </div>

            {/* Current Page Info */}
            <div className="mb-3 p-2 bg-blue-50 rounded text-sm">
              <Text strong>Current: </Text>
              <Text>{pages.find(p => p.key === currentPageKey)?.title || 'Home'}</Text>
              {pages.find(p => p.key === currentPageKey)?.folderPath && (
                <div className="font-mono text-xs text-gray-600 mt-1">
                  app/{pages.find(p => p.key === currentPageKey)?.folderPath}/page.js
                </div>
              )}
              {currentPageKey === 'home' && (
                <div className="font-mono text-xs text-gray-600 mt-1">
                  app/page.js (root)
                </div>
              )}
            </div>

            {/* Page Tree */}
            <div className="max-h-60 overflow-y-auto">
              <Tree
                treeData={treeData}
                expandedKeys={expandedKeys}
                onExpand={setExpandedKeys}
                selectedKeys={[currentPageKey]}
                onSelect={(selectedKeys) => {
                  if (selectedKeys && selectedKeys.length > 0 && selectedKeys[0] !== currentPageKey) {
                    const selectedKey = selectedKeys[0];
                    console.log('Tree selection - attempting to switch to page:', selectedKey, {
                      unsavedChanges,
                      currentPageKey,
                      selectedKey
                    });
                    switchToPage(selectedKey);
                  }
                }}
                switcherIcon={({ expanded }) => 
                  expanded ? <CaretDownOutlined /> : <CaretRightOutlined />
                }
              />
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* Add New Page */}
            <div className="flex items-center justify-between">
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => {
                  setSelectedPageKey('home'); // Default to adding under home
                  setNewPageModalVisible(true);
                }}
              >
                Add Page
              </Button>
              
              {lastSaveTime && (
                <Text type="secondary" className="text-xs">
                  <ClockCircleOutlined className="mr-1" />
                  Saved {lastSaveTime.toLocaleTimeString()}
                </Text>
              )}
            </div>
          </div>
        )}
        trigger={['click']}
        placement="bottomLeft"
      >
        <Tooltip title="Manage pages">
          <Button type="text" size="small">
            <div className="flex items-center space-x-1">
              <FolderOutlined />
              <span>Pages</span>
              {unsavedChanges && <span className="text-orange-500">●</span>}
            </div>
          </Button>
        </Tooltip>
      </Dropdown>

      {/* New Page Modal */}
      <Modal
      zIndex={1050}
        title="Add New Page"
        open={newPageModalVisible}
        onOk={addNewPage}
        onCancel={() => {
          setNewPageModalVisible(false);
          setNewPageName('');
          setSelectedPageKey(null);
        }}
        okText="Create Page"
        style={{ zIndex: 1050 }}
      >
        <div className="space-y-4">
          <div>
            <Text>Page Name</Text>
            <Input
              value={newPageName}
              onChange={(e) => setNewPageName(e.target.value)}
              placeholder="e.g., About, Contact, Shop"
              className="mt-1"
            />
          </div>
          
          <div>
            <Text>Parent Page</Text>
            <Select
              value={selectedPageKey || 'home'}
              onChange={setSelectedPageKey}
              className="w-full mt-1"
              placeholder="Select parent page"
            >
              <Option value="home">🏠 Home (Top Level)</Option>
              {pages.filter(p => !p.isHome).map(page => (
                <Option key={page.key} value={page.key}>
                  📄 {page.title}
                </Option>
              ))}
            </Select>
          </div>
          
          {newPageName && (
            <div className="bg-gray-50 p-3 rounded">
              <Text strong className="text-sm">Next.js App Router Structure:</Text>
              <div className="mt-2 font-mono text-xs text-gray-600">
                {(() => {
                  const pageKey = newPageName.toLowerCase().replace(/[^a-z0-9]/g, '-');
                  const parentKey = selectedPageKey || 'home';
                  if (parentKey === 'home') {
                    return `app/${pageKey}/page.js`;
                  } else {
                    const folderPath = generateAppRouterFolderPath(pageKey, parentKey);
                    return `app/${folderPath}/page.js`;
                  }
                })()}
              </div>
              <div className="mt-1 text-xs text-blue-600">
                URL: {(() => {
                  const pageKey = newPageName.toLowerCase().replace(/[^a-z0-9]/g, '-');
                  const parentKey = selectedPageKey || 'home';
                  return generatePagePath(pageKey, parentKey);
                })()}
              </div>
            </div>
          )}
          
          <div className="text-xs text-gray-500">
            💡 All pages are organized under the Home page for proper Next.js App Router structure
          </div>
        </div>
      </Modal>

      {/* Settings Modal */}
      <Modal
        title="Auto-Save Settings"
        open={settingsModalVisible}
        onOk={() => setSettingsModalVisible(false)}
        onCancel={() => setSettingsModalVisible(false)}
        style={{ zIndex: 1050 }}
        footer={[
          <Button key="close" onClick={() => setSettingsModalVisible(false)}>
            Close
          </Button>
        ]}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Text>Enable Auto-Save</Text>
            <Switch
              checked={autoSaveEnabled}
              onChange={setAutoSaveEnabled}
            />
          </div>
          
          {autoSaveEnabled && (
            <div>
              <Text>Auto-Save Interval (5 seconds - 5 minutes)</Text>
              <InputNumber
                value={autoSaveInterval}
                onChange={setAutoSaveInterval}
                min={5}
                max={300}
                className="w-full mt-1"
              />
              <div className="text-xs text-gray-500 mt-1">
                Range: 5 seconds to 300 seconds (5 minutes)
              </div>
            </div>
          )}
          
          <div>
            <Text>Project Name</Text>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="my-website"
              className="mt-1"
            />
          </div>
        </div>
      </Modal>

      {/* Confirm Switch Modal */}
      <Modal
        title="⚠️ Unsaved Changes"
        open={confirmSwitchModalVisible}
        onCancel={handleCancelSwitch}
        centered
        width={450}
        style={{ zIndex: 1050 }}
        footer={[
          <Button key="cancel" onClick={handleCancelSwitch}>
            Cancel
          </Button>,
          <Button key="dont-save" onClick={handleSwitchWithoutSaving}>
            Don't Save
          </Button>,
          <Button key="save" type="primary" onClick={handleSaveAndSwitch}>
            Save & Switch
          </Button>
        ]}
      >
        <div className="space-y-3">
          <p>You have unsaved changes on the current page.</p>
          <div className="bg-blue-50 p-3 rounded">
            <p><strong>Save & Switch:</strong> Save your changes and switch to the new page</p>
            <p><strong>Don't Save:</strong> Switch without saving (changes will be lost)</p>
            <p><strong>Cancel:</strong> Stay on the current page</p>
          </div>
          {pendingPageSwitch && (
            <p className="text-sm text-gray-600">
              Switching to: <strong>{pages.find(p => p.key === pendingPageSwitch)?.title || pendingPageSwitch}</strong>
            </p>
          )}
        </div>
      </Modal>

      {/* Load Page Modal */}
      <Modal
        title="Load Page Data"
        open={loadPageModalVisible}
        onCancel={() => {
          setLoadPageModalVisible(false);
          setLoadPageInputData('');
        }}
        onOk={loadPageToCurrentPage}
        okText="Load Page"
        width={600}
        style={{ zIndex: 1050 }}
      >
        <div className="space-y-4">
          {/* File upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Upload Page File:</label>
            <input
              type="file"
              accept=".glow,.txt"
              onChange={handlePageFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
          </div>
          
          {/* Manual paste */}
          <div>
            <label className="block text-sm font-medium mb-2">Or Paste Page Data:</label>
            <Input.TextArea
              value={loadPageInputData}
              onChange={(e) => setLoadPageInputData(e.target.value)}
              rows={6}
              placeholder="Paste your saved page data here..."
            />
            <p className="text-xs text-gray-500 mt-2">
              Supports .glow files and raw JSON data. Will load directly to the current page.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default PageManager;