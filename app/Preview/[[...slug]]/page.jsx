'use client'
import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';

import { Topbar } from '../../Components/TopBar';

import { Editor, Element, Frame, useEditor } from "@craftjs/core";
import { Form, FormInputDropArea } from '../../Components/user/Advanced/Form';
import { ShopFlexBox, ShopImage, ShopText } from '../../Components/user/Advanced/ShopFlexBox';
import { Box } from '../../Components/user/Box';
import { Button } from '../../Components/user/Button';
import { Carousel } from '../../Components/user/Carousel';
import { FlexBox } from '../../Components/user/FlexBox';
import { GridBox } from '../../Components/user/GridBox';
import { Image } from '../../Components/user/Image';
import { FormInput } from '../../Components/user/Input';
import { Link } from '../../Components/user/Link';
import { Paragraph } from '../../Components/user/Paragraph';
import { Text } from '../../Components/user/Text';
import { TextArea } from '../../Components/user/TextArea';
import { Video } from '../../Components/user/Video';
import useSaveOperations from '../../Components/support/useSaveOperations';

// Function to create a fallback project structure
const createFallbackProject = () => {
  return {
    name: 'fallback-project',
    pages: [
      {
        key: 'home',
        title: 'Home',
        path: '/',
        folderPath: '',
        parentKey: null,
        isHome: true,
        serializedData: '{"ROOT":{"type":{"resolvedName":"Box"},"nodes":[],"props":{"canvas":true},"custom":{},"parent":null,"displayName":"Box","isCanvas":true}}',
        children: []
      }
    ],
    currentPage: 'home',
    timestamp: new Date().toISOString()
  };
};

// Helper function to map URL path/slug to a page key
const mapPathToPageKey = (slug, pages) => {
  // If no pages provided or empty array, return 'home'
  if (!pages || !Array.isArray(pages) || pages.length === 0) {
    console.warn('mapPathToPageKey: No pages provided, defaulting to home');
    return 'home';
  }
  
  // If no slug, show home page
  if (!slug || !Array.isArray(slug) || slug.length === 0) {
    return 'home';
  }
  
  console.log('mapPathToPageKey: Mapping slug to page key', {
    slug: slug.join('/'),
    availablePages: pages.map(p => `${p.key} (${p.path})`)
  });
  
  // Convert slug array to path string
  const targetPath = '/' + slug.join('/');
  
  // Strategy 1: Find page by exact path match
  let page = pages.find(p => p.path === targetPath);
  if (page) {
    console.log('mapPathToPageKey: Found exact path match:', page.key);
    return page.key;
  }
  
  // Strategy 2: For single-segment URLs, try to find by key
  if (slug.length === 1) {
    const pageKey = slug[0];
    page = pages.find(p => p.key === pageKey);
    if (page) {
      console.log('mapPathToPageKey: Found exact key match:', page.key);
      return page.key;
    }
  }
  
  // Strategy 3: Try case-insensitive matching
  page = pages.find(p => p.path && p.path.toLowerCase() === targetPath.toLowerCase());
  if (page) {
    console.log('mapPathToPageKey: Found case-insensitive path match:', page.key);
    return page.key;
  }
  
  // Strategy 4: Try case-insensitive key matching for single segments
  if (slug.length === 1) {
    const pageKey = slug[0].toLowerCase();
    page = pages.find(p => p.key && p.key.toLowerCase() === pageKey);
    if (page) {
      console.log('mapPathToPageKey: Found case-insensitive key match:', page.key);
      return page.key;
    }
  }
  
  // Strategy 5: Try to find by title (in case the URL uses the display title)
  if (slug.length === 1) {
    const searchTerm = slug[0].toLowerCase().replace(/-/g, ' ');
    page = pages.find(p => p.title && p.title.toLowerCase() === searchTerm);
    if (page) {
      console.log('mapPathToPageKey: Found title match:', page.key);
      return page.key;
    }
  }
  
  // Strategy 6: Special case - If slug is just "about", "contact", etc., look for those common pages
  if (slug.length === 1) {
    const commonPages = ['about', 'contact', 'services', 'products', 'blog', 'portfolio'];
    if (commonPages.includes(slug[0].toLowerCase())) {
      // Look for any page with this key or path
      page = pages.find(p => 
        p.key.toLowerCase().includes(slug[0].toLowerCase()) ||
        (p.path && p.path.toLowerCase().includes(slug[0].toLowerCase()))
      );
      if (page) {
        console.log('mapPathToPageKey: Found common page match:', page.key);
        return page.key;
      }
    }
  }
  
  console.warn('mapPathToPageKey: No matching page found for slug:', slug.join('/'));
  return null;
};

