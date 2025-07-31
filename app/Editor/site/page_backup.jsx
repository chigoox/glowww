'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { getSite, updateSite, getSiteData, getPage, updatePage } from '../../../lib/sites';
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
  const [openMenuNodeId, setOpenMenuNodeId] = useState(null);
  const [activeDrawer, setActiveDrawer] = useState(null);
  const [useFigmaStyle, setUseFigmaStyle] = useState(true);
  const [currentPageId, setCurrentPageId] = useState('home'); // Track current page
  const [currentPageData, setCurrentPageData] = useState(null); // Store current page content
  const [pageContentCache, setPageContentCache] = useState({}); // Cache page content
  const [isLoadingPage, setIsLoadingPage] = useState(false); // Loading state for page switches
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Auto-save functionality
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSaveFrequency, setAutoSaveFrequency] = useState(3000); // 3 seconds default

  const { enabled, query, actions, canUndo, canRedo, editorState } = useEditor((state, query) => ({
    enabled: state.options.enabled,
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo(),
    // Monitor the actual state to trigger history updates
    editorState: state
  }));

  // Debug editor state changes
  useEffect(() => {
    console.log('🎛️ V2: Editor state changed:', {
      enabled,
      isInitialized,
      currentPageId,
      hasActions: !!actions,
      hasQuery: !!query,
      canAdd: !!actions?.add,
      optionsEnabled: enabled
    });
  }, [enabled, isInitialized, currentPageId, actions, query]);

  // Load initial content only when component mounts
  useEffect(() => {
    const loadInitialContent = async () => {
      // Wait for actions to be available and not already initialized
      if (!actions || isInitialized) return;
      
      console.log('🚀 Loading page from Firebase document:', currentPageId);
      
      try {
        let contentToLoad = null;
        
        // Load all pages from Firebase page documents (including home)
        const cachedContent = pageContentCache[currentPageId];
        if (cachedContent && cachedContent !== '{}' && cachedContent.includes('ROOT')) {
          try {
            JSON.parse(cachedContent);
            contentToLoad = cachedContent;
            console.log('📦 Using cached content for page:', currentPageId);
          } catch (parseError) {
            console.log('🗑️ Cached content invalid, will try Firebase');
          }
        }
        
        // If no valid cache, load from Firebase page document
        if (!contentToLoad) {
          try {
            console.log('🔥 Loading page from Firebase document:', currentPageId);
            const pageData = await getPage(user.uid, siteId, currentPageId);
            if (pageData?.content) {
              const pageContent = JSON.stringify(pageData.content);
              const parsed = JSON.parse(pageContent);
              if (parsed.ROOT) {
                contentToLoad = pageContent;
                console.log('✅ Loaded page content from Firebase for:', currentPageId, 'Size:', pageContent.length);
              }
            } else {
              console.log('📝 No page content found in Firebase for:', currentPageId);
            }
          } catch (error) {
            console.log('❌ Could not load page from Firebase:', error);
          }
        }
        
        // Clear editor first to ensure clean state
        actions.clearEvents();
        
        // Use a longer timeout to ensure editor is fully ready
        setTimeout(() => {
          try {
            if (contentToLoad) {
              console.log('Deserializing validated existing content');
              actions.deserialize(contentToLoad);
              setCurrentPageData(contentToLoad);
              
              // Cache the initial content
              setPageContentCache(prev => ({
                ...prev,
                [currentPageId]: contentToLoad
              }));
            } else {
              // Load empty state for new pages
              console.log('Loading empty state for page:', currentPageId);
              const emptyState = JSON.stringify({
                "ROOT": {
                  "type": { "resolvedName": "Root" },
                  "nodes": [],
                  "props": { "canvas": true },
                  "custom": {},
                  "parent": null,
                  "displayName": "Root",
                  "isCanvas": true
                }
              });
              actions.deserialize(emptyState);
              setCurrentPageData(emptyState);
              
              // Cache the empty state for current page
              setPageContentCache(prev => ({
                ...prev,
                [currentPageId]: emptyState
              }));
            }
            
            setIsInitialized(true);
            console.log('Editor initialization complete');
            
          } catch (deserializeError) {
            console.error('Error during content deserialization:', deserializeError);
            // Try to load empty state as fallback
            try {
              const emptyState = JSON.stringify({
                "ROOT": {
                  "type": { "resolvedName": "Root" },
                  "nodes": [],
                  "props": { "canvas": true },
                  "custom": {},
                  "parent": null,
                  "displayName": "Root",
                  "isCanvas": true
                }
              });
              actions.deserialize(emptyState);
              setCurrentPageData(emptyState);
              setPageContentCache(prev => ({
                ...prev,
                [currentPageId]: emptyState
              }));
              setIsInitialized(true);
              console.log('Fallback to empty state successful for page:', currentPageId);
            } catch (fallbackError) {
              console.error('Failed to load fallback empty state:', fallbackError);
              setIsInitialized(true); // Set as initialized to prevent infinite loops
            }
          }
        }, 300); // Increased timeout for better reliability
        
      } catch (error) {
        console.error('Error during initial content loading:', error);
        setIsInitialized(true);
      }
    };

    loadInitialContent();
  }, [siteContent, actions, isInitialized, currentPageId]); // Include currentPageId dependency

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

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!query || !isInitialized || isLoadingPage || isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      const currentContent = query.serialize();
      
      if (!currentContent || currentContent === '{}' || !currentContent.includes('ROOT')) {
        console.log('📝 Auto-save skipped: No valid content to save');
        return;
      }

      // Validate content before saving
      let contentToSave;
      try {
        const parsed = JSON.parse(currentContent);
        if (!parsed.ROOT) {
          console.log('📝 Auto-save skipped: Content missing ROOT node');
          return;
        }
        contentToSave = parsed;
      } catch (parseError) {
        console.log('📝 Auto-save skipped: Invalid JSON content');
        return;
      }

      // Save to Firebase page document
      console.log('💾 Auto-saving page:', currentPageId, 'Content size:', JSON.stringify(contentToSave).length);
      
      await updatePage(user.uid, siteId, currentPageId, {
        content: contentToSave,
        lastModified: new Date()
      });

      // Update cache
      setPageContentCache(prev => ({
        ...prev,
        [currentPageId]: currentContent
      }));

      setLastSaved(new Date());
      console.log('✅ Auto-save successful for page:', currentPageId);
      
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [query, isInitialized, isLoadingPage, isSaving, currentPageId, user?.uid, siteId]);

  // Auto-save effect with debouncing
  useEffect(() => {
    if (!isInitialized || isLoadingPage) return;

    const timeoutId = setTimeout(() => {
      autoSave();
    }, autoSaveFrequency);

    return () => clearTimeout(timeoutId);
  }, [editorState, autoSave, autoSaveFrequency, isInitialized, isLoadingPage]);

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

  // Handle page changes with complete editor reset
  const handlePageChange = async (newPageId) => {
    // Enhanced validation to prevent getting stuck
    if (newPageId === currentPageId) {
      console.log('🚫 V3: Page change skipped - already on target page', newPageId);
      return;
    }
    
    if (!actions) {
      console.log('🚫 V3: Page change skipped - actions not available');
      return;
    }
    
    // Allow page changes even if not initialized (for recovery)
    if (isLoadingPage) {
      console.log('🚫 V3: Page change skipped - already loading a page');
      return;
    }
    
    console.log('🔄🔄🔄 V3 CODE RUNNING - Starting page change from', currentPageId, 'to', newPageId);
    console.log('🔍 V3: Current state:', { isInitialized, isLoadingPage, actionsAvailable: !!actions });
    console.log('🗂️ V3: Available pages in cache:', Object.keys(pageContentCache));
    
    // Add detailed page information logging
    console.log('📋 V3: Page Change Details:', {
      from: currentPageId,
      to: newPageId,
      isHome: newPageId === 'home',
      cacheHasTarget: !!pageContentCache[newPageId],
      currentCacheKeys: Object.keys(pageContentCache),
      targetPageCacheSize: pageContentCache[newPageId]?.length || 0
    });
    
    try {
      setIsLoadingPage(true);
      
      // Save current page content before switching (only if editor is initialized)
      if (currentPageId && query && isInitialized) {
        try {
          const currentContent = query.serialize();
          console.log('💾 Saving current page content before switch, length:', currentContent?.length);
          
          // Only save if the content is valid and different from what we have cached
          if (currentContent && currentContent !== '{}' && currentContent.includes('ROOT')) {
            // Validate content before saving
            try {
              const parsed = JSON.parse(currentContent);
              if (parsed.ROOT && currentContent !== pageContentCache[currentPageId]) {
                // Save to Firebase page document (same for all pages including home)
                await updatePage(user.uid, siteId, currentPageId, {
                  content: parsed,
                  lastModified: new Date()
                });
                
                // Update cache with valid content
                setPageContentCache(prev => ({
                  ...prev,
                  [currentPageId]: currentContent
                }));
                
                console.log('✅ Current page content saved to Firebase document successfully');
              } else {
                console.log('📋 Content unchanged, skipping save');
              }
            } catch (validationError) {
              console.error('❌ Current content is invalid, not saving:', validationError);
            }
          } else {
            console.log('⚠️ No valid content to save from current page');
          }
        } catch (saveError) {
          console.error('❌ Error saving current page content:', saveError);
          // Don't block page change due to save errors
        }
      }
      
      // Force complete editor reset by setting initialized to false temporarily
      console.log('🔄 Resetting editor state');
      
      // Clear all editor state
      try {
        actions.clearEvents();
        
        // Try to clear history if the method exists
        if (actions.history && typeof actions.history.clear === 'function') {
          actions.history.clear();
          console.log('🧹 Editor history cleared');
        }
        
      } catch (clearError) {
        console.error('⚠️ Error clearing editor (continuing anyway):', clearError);
      }
      
      // Update current page ID BEFORE the timeout
      console.log('📄 Setting current page to:', newPageId);
      setCurrentPageId(newPageId);
      
      // Immediate page content loading with better error recovery
      console.log('🚀 Beginning page content loading for:', newPageId);
      
      try {
        // Load content for the new page
          let newPageContent = null;
          
          // FIRST: Check if we have valid cached content
          console.log('🔍 V3: Checking cache for:', newPageId);
          console.log('🗃️ V3: Cache contents:', Object.keys(pageContentCache).map(key => ({
            pageId: key,
            hasContent: !!pageContentCache[key],
            length: pageContentCache[key]?.length || 0,
            hasRoot: pageContentCache[key]?.includes('ROOT') || false
          })));
          
          const cachedContent = pageContentCache[newPageId];
          console.log('🔍 V3: Cache lookup result for', newPageId, ':', {
            found: !!cachedContent,
            length: cachedContent?.length || 0,
            hasRoot: cachedContent?.includes('ROOT') || false,
            preview: cachedContent?.substring(0, 150) + '...' || 'No content'
          });
          
          if (cachedContent && cachedContent !== '{}' && cachedContent.includes('ROOT')) {
            try {
              const parsed = JSON.parse(cachedContent);
              if (parsed.ROOT) {
                newPageContent = cachedContent;
                console.log('📦 V3: Loading valid page from cache:', newPageId, 'Length:', cachedContent.length);
              }
            } catch (parseError) {
              console.error('❌ V3: Cached content is invalid:', parseError);
              // Remove invalid cache immediately
              setPageContentCache(prev => {
                const newCache = { ...prev };
                delete newCache[newPageId];
                return newCache;
              });
            }
          } else {
            console.log('🚫 V3: No valid cache found for:', newPageId, 'Reasons:', {
              hasCache: !!cachedContent,
              notEmptyObject: cachedContent !== '{}',
              includesRoot: cachedContent?.includes('ROOT') || false,
              debugInfo: cachedContent ? `Content preview: ${cachedContent.substring(0, 100)}...` : 'No content at all'
            });
          }
          
          // SECOND: Load from Firebase page document if no valid cache
          if (!newPageContent) {
            console.log('🔥 V3: Loading page from Firebase document:', newPageId);
            
            try {
              // Load from Firebase page document (same for all pages including home)
              console.log('📄 V3: Attempting to load page from Firebase document:', newPageId);
              
              // Enhanced debugging for pages 3 and 4
              if (newPageId.includes('3') || newPageId.includes('4')) {
                console.log('🚨 SPECIAL DEBUG - Loading page 3 or 4:', {
                  pageId: newPageId,
                  userId: user.uid,
                  siteId: siteId
                });
              }
              
              const pageData = await getPage(user.uid, siteId, newPageId);
              console.log('📄 V3: Page data response:', {
                found: !!pageData,
                hasContent: !!pageData?.content,
                contentType: typeof pageData?.content,
                contentSize: pageData?.content ? JSON.stringify(pageData.content).length : 0,
                pageMetadata: pageData ? {
                  id: pageData.id,
                  name: pageData.name,
                  slug: pageData.slug,
                      isHome: pageData.isHome
                    } : 'No page data'
                  });
                  
                  // Extra debugging for pages 3 and 4
                  if (newPageId.includes('3') || newPageId.includes('4')) {
                    console.log('🚨 DETAILED PAGE 3/4 ANALYSIS:', {
                      pageId: newPageId,
                      rawPageData: pageData,
                      contentStructure: pageData?.content,
                      contentAnalysis: pageData?.content ? {
                        hasRoot: !!pageData.content.ROOT,
                        rootType: pageData.content.ROOT?.type?.resolvedName,
                        nodeCount: pageData.content.ROOT?.nodes?.length || 0,
                        isCanvas: pageData.content.ROOT?.isCanvas
                      } : 'No content to analyze'
                    });
                  }
                  
                  if (pageData?.content) {
                    try {
                      newPageContent = JSON.stringify(pageData.content);
                      const parsed = JSON.parse(newPageContent);
                      if (parsed.ROOT) {
                        console.log('📄 V3: Page content loaded from Firebase, length:', newPageContent.length);
                      } else {
                        console.error('❌ V3: Firebase page content missing ROOT');
                        newPageContent = null;
                      }
                    } catch (parseError) {
                      console.error('❌ V3: Firebase page content is invalid JSON:', parseError);
                      newPageContent = null;
                    }
                  } else {
                    console.log('📝 V3: No page content found in Firebase, checking if page exists...');
                    
                    // Let's check if this page actually exists in the site's pages list
                    try {
                      const { getSitePages } = await import('../../../lib/sites');
                      const allPages = await getSitePages(user.uid, siteId);
                      const pageExists = allPages.find(p => p.id === newPageId);
                      
                      if (!pageExists) {
                        console.error('❌ V3: Page does not exist in Firebase:', newPageId);
                        message.error(`Page "${newPageId}" not found. It may have been deleted.`);
                        // Switch back to home page
                        handlePageChange('home');
                        return;
                      } else {
                        console.log('✅ V3: Page exists but has no content, will create empty content');
                      }
                    } catch (pagesCheckError) {
                      console.error('❌ V3: Error checking if page exists:', pagesCheckError);
                    }
                  }
                } catch (pageError) {
                  console.error('❌ V3: Failed to load page from Firebase:', pageError);
                  console.log('📝 V3: Page not found in Firebase, will create empty page:', newPageId);
                }
              }
            } catch (firebaseError) {
              console.error('❌ V3: Firebase loading error:', firebaseError);
              // Continue with empty state
            }
          }
          
          // THIRD: Create empty state if needed
          let contentToApply = newPageContent;
          
          if (!contentToApply || contentToApply === '{}') {
            // Create fresh empty state
            contentToApply = JSON.stringify({
              "ROOT": {
                "type": { "resolvedName": "Root" },
                "nodes": [],
                "props": { "canvas": true },
                "custom": {},
                "parent": null,
                "displayName": "Root",
                "isCanvas": true
              }
            });
            console.log('📄 Using empty state for page:', newPageId);
          }
          
          // FOURTH: Apply the content to editor
          console.log('🎨 V3: About to deserialize content for page:', newPageId);
          console.log('📊 V3: Content analysis:', {
            hasContent: !!contentToApply,
            length: contentToApply?.length || 0,
            isEmptyObject: contentToApply === '{}',
            includesRoot: contentToApply?.includes('ROOT') || false,
            preview: contentToApply?.substring(0, 100) + '...'
          });
          
          try {
            // Final validation before applying
            const parsed = JSON.parse(contentToApply);
            if (!parsed.ROOT) {
              throw new Error('Content missing ROOT node');
            }
            
            console.log('🔍 V3: Content structure check passed, ROOT node found');
            console.log('🏗️ V3: ROOT node structure:', {
              type: parsed.ROOT.type,
              nodeCount: parsed.ROOT.nodes?.length || 0,
              hasProps: !!parsed.ROOT.props,
              isCanvas: parsed.ROOT.props?.canvas
            });
            
            // Clear editor completely before applying new content
            console.log('🧹 V3: Clearing editor before applying new content');
            actions.clearEvents();
            
            // Apply to editor with better error handling - keeping editor enabled
            console.log('🎨 V3: Deserializing content...');
            
            // Add extensive debugging for pages 3 and 4
            if (newPageId.includes('3') || newPageId.includes('4')) {
              console.log('🚨 DEBUGGING PAGES 3/4:', {
                pageId: newPageId,
                contentLength: contentToApply?.length || 0,
                contentPreview: contentToApply?.substring(0, 300) + '...',
                isValidJSON: (() => {
                  try {
                    const parsed = JSON.parse(contentToApply);
                    return !!parsed.ROOT;
                  } catch {
                    return false;
                  }
                })()
              });
            }
            
            // Use immediate deserialization without disabling the editor
            try {
              actions.deserialize(contentToApply);
              console.log('✅ V3: Successfully deserialized content for page:', newPageId);
              
              // Add extra verification for problematic pages
              if (newPageId.includes('3') || newPageId.includes('4')) {
                setTimeout(() => {
                  try {
                    const verificationState = query.serialize();
                    console.log('🔍 VERIFICATION FOR PAGE', newPageId, ':', {
                      serializedLength: verificationState?.length || 0,
                      hasRoot: verificationState?.includes('ROOT') || false,
                      isEmpty: verificationState === '{}',
                      preview: verificationState?.substring(0, 200) + '...'
                    });
                    
                    // Check if Frame has actual DOM content - try multiple selectors
                    const frameElement = document.querySelector('[data-page-id="' + newPageId + '"]') || 
                                        document.querySelector('.craftjs-renderer') ||
                                        document.querySelector('[data-initialized="true"]');
                    const allFrames = document.querySelectorAll('.craftjs-renderer, [data-page-id], [data-initialized]');
                    console.log('🔍 FRAME DOM CHECK FOR PAGE', newPageId, ':', {
                      frameExists: !!frameElement,
                      frameChildren: frameElement?.children?.length || 0,
                      frameHTML: frameElement?.innerHTML?.substring(0, 300) + '...' || 'No HTML found',
                      allFramesFound: allFrames.length,
                      frameClasses: frameElement?.className || 'No classes'
                    });
                  } catch (verifyError) {
                    console.error('❌ Verification failed for page', newPageId, ':', verifyError);
                  }
                }, 500);
              }
              
              // Update state after successful deserialization
              setCurrentPageData(contentToApply);
              console.log('📋 V3: Updated current page data for:', newPageId);
              
              // Delay re-enabling to ensure content is fully applied
              setTimeout(() => {
                setIsInitialized(true);
                setIsLoadingPage(false); // ✅ CRITICAL FIX: Reset loading state after successful deserialization
                console.log('🎉 V3: Editor re-enabled with new content for:', newPageId);
                
                // Verify the editor state after deserialization
                setTimeout(() => {
                  try {
                    const verifyState = query.serialize();
                    console.log('🔍 V3: Post-deserialization verification:', {
                      pageId: newPageId,
                      stateLength: verifyState?.length || 0,
                      hasRoot: verifyState?.includes('ROOT') || false,
                      matches: verifyState === contentToApply,
                      editorReady: isInitialized
                    });
                    
                    // Force Frame to re-render by temporarily disabling and re-enabling
                    if (verifyState && verifyState.includes('ROOT')) {
                      console.log('🔄 V3: Content verified, Frame should be updated');
                      
                      // Force a complete re-render by briefly toggling enabled state
                      setTimeout(() => {
                        console.log('🔄 V3: Forcing Frame refresh for content visibility');
                        actions.setOptions((options) => ({ ...options, enabled: false }));
                        
                        setTimeout(() => {
                          actions.setOptions((options) => ({ ...options, enabled: true }));
                          console.log('🔄 V3: Frame refresh complete');
                        }, 50);
                      }, 100);
                      
                    } else {
                      console.warn('⚠️ V3: Post-verification failed, may need to retry');
                    }
                    
                    // Check Frame DOM visibility after longer delay
                    setTimeout(() => {
                      try {
                        const postRefreshFrameElement = document.querySelector('[data-page-id="' + newPageId + '"]') || 
                                                       document.querySelector('.craftjs-renderer') ||
                                                       document.querySelector('[data-initialized="true"]');
                        const postRefreshState = query.serialize();
                        console.log('🔍 V3: POST-REFRESH FRAME CHECK FOR PAGE', newPageId, ':', {
                          frameExists: !!postRefreshFrameElement,
                          frameChildren: postRefreshFrameElement?.children?.length || 0,
                          hasVisibleContent: postRefreshFrameElement?.querySelector('[draggable="true"]') ? true : false,
                          stateLength: postRefreshState?.length || 0,
                          stateHasRoot: postRefreshState?.includes('ROOT') || false
                        });
                      } catch (finalCheckError) {
                        console.error('❌ Final Frame check failed:', finalCheckError);
                      }
                    }, 1000);
                  } catch (verifyError) {
                    console.warn('🔍 V3: Could not verify post-deserialization state:', verifyError);
                  }
                }, 100);
              }, 200); // Wait for deserialization to fully complete
              
            } catch (deserializeError) {
                console.error('❌ V3: Deserialization failed:', deserializeError);
                
                // Emergency fallback with fresh empty state
                const emergencyEmptyState = JSON.stringify({
                  "ROOT": {
                    "type": { "resolvedName": "Root" },
                    "nodes": [],
                    "props": { "canvas": true },
                    "custom": {},
                    "parent": null,
                    "displayName": "Root",
                    "isCanvas": true
                  }
                });
                
                setTimeout(() => {
                  try {
                    console.log('🚑 V3: Applying emergency empty state');
                  actions.clearEvents();
                  actions.deserialize(emergencyEmptyState);
                  setCurrentPageData(emergencyEmptyState);
                  contentToApply = emergencyEmptyState;
                  console.log('🚑 V3: Applied emergency empty state after deserialization failure');
                  
                  setTimeout(() => {
                    setIsInitialized(true);
                    console.log('� V3: Editor re-enabled after emergency recovery');
                  }, 200);
                } catch (emergencyError) {
                  console.error('💥 V3: Emergency fallback also failed:', emergencyError);
                  setIsInitialized(true); // Still re-enable to prevent permanent lock
                  setIsLoadingPage(false); // ✅ CRITICAL FIX: Reset loading state even on emergency failure
                }
                }, 100); // Increased delay to ensure proper sequencing
            }
            
          } catch (parseError) {
            console.error('❌ V3: Content parse error:', parseError);
            
            // Create fresh empty state for invalid content
            contentToApply = JSON.stringify({
              "ROOT": {
                "type": { "resolvedName": "Root" },
                "nodes": [],
                "props": { "canvas": true },
                "custom": {},
                "parent": null,
                "displayName": "Root",
                "isCanvas": true
              }
            });
            console.log('📄 V3: Using fresh empty state due to parse error');
            
            // Apply empty state with same delayed pattern
            setTimeout(() => {
              try {
                actions.clearEvents();
                actions.deserialize(contentToApply);
                setCurrentPageData(contentToApply);
                
                setTimeout(() => {
                  setIsInitialized(true);
                  setIsLoadingPage(false); // ✅ CRITICAL FIX: Reset loading state after parse error recovery
                  console.log('🚑 V3: Applied emergency state after parse error');
                }, 200);
              } catch (emergencyError) {
                console.error('💥 V3: Emergency state application failed:', emergencyError);
                setIsInitialized(true); // Still re-enable to prevent permanent lock
                setIsLoadingPage(false); // ✅ CRITICAL FIX: Reset loading state even on emergency failure
              }
            }, 100);
          }
          
          // FIFTH: Cache the successfully loaded content
          if (contentToApply && contentToApply !== pageContentCache[newPageId]) {
            console.log('💾 V3: Caching content for page:', newPageId, 'Length:', contentToApply.length);
            setPageContentCache(prev => {
              const newCache = {
                ...prev,
                [newPageId]: contentToApply
              };
              console.log('💾 V3: Cache updated. Pages now cached:', Object.keys(newCache));
              return newCache;
            });
          } else {
            console.log('💾 V3: Content already cached or invalid, skipping cache update');
          }
          
          console.log('🎉 V3: Page switch process initiated for:', newPageId);
          console.log('📋 V3: Content application will complete asynchronously');
          message.success(`Switching to page: ${newPageId}...`);
          
        } catch (overallError) {
          console.error('💥 Critical error during page content application:', overallError);
          
          // Final emergency recovery - ensure editor doesn't stay locked
          try {
            const emergencyState = JSON.stringify({
              "ROOT": {
                "type": { "resolvedName": "Root" },
                "nodes": [],
                "props": { "canvas": true },
                "custom": {},
                "parent": null,
                "displayName": "Root",
                "isCanvas": true
              }
            });
            actions.deserialize(emergencyState);
            setCurrentPageData(emergencyState);
            setIsInitialized(true);
            
            // Cache emergency state
            setPageContentCache(prev => ({
              ...prev,
              [newPageId]: emergencyState
            }));
            
            message.warning(`Switched to ${newPageId} with empty content due to loading error`);
            console.log('🚑 Applied final emergency recovery state');
          } catch (finalError) {
            console.error('💀 Final emergency recovery failed:', finalError);
            setIsInitialized(true); // Still re-enable to prevent getting stuck
            message.error('Page switch completed but editor may be in unstable state');
          } finally {
            setIsLoadingPage(false);
            console.log('🏁 Page loading state cleared');
          }
        }
      
    } catch (outerError) {
      console.error('💥 Outer error during page switch:', outerError);
      message.error('Failed to switch pages: ' + outerError.message);
      setIsLoadingPage(false);
      setIsInitialized(true); // Re-enable editor to prevent being stuck
    }
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
                    {isSaving && !isLoadingPage && (
                      <span className="text-blue-500">• Saving...</span>
                    )}
                    {isLoadingPage && (
                      <span className="text-purple-500">• Switching page...</span>
                    )}
                    {currentPageId !== 'home' && (
                      <span className="text-purple-600">• Page: {currentPageId}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Site Page Selector - Non-interfering */} 
          <div className="bg-gray-50 rounded-lg px-3 py-1.5">
            <SitePageSelecto r 
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
              {/* Auto-save Frequency Dropdown */}
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

              {/* Debug Cache Button */}
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'deep-debug-page-state',
                      label: '🔬 Deep Debug Page State',
                      onClick: () => {
                        console.log('=== DEEP PAGE STATE DEBUG V4 ===');
                        console.log('Current Page ID:', currentPageId);
                        console.log('Is Initialized:', isInitialized);
                        console.log('Is Loading Page:', isLoadingPage);
                        console.log('Enabled:', enabled);
                        
                        // Check editor state
                        try {
                          const currentEditorState = query.serialize();
                          console.log('Current Editor State:', {
                            length: currentEditorState?.length || 0,
                            hasRoot: currentEditorState?.includes('ROOT') || false,
                            preview: currentEditorState?.substring(0, 200) + '...',
                            isEmpty: currentEditorState === '{}' || !currentEditorState
                          });
                        } catch (error) {
                          console.log('Could not serialize current editor state:', error);
                        }
                        
                        // Check current page data
                        console.log('Current Page Data:', {
                          exists: !!currentPageData,
                          length: currentPageData?.length || 0,
                          hasRoot: currentPageData?.includes('ROOT') || false,
                          preview: currentPageData?.substring(0, 200) + '...'
                        });
                        
                        // Check cache
                        const cacheKeys = Object.keys(pageContentCache);
                        console.log('Cache Status:', {
                          totalPages: cacheKeys.length,
                          pages: cacheKeys,
                          currentPageCached: !!pageContentCache[currentPageId],
                          currentPageCacheSize: pageContentCache[currentPageId]?.length || 0
                        });
                        
                        // Check if Frame component has content
                        console.log('Frame Component Analysis:');
                        console.log('- Is Initialized:', isInitialized);
                        console.log('- Is Loading Page:', isLoadingPage);
                        console.log('- Should Render Frame:', isInitialized && !isLoadingPage);
                        
                        message.info('Deep debug info logged to console');
                      }
                    },
                    {
                      key: 'test-page-switch',
                      label: '🧪 Test Page Switch to Home',
                      onClick: () => {
                        console.log('🧪 Testing page switch to home from:', currentPageId);
                        if (currentPageId !== 'home') {
                          handlePageChange('home');
                        } else {
                          message.info('Already on home page');
                        }
                      }
                    },
                    {
                      key: 'test-page-switch-any',
                      label: '🧪 Test Switch to Available Page',
                      onClick: async () => {
                        console.log('🧪 Testing page switch to any available page...');
                        try {
                          const { getSitePages } = await import('../../../lib/sites');
                          const firebasePages = await getSitePages(user.uid, siteId);
                          console.log('Available pages for testing:', firebasePages.map(p => ({ id: p.id, name: p.name, isHome: p.isHome })));
                          
                          // Find a page that's different from current
                          const targetPage = firebasePages.find(p => p.id !== currentPageId);
                          if (targetPage) {
                            console.log('🧪 Attempting to switch to page:', targetPage.id, 'name:', targetPage.name);
                            handlePageChange(targetPage.id);
                          } else {
                            message.warning('No other pages available to switch to');
                          }
                        } catch (error) {
                          console.error('Error in test page switch:', error);
                          message.error('Failed to test page switch: ' + error.message);
                        }
                      }
                    },
                    {
                      key: 'debug-available-pages',
                      label: '🔍 Debug Available Pages',
                      onClick: async () => {
                        console.log('=== AVAILABLE PAGES DEBUG ===');
                        try {
                          console.log('User UID:', user.uid);
                          console.log('Site ID:', siteId);
                          console.log('Loading pages from Firebase...');
                          const { getSitePages } = await import('../../../lib/sites');
                          const firebasePages = await getSitePages(user.uid, siteId);
                          console.log('Firebase Pages Count:', firebasePages.length);
                          console.log('Firebase Pages Full Data:', firebasePages);
                          
                          firebasePages.forEach((page, index) => {
                            console.log(`Page[${index}] - ID: ${page.id}:`, {
                              name: page.name,
                              slug: page.slug,
                              isHome: page.isHome,
                              path: page.path,
                              contentSize: page.contentSize,
                              createdAt: page.createdAt,
                              updatedAt: page.updatedAt
                            });
                          });
                          
                          // Test loading individual page content
                          if (firebasePages.length > 0) {
                            const testPage = firebasePages.find(p => !p.isHome) || firebasePages[0];
                            console.log('Testing content load for page:', testPage.id);
                            try {
                              const { getPage } = await import('../../../lib/sites');
                              const pageWithContent = await getPage(user.uid, siteId, testPage.id);
                              console.log('Page content test result:', {
                                pageId: testPage.id,
                                hasContent: !!pageWithContent?.content,
                                contentSize: pageWithContent?.content ? JSON.stringify(pageWithContent.content).length : 0,
                                contentPreview: pageWithContent?.content ? JSON.stringify(pageWithContent.content).substring(0, 200) + '...' : 'No content'
                              });
                            } catch (contentError) {
                              console.error('Error loading page content for', testPage.id, ':', contentError);
                            }
                          }
                          
                          message.info(`Found ${firebasePages.length} pages in Firebase`);
                        } catch (error) {
                          console.error('Error loading pages:', error);
                          message.error('Failed to load pages: ' + error.message);
                        }
                      }
                    },
                    {
                      key: 'clear-cache',
                      label: 'Clear Page Cache',
                      onClick: () => {
                        setPageContentCache({});
                        message.success('Page cache cleared');
                        console.log('Page cache manually cleared');
                      }
                    },
                    {
                      key: 'validate-cache',
                      label: 'Validate & Clean Cache',
                      onClick: () => {
                        validateAndCleanCache();
                        message.success('Cache validated and cleaned');
                      }
                    },
                    {
                      key: 'force-refresh-content',
                      label: '🔄 Force Refresh Current Page Content',
                      onClick: async () => {
                        console.log('🔄 V4: Force refreshing content for page:', currentPageId);
                        
                        try {
                          // Disable editor temporarily
                          setIsInitialized(false);
                          
                          // Clear current cache for this page
                          setPageContentCache(prev => {
                            const newCache = { ...prev };
                            delete newCache[currentPageId];
                            return newCache;
                          });
                          
                          // Load fresh content from Firebase page document
                          let freshContent = null;
                          
                          // Load from Firebase page document (same for all pages including home)
                          try {
                            console.log('🔄 V4: Loading fresh content from Firebase page document:', currentPageId);
                            const pageData = await getPage(user.uid, siteId, currentPageId);
                            if (pageData?.content) {
                              freshContent = JSON.stringify(pageData.content);
                              console.log('📄 V4: Refreshed page content from Firebase document');
                            }
                          } catch (error) {
                            console.error('Error loading page from Firebase:', error);
                          }
                          
                          // Apply fresh content or empty state
                          setTimeout(() => {
                            try {
                              if (freshContent && freshContent.includes('ROOT')) {
                                console.log('🎨 V4: Applying fresh content, length:', freshContent.length);
                                actions.clearEvents();
                                actions.deserialize(freshContent);
                                setCurrentPageData(freshContent);
                                
                                // Cache the fresh content
                                setPageContentCache(prev => ({
                                  ...prev,
                                  [currentPageId]: freshContent
                                }));
                                
                                console.log('✅ V4: Fresh content applied successfully');
                              } else {
                                // Apply empty state
                                const emptyState = JSON.stringify({
                                  "ROOT": {
                                    "type": { "resolvedName": "Root" },
                                    "nodes": [],
                                    "props": { "canvas": true },
                                    "custom": {},
                                    "parent": null,
                                    "displayName": "Root",
                                    "isCanvas": true
                                  }
                                });
                                
                                console.log('📄 V4: No fresh content found, applying empty state');
                                actions.clearEvents();
                                actions.deserialize(emptyState);
                                setCurrentPageData(emptyState);
                                
                                setPageContentCache(prev => ({
                                  ...prev,
                                  [currentPageId]: emptyState
                                }));
                              }
                              
                              // Re-enable editor
                              setTimeout(() => {
                                setIsInitialized(true);
                                console.log('🎉 V4: Editor re-enabled after content refresh');
                                message.success('Content refreshed successfully');
                              }, 200);
                              
                            } catch (error) {
                              console.error('Error applying fresh content:', error);
                              setIsInitialized(true);
                              message.error('Failed to refresh content');
                            }
                          }, 300);
                          
                        } catch (error) {
                          console.error('Error during force refresh:', error);
                          setIsInitialized(true);
                          message.error('Failed to refresh content');
                        }
                      }
                    },
                    {
                      key: 'emergency-reset',
                      label: '🚨 Emergency Reset (if stuck)',
                      onClick: () => {
                        console.log('🚨 EMERGENCY RESET TRIGGERED');
                        // Force reset everything
                        setIsLoadingPage(false);
                        setIsInitialized(false);
                        setPageContentCache({});
                        setCurrentPageData(null);
                        
                        // Force editor state reset
                        try {
                          actions.clearEvents();
                          if (actions.history && typeof actions.history.clear === 'function') {
                            actions.history.clear();
                          }
                        } catch (clearError) {
                          console.error('Error during emergency clear:', clearError);
                        }
                        
                        // Apply basic empty state and re-enable
                        setTimeout(() => {
                          try {
                            const emptyState = JSON.stringify({
                              "ROOT": {
                                "type": { "resolvedName": "Root" },
                                "nodes": [],
                                "props": { "canvas": true },
                                "custom": {},
                                "parent": null,
                                "displayName": "Root",
                                "isCanvas": true
                              }
                            });
                            actions.deserialize(emptyState);
                            setCurrentPageData(emptyState);
                            setPageContentCache({ [currentPageId]: emptyState });
                            setIsInitialized(true);
                            console.log('🚑 Emergency reset completed');
                            message.success('Emergency reset completed - editor should be functional now');
                          } catch (emergencyError) {
                            console.error('Emergency reset failed:', emergencyError);
                            setIsInitialized(true); // Enable anyway
                            message.error('Emergency reset had issues but editor is re-enabled');
                          }
                        }, 500);
                      }
                    },
                  ]
                }}
                placement="bottomRight"
                trigger={['click']}
              >
                <button className="text-xs px-2 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors">
                  🐛 Debug
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
          console.log('🧰 V2: Toolbox render check:', {
            enabled,
            isInitialized,
            shouldShowToolbox,
            currentPageId,
            hasActions: !!actions
          });
          return shouldShowToolbox;
        })() && (
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
              {/* Always render Frame to prevent unmounting and content loss */}
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
                    serializedLength: query.serialize()?.length || 0
                  });
                }}
              >
                <Element 
                  is={Root} 
                  padding={0} 
                  maxWidth='90%'
                  minWidth='99%'
                  paddingBottom='2rem'
                  background="#ffffff" 
                  canvas
                  className="min-h-[600px] w-full min-w-[99%] max-w-[90%] pb-8"
                />
              </Frame>
              
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
