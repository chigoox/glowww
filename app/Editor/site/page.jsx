'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { getSite, updateSite, getSiteData, getPage, updatePage, getSitePages } from '../../../lib/sites';
import { Spin, message, Button, Space, Typography, Alert, Switch, Dropdown, Tooltip } from 'antd';
import { EyeOutlined, ArrowLeftOutlined, UndoOutlined, RedoOutlined, HistoryOutlined, EditOutlined, 
         SaveOutlined, SettingOutlined, ImportOutlined, ExportOutlined, BgColorsOutlined, HeatMapOutlined,
         BoxPlotOutlined, MenuOutlined, EyeInvisibleOutlined, GlobalOutlined, ClockCircleOutlined, 
         MinusOutlined, ToolOutlined, FormatPainterOutlined, LayoutOutlined, SelectOutlined, DragOutlined } from '@ant-design/icons';

// Import existing editor components
import { Toolbox } from '../../Components/editor/ToolBox';
import { TopBar } from '../../Components/editor/TopBar';
import { Editor, Element, Frame, useEditor } from "@craftjs/core";
import { Box } from '../../Components/user/Layout/Box';
import { StyleMenu } from '../../Components/editor/StyleMenu';
import { FlexBox } from '../../Components/user/Layout/FlexBox';
import { Text } from '../../Components/user/Text/Text';
import { GridBox } from '../../Components/user/Layout/GridBox';
import { Image } from '../../Components/user/Media/Image';
import { Button as CraftButton } from '../../Components/user/Interactive/Button';
import { Link } from '../../Components/user/Interactive/Link';
import { Paragraph } from '../../Components/user/Text/Paragraph';
import { Video } from '../../Components/user/Media/Video';
import { ShopFlexBox, ShopImage, ShopText } from '../../Components/user/Advanced/ShopFlexBox';
import { FormInput } from '../../Components/user/Input';
import EditorLayers from '../../Components/editor/EditorLayers';
import { Form, FormInputDropArea } from '../../Components/user/Advanced/Form';
import { Carousel } from '../../Components/user/Media/Carousel';
import { NavBar, NavItem } from '../../Components/user/Nav/NavBar';
import { Root } from '../../Components/core/Root';
import { MultiSelectProvider } from '../../Components/utils/context/MultiSelectContext';
import { EditorSettingsProvider } from '../../Components/utils/context/EditorSettingsContext';
import { SelectDropProvider, useSelectDrop } from '../../Components/utils/context/SelectDropContext';
import EditorSettingsModal from '../../Components/ui/EditorSettingsModal';
import { useDropPositionCorrection } from '../../Components/utils/drag-drop/useDropPositionCorrection';
import { useContainerSwitchingFeedback } from '../../Components/utils/drag-drop/useContainerSwitchingFeedback';
import SnapGridControls from '../../Components/utils/grid/SnapGridControls';
import PageManager2 from '../../Components/editor/PageManager2';
import PageLoadModal from '../../Components/editor/PageLoadModal';
import { exportPageToGlow } from '../../../lib/pageExportImport';
import pako from 'pako';

const { Title, Text: AntText } = Typography;

