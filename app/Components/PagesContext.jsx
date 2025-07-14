'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRandomName } from './support/useRandomName';

/**
 * Context for sharing pages/routes data across components
 * Used primarily for navigation components like Link
 */
const PagesContext = createContext({
  pages: [],
  currentPageKey: 'home',
  isPreviewMode: true,
  projectName: ''
});

/**
 * Provider component for Pages Context
 * Listens for page updates from PageManager
 */
export const PagesProvider = ({ children }) => {
  const { generateName } = useRandomName();
  
  const [pages, setPages] = useState([
    {
      key: 'home',
      title: 'Home',
      path: '/',
      folderPath: '',
      parentKey: null,
      isHome: true
    }
  ]);
  const [currentPageKey, setCurrentPageKey] = useState('home');
  const [projectName, setProjectName] = useState('');
  
  // Generate initial project name
  useEffect(() => {
    const initializeProjectName = async () => {
      if (!projectName) {
        try {
          const randomName = await generateName();
          setProjectName(randomName);
        } catch (error) {
          console.error('Failed to generate project name:', error);
          setProjectName('my-project-' + Math.floor(Math.random() * 9000 + 1000));
        }
      }
    };
    
    initializeProjectName();
  }, [generateName, projectName]);
  
  // Determine if we're in preview mode
  // In production, this would be false
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Listen for page updates from PageManager
  useEffect(() => {
    const handlePagesUpdate = (event) => {
      const { pages, projectName, currentPage } = event.detail;
      
      if (pages && Array.isArray(pages)) {
        setPages(pages);
      }
      
      if (projectName) {
        setProjectName(projectName);
      }
      
      if (currentPage) {
        setCurrentPageKey(currentPage);
      }
    };
    
    // Add event listener for page updates
    window.addEventListener('projectPagesUpdate', handlePagesUpdate);
    
    return () => {
      window.removeEventListener('projectPagesUpdate', handlePagesUpdate);
    };
  }, []);
  
  return (
    <PagesContext.Provider 
      value={{ 
        pages, 
        currentPageKey, 
        isPreviewMode, 
        projectName 
      }}
    >
      {children}
    </PagesContext.Provider>
  );
};

/**
 * Hook for consuming the Pages Context
 */
export const usePages = () => useContext(PagesContext);

export default PagesContext;