'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Editor, Element, Frame } from "@craftjs/core";

// Import all user components for rendering
import { Box } from '../../Components/user/Box';
import { FlexBox } from '../../Components/user/FlexBox';
import { Text } from '../../Components/user/Text';
import { GridBox } from '../../Components/user/GridBox';
import { Image } from '../../Components/user/Image';
import { Button } from '../../Components/user/Button';
import { Link } from '../../Components/user/Link';
import { Paragraph } from '../../Components/user/Paragraph';
import { Video } from '../../Components/user/Video';
import { ShopFlexBox, ShopImage, ShopText } from '../../Components/user/Advanced/ShopFlexBox';
import { FormInput } from '../../Components/user/Input';
import { Form, FormInputDropArea } from '../../Components/user/Advanced/Form';
import { Carousel } from '../../Components/user/Carousel';
import { NavBar, NavItem } from '../../Components/user/Nav/NavBar';
import { Root } from '../../Components/core/Root';

// Import save operations hook to load auto-saved projects
import useSaveOperations from '../../Components/utils/export/useSaveOperations';

// Import context providers needed for preview
import { MultiSelectProvider } from '../../Components/utils/context/MultiSelectContext';
import { PagesProvider } from '../../Components/utils/context/PagesContext';

/**
 * Preview Page Component
 * 
 * Routes:
 * - /Preview -> Home page
 * - /Preview/test -> test page
 * - /Preview/test/test-content -> test content page
 * - /Preview/go-page -> go page
 * 
 * Features:
 * - Auto-loads last auto-saved project
 * - Maps URL paths to page hierarchy
 * - No top bar (clean preview)
 * - Read-only editor mode for preview
 */
