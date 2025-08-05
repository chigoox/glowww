import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import pako from 'pako';
import { useRandomName } from '../hooks/useRandomName';

/**
 * A shared hook for save and load operations across components
 * This centralizes all save/load logic to eliminate event-based communication
 */
const useSaveOperations = () => {
  const { generateName } = useRandomName();
  
  // Project state - initialize with random name
  const [projectName, setProjectName] = useState('');
  const [lastSaveTime, setLastSaveTime] = useState(null);
  
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
  
  // Compression utilities
  const compressData = useCallback((jsonString) => {
    try {
      const compressed = pako.deflate(jsonString);
      return btoa(String.fromCharCode.apply(null, compressed));
    } catch (error) {
      console.error('Compression error:', error);
      throw new Error('Failed to compress data');
    }
  }, []);

  const decompressData = useCallback((compressedString) => {
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
  }, []);

  // Auto-save project to localStorage
  const autoSaveProject = useCallback((projectData) => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('localStorage not available for auto-save');
      return false;
    }
    
    if (!projectData) {
      console.warn('No project data available for auto-save');
      return false;
    }

    console.log('Auto-saving project:', {
      name: projectData.name,
      pageCount: projectData.pages?.length || 0,
      currentPage: projectData.currentPage
    });

    const finalProjectData = {
      name: projectData.name,
      pages: projectData.pages,
      currentPage: projectData.currentPage,
      autoSaveSettings: projectData.autoSaveSettings,
      globalNavbarSettings: projectData.globalNavbarSettings,
      timestamp: new Date().toISOString(),
      autoSave: true
    };
    
    try {
      const compressed = compressData(JSON.stringify(finalProjectData));
      
      // Save to localStorage with auto-save suffix
      const storageKey = `glowproject_${finalProjectData.name}_autosave`;
      localStorage.setItem(storageKey, compressed);
      // Set as active project since this is now the only save method
      localStorage.setItem('glow_active_project', finalProjectData.name);
      
      console.log(`Project "${finalProjectData.name}" auto-saved to local storage!`);
      setLastSaveTime(new Date());
      return true;
    } catch (error) {
      console.error('Failed to auto-save project:', error);
      return false;
    }
  }, [compressData]);
  
  // Load project from localStorage or compressed data
  const loadProject = useCallback((projectNameOrData) => {
    try {
      // Check if we're in a browser environment for localStorage operations
      if (typeof window === 'undefined' || !window.localStorage) {
        // If no localStorage, try to decompress data directly
        if (projectNameOrData && typeof projectNameOrData === 'string') {
          const decompressed = decompressData(projectNameOrData);
          const projectData = JSON.parse(decompressed);
          setProjectName(projectData.name);
          return projectData;
        }
        console.warn('localStorage not available and no data provided');
        return null;
      }
      
      let decompressed;
      let projectData;
      
      if (projectNameOrData.startsWith('glowproject_')) {
        // Loading by storage key
        const storageKey = projectNameOrData;
        const compressed = localStorage.getItem(storageKey);
        if (!compressed) {
          throw new Error(`Project ${storageKey} not found in local storage`);
        }
        decompressed = decompressData(compressed);
        projectData = JSON.parse(decompressed);
      } else if (localStorage.getItem(`glowproject_${projectNameOrData}`)) {
        // Loading by project name
        const compressed = localStorage.getItem(`glowproject_${projectNameOrData}`);
        decompressed = decompressData(compressed);
        projectData = JSON.parse(decompressed);
      } else {
        // Try to decompress the provided data directly
        decompressed = decompressData(projectNameOrData);
        projectData = JSON.parse(decompressed);
      }
      
      console.log('Project loaded:', {
        name: projectData.name,
        pageCount: projectData.pages?.length || 0,
        currentPage: projectData.currentPage
      });
      
      // Update project name in state
      setProjectName(projectData.name);
      
      return projectData;
    } catch (error) {
      console.error('Failed to load project:', error);
      message.error('Failed to load project: ' + error.message);
      return null;
    }
  }, [decompressData]);
  
  // Get all saved projects from localStorage
  const getSavedProjects = useCallback(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    
    const savedKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('glowproject_') && !key.endsWith('_autosave')
    );
    
    return savedKeys.map(key => {
      const projectName = key.replace('glowproject_', '');
      try {
        const compressed = localStorage.getItem(key);
        const decompressed = decompressData(compressed);
        const projectData = JSON.parse(decompressed);
        return {
          name: projectName,
          timestamp: projectData.timestamp,
          data: compressed,
          type: 'saved'
        };
      } catch (error) {
        console.error('Error loading saved project:', error);
        return null;
      }
    }).filter(Boolean);
  }, [decompressData]);
  
  // Get all auto-saved projects from localStorage
  const getAutoSavedProjects = useCallback(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    
    const autoSavedKeys = Object.keys(localStorage).filter(key => 
      key.endsWith('_autosave')
    );
    
    return autoSavedKeys.map(key => {
      const projectName = key.replace('_autosave', '');
      try {
        const compressed = localStorage.getItem(key);
        const decompressed = decompressData(compressed);
        const projectData = JSON.parse(decompressed);
        return {
          name: projectName,
          timestamp: projectData.timestamp,
          data: compressed,
          type: 'auto-saved',
          key: key // Add the key for deletion
        };
      } catch (error) {
        console.error('Error loading auto-saved project:', error);
        return null;
      }
    }).filter(Boolean);
  }, [decompressData]);
  
  // Delete a project from localStorage
  const deleteProject = useCallback((projectKey) => {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || !window.localStorage) {
        console.warn('localStorage not available');
        return false;
      }
      
      if (!projectKey) {
        console.warn('No project key provided for deletion');
        return false;
      }
      
      // Check if project exists
      if (!localStorage.getItem(projectKey)) {
        console.warn(`Project with key ${projectKey} does not exist`);
        return false;
      }
      
      // Remove from localStorage
      localStorage.removeItem(projectKey);
      message.success('Project deleted successfully!');
      return true;
    } catch (error) {
      console.error('Failed to delete project:', error);
      message.error('Failed to delete project: ' + error.message);
      return false;
    }
  }, []);
  
  // Get current project data from localStorage (auto-save only)
  const getProjectData = useCallback((projectNameToGet = null) => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('localStorage not available');
      return null;
    }
    
    const nameToUse = projectNameToGet || projectName;
    
    try {
      // Only look for auto-save version now
      const autoSaveKey = `glowproject_${nameToUse}_autosave`;
      const compressed = localStorage.getItem(autoSaveKey);
      
      if (!compressed) {
        // If no project found with this name, try to find the active project
        if (!projectNameToGet) {
          const activeProjectName = localStorage.getItem('glow_active_project');
          if (activeProjectName && activeProjectName !== nameToUse) {
            console.log('No project found with name, trying active project:', activeProjectName);
            return getProjectData(activeProjectName);
          }
        }
        console.warn(`No auto-saved project data found for "${nameToUse}"`);
        return null;
      }
      
      console.log(`Found project "${nameToUse}" from auto-save storage`);
      const decompressed = decompressData(compressed);
      const projectData = JSON.parse(decompressed);
      
      // Validate project structure
      if (!projectData || !projectData.pages || !Array.isArray(projectData.pages)) {
        console.error('Invalid project structure:', projectData);
        return null;
      }
      
      return projectData;
    } catch (error) {
      console.error('Failed to get project data:', error);
      return null;
    }
  }, [projectName, decompressData]);



  return {
    projectName,
    setProjectName,
    lastSaveTime,
    setLastSaveTime,
    compressData,
    decompressData,
    autoSaveProject,
    loadProject,
    getAutoSavedProjects,
    getProjectData,
    deleteProject
  };
};

export default useSaveOperations;