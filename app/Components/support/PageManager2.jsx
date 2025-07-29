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
  Space,
  Typography,
  Divider,
  Popconfirm,
  Spin,
  Form,
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
  CodeOutlined,
  FileOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { useEditor } from '@craftjs/core';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { getSitePages, createPage, getPage, updatePage, deletePage as deletePageFromDB } from '../../../lib/sites';

const { Text, Title } = Typography;
const { Option } = Select;

/**
 * PageManager - Firebase-based page management system for the website builder
 * Features:
 * - Hierarchical page structure with Firebase storage
 * - Auto-save functionality integrated with editor
 * - Page navigation and switching
 * - Real-time page updates
 */
const PageManager2 = () => {
  const { actions, query } = useEditor();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  // Get site ID from URL parameters
  const siteId = searchParams?.get('site');
  
  // Check if editor is ready
  const isEditorReady = actions && query;
  
  // Modal states
  const [newPageModalVisible, setNewPageModalVisible] = useState(false);
  const [confirmSwitchModalVisible, setConfirmSwitchModalVisible] = useState(false);
  const [loadPageModalVisible, setLoadPageModalVisible] = useState(false);
  const [pendingPageSwitch, setPendingPageSwitch] = useState(null);
  
  // Page management states
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPageKey, setCurrentPageKey] = useState('home');
  const [selectedPageKey, setSelectedPageKey] = useState(null);
  const [expandedKeys, setExpandedKeys] = useState(['home']);
  
  // New page form states
  const [newPageName, setNewPageName] = useState('');
  const [newPageFormData, setNewPageFormData] = useState({ title: '', slug: '', parentKey: '' });
  const [creating, setCreating] = useState(false);
  const [loadPageInputData, setLoadPageInputData] = useState('');
  
  // Unsaved changes tracking
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(null);
  
  // Keep track of current page data
  const currentPageDataRef = useRef(null);
  const homePageCreationAttempts = useRef(0);

  // Load pages from Firebase on component mount
  useEffect(() => {
    if (!user?.uid || !siteId) {
      console.log('PageManager2: Waiting for user or siteId...', { user: !!user, siteId });
      return;
    }
    
    // Add a small delay to ensure the editor is ready
    const timeoutId = setTimeout(() => {
      loadPagesFromFirebase();
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [user?.uid, siteId]);

  // Load pages from Firebase
  const loadPagesFromFirebase = async () => {
    try {
      setLoading(true);
      console.log('🔄 PageManager2: Loading pages from Firebase...', { userId: user.uid, siteId });
      const firebasePages = await getSitePages(user.uid, siteId);
      console.log('🔄 PageManager2: Got firebasePages:', firebasePages);
      
      // If no pages exist at all, create a default home page first
      if (!firebasePages || firebasePages.length === 0) {
        if (homePageCreationAttempts.current < 3) {
          homePageCreationAttempts.current++;
          console.log('❌ PageManager2: No pages found, creating default home page... (attempt', homePageCreationAttempts.current, ')');
          await createDefaultHomePage();
          return; // Function will be called again after home page creation
        } else {
          console.error('❌ PageManager2: Too many home page creation attempts, stopping to prevent infinite loop');
          setLoading(false);
          return;
        }
      }
      
      // Convert Firebase pages to our format with proper hierarchy
      console.log('Raw Firebase pages:', firebasePages); // Debug log
      const convertedPages = firebasePages.map(page => {
        console.log('Converting page:', page.id, 'isHome:', page.isHome, 'name:', page.name);
        return {
          key: page.isHome ? 'home' : (page.slug || page.id), // Ensure home page always has key 'home'
          id: page.id,
          title: page.name || 'Untitled Page',
          slug: page.slug || page.id,
          isHome: page.isHome || false,
          path: page.isHome ? '/' : (page.path || `/${page.slug || page.id}`),
          content: null, // Load content when needed
          seoTitle: page.seoTitle || '',
          seoDescription: page.seoDescription || '',
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
          // Include hierarchy information
          parentKey: page.parentKey || (page.isHome ? null : 'home'),
          hierarchy: page.hierarchy || {
            parent: page.isHome ? null : (page.parentKey || 'home'),
            level: page.isHome ? 0 : (page.parentKey === 'home' || !page.parentKey ? 1 : 2),
            isChild: !page.isHome
          }
        };
      });

      // Sort pages: home first, then by hierarchy level, then alphabetically
      convertedPages.sort((a, b) => {
        if (a.isHome) return -1;
        if (b.isHome) return 1;
        if (a.hierarchy.level !== b.hierarchy.level) return a.hierarchy.level - b.hierarchy.level;
        return a.title.localeCompare(b.title);
      });

      // Ensure we have a home page
      if (!convertedPages.find(p => p.isHome)) {
        if (homePageCreationAttempts.current < 3) {
          homePageCreationAttempts.current++;
          console.log('❌ PageManager2: No home page found in converted pages, creating default home page... (attempt', homePageCreationAttempts.current, ')');
          await createDefaultHomePage();
          return; // Reload after creating home page
        } else {
          console.error('❌ PageManager2: Too many home page creation attempts, stopping to prevent infinite loop');
          setLoading(false);
          return;
        }
      }

      console.log('✅ PageManager2: Successfully converted pages:', convertedPages);
      // Reset creation attempts counter since we found pages
      homePageCreationAttempts.current = 0;
      setPages(convertedPages);
      
      // Set current page to home or the first page
      const homePage = convertedPages.find(p => p.isHome);
      if (homePage) {
        console.log('✅ PageManager2: Setting current page to home:', homePage.key);
        setCurrentPageKey(homePage.key);
        // Load home page content with a small delay to ensure state is updated
        setTimeout(() => {
          loadPageContent(homePage.key);
        }, 100);
      }

    } catch (error) {
      console.error('Error loading pages from Firebase:', error);
      message.error('Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  // Create default home page
  const createDefaultHomePage = async () => {
    try {
      console.log('🏠 PageManager2: Creating default home page...');
      const defaultContent = {
        "ROOT": {
          "type": { "resolvedName": "Root" },
          "nodes": [],
          "props": { "canvas": true },
          "custom": {},
          "parent": null,
          "displayName": "Root",
          "isCanvas": true
        }
      };

      const result = await createPage(user.uid, siteId, {
        name: 'Home',
        slug: 'home', // Ensure the slug is explicitly 'home'
        isHome: true,
        content: defaultContent,
        seoTitle: 'Home',
        seoDescription: 'Welcome to our website'
      });

      console.log('🏠 PageManager2: Default home page created:', result);
      
      // Reload pages after creating home
      await loadPagesFromFirebase();
    } catch (error) {
      console.error('Error creating default home page:', error);
      message.error('Failed to create home page');
    }
  };

  // Utility functions for Firebase integration

  // Save current page data to Firebase
  const saveCurrentPageData = async () => {
    try {
      const currentData = query.serialize();
      if (!currentData) {
        console.warn('No data to serialize');
        return false;
      }
      
      console.log('Saving current page data for page:', currentPageKey);
      
      const currentPage = pages.find(p => p.key === currentPageKey);
      if (!currentPage) {
        console.error('Current page not found in pages array');
        return false;
      }

      // Update page in Firebase
      await updatePage(user.uid, siteId, currentPage.id, {
        content: JSON.parse(currentData)
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

  // Load page content from Firebase
  const loadPageContent = async (pageKey) => {
    try {
      // Ensure pages are loaded first
      if (!pages || pages.length === 0) {
        console.warn('Pages not loaded yet, deferring page content loading for:', pageKey);
        return;
      }

      const page = pages.find(p => p.key === pageKey);
      if (!page) {
        console.warn('Page not found:', pageKey, 'Available pages:', pages.map(p => p.key));
        // If it's the home page and not found, try to create it
        if (pageKey === 'home') {
          if (homePageCreationAttempts.current < 3) {
            homePageCreationAttempts.current++;
            console.log('Home page not found, attempting to create default home page... (attempt', homePageCreationAttempts.current, ')');
            await createDefaultHomePage();
            return; // This will reload pages and try again
          } else {
            console.error('Too many home page creation attempts in loadPageContent, stopping to prevent infinite loop');
            return;
          }
        }
        return;
      }

      // Get page content from Firebase
      const pageData = await getPage(user.uid, siteId, page.id);
      let contentToLoad = pageData.content;

      // Default content if empty
      if (!contentToLoad || Object.keys(contentToLoad).length === 0) {
        contentToLoad = {
          "ROOT": {
            "type": { "resolvedName": "Root" },
            "nodes": [],
            "props": { "canvas": true },
            "custom": {},
            "parent": null,
            "displayName": "Root",
            "isCanvas": true
          }
        };
      }

      console.log('Loading page content:', { pageKey, hasContent: !!pageData.content });

      // Deserialize with delay to ensure CraftJS is ready
      const deserializeWithDelay = () => {
        try {
          if (!query || !actions) {
            console.warn('CraftJS not ready, retrying...');
            setTimeout(deserializeWithDelay, 100);
            return;
          }
          
          actions.deserialize(JSON.stringify(contentToLoad));
          console.log('CraftJS deserialization successful for page:', pageKey);
          
          setCurrentPageKey(pageKey);
          currentPageDataRef.current = JSON.stringify(contentToLoad);
          setUnsavedChanges(false);
          
          message.success(`Loaded page: ${page.title}`);
          
        } catch (deserializeError) {
          console.error('CraftJS deserialization failed:', deserializeError);
          message.error('Failed to load page content');
        }
      };
      
      setTimeout(deserializeWithDelay, 100);
      
    } catch (error) {
      console.error('Failed to load page content:', error);
      message.error('Failed to load page: ' + error.message);
    }
  };

  // Switch between pages
  const switchToPage = async (pageKey) => {
    if (pageKey === currentPageKey) return;
    
    console.log('switchToPage called:', { pageKey, unsavedChanges, currentPageKey });
    
    // Save current page data before switching
    if (unsavedChanges) {
      console.log('Saving current page data before switching');
      const saveSuccess = await saveCurrentPageData();
      
      if (!saveSuccess) {
        console.warn('Failed to save current page data');
        setPendingPageSwitch(pageKey);
        setConfirmSwitchModalVisible(true);
        return;
      }
    }
    
    console.log('Loading new page:', pageKey);
    await loadPageContent(pageKey);
  };

  // Add new page
  const handleAddPage = async () => {
    if (!newPageFormData.title.trim()) {
      message.error('Please enter a page title');
      return;
    }
    
    setCreating(true);
    
    try {
      const pageSlug = newPageFormData.slug || 
        newPageFormData.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      // Check if page with same slug already exists
      if (pages.find(p => p.slug === pageSlug)) {
        message.error('A page with this URL already exists');
        setCreating(false);
        return;
      }
      
      const defaultContent = {
        "ROOT": {
          "type": { "resolvedName": "Root" },
          "nodes": [],
          "props": { "canvas": true },
          "custom": {},
          "parent": null,
          "displayName": "Root",
          "isCanvas": true
        }
      };

      const newPage = await createPage(user.uid, siteId, {
        name: newPageFormData.title,
        slug: pageSlug,
        isHome: false,
        content: defaultContent,
        seoTitle: newPageFormData.title,
        seoDescription: `${newPageFormData.title} page`,
        parentKey: newPageFormData.parentKey || 'home',
        // Ensure all pages are children of home in the hierarchy
        path: newPageFormData.parentKey === 'home' || !newPageFormData.parentKey 
          ? `/${pageSlug}` 
          : `/${pages.find(p => p.key === newPageFormData.parentKey)?.slug || 'home'}/${pageSlug}`,
        // Store hierarchy information
        hierarchy: {
          parent: newPageFormData.parentKey || 'home',
          level: newPageFormData.parentKey === 'home' || !newPageFormData.parentKey ? 1 : 2,
          isChild: true // All pages except home are children
        }
      });

      // Reload pages to include the new page
      await loadPagesFromFirebase();
      
      message.success(`Page "${newPageFormData.title}" created successfully`);
      setNewPageModalVisible(false);
      setNewPageFormData({ title: '', slug: '', parentKey: '' });
      
    } catch (error) {
      console.error('Error creating page:', error);
      message.error('Failed to create page: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  // Load Page functionality - allows users to copy/paste page data to overwrite current page
  const loadPageToCurrentPage = async () => {
    try {
      if (!loadPageInputData.trim()) {
        message.error('Please paste the page data or upload a .glow file');
        return;
      }
      
      let pageDataToLoad;
      
      try {
        // Try to parse as JSON first
        pageDataToLoad = JSON.parse(loadPageInputData.trim());
      } catch (jsonError) {
        // If JSON parsing fails, try to decompress (for .glow files)
        try {
          const { decompressData } = await import('../../../lib/sites');
          pageDataToLoad = JSON.parse(decompressData(loadPageInputData.trim()));
        } catch (decompressError) {
          throw new Error('Invalid format. Please provide valid JSON data or a .glow file.');
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
          
          actions.deserialize(JSON.stringify(pageDataToLoad));
          console.log('Page data loaded to current page successfully');
          
          // Mark current page as having unsaved changes
          setUnsavedChanges(true);
          
          message.success('Page loaded to current page successfully! Remember to save your changes.');
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

  // Handle file upload for Load Page
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

  // Delete page
  const deletePageHandler = async (pageKey) => {
    const page = pages.find(p => p.key === pageKey);
    if (page?.isHome) {
      message.error('Cannot delete the home page');
      return;
    }
    
    if (!page) {
      message.error('Page not found');
      return;
    }
    
    try {
      await deletePageFromDB(user.uid, siteId, page.id);
      
      // If deleting current page, switch to home
      if (pageKey === currentPageKey) {
        setUnsavedChanges(false);
        currentPageDataRef.current = null;
        const homePage = pages.find(p => p.isHome);
        if (homePage) {
          await loadPageContent(homePage.key);
        }
      }
      
      // Reload pages
      await loadPagesFromFirebase();
      
      message.success(`Page "${page.title}" deleted`);
    } catch (error) {
      console.error('Error deleting page:', error);
      message.error('Failed to delete page: ' + error.message);
    }
  };

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

  // Convert pages to tree format for display with proper hierarchy
  const buildTreeNode = (page, children = []) => ({
    title: (
      <div className="flex items-center justify-between w-full group">
        <div className="flex items-center space-x-2">
          {page.isHome ? <HomeOutlined /> : <FileTextOutlined />}
          <div className="flex flex-col">
            <span className={page.key === currentPageKey ? 'font-bold text-blue-600' : ''}>
              {page.title}
            </span>
            <span className="text-xs text-gray-400">
              {page.path}
            </span>
          </div>
          {page.key === currentPageKey && unsavedChanges && (
            <span className="text-orange-500 text-xs">●</span>
          )}
        </div>
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip title="Add child page">
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setNewPageFormData(prev => ({ ...prev, parentKey: page.key }));
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
                deletePageHandler(page.key);
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
    children: children.length > 0 ? children : undefined
  });

  // Build hierarchical tree structure
  const buildHierarchicalTree = () => {
    const homePage = pages.find(p => p.isHome);
    if (!homePage) return [];

    // Get all child pages of home
    const childPages = pages.filter(p => !p.isHome && (p.parentKey === 'home' || p.hierarchy?.parent === 'home'));
    
    // Build child nodes recursively
    const buildChildren = (parentKey) => {
      return pages
        .filter(p => p.parentKey === parentKey || p.hierarchy?.parent === parentKey)
        .map(page => {
          const grandChildren = buildChildren(page.key);
          return buildTreeNode(page, grandChildren);
        });
    };

    const homeChildren = buildChildren('home');
    return [buildTreeNode(homePage, homeChildren)];
  };

  // Page tree data for Ant Design Tree component (memoized for performance)
  const treeData = useMemo(() => {
    return buildHierarchicalTree();
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
          slug: currentPage?.slug || currentPageKey,
          path: currentPage?.path || '/',
          isHome: currentPage?.isHome || false,
          id: currentPage?.id
        },
        serializedData: currentData,
        timestamp: new Date().toISOString()
      };
      
      console.log('=== Current Page JSON ===');
      console.log(`Page: ${pageJSON.pageInfo.title} (${pageJSON.pageInfo.slug})`);
      console.log(`Path: ${pageJSON.pageInfo.path}`);
      console.log(`Firebase ID: ${pageJSON.pageInfo.id}`);
      console.log('Full Page Data:', pageJSON);
      console.log('Serialized Data Only:', currentData);
      console.log('========================');
      
      message.success(`Page JSON output to console: ${pageJSON.pageInfo.title}`);
    } catch (error) {
      console.error('Failed to output page JSON:', error);
      message.error('Failed to output page JSON: ' + error.message);
    }
  };

  // Download current page's data as a file
  const downloadCurrentPageData = () => {
    try {
      const currentData = query.serialize();
      const currentPage = pages.find(p => p.key === currentPageKey);
      
      const pageJSON = {
        pageInfo: {
          key: currentPageKey,
          title: currentPage?.title || 'Unknown',
          slug: currentPage?.slug || currentPageKey,
          path: currentPage?.path || '/',
          isHome: currentPage?.isHome || false,
          id: currentPage?.id,
          exportedAt: new Date().toISOString()
        },
        serializedData: currentData,
        timestamp: new Date().toISOString()
      };
      
      // Create downloadable JSON file
      const dataStr = JSON.stringify(pageJSON, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      // Create download link
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename based on page info
      const sanitizedTitle = (currentPage?.title || 'page').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      link.download = `${sanitizedTitle}-${timestamp}.glow`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up URL object
      URL.revokeObjectURL(url);
      
      message.success(`Downloaded: ${link.download}`);
      
    } catch (error) {
      console.error('Failed to download page data:', error);
      message.error('Failed to download page data: ' + error.message);
    }
  };

  // Handle confirm switch modal actions
  const handleSaveAndSwitch = async () => {
    console.log('User chose to save and switch to:', pendingPageSwitch);
    const saveSuccess = await saveCurrentPageData();
    if (saveSuccess) {
      setConfirmSwitchModalVisible(false);
      await loadPageContent(pendingPageSwitch);
      setPendingPageSwitch(null);
    }
  };

  const handleSwitchWithoutSaving = async () => {
    console.log('User chose to switch without saving to:', pendingPageSwitch);
    setConfirmSwitchModalVisible(false);
    await loadPageContent(pendingPageSwitch);
    setPendingPageSwitch(null);
  };

  const handleCancelSwitch = () => {
    console.log('User cancelled page switch');
    setConfirmSwitchModalVisible(false);
    setPendingPageSwitch(null);
  };

  return (
    <>
      {/* Pages Button */}
      <Dropdown
        zIndex={999999}
        popupRender={() => (
          <div className="bg-white rounded-lg z-[99999999] shadow-lg border p-4 min-w-[300px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <FolderOutlined />
                <Text strong>Pages</Text>
                <Text type="secondary">({pages.length})</Text>
              </div>
              <div className="flex items-center space-x-2">
                <Tooltip title="Load page to current page">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<FileOutlined />}
                    onClick={() => setLoadPageModalVisible(true)}
                  />
                </Tooltip>
                <Tooltip title="Download page data">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<DownloadOutlined />}
                    onClick={downloadCurrentPageData}
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
              </div>
            </div>

            {/* Current Page Info */}
            <div className="mb-3 p-2 bg-blue-50 rounded text-sm">
              <Text strong>Current: </Text>
              <Text>{pages.find(p => p.key === currentPageKey)?.title || 'Loading...'}</Text>
              <div className="font-mono text-xs text-gray-600 mt-1">
                {pages.find(p => p.key === currentPageKey)?.path || '/'}
              </div>
            </div>

            {/* Loading indicator */}
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Spin size="small" />
                <Text className="ml-2" type="secondary">Loading pages...</Text>
              </div>
            ) : (
              <>
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
              </>
            )}
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
        zIndex={9999}
        title="Add New Page"
        open={newPageModalVisible}
        onOk={handleAddPage}
        onCancel={() => {
          setNewPageModalVisible(false);
          setNewPageFormData({ title: '', slug: '', parentKey: '' });
        }}
        okText="Create Page"
        okButtonProps={{ loading: creating }}
        style={{ zIndex: 9999 }}
      >
        <Form layout="vertical">
          <Form.Item label="Page Title" required>
            <Input
              value={newPageFormData.title}
              onChange={(e) => setNewPageFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="About Us"
              autoFocus
            />
          </Form.Item>
          
          <Form.Item label="URL Slug" help="Leave empty to auto-generate from title">
            <Input
              value={newPageFormData.slug}
              onChange={(e) => setNewPageFormData(prev => ({ ...prev, slug: e.target.value }))}
              placeholder="about-us"
              addonBefore="/"
            />
          </Form.Item>
          
          <Form.Item label="Add Under" help="All pages will be children of Home. Select the parent page.">
            <Select
              value={newPageFormData.parentKey || 'home'}
              onChange={(value) => setNewPageFormData(prev => ({ ...prev, parentKey: value }))}
              style={{ width: '100%' }}
            >
              <Option value="home">🏠 Home (Root Level)</Option>
              {pages.filter(p => !p.isHome).map(page => (
                <Option key={page.key} value={page.key}>
                  📄 {page.title} {page.hierarchy?.level > 1 ? `(Level ${page.hierarchy.level})` : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          {newPageFormData.title && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <Text strong className="text-blue-800">Page Structure Preview:</Text>
              <div className="mt-2 space-y-1">
                <div className="font-mono text-sm text-blue-700">
                  URL: {(() => {
                    const slug = newPageFormData.slug || newPageFormData.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
                    const parent = newPageFormData.parentKey || 'home';
                    if (parent === 'home') {
                      return `/${slug}`;
                    } else {
                      const parentPage = pages.find(p => p.key === parent);
                      return `${parentPage?.path || '/'}/${slug}`;
                    }
                  })()}
                </div>
                <div className="text-xs text-blue-600">
                  Hierarchy: Home → {(() => {
                    const parent = newPageFormData.parentKey || 'home';
                    if (parent === 'home') {
                      return newPageFormData.title;
                    } else {
                      const parentPage = pages.find(p => p.key === parent);
                      return `${parentPage?.title || 'Parent'} → ${newPageFormData.title}`;
                    }
                  })()}
                </div>
              </div>
            </div>
          )}
        </Form>
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
        okText="Load to Current Page"
        width={800}
        style={{ zIndex: 1050 }}
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <span className="text-yellow-600">⚠️</span>
              <div>
                <Text strong className="text-yellow-800">This will overwrite your current page content!</Text>
                <div className="text-sm text-yellow-700 mt-1">
                  Make sure to save your current work before loading new page data. This action cannot be undone.
                </div>
              </div>
            </div>
          </div>
          
          <Text>Load a page from a .glow file or paste serialized page data:</Text>
          
          <div className="flex items-center space-x-2">
            <input
              type="file"
              accept=".glow,.txt,.json"
              onChange={handlePageFileUpload}
              style={{ display: 'none' }}
              id="pageFileUpload"
            />
            <Button
              icon={<FileOutlined />}
              onClick={() => document.getElementById('pageFileUpload').click()}
            >
              Choose File
            </Button>
            <Text type="secondary">Supports .glow, .txt, and .json files</Text>
          </div>
          
          <div>
            <Text strong>Or paste page data directly:</Text>
            <Input.TextArea
              value={loadPageInputData}
              onChange={(e) => setLoadPageInputData(e.target.value)}
              placeholder="Paste your page data here (JSON format or .glow file content)..."
              rows={12}
              style={{ fontFamily: 'monospace', fontSize: '12px' }}
            />
          </div>
          
          <div className="text-xs text-gray-500">
            <Text type="secondary">
              💡 Tip: You can get page data by clicking the code button (📋) in the pages menu to output the current page data to console.
            </Text>
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
      
    </>
  );
};

export default PageManager2;