export default function PreviewPage() {
  const params = useParams();
  const [projectData, setProjectData] = useState(null);
  const [currentPage, setCurrentPage] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use the shared save operations hook to access auto-saved data
  const { getProjectData } = useSaveOperations();
  
  // Extract and process slug from params
  const slug = useMemo(() => {
    return params?.slug || [];
  }, [params?.slug]);
  
  const slugPath = useMemo(() => {
    return slug.join('/');
  }, [slug]);

  /**
   * Load the most recent auto-saved project
   */
  const loadAutoSavedProject = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get the active project name from localStorage
      const activeProjectName = localStorage.getItem('glow_active_project') || 'my-project-' + Math.floor(Math.random() * 9000 + 1000);
      console.log('Preview: Loading auto-saved project:', activeProjectName);
      
      // Load project data
      const project = getProjectData(activeProjectName);
      
      if (!project) {
        // Try to find any auto-saved project if the active one doesn't exist
        const allAutoSaved = Object.keys(localStorage)
          .filter(key => key.startsWith('glowproject_') && key.endsWith('_autosave'))
          .map(key => key.replace('glowproject_', '').replace('_autosave', ''));
        
        if (allAutoSaved.length > 0) {
          console.log('Preview: Trying fallback project:', allAutoSaved[0]);
          const fallbackProject = getProjectData(allAutoSaved[0]);
          if (fallbackProject) {
            setProjectData(fallbackProject);
            return fallbackProject;
          }
        }
        
        throw new Error('No auto-saved projects found. Please create and save a project first.');
      }
      
      console.log('Preview: Project loaded successfully:', {
        name: project.name,
        pages: project.pages?.length || 0,
        currentPage: project.currentPage
      });
      
      setProjectData(project);
      return project;
    } catch (error) {
      console.error('Preview: Error loading project:', error);
      setError(error.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Find the correct page based on the URL path
   * Maps URL segments to page hierarchy
   */
  const findPageByPath = (project, urlPath) => {
    if (!project?.pages || !Array.isArray(project.pages)) {
      return null;
    }
    
    // Root route (/Preview) should show home page
    if (!urlPath || urlPath === '') {
      return project.pages.find(page => page.isHome || page.key === 'home');
    }
    
    // Split the path into segments
    const pathSegments = urlPath.split('/').filter(segment => segment.length > 0);
    console.log('Preview: Looking for page with path segments:', pathSegments);
    
    // Build page hierarchy map for quick lookup
    const pageMap = {};
    const pagesByKey = {};
    
    project.pages.forEach(page => {
      pagesByKey[page.key] = page;
      
      // Map different possible path formats
      if (page.path) {
        pageMap[page.path.replace(/^\/+/, '')] = page;
      }
      if (page.key !== 'home') {
        pageMap[page.key] = page;
      }
      if (page.folderPath) {
        pageMap[page.folderPath] = page;
      }
    });
    
    // Try exact path match first
    const exactMatch = pageMap[urlPath];
    if (exactMatch) {
      console.log('Preview: Found exact path match:', exactMatch.title);
      return exactMatch;
    }
    
    // Try to match by reconstructing path from hierarchy
    for (const page of project.pages) {
      if (page.isHome) continue;
      
      const pagePath = buildPagePath(page, pagesByKey);
      if (pagePath === urlPath) {
        console.log('Preview: Found hierarchical match:', page.title, 'path:', pagePath);
        return page;
      }
    }
    
    // Try fuzzy matching - look for page key at the end of the path
    const lastSegment = pathSegments[pathSegments.length - 1];
    const fuzzyMatch = project.pages.find(page => 
      page.key === lastSegment || 
      page.title.toLowerCase().replace(/[^a-z0-9]/g, '-') === lastSegment
    );
    
    if (fuzzyMatch) {
      console.log('Preview: Found fuzzy match:', fuzzyMatch.title);
      return fuzzyMatch;
    }
    
    console.log('Preview: No page found for path:', urlPath);
    return null;
  };

  /**
   * Build the full path for a page based on its hierarchy
   */
  const buildPagePath = (page, pagesByKey) => {
    if (page.isHome || page.key === 'home') {
      return '';
    }
    
    const pathSegments = [];
    let currentPage = page;
    
    // Walk up the hierarchy to build the full path
    while (currentPage && !currentPage.isHome) {
      pathSegments.unshift(currentPage.key);
      currentPage = currentPage.parentKey ? pagesByKey[currentPage.parentKey] : null;
    }
    
    return pathSegments.join('/');
  };

  /**
   * Create fallback project structure if none exists
   */
  const createFallbackProject = () => {
    return {
      name: 'preview-fallback',
      pages: [
        {
          key: 'home',
          title: 'Home',
          path: '/',
          folderPath: '',
          parentKey: null,
          isHome: true,
          serializedData: JSON.stringify({
            "ROOT": {
              "type": { "resolvedName": "Element" },
              "isCanvas": true,
              "props": {},
              "displayName": "Element",
              "custom": {},
              "hidden": false,
              "nodes": ["node_1"],
              "linkedNodes": {}
            },
            "node_1": {
              "type": { "resolvedName": "Text" },
              "isCanvas": false,
              "props": {
                "text": "Welcome to Preview Mode",
                "fontSize": "24",
                "fontWeight": "600",
                "color": "#1f2937",
                "textAlign": "center",
                "margin": ["20", "20", "20", "20"]
              },
              "displayName": "Text",
              "custom": {},
              "parent": "ROOT",
              "hidden": false,
              "nodes": [],
              "linkedNodes": {}
            }
          }),
          children: []
        }
      ],
      currentPage: 'home',
      autoSaveSettings: { enabled: true, interval: 15 },
      timestamp: new Date().toISOString()
    };
  };

  // Load project and find current page when component mounts or slug changes
  useEffect(() => {
    const initializePreview = async () => {
      console.log('Preview: Initializing with slug:', slugPath);
      
      let project = await loadAutoSavedProject();
      
      // Create fallback if no project exists
      if (!project) {
        project = createFallbackProject();
        setProjectData(project);
      }
      
      // Find the page that matches the current URL
      const targetPage = findPageByPath(project, slugPath);
      
      if (targetPage) {
        console.log('Preview: Setting current page to:', targetPage.title);
        setCurrentPage(targetPage);
      } else {
        // If page not found, show available pages in error
        const availablePages = project.pages.map(p => `${p.title} (${buildPagePath(p, project.pages.reduce((acc, page) => ({ ...acc, [page.key]: page }), {})) || '/'})`).join(', ');
        setError(`Page not found for path: /${slugPath}\n\nAvailable pages: ${availablePages}`);
      }
    };
    
    initializePreview();
  }, [slugPath]); // Depend on slugPath to reload when route changes

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading Preview...</h2>
          <p className="text-gray-500 mt-2">Loading auto-saved project data</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.963-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Preview Error</h2>
            <p className="text-gray-600 mb-4 whitespace-pre-line">{error}</p>
            <div className="space-y-2">
              <button 
                onClick={() => window.location.reload()} 
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Reload Page
              </button>
              <a 
                href="/" 
                className="block w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors text-center"
              >
                Back to Editor
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No current page selected
  if (!currentPage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700">No Page Selected</h2>
          <p className="text-gray-500 mt-2">Unable to determine which page to show</p>
        </div>
      </div>
    );
  }

  // No serialized data for the page
  if (!currentPage.serializedData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{currentPage.title}</h2>
          <p className="text-gray-600 mb-4">This page doesn't have any content yet.</p>
          <a 
            href="/" 
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Edit in Builder
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Page Title Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{currentPage.title}</h1>
            <p className="text-sm text-gray-500">Preview Mode • /{slugPath || ''}</p>
          </div>
          <a 
            href="/" 
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
          >
            Edit Page
          </a>
        </div>
      </div>

      {/* Page Content */}
      <div className="w-full overflow-auto">
        <div className="w-full max-w-none">
          <PagesProvider>
            <Editor
              resolver={{
                Box,
                FlexBox,
                Text,
                GridBox,
                Image,
                Button,
                Link,
                Paragraph,
                Video,
                ShopFlexBox,
                ShopImage,
                ShopText,
                FormInput,
                Form,
                FormInputDropArea,
                Carousel,
                NavBar,
                NavItem,
                Root,
                Element
              }}
              enabled={false} // Disable editing in preview mode
            >
              <MultiSelectProvider>
                <Frame data={currentPage.serializedData} className="w-full">
                  <Element 
                    is={Root} 
                    padding={0} 
                    background="#ffffff" 
                    canvas
                    className="w-full border-2"
                    style={{ 
                      maxWidth: '100%',
                      minWidth: '100%',
                      overflow: 'hidden'
                    }}
                  />
                </Frame>
              </MultiSelectProvider>
            </Editor>
          </PagesProvider>
        </div>
      </div>
    </div>
  );
}
