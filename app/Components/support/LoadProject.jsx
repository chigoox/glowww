'use client';

import React, { useState, useEffect } from 'react';
import { Button, Modal, Input, message, Tooltip, Divider } from 'antd';
import { 
  FolderOpenOutlined
} from '@ant-design/icons';
import { useEditor } from '@craftjs/core';
import useSaveOperations from './useSaveOperations';

const LoadProject = () => {
  const { actions, query } = useEditor();
  
  // Use the shared save operations hook
  const { 
    decompressData,
    getAutoSavedProjects,
    loadProject,
    deleteProject
  } = useSaveOperations();
  
  // State for modals
  const [loadModalVisible, setLoadModalVisible] = useState(false);
  // State for inputs
  const [loadData, setLoadData] = useState('');
  // State to trigger refresh of the projects list
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load functionality for projects using the direct PageManager function
  const handleLoadProject = () => {
    setLoadData('');
    setLoadModalVisible(true);
  };

  const loadProjectFromData = () => {
    try {
      if (!loadData.trim()) {
        message.error('Please paste the project data or upload a file');
        return;
      }
      
      // Use the hook to decompress and parse the data
      const projectData = loadProject(loadData.trim());
      
      if (!projectData) {
        message.error('Failed to load project data');
        return;
      }
      
      // Check if this is a project file or single page file
      if (projectData.pages && Array.isArray(projectData.pages)) {
        // This is a full project - use direct function call to PageManager
        console.log('Loading full project with direct function call');
        
        if (window.pageManagerLoad && typeof window.pageManagerLoad === 'function') {
          const success = window.pageManagerLoad(projectData);
          if (success) {
            message.success('Project loaded successfully! Use the Pages manager to navigate between pages.');
            setLoadModalVisible(false);
            setLoadData('');
          }
        } else {
          message.error('PageManager load function not available');
        }
      } else {
        // This is a single page (legacy format)
        actions.deserialize(JSON.stringify(projectData));
        message.success('Single page loaded successfully!');
        setLoadModalVisible(false);
        setLoadData('');
      }
    } catch (error) {
      console.error('Failed to load project:', error);
      message.error('Failed to load: ' + error.message);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLoadData(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  // Load auto-saved project directly
  const loadAutoSavedProject = (projectData) => {
    setLoadData(projectData.data);
    loadProjectFromData();
  };

  // Get auto-saved projects from the hook (only auto-saved now)
  const autoSavedProjects = getAutoSavedProjects();
  const allProjects = [...autoSavedProjects].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  // Handle deleting a project
  const handleDeleteProject = (project, e) => {
    e.stopPropagation();
    if (!project.key) {
      message.error('Cannot delete project: Missing key');
      return;
    }
    const success = deleteProject(project.key);
    if (success) {
      setRefreshTrigger(prev => prev + 1); // Force refresh
    }
  };

  return (
    <div className="flex items-center space-x-1">
      {/* Load Project Button */}
      <Tooltip title="Load auto-saved project">
        <Button
          icon={<FolderOpenOutlined />}
          size="small"
          type="text"
          onClick={handleLoadProject}
          className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
        />
      </Tooltip>
      {/* Load Modal */}
      <Modal
        title="Load Auto-Saved Project"
        open={loadModalVisible}
        onCancel={() => {
          setLoadModalVisible(false);
          setLoadData('');
        }}
        onOk={loadProjectFromData}
        okText="Load Project"
        width={700}
      >
        <div className="space-y-4">
          {/* Auto-saved projects */}
          {allProjects.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Auto-Saved Projects:</label>
              <div className="grid gap-2 max-h-32 overflow-y-auto">
                {allProjects.map((project, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setLoadData(project.data);
                    }}
                  >
                    <span className="font-medium text-sm">{project.name}</span>
                    <Button
                      size="small"
                      danger
                      onClick={(e) => handleDeleteProject(project, e)}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
              <Divider />
            </div>
          )}
          
          {/* File upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Upload Project File:</label>
            <input
              type="file"
              accept=".glowproj,.glow,.txt"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          
          {/* Manual paste */}
          <div>
            <label className="block text-sm font-medium mb-2">Or Paste Project Data:</label>
            <Input.TextArea
              value={loadData}
              onChange={(e) => setLoadData(e.target.value)}
              rows={6}
              placeholder="Paste your saved project data here..."
            />
            <p className="text-xs text-gray-500 mt-2">
              Supports both project files (.glowproj) and legacy single page saves (.glow). Note: Projects are now auto-saved automatically.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LoadProject;
