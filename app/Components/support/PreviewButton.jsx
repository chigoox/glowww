'use client';

import React from 'react';
import { Button, Tooltip } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import useSaveOperations from './useSaveOperations';

/**
 * Preview Button Component
 * 
 * Features:
 * - Opens current page in preview mode in new tab
 * - Generates correct preview URL based on page hierarchy
 * - Shows current page info in tooltip
 * - Integrates with page manager to get current page data
 */
const PreviewButton = () => {
  // Use the save operations hook to access project data reliably
  const { getProjectData } = useSaveOperations();
  
  /**
   * Get current page information from the page manager
   */
  const getCurrentPageInfo = () => {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        return null;
      }
      
      // Primary: Get current page data from window if available (set by PageManager)
      if (window.currentPageInfo) {
        return window.currentPageInfo;
      }
      
      // Secondary: Try to get from active project using the hook
      if (window.localStorage) {
        const activeProjectName = localStorage.getItem('glow_active_project');
        if (activeProjectName) {
          try {
            const projectData = getProjectData(activeProjectName);
          
            if (projectData) {
              // Find current page from project data
              const currentPageKey = projectData.currentPage || 'home';
              const currentPage = projectData.pages?.find(p => p.key === currentPageKey);
              
              if (currentPage) {
                return {
                  key: currentPage.key,
                  title: currentPage.title,
                  path: currentPage.path,
                  folderPath: currentPage.folderPath,
                  parentKey: currentPage.parentKey,
                  isHome: currentPage.isHome
                };
              }
            }
          } catch (error) {
            console.warn('PreviewButton: Error loading project data:', error);
          }
        }
      }
      
      // Fallback: Default to home page
      return { key: 'home', title: 'Home', path: '/', isHome: true };
    } catch (error) {
      console.warn('PreviewButton: Error getting current page info:', error);
      return { key: 'home', title: 'Home', path: '/', isHome: true };
    }
  };

  /**
   * Generate preview URL based on page hierarchy
   */
  const generatePreviewUrl = (pageInfo) => {
    const baseUrl = window.location.origin;
    
    // If it's home page, use root preview route
    if (pageInfo.key === 'home' || pageInfo.isHome || pageInfo.path === '/') {
      return `${baseUrl}/Preview`;
    }
    
    // For other pages, construct the path based on hierarchy
    let previewPath = '';
    
    // Try to use folderPath if available (most accurate for hierarchy)
    if (pageInfo.folderPath) {
      previewPath = pageInfo.folderPath;
    }
    // Fallback to using the key
    else if (pageInfo.key && pageInfo.key !== 'home') {
      previewPath = pageInfo.key;
    }
    // Fallback to path (remove leading slash)
    else if (pageInfo.path && pageInfo.path !== '/') {
      previewPath = pageInfo.path.replace(/^\/+/, '');
    }
    
    // Ensure we have a valid path
    if (!previewPath) {
      previewPath = pageInfo.key || 'home';
    }
    
    return `${baseUrl}/Preview/${previewPath}`;
  };

  /**
   * Handle preview button click
   */
  const handlePreviewClick = () => {
    const pageInfo = getCurrentPageInfo();
    const previewUrl = generatePreviewUrl(pageInfo);
    
    console.log('PreviewButton: Opening preview for page:', pageInfo.title, 'URL:', previewUrl);
    
    // Open preview in new tab
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
  };

  const currentPage = getCurrentPageInfo();

  return (
    <Tooltip 
      title={
        <div>
          <div className="font-medium">Preview Current Page</div>
          <div className="text-xs opacity-75 mt-1">
            {currentPage?.title || 'Current page'} • Opens in new tab
          </div>
        </div>
      }
    >
      <Button
        icon={<EyeOutlined />}
        size="small"
        type="text"
        onClick={handlePreviewClick}
        className="flex items-center space-x-1 hover:bg-green-50 hover:text-green-600 transition-colors"
      >
        <span className="text-xs hidden sm:inline ml-1">Preview</span>
      </Button>
    </Tooltip>
  );
};

export default PreviewButton;