// Create a component that uses useEditor inside the Editor context
const EditorLayout = ({ pageKey, pageData }) => {
  const [openMenuNodeId, setOpenMenuNodeId] = useState(null);
  const [activeDrawer, setActiveDrawer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const loadingRef = useRef(false); // Prevent multiple simultaneous loads
  const deserializationAttemptedRef = useRef(false);
  
  // Separate state for editor - don't access this during render
  const editorRef = useRef(null);
  
  // Get editor reference first, without subscribing to state changes
  const { enabled, actions, query } = useEditor();

  // Load the specific page data when component mounts or pageKey changes
  useEffect(() => {
    // Store editor reference for safe access outside render
    editorRef.current = { actions, query };
    
    // Reset state for new loads
    if (pageKey !== loadingRef.current) {
      deserializationAttemptedRef.current = false;
    }
    
    // Prevent multiple simultaneous loads
    if (deserializationAttemptedRef.current) {
      console.log('Preview: Skipping duplicate load attempt for', pageKey);
      return;
    }
    
    deserializationAttemptedRef.current = true;
    loadingRef.current = pageKey; // Track which page we're loading
    
    const loadPageContent = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const defaultData = '{"ROOT":{"type":{"resolvedName":"Box"},"nodes":[],"props":{"canvas":true},"custom":{},"parent":null,"displayName":"Box","isCanvas":true}}';
        let dataToLoad = defaultData;
        
        console.log('Preview: Loading page data for', pageKey, ':', {
          title: pageData?.title || 'Unknown',
          path: pageData?.path || '/',
          hasData: !!(pageData?.serializedData && pageData.serializedData.trim().length > 0),
          dataLength: pageData?.serializedData?.length || 0
        });
        
        if (pageData && typeof pageData.serializedData === 'string' && pageData.serializedData.trim().length > 0) {
          dataToLoad = pageData.serializedData;
        }
        
        // Wait for the next tick to ensure we're not in render phase
        setTimeout(() => {
          const deserializeWithDelay = () => {
            // Get current editor reference
            const currentEditor = editorRef.current;
            if (!currentEditor || !currentEditor.query || !currentEditor.actions) {
              console.warn('CraftJS not ready, retrying in 200ms...');
              setTimeout(deserializeWithDelay, 200);
              return;
            }
            
            try {
              console.log('Preview: Deserializing page data for', pageData?.title || pageKey);
              
              // Use try-catch within each deserialization attempt
              try {
                currentEditor.actions.deserialize(dataToLoad);
                console.log('Preview: Successfully deserialized page data');
                
                // Defer state updates using requestAnimationFrame to avoid React errors
                requestAnimationFrame(() => {
                  setIsLoading(false);
                  console.log('Preview: Successfully loaded page', pageData?.title || pageKey);
                });
              } catch (deserializeError) {
                console.error('CraftJS deserialization failed, trying fallback:', deserializeError);
                
                // Fallback to default data
                try {
                  console.warn('Preview: Using fallback empty page layout');
                  currentEditor.actions.deserialize(defaultData);
                  requestAnimationFrame(() => {
                    setIsLoading(false);
                    message.warning('Loaded empty page layout due to data error');
                  });
                } catch (fallbackError) {
                  console.error('Failed to load fallback page:', fallbackError);
                  requestAnimationFrame(() => {
                    setError('Failed to load page content: ' + deserializeError.message);
                    setIsLoading(false);
                  });
                }
              }
            } catch (error) {
              console.error('Preview: Error in deserialization process:', error);
              requestAnimationFrame(() => {
                setError('Error loading page: ' + error.message);
                setIsLoading(false);
              });
            }
          };
          
          // Start deserialization process in next tick
          deserializeWithDelay();
        }, 200); // Increased delay for better stability
        
      } catch (error) {
        console.error('Failed to start page loading process:', error);
        requestAnimationFrame(() => {
          setError('Failed to load page: ' + error.message);
          setIsLoading(false);
        });
      }
    };
    
    // Start loading process
    loadPageContent();
  }, [pageKey, pageData?.serializedData, message]); // Only depend on pageKey and the actual data content

  useEffect(() => {
    // React 19 + Craft.js compatibility fixes
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    
    // Fix addEventListener for non-DOM objects
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        try {
            if (this && typeof originalAddEventListener === 'function') {
                return originalAddEventListener.call(this, type, listener, options);
            }
        } catch (error) {
            console.warn('addEventListener compatibility fix:', error);
        }
    };
    
    // Fix removeEventListener for non-DOM objects  
    EventTarget.prototype.removeEventListener = function(type, listener, options) {
        try {
            if (this && typeof originalRemoveEventListener === 'function') {
                return originalRemoveEventListener.call(this, type, listener, options);
            }
        } catch (error) {
            console.warn('removeEventListener compatibility fix:', error);
        }
    };
    
    // Fix getBoundingClientRect for non-DOM objects
    Element.prototype.getBoundingClientRect = function() {
        try {
            if (this && typeof originalGetBoundingClientRect === 'function') {
                return originalGetBoundingClientRect.call(this);
            }
            // Fallback for invalid elements
            return {
                top: 0, left: 0, bottom: 0, right: 0,
                width: 0, height: 0, x: 0, y: 0,
                toJSON: () => ({})
            };
        } catch (error) {
            console.warn('getBoundingClientRect compatibility fix:', error);
            return {
                top: 0, left: 0, bottom: 0, right: 0,
                width: 0, height: 0, x: 0, y: 0,
                toJSON: () => ({})
            };
        }
    };
    
    return () => {
        // Restore original methods on cleanup
        EventTarget.prototype.addEventListener = originalAddEventListener;
        EventTarget.prototype.removeEventListener = originalRemoveEventListener;
        Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen overflow-hidden bg-gray-50">
        <div className="fixed top-0 left-0 right-0 z-50">
          <Topbar />
        </div>
        <div className="flex items-center justify-center h-screen pt-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading page: {pageData?.title || pageKey}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen overflow-hidden bg-gray-50">
        <div className="fixed top-0 left-0 right-0 z-50">
          <Topbar />
        </div>
        <div className="flex items-center justify-center h-screen pt-16">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Page</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.href = '/Preview'}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-50">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Topbar />
      </div>

      {/* Page Title Bar */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Preview:</span>
            <span className="font-medium text-gray-800">{pageData?.title || pageKey}</span>
            <span className="text-xs text-gray-400">({pageData?.path || '/'})</span>
          </div>
          <div className="text-xs text-gray-500">
            {pageData?.folderPath ? `app/${pageData.folderPath}/page.js` : 'app/page.js'}
          </div>
        </div>
      </div>

      {/* Main Layout Container */}
      <div className="flex h-screen pt-28">
        {/* Main Editor Area */}
        <div className="flex-1 flex">
          {/* Canvas Area */}
          <div className="flex-1 p-4 overflow-auto bg-gray-100">
            <div className="w-full max-w-none">
              <Frame className="w-full min-h-[600px]">
                <Element 
                  is={Box} 
                  padding={20} 
                  background="#ffffff" 
                  canvas
                  className="min-h-[600px] w-full"
                  style={{ 
                    maxWidth: '100%',
                    overflow: 'hidden'
                  }}
                >
                  {/* Canvas content will be loaded here */}
                </Element>
              </Frame>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function DynamicPreview() {
  const params = useParams();
  const [projectData, setProjectData] = useState(null);
  const [currentPage, setCurrentPage] = useState(null);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Use the shared save operations hook for project operations
  const { getProjectData } = useSaveOperations();
  
  // Extract slug from params and memoize it to prevent infinite loops
  const slug = useMemo(() => params?.slug || [], [params?.slug]);
  const slugString = useMemo(() => slug.join('/'), [slug]);
  
  // Load and initialize project data
  useEffect(() => {
    // Prevent multiple loads during initialization
    if (isInitialized) return;
    
    const loadProjectData = async () => {
      try {
        console.log('Preview: Loading project data, slug:', slugString);
        
        // Get the active project name from localStorage
        const activeProjectName = localStorage.getItem('glow_active_project') || 'my-website';
        console.log('Preview: Active project from localStorage:', activeProjectName);
        
        // Load project data using the hook
        let project = getProjectData(activeProjectName);
        
        // Try alternate project names if needed
        if (!project && activeProjectName !== 'my-website') {
          console.log('Preview: Trying default project name "my-website" as fallback');
          project = getProjectData('my-website');
        }
        
        // If still no project found, create a fallback but show a helpful message
        if (!project) {
          console.warn('Preview: No project data found in any storage location, using fallback');
          project = createFallbackProject();
        } else {
          console.log('Preview: Project loaded successfully:', {
            name: project.name,
            pages: project.pages?.length || 0,
            currentPage: project.currentPage
          });
        }
        
        // Temporary debugging - show data in page title
        if (typeof window !== 'undefined') {
          document.title = `Preview - ${project.name || 'Untitled Project'}`;
        }
        
        // Set project data state
        setProjectData(project);
        
        // Find the page to display based on the URL
        const pageKey = mapPathToPageKey(slug, project.pages);
        console.log('Preview: Mapped URL slug to page key:', { 
          slug: slugString, 
          pageKey,
          availablePages: project.pages.map(p => p.key)
        });
        
        if (!pageKey) {
          // Check if we're using fallback data
          const isUsingFallback = !project || project.name === 'fallback-project';
          
          if (isUsingFallback) {
            setError(`Page not found: /${slug.join('/')}. 
            
It looks like no project data has been saved yet. This happens when:
- Auto-save is disabled in the page manager
- You haven't manually saved your project
- The page was created but not yet saved

To fix this:
1. Go to the editor and enable auto-save in the page manager settings
2. Or manually save your project using the "Save Project" button
3. Then return to preview your page

Available pages in fallback: ${project.pages.map(p => p.key).join(', ')}`);
          } else {
            setError(`Page not found: /${slug.join('/')}. Available pages: ${project.pages.map(p => p.key).join(', ')}`);
          }
          setIsInitialized(true);
          return;
        }
        
        const page = project.pages.find(p => p.key === pageKey);
        console.log('Preview: Loading page:', page?.title || pageKey, {
          hasData: !!(page?.serializedData && page.serializedData.trim().length > 0)
        });
        
        setCurrentPage(page);
        setError(null); // Clear any previous errors
        setIsInitialized(true); // Mark as initialized
      } catch (error) {
        console.error('Preview: Error loading project data:', error);
        setError(`Error loading project: ${error.message}`);
        setIsInitialized(true);
      }
    };
    
    // Execute with a small delay to ensure localStorage is ready
    setTimeout(loadProjectData, 100);
    
  }, [slugString, getProjectData]); // Use slugString instead of slug array to prevent infinite loops
  
  if (error) {
    const [showDiagnostics, setShowDiagnostics] = useState(false);
    const [diagnosticInfo, setDiagnosticInfo] = useState(null);
    
    // Function to gather diagnostic information
    const runDiagnostics = () => {
      const diagnostics = {
        projects: {},
        localStorage: {
          size: 0,
          keyCount: 0,
          projectKeys: []
        },
        activeProject: localStorage.getItem('glow_active_project') || 'none'
      };
      
      // Get localStorage stats
      try {
        diagnostics.localStorage.size = JSON.stringify(localStorage).length;
        diagnostics.localStorage.keyCount = localStorage.length;
        
        // Find project keys
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('glowproject_')) {
            diagnostics.localStorage.projectKeys.push(key);
            
            // Check if project can be decompressed
            try {
              const compressed = localStorage.getItem(key);
              const projectName = key.replace('glowproject_', '').replace('_autosave', '');
              diagnostics.projects[projectName] = {
                key,
                compressedSize: compressed.length,
                valid: false,
                type: key.includes('_autosave') ? 'autosave' : 'manual',
                error: null
              };
              
              // Try to decompress
              const { decompressData } = useSaveOperations();
              const decompressed = decompressData(compressed);
              const projectData = JSON.parse(decompressed);
              
              // Verify project structure
              if (projectData && projectData.pages && Array.isArray(projectData.pages)) {
                diagnostics.projects[projectName].valid = true;
                diagnostics.projects[projectName].pageCount = projectData.pages.length;
                diagnostics.projects[projectName].currentPage = projectData.currentPage;
                diagnostics.projects[projectName].timestamp = projectData.timestamp;
                diagnostics.projects[projectName].pageKeys = projectData.pages.map(p => p.key);
              } else {
                diagnostics.projects[projectName].error = 'Invalid project structure';
              }
            } catch (e) {
              if (!diagnostics.projects[projectName]) {
                diagnostics.projects[projectName] = {
                  key,
                  type: key.includes('_autosave') ? 'autosave' : 'manual',
                  valid: false,
                  error: e.message
                };
              } else {
                diagnostics.projects[projectName].error = e.message;
              }
            }
          }
        });
      } catch (e) {
        diagnostics.error = e.message;
      }
      
      setDiagnosticInfo(diagnostics);
      setShowDiagnostics(true);
    };
    
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-2xl p-8">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Page Not Found</h1>
          <p className="text-gray-600 mb-4 whitespace-pre-line">{error}</p>
          
          <div className="space-x-2 mb-6">
            <button 
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Editor
            </button>
            <button 
              onClick={() => window.location.href = '/Preview'}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Preview Home
            </button>
          </div>
          
          {/* Diagnostic Tools */}
          {!showDiagnostics ? (
            <button 
              onClick={runDiagnostics}
              className="text-sm text-gray-500 underline hover:text-gray-700"
            >
              Run Diagnostics
            </button>
          ) : diagnosticInfo && (
            <div className="mt-4 text-left bg-gray-100 p-4 rounded-md">
              <h3 className="font-bold mb-2">Diagnostic Information:</h3>
              <div className="text-xs overflow-auto max-h-60">
                <p><strong>Active Project:</strong> {diagnosticInfo.activeProject}</p>
                <p><strong>LocalStorage:</strong> {diagnosticInfo.localStorage.keyCount} keys, 
                  {Math.round(diagnosticInfo.localStorage.size / 1024)} KB used
                </p>
                
                <h4 className="font-bold mt-2 mb-1">Projects:</h4>
                {Object.keys(diagnosticInfo.projects).length === 0 ? (
                  <p className="text-red-600">No projects found in localStorage!</p>
                ) : (
                  Object.entries(diagnosticInfo.projects).map(([name, info]) => (
                    <div key={name} className="mb-2 border-b border-gray-200 pb-2">
                      <p>
                        <strong>{name}</strong> ({info.type}) - 
                        {info.valid ? (
                          <span className="text-green-600">Valid ✓</span>
                        ) : (
                          <span className="text-red-600">Invalid ✗</span>
                        )}
                      </p>
                      {info.valid ? (
                        <div>
                          <p>Pages: {info.pageCount} ({info.pageKeys?.join(', ')})</p>
                          <p>Current Page: {info.currentPage}</p>
                          <p>Last Saved: {new Date(info.timestamp).toLocaleString()}</p>
                        </div>
                      ) : (
                        <p className="text-red-500">Error: {info.error}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
              <button 
                onClick={() => setShowDiagnostics(false)}
                className="text-sm text-gray-500 underline hover:text-gray-700 mt-2"
              >
                Hide Diagnostics
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  if (!projectData || !currentPage) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <Editor enabled={false} resolver={{
      Box, FlexBox, GridBox, Text, Image, Button, TextArea, Link, FormInputDropArea,
      Paragraph, Video, ShopFlexBox, ShopText, ShopImage, FormInput, Form, Carousel
    }}> 
      <EditorLayout pageKey={currentPage.key} pageData={currentPage} />
    </Editor>
  );
}
