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
  ClockCircleOutlined
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
const PageManager2 = ({ 
  currentPageId, 
  onPageChange, 
  pages: externalPages, 
  onPagesUpdate 
}) => {
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
  const [pendingPageSwitch, setPendingPageSwitch] = useState(null);
  
  // Page management states
  const [pages, setPages] = useState(externalPages || []);
  const [loading, setLoading] = useState(!externalPages?.length);
  const [currentPageKey, setCurrentPageKey] = useState(currentPageId || 'home');
  const [selectedPageKey, setSelectedPageKey] = useState(null);
  const [expandedKeys, setExpandedKeys] = useState(['home']);
  
  // New page form states
  const [newPageName, setNewPageName] = useState('');
  const [newPageFormData, setNewPageFormData] = useState({ title: '', slug: '', parentKey: '' });
  const [creating, setCreating] = useState(false);
  
  // Unsaved changes tracking
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(null);
  
  // Keep track of current page data
  const currentPageDataRef = useRef(null);
  const homePageCreationAttempts = useRef(0);

  // Convert external pages to internal format
  const convertPagesToInternalFormat = (externalPages) => {
    if (!externalPages?.length) return [];
    
    console.log('🔄 PageManager2: Converting external pages:', externalPages);
    
    return externalPages.map(page => {
      const isHomePage = page.isHome || page.name === 'home' || page.slug === 'home';
      const converted = {
        key: isHomePage ? 'home' : (page.slug || page.id),
        id: page.id,
        title: page.name || 'Untitled Page',
        slug: page.slug || page.id,
        isHome: isHomePage,
        path: isHomePage ? '/' : (page.path || `/${page.slug || page.id}`),
        content: null,
        seoTitle: page.seoTitle || '',
        seoDescription: page.seoDescription || '',
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
        parentKey: isHomePage ? null : (page.parentKey || 'home'),
        hierarchy: page.hierarchy || {
          parent: isHomePage ? null : (page.parentKey || 'home'),
          level: isHomePage ? 0 : (page.parentKey === 'home' || !page.parentKey ? 1 : 2),
          isChild: !isHomePage
        }
      };
      console.log('🔧 PageManager2: Converted page:', { 
        original: { id: page.id, name: page.name, isHome: page.isHome },
        converted: { key: converted.key, title: converted.title, isHome: converted.isHome }
      });
      return converted;
    });
  };

  // Sync with external pages when they change
  useEffect(() => {
    if (externalPages?.length) {
      console.log('PageManager2: Syncing with external pages:', externalPages.length);
      const convertedPages = convertPagesToInternalFormat(externalPages);
      setPages(convertedPages);
      setLoading(false);
    }
  }, [externalPages]);

  // Convert page ID to page key for internal use
  const convertPageIdToKey = (pageId, pagesArray = pages) => {
    if (!pageId) return 'home';
    
    console.log('🔧 PageManager2: Converting page ID to key:', { pageId, availablePages: pagesArray.map(p => ({ id: p.id, key: p.key })) });
    
    // Find the page by ID and return its key
    const page = pagesArray.find(p => p.id === pageId);
    if (page) {
      console.log('🎯 PageManager2: Found page by ID:', { pageId, key: page.key, title: page.title });
      return page.key;
    }
    
    // If page not found by ID, check if pageId is already a key
    const pageByKey = pagesArray.find(p => p.key === pageId);
    if (pageByKey) {
      console.log('🎯 PageManager2: Found page by key:', { pageId, key: pageId, title: pageByKey.title });
      return pageId;
    }
    
    console.warn('⚠️ PageManager2: Page not found, defaulting to home:', pageId);
    // Default to 'home' if no match found
    return 'home';
  };

  // Convert page key to page ID for external use
  const convertPageKeyToId = (pageKey, pagesArray = pages) => {
    const page = pagesArray.find(p => p.key === pageKey);
    const result = page ? page.id : pageKey;
    console.log('🔧 PageManager2: Converting key to ID:', { pageKey, pageId: result });
    return result;
  };

  // Sync with external current page ID
  useEffect(() => {
    if (currentPageId && pages.length > 0) {
      const expectedKey = convertPageIdToKey(currentPageId, pages);
      if (expectedKey !== currentPageKey) {
        console.log('🔄 PageManager2: Syncing current page from', currentPageKey, 'to', expectedKey, '(ID:', currentPageId, ')');
        setCurrentPageKey(expectedKey);
      } else {
        console.log('✅ PageManager2: Current page already in sync:', { currentPageId, currentPageKey, expectedKey });
      }
    } else {
      console.log('⏳ PageManager2: Waiting for page sync...', { currentPageId, pagesLength: pages.length });
    }
  }, [currentPageId, currentPageKey, pages]);

  // Load pages from Firebase on component mount (only if no external pages provided)
  useEffect(() => {
    if (!externalPages?.length && user?.uid && siteId) {
      console.log('PageManager2: No external pages, loading from Firebase...');
      const timeoutId = setTimeout(() => {
        loadPagesFromFirebase();
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [user?.uid, siteId, externalPages?.length]);

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
        console.log('Converting page:', page.id, 'isHome:', page.isHome, 'name:', page.name, 'parentKey:', page.parentKey);
        const isHomePage = page.isHome || page.name === 'home' || page.slug === 'home';
        return {
          key: isHomePage ? 'home' : (page.slug || page.id), // Ensure home page always has key 'home'
          id: page.id,
          title: page.name || 'Untitled Page',
          slug: page.slug || page.id,
          isHome: isHomePage,
          path: isHomePage ? '/' : (page.path || `/${page.slug || page.id}`),
          content: null, // Load content when needed
          seoTitle: page.seoTitle || '',
          seoDescription: page.seoDescription || '',
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
          // CRITICAL: Ensure all non-home pages have 'home' as parent
          parentKey: isHomePage ? null : (page.parentKey || 'home'),
          hierarchy: page.hierarchy || {
            parent: isHomePage ? null : (page.parentKey || 'home'),
            level: isHomePage ? 0 : (page.parentKey === 'home' || !page.parentKey ? 1 : 2),
            isChild: !isHomePage
          }
        };
      });

      console.log('🔧 Converted pages with hierarchy:', convertedPages.map(p => ({ key: p.key, title: p.title, parentKey: p.parentKey, isHome: p.isHome })));

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
          "props": { 
            "canvas": true,
            "padding": 0,
            "margin": 0,
            "width": "100%",
            "minWidth": "100%",
            "maxWidth": "100%",
            "minHeight": "100vh",
            "background": "#ffffff",
            "position": "relative",
            "display": "block"
          },
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
            "props": { 
              "canvas": true,
              "padding": 0,
              "margin": 0,
              "width": "100%",
              "minWidth": "100%",
              "maxWidth": "100%",
              "minHeight": "100vh",
              "background": "#ffffff",
              "position": "relative",
              "display": "block"
            },
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
    
    console.log('PageManager2: switchToPage called:', { pageKey, currentPageKey });
    
    // Use external page change handler if provided
    if (onPageChange) {
      console.log('PageManager2: Using external page change handler');
      const pageId = convertPageKeyToId(pageKey, pages);
      console.log('PageManager2: Converting key', pageKey, 'to ID', pageId);
      onPageChange(pageId);
      return;
    }
    
    // Fallback to internal logic (for backward compatibility)
    console.log('PageManager2: Using internal page change logic');
    
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
          "props": { 
            "canvas": true,
            "padding": 0,
            "margin": 0,
            "width": "100%",
            "minWidth": "100%",
            "maxWidth": "100%",
            "minHeight": "100vh",
            "background": "#ffffff",
            "position": "relative",
            "display": "block"
          },
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
      
      // Notify parent component if callback provided
      if (onPagesUpdate) {
        const updatedPages = await getSitePages(user.uid, siteId);
        onPagesUpdate(updatedPages);
      }
      
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
      
      // Notify parent component if callback provided
      if (onPagesUpdate) {
        const updatedPages = await getSitePages(user.uid, siteId);
        onPagesUpdate(updatedPages);
      }
      
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
  // Convert flat pages array to tree structure (from PageManager.jsx)
  const buildPageTree = (pagesList) => {
    console.log('🌳 Building page tree from pages:', pagesList.map(p => ({ key: p.key, title: p.title, parentKey: p.parentKey, isHome: p.isHome })));
    
    const tree = [];
    const pageMap = {};
    
    // Create a map for quick lookup
    pagesList.forEach(page => {
      pageMap[page.key] = { ...page, children: [] };
    });
    
    console.log('🗺️ Page map created:', Object.keys(pageMap));
    
    // Build the tree
    pagesList.forEach(page => {
      if (page.parentKey && pageMap[page.parentKey]) {
        console.log(`📁 Adding ${page.key} as child of ${page.parentKey}`);
        pageMap[page.parentKey].children.push(pageMap[page.key]);
      } else {
        console.log(`🌲 Adding ${page.key} as root node (parentKey: ${page.parentKey})`);
        tree.push(pageMap[page.key]);
      }
    });
    
    console.log('🌳 Final tree structure:', tree);
    return tree;
  };

  // Find page in the tree structure (from PageManager.jsx)
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

  // Recursive function to build tree node with proper nesting (enhanced from PageManager.jsx)
  const buildTreeNode = (page) => {
    console.log(`🔨 Building tree node for: ${page.key} (${page.title}) with ${page.children?.length || 0} children`);
    if (page.children && page.children.length > 0) {
      console.log(`  Children: ${page.children.map(c => c.key).join(', ')}`);
    }
    
    const treeNode = {
      title: (
        <div className="flex items-center justify-between w-full group hover:bg-gray-50 -mx-2 px-2 py-1 rounded transition-all">
          <div className="flex items-center space-x-2">
            {page.isHome ? (
              <HomeOutlined className="text-blue-600" />
            ) : (
              <FileTextOutlined className="text-gray-500" />
            )}
            <div className="flex flex-col">
              <span className={`${
                page.key === currentPageKey 
                  ? 'font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded-md' 
                  : 'text-gray-700 hover:text-gray-900'
              } transition-all`}>
                {page.title}
              </span>
              <span className="text-xs text-gray-400 mt-0.5">
                {page.path}
              </span>
            </div>
            {page.key === currentPageKey && unsavedChanges && (
              <span className="text-orange-500 text-xs flex items-center">
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1 animate-pulse"></span>
                ●
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip title="Add sub-page">
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                className="text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPageKey(page.key);
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
                okButtonProps={{ danger: true }}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            )}
          </div>
        </div>
      ),
      key: page.key,
      isLeaf: !page.children || page.children.length === 0
    };
    
    // Only add children if they exist and have content
    if (page.children && page.children.length > 0) {
      treeNode.children = page.children.map(child => buildTreeNode(child));
    }
    
    console.log(`  Final tree node for ${page.key}:`, { key: treeNode.key, hasChildren: !!treeNode.children, isLeaf: treeNode.isLeaf });
    
    return treeNode;
  };

  // Page tree data for Ant Design Tree component (memoized for performance)
  const treeData = useMemo(() => {
    console.log('🔧 Generating tree data from pages:', pages.map(p => ({ key: p.key, title: p.title, parentKey: p.parentKey, isHome: p.isHome })));
    const tree = buildPageTree(pages).map(page => buildTreeNode(page));
    console.log('🌳 Final tree data for Ant Design Tree:', tree);
    console.log('🌳 Tree structure visualization:');
    const visualizeTree = (nodes, depth = 0) => {
      nodes.forEach(node => {
        console.log('  '.repeat(depth) + `- ${node.title} (${node.key})`);
        if (node.children && node.children.length > 0) {
          visualizeTree(node.children, depth + 1);
        }
      });
    };
    visualizeTree(tree);
    return tree;
  }, [pages, currentPageKey, unsavedChanges]);

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
          <div
            className=" z-[99999999] shadow-lg border p-4 min-w-[320px]"
            style={{
              background: 'var(--panel-bg)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-color)'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <FolderOutlined style={{ color: 'var(--accent-color)' }} />
                <Text strong style={{ color: 'var(--text-primary)' }}>Pages</Text>
                <Text className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  {pages.length}
                </Text>
              </div>
              <div className="flex items-center space-x-2">
                {/* Clean UI without action buttons */}
              </div>
            </div>

            {/* Current Page Info - Enhanced */}
            <div
              className="mb-3 p-3 rounded-lg text-sm"
              style={{
                background: 'var(--accent-bg)',
                border: '1px solid var(--accent-color)'
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <Text strong style={{ color: 'var(--text-primary)' }}>Current: </Text>
                  <Text style={{ color: 'var(--text-primary)' }} className="font-medium">
                    {pages.find(p => p.key === currentPageKey)?.title || 'Loading...'}
                  </Text>
                  <div className="font-mono text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {pages.find(p => p.key === currentPageKey)?.path || '/'}
                  </div>
                </div>
                {unsavedChanges && (
                  <div className="flex items-center text-xs" style={{ color: 'var(--warning-color)' }}>
                    <span className="w-2 h-2 rounded-full mr-1 animate-pulse" style={{ background: 'var(--warning-color)' }}></span>
                    Unsaved
                  </div>
                )}
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
                {/* Page Tree with enhanced styling */}
                <div
                  className="max-h-60 overflow-y-auto border rounded-lg"
                  style={{ background: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}
                >
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
                      expanded ? <CaretDownOutlined style={{ color: 'var(--accent-color)' }} /> : <CaretRightOutlined style={{ color: 'var(--text-muted)' }} />
                    }
                    className="p-2"
                  />
                </div>

                <Divider style={{ margin: '16px 0' }} />

                {/* Add New Page - Enhanced */}
                <div className="flex items-center justify-between">
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setNewPageModalVisible(true);
                    }}
                    className="border-0 shadow-sm hover:shadow-md transition-all"
                  >
                    Add Page
                  </Button>
                  
                  {lastSaveTime && (
                    <Text className="text-xs flex items-center" style={{ color: 'var(--text-secondary)' }}>
                      <ClockCircleOutlined className="mr-1" style={{ color: 'var(--success-color)' }} />
                      <span>Saved {lastSaveTime.toLocaleTimeString()}</span>
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
              <FolderOutlined style={{ color: 'var(--accent-color)' }} />
              <span>Pages</span>
              {unsavedChanges && <span style={{ color: 'var(--warning-color)' }}>●</span>}
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
            <div className="rounded-lg p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <Text strong style={{ color: 'var(--text-primary)' }}>Page Structure Preview:</Text>
              <div className="mt-2 space-y-1">
                <div className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
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
                <div className="text-xs" style={{ color: 'var(--accent-color)' }}>
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