// Enhanced Editor Layout with Site Context
const SiteEditorLayout = ({ siteId, siteData, siteContent }) => {
  const { user } = useAuth();
  const [site, setSite] = useState(siteData);
  const [pages, setPages] = useState([]); // Add pages state
  const [openMenuNodeId, setOpenMenuNodeId] = useState(null);
  const [activeDrawer, setActiveDrawer] = useState(null);
  const [useFigmaStyle, setUseFigmaStyle] = useState(true);
  const [isLeftPanelMinimized, setIsLeftPanelMinimized] = useState(false);
  const [isRightPanelMinimized, setIsRightPanelMinimized] = useState(false);
  const [currentPageId, setCurrentPageId] = useState(null); // Track current page - start with null
  const [currentPageData, setCurrentPageData] = useState(null); // Store current page content
  const [pageContentCache, setPageContentCache] = useState({}); // Cache page content
  const [isLoadingPage, setIsLoadingPage] = useState(false); // Loading state for page switches
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadModalVisible, setLoadModalVisible] = useState(false); // Page load modal state
  // Auto-save functionality
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSaveFrequency, setAutoSaveFrequency] = useState(3000); // 3 seconds default
  const [lastInitialized, setLastInitialized] = useState(null); // Track when last initialized
  const [hasLoadedFromFirebase, setHasLoadedFromFirebase] = useState(false); // Track if we've loaded real content
  const [settingsModalOpen, setSettingsModalOpen] = useState(false); // Settings modal state

  // Full Photoshop-style history system (like TopBar.jsx)
  const [historyEntries, setHistoryEntries] = useState([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);
  const [lastStateSnapshot, setLastStateSnapshot] = useState(null);
  const [isHistoryInitialized, setIsHistoryInitialized] = useState(false);

  // Initialize drop position correction system
  useDropPositionCorrection();
  
  // Initialize container switching feedback system
  useContainerSwitchingFeedback();
  
  // Initialize container switching feedback system
  useContainerSwitchingFeedback();

  // Helper function to detect what changed between states (from TopBar.jsx)
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

  // Jump to specific history point using Craft.js undo/redo (from TopBar.jsx)
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

  // Debug function to test content persistence (accessible via browser console)
  window.debugContentPersistence = () => {
    console.log('🔍 Content Persistence Debug Info:');
    console.log('Current Page ID:', currentPageId);
    console.log('Is Initialized:', isInitialized);
    console.log('Has Loaded From Firebase:', hasLoadedFromFirebase);
    console.log('Last Initialized:', lastInitialized ? new Date(lastInitialized) : 'Never');
    console.log('Pages Available:', pages.length);
    console.log('Page Content Cache:', Object.keys(pageContentCache));
    
    if (query && currentPageId) {
      const currentContent = query.serialize();
      console.log('Current Editor Content Size:', currentContent.length);
      console.log('Current Editor Content Preview:', currentContent.substring(0, 200) + '...');
      
      const cachedContent = pageContentCache[currentPageId];
      if (cachedContent) {
        console.log('Cached Content Size:', cachedContent.length);
        console.log('Content matches cache:', currentContent === cachedContent);
      } else {
        console.log('No cached content for current page');
      }
    }
  };

  // Enhanced debug function to force reload content from Firebase
  window.forceReloadContent = async () => {
    if (!user?.uid || !siteId || !currentPageId) {
      console.log('❌ Cannot reload - missing user, site, or page ID');
      return;
    }
    
    try {
      console.log('🔄 Force reloading content from Firebase for page:', currentPageId);
      const pageData = await getPage(user.uid, siteId, currentPageId);
      console.log('📋 Fresh Firebase data:', pageData);
      
      if (pageData?.content && actions) {
        console.log('🔄 Applying fresh content to editor...');
        actions.deserialize(pageData.content);
        setPageContentCache(prev => ({
          ...prev,
          [currentPageId]: JSON.stringify(pageData.content)
        }));
        setHasLoadedFromFirebase(true); // Mark that we have real content
        console.log('✅ Content reloaded successfully');
      } else {
        console.log('❌ No valid content found in Firebase');
      }
    } catch (error) {
      console.error('❌ Error force reloading content:', error);
    }
  };

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

    // Ensure ROOT node exists with proper full-width properties
    if (!cleaned.ROOT) {
      cleaned.ROOT = {
        type: { resolvedName: "Root" },
        isCanvas: true,
        props: { 
          canvas: true,
          padding: 0,
          margin: 0,
          width: "100%",
          minWidth: "100%",
          maxWidth: "100%",
          minHeight: "100vh",
          background: "#ffffff",
          position: "relative",
          display: "block"
        },
        displayName: "Root",
        custom: {},
        parent: null,
        nodes: [],
        linkedNodes: {}
      };
    } else {
      // Ensure existing ROOT has full-width properties to prevent width corruption
      if (cleaned.ROOT.props) {
        cleaned.ROOT.props = {
          ...cleaned.ROOT.props,
          width: "100%",
          minWidth: "100%", 
          maxWidth: "100%",
          canvas: true,
          position: "relative",
          display: "block"
        };
      } else {
        cleaned.ROOT.props = {
          canvas: true,
          padding: 0,
          margin: 0,
          width: "100%",
          minWidth: "100%",
          maxWidth: "100%",
          minHeight: "100vh",
          background: "#ffffff",
          position: "relative",
          display: "block"
        };
      }
    }

    return cleaned;
  };

  const { enabled, query, actions, canUndo, canRedo, editorState } = useEditor((state, query) => ({
    enabled: state.options.enabled,
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo(),
    // Monitor the actual state to trigger history updates
    editorState: state
  }), {
    // Disable editor until we load content
    enabled: isInitialized && !isLoadingPage
  });

  // Load pages on component mount
  useEffect(() => {
    const loadPages = async () => {
      if (!user?.uid || !siteId) return;
      
      try {
        const sitePages = await getSitePages(user.uid, siteId);
        console.log('📋 Loaded pages from Firebase:', sitePages);
        setPages(sitePages || []);
        
        // If we don't have a current page ID set, set it to the home page
        if (!currentPageId && sitePages?.length > 0) {
          const homePage = sitePages.find(page => page.isHome || page.name === 'home');
          const initialPageId = homePage ? homePage.id : sitePages[0]?.id;
          if (initialPageId) {
            console.log('🔄 Setting initial currentPageId to:', initialPageId);
            setCurrentPageId(initialPageId);
          }
        }
        
        // If no pages exist, the site should already have a home page created
        // Don't create a fake page here - let the load logic handle it
        if (!sitePages || sitePages.length === 0) {
          console.warn('⚠️ No pages found for site. Site may need initialization.');
        }
      } catch (error) {
        console.error('❌ Error loading pages:', error);
        // Don't create fallback pages here - let initialization handle it
      }
    };

    loadPages();
  }, [user?.uid, siteId]);

  // Load initial content only when component mounts
  useEffect(() => {
    const loadInitialContent = async () => {
      // Wait for actions to be available and not already initialized
      if (!actions || isInitialized || !user?.uid || !siteId || !pages.length) return;
      
      // Find the home page from the actual pages loaded from Firebase
      let targetPageId = currentPageId;
      
      if (!targetPageId) {
        // Look for the home page first
        const homePage = pages.find(page => page.isHome || page.name === 'home');
        if (homePage) {
          targetPageId = homePage.id;
          console.log('🏠 Found home page:', targetPageId);
        } else {
          // If no home page found, use the first page
          targetPageId = pages[0]?.id;
          console.log('📄 Using first page as default:', targetPageId);
        }
      }
      
      if (!targetPageId) {
        console.error('❌ No page to load - no pages found');
        return;
      }
      
      console.log('🚀 Loading page from Firebase document:', targetPageId);
      
      try {
        let contentToLoad = null;
        
        // Always load fresh content from Firebase on page reload
        // This ensures saved data isn't overridden by cached content
        try {
          console.log('🔄 Loading fresh content from Firebase for:', targetPageId);
          const pageData = await getPage(user.uid, siteId, targetPageId);
          console.log('📋 Firebase page data:', pageData);
          
          // Be more lenient about content validation during initial load
          if (pageData?.content && Object.keys(pageData.content).length > 0) {
            // Try to validate content structure
            let validContent = null;
            
            if (pageData.content.ROOT) {
              // Content has ROOT - use directly
              validContent = pageData.content;
            } else if (typeof pageData.content === 'object') {
              // Content might be stored differently - try to find any valid node structure
              const hasValidNodes = Object.values(pageData.content).some(node => 
                node && typeof node === 'object' && node.type
              );
              
              if (hasValidNodes) {
                validContent = pageData.content;
              }
            }
            
            if (validContent) {
              const pageContent = JSON.stringify(validContent);
              contentToLoad = pageContent;
              setHasLoadedFromFirebase(true); // Mark that we loaded real content
              console.log('✅ Loaded valid content from Firebase, size:', pageContent.length);
            } else {
              console.log('⚠️ Firebase page exists but content structure is not recognizable');
              setHasLoadedFromFirebase(false);
            }
          } else {
            console.log('⚠️ Firebase page exists but has no content or empty content');
            setHasLoadedFromFirebase(false); // Mark that we didn't get real content
          }
        } catch (error) {
          console.error('❌ Could not load page from Firebase:', error);
          setHasLoadedFromFirebase(false); // Mark that we didn't get real content
          
          // Only check cache as fallback if Firebase fails
          const cachedContent = pageContentCache[targetPageId];
          if (cachedContent && cachedContent !== '{}' && cachedContent.includes('ROOT')) {
            try {
              JSON.parse(cachedContent);
              contentToLoad = cachedContent;
              console.log('📦 Using cached content as fallback for page:', targetPageId);
            } catch (parseError) {
              console.log('🗑️ Invalid cached content, will use empty state');
            }
          }
        }
        
        // Clear editor first to ensure clean state
        actions.clearEvents();
        
        // Define fallback handler for initialization errors (clean empty state)
        const handleInitializationFallback = () => {
          try {
            const fallbackState = {
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
            
            actions.deserialize(fallbackState);
            setCurrentPageData(JSON.stringify(fallbackState));
            setPageContentCache(prev => ({
              ...prev,
              [targetPageId]: JSON.stringify(fallbackState)
            }));
            setIsInitialized(true);
            setLastInitialized(Date.now()); // Track when content was loaded
            console.log('Fallback to empty state successful for page:', targetPageId);
          } catch (fallbackError) {
            console.error('Failed to load fallback empty state:', fallbackError);
            setIsInitialized(true); // Set as initialized to prevent infinite loops
            setLastInitialized(Date.now()); // Track when content was loaded
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
                setLastInitialized(Date.now()); // Track when content was loaded
                
                // History will be automatically initialized by the new system
                console.log('Page loaded successfully, history will auto-initialize');
                
              } catch (deserializeError) {
                console.error('Error during content deserialization:', deserializeError);
                // Fallback to empty state
                handleInitializationFallback();
              }
            }, 100);
          } else {
            // Load enhanced empty state for new pages with better drop zone
            // Check if this page should have content (check page metadata)
            const shouldHaveContent = pages.find(p => p.id === targetPageId)?.content;
            if (shouldHaveContent) {
              console.log('⚠️ Page should have content but none was loaded - using empty state but blocking saves');
              setHasLoadedFromFirebase(false); // Block saves until real content is loaded
            } else {
              console.log('📄 New page detected - empty state is expected, allowing saves');
              setHasLoadedFromFirebase(true); // Allow saves for truly new pages
            }
            
            setTimeout(() => {
              const enhancedEmptyState = {
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
                setLastInitialized(Date.now()); // Track when content was loaded
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
    if (!query || !isInitialized || isLoadingPage || isSaving || !currentPageId) {
      console.log('📝 Auto-save skipped:', { 
        hasQuery: !!query, 
        isInitialized, 
        isLoadingPage, 
        isSaving,
        hasCurrentPageId: !!currentPageId
      });
      return;
    }

    // CRITICAL: Don't save unless we've loaded real content from Firebase first
    // This prevents overriding saved data with empty content on page load
    if (!hasLoadedFromFirebase) {
      console.log('📝 Auto-save blocked: Haven\'t loaded real content from Firebase yet');
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
            message.error('Failed to save page: ' + error.message);
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
    
    // Prevent auto-save for the first 5 seconds after initialization
    // This ensures loaded content isn't immediately overridden
    const timeSinceInit = lastInitialized ? Date.now() - lastInitialized : Infinity;
    if (timeSinceInit < 5000) {
      console.log('⏳ Auto-save paused - content recently loaded from Firebase');
      return;
    }

    // CRITICAL: Don't auto-save unless we've loaded real content from Firebase
    if (!hasLoadedFromFirebase) {
      console.log('⏳ Auto-save blocked - waiting for real content from Firebase');
      return;
    }

    // Only trigger auto-save if content actually changed
    const timeoutId = setTimeout(() => {
      try {
        const currentContent = query.serialize();
        const cachedContent = pageContentCache[currentPageId];
        
        // Only auto-save if content is different from cache
        if (currentContent && currentContent !== cachedContent && currentContent !== '{}') {
          console.log('🔄 Content changed, triggering auto-save');
          autoSave();
        }
      } catch (error) {
        console.error('Error checking content changes for auto-save:', error);
      }
    }, autoSaveFrequency);

    return () => clearTimeout(timeoutId);
  }, [editorState, autoSaveFrequency, isInitialized, isLoadingPage, lastInitialized, hasLoadedFromFirebase]); // Added hasLoadedFromFirebase dependency

  // Listen to state changes to build history entries (from TopBar.jsx)
  useEffect(() => {
    const updateHistory = () => {
      try {
        if (!query) return;
        
        const currentState = query.serialize();
        const timestamp = new Date().toLocaleTimeString();
        
        // Initialize history if not done yet
        if (!isHistoryInitialized) {
          const initialEntry = {
            id: 0,
            description: 'Initial state',
            timestamp: timestamp,
            state: currentState
          };
          setHistoryEntries([initialEntry]);
          setCurrentHistoryIndex(0);
          setLastStateSnapshot(currentState);
          setIsHistoryInitialized(true);
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

    // Only track history after initialization
    if (!isInitialized || isLoadingPage) return;
    
    // Don't track changes during initialization
    const timeSinceInit = lastInitialized ? Date.now() - lastInitialized : Infinity;
    if (timeSinceInit < 2000) return;

    // Throttle updates to avoid excessive entries
    const timeoutId = setTimeout(updateHistory, 300);
    return () => clearTimeout(timeoutId);
  }, [editorState, isHistoryInitialized, isInitialized, isLoadingPage, lastInitialized, lastStateSnapshot, detectChanges, query]);

  // Sync history index with undo/redo state (from TopBar.jsx)
  useEffect(() => {
    if (isHistoryInitialized && historyEntries.length > 0 && query) {
      const currentState = query.serialize();
      
      // Find matching state in history
      const matchingIndex = historyEntries.findIndex(entry => entry.state === currentState);
      if (matchingIndex !== -1 && matchingIndex !== currentHistoryIndex) {
        setCurrentHistoryIndex(matchingIndex);
        console.log(`History index synced to: ${matchingIndex}`);
      }
    }
  }, [canUndo, canRedo, isHistoryInitialized, historyEntries, currentHistoryIndex, query]);

  // Keyboard shortcuts for undo/redo (from TopBar.jsx)
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

  // Create sophisticated history dropdown menu (from TopBar.jsx)
  const historyDropdownMenu = {
    items: historyEntries.slice().reverse().map((entry, reverseIndex) => {
      const actualIndex = historyEntries.length - 1 - reverseIndex;
      const isCurrent = actualIndex === currentHistoryIndex;
      const isPast = actualIndex < currentHistoryIndex;
      const isFuture = actualIndex > currentHistoryIndex;
      
      return {
        key: entry.id.toString(),
        label: (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            minWidth: '250px',
            backgroundColor: isCurrent ? '#e6f7ff' : 'transparent',
            padding: '6px 12px',
            borderRadius: '4px',
            borderLeft: isCurrent ? '3px solid #1890ff' : '3px solid transparent',
            opacity: isFuture ? 0.6 : 1
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontWeight: isCurrent ? 'bold' : 'normal',
                color: isCurrent ? '#1890ff' : isPast ? '#333' : '#666',
                fontSize: '13px'
              }}>
                {entry.description}
              </div>
              <div style={{ 
                fontSize: '11px', 
                color: '#999',
                marginTop: '2px'
              }}>
                {entry.timestamp}
              </div>
            </div>
            <div style={{ marginLeft: '8px' }}>
              {isCurrent && <span style={{ color: '#1890ff', fontSize: '12px' }}>●</span>}
              {isPast && <span style={{ color: '#52c41a', fontSize: '12px' }}>✓</span>}
              {isFuture && <span style={{ color: '#faad14', fontSize: '12px' }}>○</span>}
            </div>
          </div>
        ),
        onClick: () => jumpToHistoryPoint(actualIndex),
      };
    }),
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
    
  // Always include a page path: use currentPageId when available, otherwise 'home'
  const pageSegment = currentPageId || 'home';
  previewUrl += `/${pageSegment}`;
  window.open(previewUrl, '_blank');
  };

  // Publish/Unpublish function
  // Compression utilities (matching PageManager approach)
  const compressData = (jsonString) => {
    try {
      const compressed = pako.deflate(jsonString);
      return btoa(String.fromCharCode.apply(null, compressed));
    } catch (error) {
      console.error('Compression error:', error);
      throw new Error('Failed to compress data');
    }
  };

  const decompressData = (compressedString) => {
    try {
      const binaryString = atob(compressedString);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const decompressed = pako.inflate(bytes, { to: 'string' });
      return decompressed;
    } catch (error) {
      console.error('Decompression error:', error);
      throw new Error('Failed to decompress data - invalid format');
    }
  };

  // Handle loading page data from external source (matching PageManager logic)
  const handleLoadPageData = async (inputData) => {
    if (!actions || !isInitialized || isLoadingPage) {
      message.error('Editor not ready for loading');
      return;
    }

    try {
      setIsLoadingPage(true);
      
      if (!inputData.trim()) {
        message.error('Please provide page data');
        return;
      }
      
      let pageDataToLoad;
      
      try {
        // Try to decompress first (for .glow files or compressed data from PageManager)
        pageDataToLoad = decompressData(inputData.trim());
        console.log('Successfully decompressed page data');
      } catch (decompressError) {
        // If decompression fails, try to use as raw JSON
        try {
          JSON.parse(inputData.trim()); // Validate JSON
          pageDataToLoad = inputData.trim();
          console.log('Using raw JSON data');
        } catch (jsonError) {
          throw new Error('Invalid format. Please provide a valid .glow file or serialized JSON data.');
        }
      }
      
      // Load the page data with proper CraftJS readiness check (matching PageManager approach)
      const deserializeWithDelay = () => {
        try {
          // Check if query is available and ready
          if (!query || !actions) {
            console.warn('CraftJS not ready for page load, retrying...');
            setTimeout(deserializeWithDelay, 100);
            return;
          }
          
          // Clear current editor state first
          actions.clearEvents();
          
          setTimeout(() => {
            try {
              actions.deserialize(pageDataToLoad);
              console.log('Page data loaded successfully using PageManager approach');
              
              // Update cache for current page
              setPageContentCache(prev => ({
                ...prev,
                [currentPageId]: pageDataToLoad
              }));
              
              setCurrentPageData(pageDataToLoad);
              message.success('Page loaded successfully!');
              
            } catch (deserializeError) {
              console.error('Failed to deserialize loaded page data:', deserializeError);
              message.error('Failed to load page data: ' + deserializeError.message);
            } finally {
              setIsLoadingPage(false);
            }
          }, 100);
          
        } catch (error) {
          console.error('Error in deserializeWithDelay:', error);
          message.error('Failed to load page: ' + error.message);
          setIsLoadingPage(false);
        }
      };
      
      setTimeout(deserializeWithDelay, 100);
      
    } catch (error) {
      console.error('Error in handleLoadPageData:', error);
      message.error('Failed to load page: ' + error.message);
      setIsLoadingPage(false);
    }
  };

  // Handle exporting current page (matching PageManager compression approach)
  const handleExportPage = async () => {
    try {
      if (!query || !currentPageId) {
        message.error('No page to export');
        return;
      }
      
      const currentContent = query.serialize();
      if (!currentContent || currentContent === '{}') {
        message.error('No content to export');
        return;
      }
      
      // Validate the content has ROOT
      const parsed = JSON.parse(currentContent);
      if (!parsed.ROOT) {
        message.error('Invalid page structure');
        return;
      }
      
      // Compress the data using PageManager approach
      const compressedData = compressData(currentContent);
      
      // Create the file blob with compressed data
      const blob = new Blob([compressedData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      const pageName = pages.find(p => p.id === currentPageId)?.name || currentPageId;
      link.download = `${pageName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.glow`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      URL.revokeObjectURL(url);
      
      message.success(`Page "${pageName}" exported as compressed .glow file!`);
      
    } catch (error) {
      console.error('Export failed:', error);
      message.error('Failed to export page: ' + error.message);
    }
  };

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
        loading: isLoadingPage,
        newPageId,
        currentPageId
      });
      return;
    }
    
    console.log('🔄 V4: Starting page change from', currentPageId, 'to', newPageId);
    console.log('🔍 V4: Available pages:', pages.map(p => ({ id: p.id, name: p.name, isHome: p.isHome })));
    
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
          console.log('🔄 V4: Loading page content from Firebase for ID:', newPageId);
          const pageData = await getPage(user.uid, siteId, newPageId);
          console.log('📋 V4: Firebase page data received:', { 
            pageId: newPageId, 
            hasContent: !!pageData?.content, 
            contentKeys: pageData?.content ? Object.keys(pageData.content) : [],
            hasRoot: !!pageData?.content?.ROOT,
            contentType: typeof pageData?.content
          });
          
          // Be more lenient about content validation - accept any content structure
          if (pageData?.content && Object.keys(pageData.content).length > 0) {
            // Try to validate content structure
            let validContent = null;
            
            if (pageData.content.ROOT) {
              // Content has ROOT - use directly
              validContent = pageData.content;
            } else if (typeof pageData.content === 'object') {
              // Content might be stored differently - try to find any valid node structure
              const hasValidNodes = Object.values(pageData.content).some(node => 
                node && typeof node === 'object' && node.type
              );
              
              if (hasValidNodes) {
                validContent = pageData.content;
              }
            }
            
            if (validContent) {
              contentToLoad = JSON.stringify(validContent);
              console.log('✅ V4: Loaded valid content from Firebase, size:', contentToLoad.length);
            } else {
              console.warn('⚠️ V4: Page data exists but content structure is not recognizable');
            }
          } else {
            console.log('⚠️ V4: Page exists but has no content or empty content');
          }
        } catch (firebaseError) {
          console.error('❌ V4: Firebase error:', firebaseError);
        }
      }
      
      // Only create empty state if we truly have no content
      if (!contentToLoad) {
        // Find the page info to check if this should be an empty page
        const currentPage = pages.find(p => p.id === newPageId);
        const pageName = currentPage?.name || 'New Page';
        const isHomePage = currentPage?.isHome || false;
        
        console.log('📝 V4: No content found, creating empty state for:', { newPageId, pageName, isHomePage });
        
        // Create a clean empty state with proper full-width Root
        contentToLoad = JSON.stringify({
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
        });
        console.log('📝 V4: Created clean empty state for new page:', pageName);
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
        
        // Emergency fallback with distinctive content for this page
        const currentPage = pages.find(p => p.id === newPageId);
        const pageName = currentPage?.name || 'Unknown Page';
        
        const enhancedEmptyState = {
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
      
      // Debug function to check Firebase page loading
      window.debugPageLoading = async () => {
        console.log('🔍 DEBUG: Page Loading Analysis');
        console.log('- Current Page ID:', currentPageId);
        console.log('- Site ID:', siteId);
        console.log('- User ID:', user?.uid);
        console.log('- Pages loaded:', pages.map(p => ({ id: p.id, name: p.name, isHome: p.isHome })));
        console.log('- Cache keys:', Object.keys(pageContentCache));
        console.log('- Is initialized:', isInitialized);
        console.log('- Is loading page:', isLoadingPage);
        
        // Test Firebase page loading
        if (currentPageId && user?.uid && siteId) {
          try {
            console.log('🔄 Testing Firebase page load for:', currentPageId);
            const pageData = await getPage(user.uid, siteId, currentPageId);
            console.log('📋 Firebase page data:', pageData);
            console.log('📋 Content exists:', !!pageData?.content);
            console.log('📋 Content has ROOT:', !!pageData?.content?.ROOT);
            if (pageData?.content?.ROOT) {
              console.log('📋 ROOT nodes:', pageData.content.ROOT.nodes?.length || 0);
            }
          } catch (error) {
            console.error('❌ Firebase page load failed:', error);
          }
        }
        
        // Test current editor state
        if (query) {
          try {
            const currentState = query.serialize();
            console.log('🎨 Current editor state size:', currentState?.length || 0);
            const parsed = JSON.parse(currentState);
            console.log('🎨 Current editor ROOT nodes:', parsed?.ROOT?.nodes?.length || 0);
          } catch (error) {
            console.error('❌ Editor state read failed:', error);
          }
        }
      };
      
      // Test page saving
      window.testPageSave = async () => {
        if (!query || !currentPageId) {
          console.error('❌ Cannot test save - missing query or page ID');
          return;
        }
        
        try {
          const currentContent = query.serialize();
          const parsed = JSON.parse(currentContent);
          console.log('💾 Testing page save...');
          console.log('📊 Content to save:', { 
            pageId: currentPageId, 
            hasRoot: !!parsed.ROOT, 
            nodeCount: Object.keys(parsed).length,
            rootNodes: parsed.ROOT?.nodes?.length || 0
          });
          
          await updatePage(user.uid, siteId, currentPageId, {
            content: parsed,
            lastModified: new Date()
          });
          
          console.log('✅ Test save successful!');
          message.success('Test save successful!');
        } catch (error) {
          console.error('❌ Test save failed:', error);
          message.error('Test save failed: ' + error.message);
        }
      };
      
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
        delete window.debugPageLoading;
        delete window.testPageSave;
      }
    };
  }, [refreshPageCache, pages, currentPageId, pageContentCache, isInitialized, isLoadingPage, handlePageChange, actions, query, user?.uid, siteId]);

  return (
    <div className="h-screen w-[100vw]   flex flex-col">
      {/* Modern Toolbar */}
      <div className="bg-white border-b overflow-x-scroll border-gray-300 shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left Section - Navigation & Site Info */}
          <div className="flex items-center space-x-4">
            <Tooltip title="Back to Dashboard">
              <Button 
                type="text" 
                icon={<ArrowLeftOutlined className="text-lg" />}
                onClick={() => window.location.href = '/dashboard'}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-none shadow-none h-10 w-10"
                size="large"
              />
            </Tooltip>
            
            <div className="border-l border-gray-300 pl-4">
              <div className="flex items-center space-x-3">
                <div>
                  <span className="text font-semibold text-gray-900">
                    {site?.name || 'Untitled Site'}
                  </span>
                  <div className=" items-center space-x-2 text-xs">
                    {site?.isPublished ? (
                      <span className="text-green-400 flex items-center">
                        <span className="w-2 h-2  bg-green-400 rounded-full mr-1"></span>
                        Published
                      </span>
                    ) : (
                      <span className="text-orange-400 flex items-center">
                        <span className="w-2 h-2 bg-orange-400 rounded-full mr-1"></span>
                        Draft
                      </span>
                    )}
                    {lastSaved && (
                      <div className="text-gray-500">
                        • Saved {lastSaved.toLocaleTimeString()}
                      </div>
                    )}
                    {isSaving && !isLoadingPage && (
                      <span className="text-blue-600 flex items-center">
                        <span className="w-2 h-2 bg-blue-600 rounded-full mr-1 animate-pulse"></span>
                        Saving...
                      </span>
                    )}
                    {isLoadingPage && (
                      <span className="text-purple-600 flex items-center">
                        <span className="w-2 h-2 bg-purple-600 rounded-full mr-1 animate-pulse"></span>
                        Switching page...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Center Section - Page Manager with Tree Structure */}
          <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
            <PageManager2 
              currentPageId={currentPageId}
              onPageChange={handlePageChange}
              pages={pages}
              onPagesUpdate={setPages}
            />
          </div>
          
          {/* Main Toolbar Section */}
          <div className="flex items-center space-x-1">
            {/* Editor/Preview Toggle */}
            <Tooltip title={enabled ? "Switch to Preview Mode" : "Switch to Editor Mode"}>
              <Button
                icon={!enabled ? <EditOutlined className="text-lg" /> : <EyeOutlined className="text-lg" />}
                disabled={!isInitialized}
                onClick={() => {
                  if (isInitialized) {
                    actions.setOptions(options => {
                      options.enabled = !enabled;
                    });
                  }
                }}
                className={`h-10 w-10 border-gray-300 ${
                  enabled 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-500' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
                size="large"
              />
            </Tooltip>

            <div className="w-px h-6 bg-gray-300 mx-2"></div>

            {/* History Controls */}
            <Tooltip title="Undo (Ctrl+Z)">
              <Button
                icon={<UndoOutlined className="text-lg" />}
                disabled={!canUndo || !isInitialized}
                onClick={handleUndo}
                className="h-10 w-10 bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200 border-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
                size="large"
              />
            </Tooltip>

            <Tooltip title="Redo (Ctrl+Y)">
              <Button
                icon={<RedoOutlined className="text-lg" />}
                disabled={!canRedo || !isInitialized}
                onClick={handleRedo}
                className="h-10 w-10 bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200 border-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
                size="large"
              />
            </Tooltip>

            <Tooltip title="Edit History">
              <Dropdown
                menu={historyDropdownMenu}
                placement="bottomLeft"
                trigger={['click']}
                overlayClassName="rounded-xl overflow-hidden shadow-2xl"
                overlayStyle={{ borderRadius: 12, overflow: 'hidden' }}
                arrow={false}
                disabled={!isInitialized}
              >
                <Button
                  icon={<HistoryOutlined className="text-lg" />}
                  disabled={!isInitialized}
                  className="h-10 w-10 bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200 border-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
                  size="large"
                />
              </Dropdown>
            </Tooltip>

            <div className="w-px h-6 bg-gray-300 mx-2"></div>

            {/* Snap Grid Controls */}
            <div className="bg-gray-50 rounded-lg px-2 py-1 border border-gray-200">
              <SnapGridControls />
            </div>

            <div className="w-px h-6 bg-gray-300 mx-2"></div>

            {/* Editor Settings */}
            <Tooltip title="Editor Settings & Preferences">
              <Button
                icon={<SettingOutlined className="text-lg" />}
                disabled={!isInitialized}
                onClick={() => setSettingsModalOpen(true)}
                className="h-10 w-10 bg-orange-600 text-white hover:bg-orange-700 border-orange-500"
                size="large"
              />
            </Tooltip>

            <div className="w-px h-6 bg-gray-300 mx-2"></div>

            {/* Save & Auto-save */}
            <Tooltip title="Save Page">
              <Button
                icon={<SaveOutlined className="text-lg" />}
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
                className="h-10 w-10 bg-green-600 text-white hover:bg-green-700 border-green-500"
                size="large"
              />
            </Tooltip>

            <Tooltip title="Auto-save Settings">
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
                overlayClassName="rounded-xl overflow-hidden shadow-2xl"
                overlayStyle={{ borderRadius: 12, overflow: 'hidden' }}
                arrow={false}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<SettingOutlined />}
                  className="rounded-lg px-3 text-gray-600 hover:text-gray-900"
                />
              </Dropdown>
            </Tooltip>

            <div className="w-px h-6 bg-gray-300 mx-2"></div>

            {/* Import/Export Group */}
            <Tooltip title="Import Page">
              <Button
                icon={<ImportOutlined className="text-lg" />}
                disabled={!isInitialized || isLoadingPage}
                onClick={() => setLoadModalVisible(true)}
                className="h-10 w-10 bg-blue-600 text-white hover:bg-blue-700 border-blue-500"
                size="large"
              />
            </Tooltip>

            <Tooltip title="Export Page">
              <Button
                icon={<ExportOutlined className="text-lg" />}
                disabled={!isInitialized || isLoadingPage}
                onClick={handleExportPage}
                className="h-10 w-10 bg-purple-600 text-white hover:bg-purple-700 border-purple-500"
                size="large"
              />
            </Tooltip>

            <div className="w-px h-6 bg-gray-300 mx-2"></div>

            <Tooltip title="Toggle Style Menu">
              <Button
                icon={useFigmaStyle ? <HeatMapOutlined className="text-lg" /> : <BoxPlotOutlined className="text-lg" />}
                onClick={() => setUseFigmaStyle(!useFigmaStyle)}
                className="h-10 w-10 bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200 border-gray-300"
                size="large"
              />
            </Tooltip>
          </div>

          {/* Right Section - Preview & Publish */}
          <div className="flex items-center space-x-2">
            <Tooltip title="Preview Site">
              <Button 
                icon={<EyeOutlined className="text-lg" />}
                onClick={handlePreview}
                className="h-10 px-4 bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-500"
                size="large"
              >
                Preview
              </Button>
            </Tooltip>
            <Tooltip title={site?.isPublished ? "Unpublish Site" : "Publish Site"}>
              <Button 
                icon={site?.isPublished ? <EyeInvisibleOutlined className="text-lg" /> : <GlobalOutlined className="text-lg" />}
                onClick={handleTogglePublish}
                className={`h-10 px-4 ${
                  site?.isPublished 
                    ? 'bg-orange-600 hover:bg-orange-700 border-orange-500' 
                    : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-500'
                } text-white`}
                size="large"
              >
                {site?.isPublished ? 'Unpublish' : 'Publish'}
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Full Width Editor Canvas */}
        <div className="w-full h-full overflow-auto bg-gray-100 relative">
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
            
            <div className="w-full  h-full max-w-none">
              {/* Only render Frame when editor is properly initialized */}
              {isInitialized ? (
                <Frame 
                  className="w-full h-full min-h-[100vh]"
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
                    width="100%"
                    minWidth="100%"
                    maxWidth="100%"
                    minHeight="100vh"
                    background="#ffffff" 
                    position="relative"
                    display="block"
                    padding={0}
                    margin={0}
                    canvas
                    className="w-full h-full min-h-[100vh]"
                  />
                </Frame>
              ) : (
                <div className="w-full h-full min-h-[100vh] bg-white flex items-center justify-center">
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

        {/* Floating Left Sidebar - Toolbox & Layers */}
        {enabled && isInitialized && (
          <>
            {!isLeftPanelMinimized && (
              <div className="absolute flex-shrink-0 z-30 left-4 top-4 bottom-auto w-64 max-h-96 bg-white border border-gray-200 shadow-lg rounded-lg flex flex-col">
                {/* Minimize Button */}
                <div className="flex justify-between items-center p-2 border-b border-gray-200">
                  <Tooltip title="Minimize Layers Panel">
                    <Button
                      type="text"
                      size="small"
                      icon={<MinusOutlined />}
                      onClick={() => setIsLeftPanelMinimized(true)}
                      className="text-gray-500 hover:text-gray-700"
                    />
                  </Tooltip>
                  <span className="text-sm font-medium text-gray-700 flex items-center">
                    <LayoutOutlined className="mr-2" />
                    Layers
                  </span>
                </div>
                <div className="h-full max-h-80 flex-1 min-h-0">
                  <EditorLayers />
                </div>
              </div>
            )}
            {/* Toolbox always rendered (it handles its own fixed positioning) */}
            <Toolbox
              activeDrawer={activeDrawer}
              setActiveDrawer={setActiveDrawer}
              openMenuNodeId={openMenuNodeId}
              setOpenMenuNodeId={setOpenMenuNodeId}
            />
          </>
        )}

        {/* Floating Right Sidebar - Style Menu */}
        {(() => {
          const shouldShowStyleMenu = enabled && isInitialized;
          
          return shouldShowStyleMenu && !isRightPanelMinimized;
        })() && (
          <div className={`absolute right-4 top-4 bottom-4 bg-white border border-gray-200 shadow-lg rounded-lg flex-shrink-0 z-30 ${
            useFigmaStyle ? 'w-64 min-w-64' : 'w-72 min-w-72'
          } flex flex-col`}>
            {/* Minimize Button */}
            <div className="flex justify-between items-center p-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700 flex items-center">
                <FormatPainterOutlined className="mr-2" />
                Style Properties
              </span>
              <Tooltip title="Minimize Panel">
                <Button
                  type="text"
                  size="small"
                  icon={<MinusOutlined />}
                  onClick={() => setIsRightPanelMinimized(true)}
                  className="text-gray-500 hover:text-gray-700"
                />
              </Tooltip>
            </div>
            <div className="h-full overflow-y-auto hidescroll flex-1">
              <StyleMenu useFigmaStyle={useFigmaStyle} />
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Buttons for Minimized Panels */}
      {isLeftPanelMinimized && enabled && isInitialized && (
        <div className="fixed left-4 z-40" style={{ top: 'calc(4rem + 1rem + 0.5rem)' }}>
          <Tooltip title="Show Tools & Layers" placement="right">
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={<LayoutOutlined />}
              onClick={() => setIsLeftPanelMinimized(false)}
              className="shadow-lg"
            />
          </Tooltip>
        </div>
      )}

      {isRightPanelMinimized && enabled && isInitialized && (
        <div className="fixed right-4 z-40" style={{ top: 'calc(4rem + 1rem + 0.5rem)' }}>
          <Tooltip title="Show Style Properties" placement="left">
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={<FormatPainterOutlined />}
              onClick={() => setIsRightPanelMinimized(false)}
              className="shadow-lg"
            />
          </Tooltip>
        </div>
      )}

      {/* Page Load Modal */}
      <PageLoadModal
        visible={loadModalVisible}
        onCancel={() => setLoadModalVisible(false)}
        onLoad={handleLoadPageData}
        mode="load"
      />

      {/* Editor Settings Modal */}
      <EditorSettingsModal 
        visible={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
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
      <EditorSettingsProvider>
        <MultiSelectProvider>
          <SelectDropProvider>
            <SiteEditorLayout siteId={siteId} siteData={site} siteContent={siteContent} />
            {/* Desktop floating toggle for Select/Drop mode */}
            <SelectDropToggle />
          </SelectDropProvider>
        </MultiSelectProvider>
      </EditorSettingsProvider>
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

// Floating desktop toggle button component
function SelectDropToggle() {
  try {
    const { selectDropMode, setSelectDropMode, isMobile } = useSelectDrop();
    const [style, setStyle] = React.useState({ left: 16, top: null, size: 40, ready: false });

    React.useEffect(() => {
      if (isMobile) return;
      let attempts = 0;
      const gap = 8;
      const measure = () => {
        const toolbox = document.querySelector('[data-editor-toolbox-floating]');
        if (toolbox) {
          const rect = toolbox.getBoundingClientRect();
          const size = Math.max(28, Math.round(rect.height * 0.6));
            setStyle({
              left: Math.round(rect.left - size - gap),
              top: Math.round(rect.top + (rect.height / 2) - (size / 2)),
              size,
              ready: true
            });
        } else if (attempts < 25) {
          attempts++;
          setTimeout(measure, 120);
        }
      };
      measure();
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }, [isMobile]);

    if (isMobile) return null;
    const commonStyle = style.top != null ? {
      position: 'fixed', left: style.left, top: style.top,
      width: style.size, height: style.size, borderRadius: style.size / 2, zIndex: 60
    } : {
      position: 'fixed', left: style.left, bottom: 96,
      width: style.size, height: style.size, borderRadius: style.size / 2, zIndex: 60
    };

    return (
      <button
        onClick={() => setSelectDropMode(!selectDropMode)}
        aria-label={selectDropMode ? 'Disable tap to place mode' : 'Enable tap to place mode'}
        style={commonStyle}
        className={`shadow-lg flex items-center justify-center border transition-all text-[11px] font-medium ${selectDropMode ? 'bg-blue-600 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
        title="Toggle Select & Drop Mode"
      >
        {selectDropMode ? <SelectOutlined className="text-base" /> : <DragOutlined className="text-base" />}
      </button>
    );
  } catch { return null; }
}
