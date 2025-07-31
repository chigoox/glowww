'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { getSite, updateSite, getSiteData, getPage, updatePage, getSitePages } from '../../../lib/sites';
import { Spin, message, Button, Space, Typography, Alert, Switch, Dropdown, Tooltip } from 'antd';
import { EyeOutlined, ArrowLeftOutlined, UndoOutlined, RedoOutlined, HistoryOutlined } from '@ant-design/icons';

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
  const [pages, setPages] = useState([]); // Add pages state
  const [openMenuNodeId, setOpenMenuNodeId] = useState(null);
  const [activeDrawer, setActiveDrawer] = useState(null);
  const [useFigmaStyle, setUseFigmaStyle] = useState(true);
  const [currentPageId, setCurrentPageId] = useState(null); // Track current page - start with null
  const [currentPageData, setCurrentPageData] = useState(null); // Store current page content
  const [pageContentCache, setPageContentCache] = useState({}); // Cache page content
  const [isLoadingPage, setIsLoadingPage] = useState(false); // Loading state for page switches
  const [isInitialized, setIsInitialized] = useState(false);
  console.log(pages)
  // Auto-save functionality
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSaveFrequency, setAutoSaveFrequency] = useState(3000); // 3 seconds default

  // Helper function to validate and clean CraftJS content structure
  const validateAndCleanContent = (content) => {
    // Handle string input by parsing it first
    let parsedContent;
    if (typeof content === 'string') {
      try {
        parsedContent = JSON.parse(content);
      } catch (parseError) {
        console.error('Failed to parse content string:', parseError);
        throw new Error('Invalid content string format');
      }
    } else if (typeof content === 'object' && content !== null) {
      parsedContent = content;
    } else {
      throw new Error('Invalid content structure - must be string or object');
    }

    if (!parsedContent || typeof parsedContent !== 'object') {
      throw new Error('Invalid content structure after parsing');
    }

    // Create a cleaned copy
    const cleaned = {};
    
    // Process each node in the content
    Object.keys(parsedContent).forEach(nodeId => {
      const node = parsedContent[nodeId];
      
      if (node && typeof node === 'object') {
        cleaned[nodeId] = {
          type: node.type || { resolvedName: "Root" },
          isCanvas: node.isCanvas || false,
          props: node.props || {},
          displayName: node.displayName || nodeId,
          custom: node.custom || {},
          parent: node.parent || null,
          nodes: Array.isArray(node.nodes) ? node.nodes : [],
          linkedNodes: node.linkedNodes || {}
        };

        // Ensure type structure is correct
        if (cleaned[nodeId].type && typeof cleaned[nodeId].type !== 'object') {
          cleaned[nodeId].type = { resolvedName: String(cleaned[nodeId].type) };
        }

        // Ensure props exist and are an object
        if (!cleaned[nodeId].props || typeof cleaned[nodeId].props !== 'object') {
          cleaned[nodeId].props = {};
        }

        // Clean any circular references or problematic data structures
        try {
          // Test if the node can be serialized
          JSON.stringify(cleaned[nodeId]);
        } catch (serializeError) {
          console.warn(`Cleaning problematic node data for ${nodeId}:`, serializeError);
          // Reset to basic structure if serialization fails
          cleaned[nodeId] = {
            type: { resolvedName: "Box" },
            isCanvas: false,
            props: {},
            displayName: nodeId,
            custom: {},
            parent: node.parent || null,
            nodes: [],
            linkedNodes: {}
          };
        }
      }
    });

    // Ensure ROOT node exists
    if (!cleaned.ROOT) {
      cleaned.ROOT = {
        type: { resolvedName: "Root" },
        isCanvas: true,
        props: { canvas: true },
        displayName: "Root",
        custom: {},
        parent: null,
        nodes: [],
        linkedNodes: {}
      };
    }

    return cleaned;
  };

  const { enabled, query, actions, canUndo, canRedo, editorState } = useEditor((state, query) => ({
    enabled: state.options.enabled,
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo(),
    // Monitor the actual state to trigger history updates
    editorState: state
  }));

  // Load pages on component mount
  useEffect(() => {
    const loadPages = async () => {
      if (!user?.uid || !siteId) return;
      
      try {
        const sitePages = await getSitePages(user.uid, siteId);
        setPages(sitePages || []);
        
        // Create a default home page if no pages exist
        if (!sitePages || sitePages.length === 0) {
          setPages([
            {
              id: 'home',
              name: 'Home',
              slug: 'home',
              isHomePage: true,
              createdAt: new Date()
            }
          ]);
        }
      } catch (error) {
        console.error('❌ Error loading pages:', error);
        // Fallback to default page structure
        setPages([
          {
            id: 'home',
            name: 'Home',
            slug: 'home',
            isHomePage: true,
            createdAt: new Date()
          }
        ]);
      }
    };

    loadPages();
  }, [user?.uid, siteId]);

  // Load initial content only when component mounts
  useEffect(() => {
    const loadInitialContent = async () => {
      // Wait for actions to be available and not already initialized
      if (!actions || isInitialized || !user?.uid || !siteId || !pages.length) return;
      
      // Find the first page (home page) if currentPageId is null
      const targetPageId = currentPageId || (pages.length > 0 ? pages[0].id : null);
      
      if (!targetPageId) {
        console.error('No page to load - no pages found');
        return;
      }
      
      console.log('🚀 Loading page from Firebase document:', targetPageId);
      
      try {
        let contentToLoad = null;
        
        // Load all pages from Firebase page documents (including home)
        const cachedContent = pageContentCache[targetPageId];
        if (cachedContent && cachedContent !== '{}' && cachedContent.includes('ROOT')) {
          try {
            JSON.parse(cachedContent);
            contentToLoad = cachedContent;
          } catch (parseError) {
            // Cached content invalid, will try Firebase
          }
        }
        
        // If no valid cache, load from Firebase page document
        if (!contentToLoad) {
          try {
            const pageData = await getPage(user.uid, siteId, targetPageId);
            if (pageData?.content) {
              const pageContent = JSON.stringify(pageData.content);
              const parsed = JSON.parse(pageContent);
              if (parsed.ROOT) {
                contentToLoad = pageContent;
              }
            }
          } catch (error) {
            console.error('Could not load page from Firebase:', error);
          }
        }
        
        // Clear editor first to ensure clean state
        actions.clearEvents();
        
        // Define fallback handler for initialization errors
        const handleInitializationFallback = () => {
          try {
            const fallbackState = {
              "ROOT": {
                "type": { "resolvedName": "Root" },
                "nodes": ["welcomeText"],
                "props": { "canvas": true },
                "custom": {},
                "parent": null,
                "displayName": "Root",
                "isCanvas": true
              },
              "welcomeText": {
                "type": { "resolvedName": "Text" },
                "isCanvas": false,
                "props": {
                  "text": `Welcome to ${targetPageId}! You can now add components to this page.`,
                  "fontSize": "18",
                  "color": "#666666",
                  "textAlign": "center",
                  "padding": [20, 20, 20, 20]
                },
                "displayName": "Text",
                "custom": {},
                "parent": "ROOT",
                "nodes": [],
                "linkedNodes": {}
              }
            };
            
            actions.deserialize(fallbackState);
            setCurrentPageData(JSON.stringify(fallbackState));
            setPageContentCache(prev => ({
              ...prev,
              [targetPageId]: JSON.stringify(fallbackState)
            }));
            setIsInitialized(true);
            console.log('Fallback to empty state successful for page:', targetPageId);
          } catch (fallbackError) {
            console.error('Failed to load fallback empty state:', fallbackError);
            setIsInitialized(true); // Set as initialized to prevent infinite loops
          }
        };
        
        // Apply content with rendering fix for initial load
        try {
          if (contentToLoad) {
            console.log('🧹 Initial: Validating and cleaning content before load');
            const cleanedContent = validateAndCleanContent(contentToLoad);
            
            // Use setTimeout to ensure clearEvents completes before deserializing
            setTimeout(() => {
              try {
                // Check if this is an empty page that needs starter content
                const isEmptyPage = (cleanedContent.ROOT?.nodes?.length || 0) === 0;
                
                // Always use normal deserialization - no automatic content addition
                actions.deserialize(cleanedContent);
                setCurrentPageData(JSON.stringify(cleanedContent));
                
                // Cache the cleaned content
                setPageContentCache(prev => ({
                  ...prev,
                  [targetPageId]: JSON.stringify(cleanedContent)
                }));
                
                // Set current page ID to the loaded page
                if (currentPageId !== targetPageId) {
                  setCurrentPageId(targetPageId);
                }
                
                // Set initialized after successful deserialization
                setIsInitialized(true);
                
              } catch (deserializeError) {
                console.error('Error during content deserialization:', deserializeError);
                // Fallback to empty state
                handleInitializationFallback();
              }
            }, 100);
          } else {
            // Load enhanced empty state for new pages with better drop zone
            
            setTimeout(() => {
              const enhancedEmptyState = {
                "ROOT": {
                  "type": { "resolvedName": "Root" },
                  "nodes": [],
                  "props": { 
                    "canvas": true,
                    "minHeight": "600px",
                    "background": "#ffffff",
                    "position": "relative",
                    "width": "100%",
                    "padding": 20,
                    "display": "block"
                  },
                  "custom": {},
                  "parent": null,
                  "displayName": "Root",
                  "isCanvas": true
                }
              };
              
              try {
                actions.deserialize(enhancedEmptyState);
                setCurrentPageData(JSON.stringify(enhancedEmptyState));
                
                // Set current page ID for new pages
                if (currentPageId !== targetPageId) {
                  setCurrentPageId(targetPageId);
                }
                
                // Cache the enhanced empty state for current page
                setPageContentCache(prev => ({
                  ...prev,
                  [targetPageId]: JSON.stringify(enhancedEmptyState)
                }));
                
                // Set initialized after successful deserialization
                setIsInitialized(true);
                console.log('Editor initialization complete with empty state (no automatic content)');
                
              } catch (error) {
                console.error('Error loading empty state:', error);
                handleInitializationFallback();
              }
            }, 100);
          }
          
        } catch (error) {
          console.error('Error during initial content loading:', error);
          // Use the fallback handler
          handleInitializationFallback();
        }
        
      } catch (error) {
        console.error('Error during initial content loading:', error);
        setIsInitialized(true);
      }
    };

    loadInitialContent();
  }, [actions, isInitialized, user?.uid, siteId, pages.length]); // Added pages dependency

  // Helper function to validate and clean cache
  const validateAndCleanCache = useCallback(() => {
    setPageContentCache(prev => {
      const cleanedCache = {};
      
      Object.entries(prev).forEach(([pageId, content]) => {
        try {
          // Validate that the content is parseable and has ROOT
          if (content && content !== '{}' && content.includes('ROOT')) {
            const parsed = JSON.parse(content);
            if (parsed.ROOT) {
              cleanedCache[pageId] = content;
            } else {
              console.log('Removing invalid cached content for page:', pageId, '(no ROOT)');
            }
          } else {
            console.log('Removing invalid cached content for page:', pageId, '(empty or malformed)');
          }
        } catch (error) {
          console.log('Removing unparseable cached content for page:', pageId, error.message);
        }
      });
      
      return cleanedCache;
    });
  }, []);

  // Clean cache on initialization
  useEffect(() => {
    if (isInitialized) {
      validateAndCleanCache();
    }
  }, [isInitialized, validateAndCleanCache]);

  // Auto-save functionality with change detection
  const autoSave = useCallback(async () => {
    if (!query || !isInitialized || isLoadingPage || isSaving) {
      console.log('📝 Auto-save skipped:', { 
        hasQuery: !!query, 
        isInitialized, 
        isLoadingPage, 
        isSaving 
      });
      return;
    }

    try {
      setIsSaving(true);
      const currentContent = query.serialize();
      
      if (!currentContent || currentContent === '{}' || !currentContent.includes('ROOT')) {
        console.log('📝 Auto-save skipped: No valid content to save');
        return;
      }

      // Check if content actually changed from cache using current cache state
      setPageContentCache(currentCache => {
        const cachedContent = currentCache[currentPageId];
        if (currentContent === cachedContent) {
          console.log('📝 Auto-save skipped: Content unchanged from cache');
          return currentCache; // Return same cache to prevent re-render
        }

        // Content has changed, proceed with save
        (async () => {
          try {
            // Validate content before saving
            const parsed = JSON.parse(currentContent);
            if (!parsed.ROOT) {
              console.log('📝 Auto-save skipped: Content missing ROOT node');
              return;
            }

            // Save to Firebase page document
            console.log('💾 Auto-saving page:', currentPageId, 'Content size:', JSON.stringify(parsed).length);
            
            await updatePage(user.uid, siteId, currentPageId, {
              content: parsed,
              lastModified: new Date()
            });

            setLastSaved(new Date());
            console.log('✅ Auto-save successful for page:', currentPageId);
            
          } catch (error) {
            console.error('❌ Auto-save failed:', error);
          }
        })();

        // Update cache with the new content
        return {
          ...currentCache,
          [currentPageId]: currentContent
        };
      });
      
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [query, isInitialized, isLoadingPage, isSaving, currentPageId, user?.uid, siteId]);

  // Auto-save effect with change detection and debouncing
  useEffect(() => {
    if (!isInitialized || isLoadingPage || !query) return;

    // Only trigger auto-save if content actually changed
    const timeoutId = setTimeout(() => {
      try {
        const currentContent = query.serialize();
        const cachedContent = pageContentCache[currentPageId];
        
        // Only auto-save if content is different from cache
        if (currentContent && currentContent !== cachedContent && currentContent !== '{}') {
          autoSave();
        }
      } catch (error) {
        console.error('Error checking content changes for auto-save:', error);
      }
    }, autoSaveFrequency);

    return () => clearTimeout(timeoutId);
  }, [editorState, autoSaveFrequency, isInitialized, isLoadingPage]); // Removed query and cache dependencies

  // Handle undo/redo using CraftJS built-in history
  const handleUndo = () => {
    if (canUndo) {
      actions.history.undo();
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      actions.history.redo();
    }
  };

  // Simple dropdown menu for undo/redo actions
  const historyDropdownMenu = {
    items: [
      {
        key: 'undo',
        label: 'Undo',
        disabled: !canUndo,
        onClick: handleUndo
      },
      {
        key: 'redo', 
        label: 'Redo',
        disabled: !canRedo,
        onClick: handleRedo
      }
    ]
  };

  // Safety timeout to prevent permanent loading state
  useEffect(() => {
    if (isLoadingPage) {
      const timeoutId = setTimeout(() => {
        console.warn('🚨 Page loading timeout reached, forcing recovery');
        setIsLoadingPage(false);
        setIsInitialized(true);
        message.warning('Page loading timed out - editor re-enabled');
      }, 10000); // 10 second timeout
      
      return () => clearTimeout(timeoutId);
    }
  }, [isLoadingPage]);

  // Preview function
  const handlePreview = () => {
    if (!user?.username || !site?.name) {
      message.error('Cannot preview: missing user or site information');
      return;
    }
    
    // Open preview in new tab
    let previewUrl = `/u/${user.username}/${site.name}`;
    
    // If not on home page, append the page path
    if (currentPageId !== 'home') {
      // For now, use the page ID as the path
      // This could be enhanced to use actual page slug/path from the page data
      previewUrl += `/${currentPageId}`;
    }
    
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

  // Handle page changes with simplified and robust logic
  const handlePageChange = async (newPageId) => {
    // Basic validation
    if (newPageId === currentPageId || !actions || isLoadingPage) {
      console.log('🚫 V4: Page change skipped -', { 
        sameId: newPageId === currentPageId, 
        noActions: !actions, 
        loading: isLoadingPage 
      });
      return;
    }
    
    console.log('🔄 V4: Starting page change from', currentPageId, 'to', newPageId);
    
    try {
      setIsLoadingPage(true);
      
      // 1. Save current page to cache if we have valid content
      if (currentPageId && query && isInitialized) {
        try {
          const currentContent = query.serialize();
          if (currentContent && currentContent !== '{}' && currentContent.includes('ROOT')) {
            setPageContentCache(prev => ({
              ...prev,
              [currentPageId]: currentContent
            }));
            console.log('� V4: Saved current page to cache');
          }
        } catch (saveError) {
          console.error('❌ V4: Save error:', saveError);
        }
      }
      
      // 2. Clear editor state
      try {
        actions.clearEvents();
      } catch (clearError) {
        console.error('⚠️ V4: Clear error:', clearError);
      }
      
      // 3. Update page ID immediately
      setCurrentPageId(newPageId);
      
      // 4. Get content for new page
      let contentToLoad = null;
      
      // Check cache first
      const cachedContent = pageContentCache[newPageId];
      if (cachedContent && cachedContent.includes('ROOT')) {
        try {
          const parsed = JSON.parse(cachedContent);
          if (parsed.ROOT) {
            contentToLoad = cachedContent;
            console.log('📦 V4: Using cached content');
          }
        } catch (parseError) {
          console.error('❌ V4: Invalid cache, removing');
          setPageContentCache(prev => {
            const newCache = { ...prev };
            delete newCache[newPageId];
            return newCache;
          });
        }
      }
      
      // Load from Firebase if no cache
      if (!contentToLoad) {
        try {
          const pageData = await getPage(user.uid, siteId, newPageId);
          if (pageData?.content?.ROOT) {
            contentToLoad = JSON.stringify(pageData.content);
            console.log('� V4: Loaded from Firebase');
          }
        } catch (firebaseError) {
          console.error('❌ V4: Firebase error:', firebaseError);
        }
      }
      
      // Use empty state if nothing found
      if (!contentToLoad) {
        contentToLoad = JSON.stringify({
          "ROOT": {
            "type": { "resolvedName": "Root" },
            "nodes": [],
            "props": { 
              "canvas": true,
              "minHeight": "600px",
              "background": "#ffffff",
              "position": "relative",
              "width": "100%",
              "padding": 20,
              "display": "block"
            },
            "custom": {},
            "parent": null,
            "displayName": "Root",
            "isCanvas": true
          }
        });
        console.log('� V4: Using empty state');
      }
      
      // 5. Apply content to editor with rendering fix
      try {
        const parsed = JSON.parse(contentToLoad);
        console.log('🔍 V4: Parsed content analysis:', {
          hasRoot: !!parsed.ROOT,
          rootType: parsed.ROOT?.type?.resolvedName,
          nodeCount: parsed.ROOT?.nodes?.length || 0,
          isEmptyPage: (parsed.ROOT?.nodes?.length || 0) === 0,
          allKeys: Object.keys(parsed)
        });
        
        if (parsed.ROOT) {
          // Validate and clean the content structure before deserializing
          const cleanedContent = validateAndCleanContent(parsed);
          const cleanedContentString = JSON.stringify(cleanedContent);
          
          console.log('🧹 V4: Content cleaned, applying to editor with rendering fix');
          console.log('🔧 V4: Clean content preview:', {
            rootNodes: cleanedContent.ROOT?.nodes || [],
            hasVisualContent: (cleanedContent.ROOT?.nodes?.length || 0) > 0
          });
          
          // Apply the rendering fix: clear events first, then deserialize with timeout
          actions.clearEvents();
          
          setTimeout(() => {
            try {
              // Check if this is a new/empty page that needs special handling
              const isEmptyPage = (cleanedContent.ROOT?.nodes?.length || 0) === 0;
              console.log('🔍 V4: Empty page detection:', isEmptyPage);
              
              // Always use normal deserialization - no automatic content addition
              actions.deserialize(cleanedContent);
              setCurrentPageData(cleanedContentString);
              
              // Update cache
              setPageContentCache(prev => ({
                ...prev,
                [newPageId]: cleanedContentString
              }));
              
              if (isEmptyPage) {
                console.log('✅ V4: Empty page loaded (no automatic content added)');
              } else {
                console.log('✅ V4: Existing page content loaded');
              }
              
              // Verify the deserialization worked
              setTimeout(() => {
                try {
                  const verifyContent = query.serialize();
                  const verifyParsed = JSON.parse(verifyContent);
                  console.log('✅ V4: Post-switch verification:', {
                    pageId: newPageId,
                    nodeCount: verifyParsed.ROOT?.nodes?.length || 0,
                    hasVisualContent: (verifyParsed.ROOT?.nodes?.length || 0) > 0,
                    serializationWorking: !!verifyContent
                  });
                } catch (verifyError) {
                  console.error('❌ V4: Post-switch verification failed:', verifyError);
                }
              }, 10);
              
              console.log('✅ V4: Page switch successful with rendering fix');
              
              // Complete after successful deserialization
              setTimeout(() => {
                setIsLoadingPage(false);
                message.success(`Switched to: ${newPageId}`);
              }, 50);
              
            } catch (deserializeError) {
              console.error('❌ V4: Deserialization error after timeout:', deserializeError);
              throw deserializeError;
            }
          }, 100); // Give time for clearEvents to complete
          
        } else {
          throw new Error('Invalid content structure');
        }
      } catch (applyError) {
        console.error('❌ V4: Apply error:', applyError);
        
        // Emergency fallback with enhanced drop zone (no automatic content)
        const enhancedEmptyState = {
          "ROOT": {
            "type": { "resolvedName": "Root" },
            "nodes": [],
            "props": { 
              "canvas": true,
              "minHeight": "600px",
              "background": "#ffffff",
              "position": "relative",
              "width": "100%",
              "padding": 20,
              "display": "block"
            },
            "custom": {},
            "parent": null,
            "displayName": "Root",
            "isCanvas": true
          }
        };
        
        try {
          // Apply rendering fix for emergency fallback too
          actions.clearEvents();
          
          setTimeout(() => {
            try {
              actions.deserialize(enhancedEmptyState);
              setCurrentPageData(JSON.stringify(enhancedEmptyState));
              setPageContentCache(prev => ({ ...prev, [newPageId]: JSON.stringify(enhancedEmptyState) }));
              
              setTimeout(() => {
                setIsLoadingPage(false);
                message.success(`Switched to ${newPageId} with empty content`);
              }, 50);
            } catch (emergencyError) {
              console.error('💥 V4: Emergency fallback failed:', emergencyError);
              setIsLoadingPage(false);
              message.error('Page switch failed');
            }
          }, 100);
        } catch (emergencyError) {
          console.error('� V4: Emergency fallback failed:', emergencyError);
          setIsLoadingPage(false);
          message.error('Page switch failed');
        }
      }
      
    } catch (error) {
      console.error('💥 V4: Page switch error:', error);
      setIsLoadingPage(false);
      message.error('Failed to switch pages');
    }
  };

  // Cache refresh mechanism for new pages
  const refreshPageCache = useCallback(() => {
    console.log('🔄 Refreshing page cache');
    setPageContentCache({});
  }, []);

  // Expose cache refresh for SitePageSelector
  useEffect(() => {
    if (window) {
      window.refreshPageCache = refreshPageCache;
      
      // Debug function to test page creation and switching
      window.testPageSwitching = () => {
        console.log('🧪 Testing page switching...');
        console.log('Current pages:', pages);
        console.log('Current page ID:', currentPageId);
        console.log('Page cache:', Object.keys(pageContentCache));
        console.log('Is initialized:', isInitialized);
        console.log('Is loading:', isLoadingPage);
        console.log('Actions available:', !!actions);
        console.log('Query available:', !!query);
        
        // Test switching to each page
        pages.forEach((page, index) => {
          setTimeout(() => {
            console.log(`🔄 Testing switch to page ${index + 1}:`, page.id);
            handlePageChange(page.id);
          }, index * 2000);
        });
      };
      
      // Debug function to show current state
      window.debugEditorState = () => {
        console.log('🔍 Current Editor State:');
        console.log('- Current Page ID:', currentPageId);
        console.log('- Is Initialized:', isInitialized);
        console.log('- Is Loading Page:', isLoadingPage);
        console.log('- Pages:', pages.map(p => ({ id: p.id, name: p.name })));
        console.log('- Cache Keys:', Object.keys(pageContentCache));
        console.log('- Actions Available:', !!actions);
        console.log('- Query Available:', !!query);
        console.log('- User ID:', user?.uid);
        console.log('- Site ID:', siteId);
        
        if (query) {
          try {
            const currentContent = query.serialize();
            console.log('- Current Content Size:', currentContent?.length || 0);
            console.log('- Current Content Valid:', currentContent?.includes('ROOT') || false);
            
            // Parse and analyze the current content structure
            const parsed = JSON.parse(currentContent);
            const rootNodes = parsed.ROOT?.nodes || [];
            console.log('- Root Node Count:', rootNodes.length);
            console.log('- Root Node IDs:', rootNodes);
            
            if (rootNodes.length > 0) {
              console.log('- Page has visual content ✅');
              rootNodes.forEach((nodeId, index) => {
                const node = parsed[nodeId];
                console.log(`  Node ${index + 1}:`, {
                  id: nodeId,
                  type: node?.type?.resolvedName,
                  hasNodes: node?.nodes?.length > 0
                });
              });
            } else {
              console.log('- Page is empty (no visual content) ⚠️');
            }
          } catch (err) {
            console.log('- Current Content Error:', err.message);
          }
        }
        
        // Also debug the Frame component's rendered state
        console.log('- Frame Element Info:');
        const frameElement = document.querySelector('[data-page-id]');
        if (frameElement) {
          console.log('  Frame found:', {
            pageId: frameElement.getAttribute('data-page-id'),
            initialized: frameElement.getAttribute('data-initialized'),
            loading: frameElement.getAttribute('data-loading'),
            childCount: frameElement.children.length,
            innerHTML: frameElement.innerHTML.substring(0, 200) + '...'
          });
        } else {
          console.log('  Frame element not found ❌');
        }
      };
    }
    return () => {
      if (window) {
        delete window.refreshPageCache;
        delete window.testPageSwitching;
        delete window.debugEditorState;
      }
    };
  }, [refreshPageCache, pages, currentPageId, pageContentCache, isInitialized, isLoadingPage, handlePageChange, actions, query, user?.uid, siteId]);

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
                    {isSaving && !isLoadingPage && (
                      <span className="text-blue-500">• Saving...</span>
                    )}
                    {isLoadingPage && (
                      <span className="text-purple-500">• Switching page...</span>
                    )}
                    {currentPageId !== 'home' && (
                      <></>
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
                disabled={!isInitialized}
                onChange={(value) => {
                  if (isInitialized) {
                    actions.setOptions(options => {
                      options.enabled = value;
                    });
                  }
                }}
                size="small"
              />
              <span className="text-xs font-medium text-gray-700">
                {enabled ? 'Editor' : 'Preview'}
              </span>
            </div>

            {/* History Controls */}
            <div className="flex items-center space-x-1 bg-gray-50 rounded-lg px-2 py-1.5">
              <Tooltip title={canUndo && isInitialized ? "Undo (Ctrl+Z)" : "Editor not ready"}>
                <Button
                  icon={<UndoOutlined />}
                  size="small"
                  disabled={!canUndo || !isInitialized}
                  onClick={handleUndo}
                  type="text"
                  className={canUndo && isInitialized ? 'hover:bg-blue-50 hover:text-blue-600' : ''}
                />
              </Tooltip>

              <Tooltip title={canRedo && isInitialized ? "Redo (Ctrl+Y)" : "Editor not ready"}>
                <Button
                  icon={<RedoOutlined />}
                  size="small"
                  disabled={!canRedo || !isInitialized}
                  onClick={handleRedo}
                  type="text"
                  className={canRedo && isInitialized ? 'hover:bg-green-50 hover:text-green-600' : ''}
                />
              </Tooltip>

              <Dropdown
                menu={historyDropdownMenu}
                placement="bottomLeft"
                trigger={['click']}
                disabled={!isInitialized}
              >
                <Tooltip title={isInitialized ? "View edit history" : "Editor not ready"}>
                  <Button
                    icon={<HistoryOutlined />}
                    size="small"
                    type="text"
                    disabled={!isInitialized}
                    className={isInitialized ? "hover:bg-purple-50 hover:text-purple-600" : ""}
                  />
                </Tooltip>
              </Dropdown>
            </div>

            {/* Snap & Grid Controls */}
            <div className="bg-gray-50 rounded-lg px-2 py-1.5">
              <SnapGridControls />
            </div>

            {/* Auto-save & Debug Settings */}
            <div className="flex items-center space-x-2">
              {/* Manual Save Button */}
              <Tooltip title="Save current page manually">
                <Button
                  size="small"
                  type="primary"
                  disabled={!isInitialized || isLoadingPage || isSaving}
                  onClick={async () => {
                    try {
                      const currentContent = query.serialize();
                      if (currentContent && currentContent !== '{}' && currentContent.includes('ROOT')) {
                        const parsed = JSON.parse(currentContent);
                        if (parsed.ROOT) {
                          await updatePage(user.uid, siteId, currentPageId, {
                            content: parsed,
                            lastModified: new Date()
                          });
                          setPageContentCache(prev => ({
                            ...prev,
                            [currentPageId]: currentContent
                          }));
                          setLastSaved(new Date());
                          message.success(`Page "${currentPageId}" saved successfully!`);
                        }
                      }
                    } catch (error) {
                      console.error('Manual save failed:', error);
                      message.error('Failed to save page');
                    }
                  }}
                  className="text-xs"
                >
                  💾 Save
                </Button>
              </Tooltip>

              {/* Auto-save Settings */}
              <Dropdown
                menu={{
                  items: [
                    {
                      key: '1',
                      label: `Auto-save: Every ${autoSaveFrequency / 1000}s`,
                    },
                    { type: 'divider' },
                    {
                      key: '5',
                      label: 'Every 5 seconds',
                      onClick: () => setAutoSaveFrequency(5000)
                    },
                    {
                      key: '10',
                      label: 'Every 10 seconds',
                      onClick: () => setAutoSaveFrequency(10000)
                    },
                    {
                      key: '30',
                      label: 'Every 30 seconds',
                      onClick: () => setAutoSaveFrequency(30000)
                    },
                    {
                      key: '60',
                      label: 'Every minute',
                      onClick: () => setAutoSaveFrequency(60000)
                    },
                    { type: 'divider' },
                    {
                      key: 'clear-cache',
                      label: 'Clear Page Cache',
                      onClick: () => {
                        setPageContentCache({});
                        message.success('Page cache cleared');
                      }
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
        {(() => {
          const shouldShowToolbox = enabled && isInitialized;
          return shouldShowToolbox;
        })() && (
          <div className={`${activeDrawer ? 'w-64' : 'w-64'} bg-white border-r border-gray-200 shadow-sm flex-shrink-0 h-full flex flex-col`}>
            <Toolbox 
              activeDrawer={activeDrawer}
              setActiveDrawer={setActiveDrawer}
              openMenuNodeId={openMenuNodeId}
              setOpenMenuNodeId={setOpenMenuNodeId}
            />
            <div className=' h-full flex-1 min-h-0'>
              <EditorLayers />
            </div>
          </div>
        )}

        {/* Main Editor Canvas */}
        <div className="flex-1 flex">
          <div className="flex-1 p-4 overflow-auto bg-gray-100 relative">
            {/* Loading overlay during page switches */}
            {isLoadingPage && (
              <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50 backdrop-blur-sm">
                <div className="flex flex-col items-center space-y-4 bg-white p-8 rounded-lg shadow-lg border">
                  <Spin size="large" />
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-800 mb-2">
                      Switching to {currentPageId === 'home' ? 'Home' : currentPageId}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Resetting editor and loading content...
                    </div>
                    <div className="text-xs text-gray-500">
                      If this takes too long, try the Debug → Reset Editor option
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Editor initialization indicator */}
            {!isInitialized && (
              <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-40">
                <div className="flex flex-col items-center space-y-4 bg-white p-8 rounded-lg shadow-lg border">
                  <Spin size="large" />
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-800 mb-2">
                      Initializing Editor
                    </div>
                    <div className="text-sm text-gray-600">
                      Setting up your workspace...
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="w-full max-w-none">
              {/* Only render Frame when editor is properly initialized */}
              {isInitialized ? (
                <Frame 
                  className="w-full min-h-[600px] pb-8"
                  data-page-id={currentPageId}
                  data-initialized={isInitialized.toString()}
                  data-loading={isLoadingPage.toString()}
                  onNodesChange={(query) => {
                    console.log('🔍 Frame onNodesChange triggered:', {
                      pageId: currentPageId,
                      hasNodes: query.getNodes() && Object.keys(query.getNodes()).length > 0,
                      nodeCount: Object.keys(query.getNodes() || {}).length,
                      serializedLength: query.serialize()?.length || 0,
                      isNewPage: (Object.keys(query.getNodes() || {}).length <= 1) // Only ROOT node means new page
                    });
                    
                    // Check if this is a new page that might need help
                    const nodes = query.getNodes() || {};
                    const rootNode = nodes.ROOT;
                    if (rootNode && (!rootNode.data?.nodes || rootNode.data.nodes.length === 0)) {
                      console.log('🆕 Detected new/empty page in Frame, might need rendering assistance');
                    }
                  }}
                >
                  <Element 
                    is={Root} 
                    padding={20} 
                    maxWidth='90%'
                    minWidth='99%'
                    minHeight='600px'
                    paddingBottom='2rem'
                    background="#ffffff" 
                    position="relative"
                    width="100%"
                    display="block"
                    canvas
                    className="min-h-[600px] w-full min-w-[99%] max-w-[90%] pb-8"
                  />
                </Frame>
              ) : (
                <div className="w-full min-h-[600px] bg-white rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div className="text-lg mb-2">🎨</div>
                    <div>Preparing your canvas...</div>
                  </div>
                </div>
              )}
              
              {/* Loading overlay when needed */}
              {(isLoadingPage || !isInitialized) && (
                <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50 backdrop-blur-sm">
                  <div className="text-center text-gray-500">
                    <Spin size="large" />
                    <div className="mt-4">
                      {isLoadingPage ? 'Loading page content...' : 'Initializing editor...'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Style Menu */}
          {(() => {
            const shouldShowStyleMenu = enabled && isInitialized;
            console.log('🎨 V2: StyleMenu render check:', {
              enabled,
              isInitialized,
              shouldShowStyleMenu,
              currentPageId
            });
            return shouldShowStyleMenu;
          })() && (
            <div className={`bg-white border-l border-gray-200 shadow-sm flex-shrink-0 ${
              useFigmaStyle ? 'w-80 min-w-80' : 'w-auto min-w-96'
            }`}>
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
function SiteEditor() {
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
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadSiteData();
  }, [user, siteId]);

  // Loading state
  if (authLoading || loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '20px' }}>Loading site editor...</div>
      </div>
    );
  }

  // Not authenticated
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

// Wrap the SiteEditor component in Suspense boundary
export default function SiteEditorPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    }>
      <SiteEditor />
    </Suspense>
  );
}
