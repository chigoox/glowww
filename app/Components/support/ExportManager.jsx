'use client';

import React, { useState, useEffect } from 'react';
import { Button, Modal, Input, message, Tooltip, Space, Typography } from 'antd';
import { 
  ExportOutlined, 
  DownloadOutlined,
  CodeOutlined,
  FolderOutlined
} from '@ant-design/icons';
import { useEditor } from '@craftjs/core';
import useSaveOperations from './useSaveOperations';

const { Text } = Typography;

/**
 * ExportManager - Server-Side Complete Project Export System
 * Uses the /api/export route for actual file copying and project generation
 * Creates a 1:1 copy of the entire project structure with data folder approach
 */
const ExportManager = () => {
  const { query } = useEditor();
  const { getProjectData } = useSaveOperations();
  
  // State management
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [projectName, setProjectName] = useState('my-exported-project');
  const [isExporting, setIsExporting] = useState(false);
  const [currentProjectPages, setCurrentProjectPages] = useState([]);

  // Listen for project page updates from PageManager
  useEffect(() => {
    const handlePageUpdate = (event) => {
      if (event.detail && event.detail.pages) {
        setCurrentProjectPages(event.detail.pages);
        setProjectName(event.detail.projectName || 'my-exported-project');
      }
    };

    window.addEventListener('projectPagesUpdate', handlePageUpdate);
    
    return () => {
      window.removeEventListener('projectPagesUpdate', handlePageUpdate);
    };
  }, []);

  /**
   * Get current project data for export
   */
  const getCurrentProjectData = () => {
    try {
      const activeProjectName = localStorage.getItem('glow_active_project');
      const projectData = getProjectData(activeProjectName);
      
      if (!projectData) {
        throw new Error('No active project found to export');
      }

      return {
        name: projectData.name || projectName,
        pages: projectData.pages || [],
        currentPage: projectData.currentPage || 'home',
        autoSaveSettings: projectData.autoSaveSettings || { enabled: true, interval: 15 },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting project data:', error);
      throw error;
    }
  };

  /**
   * Get list of components used in the current project
   */
  const getUsedComponents = () => {
    try {
      const serializedData = query.serialize();
      const usedComponents = new Set();
      
      // Always include essential components
      usedComponents.add('Root');
      usedComponents.add('Element');
      
      // Extract components from serialized data
      Object.values(serializedData).forEach(node => {
        if (node.type && node.type.resolvedName) {
          usedComponents.add(node.type.resolvedName);
        }
      });
      
      return Array.from(usedComponents);
    } catch (error) {
      console.warn('Error extracting components, using defaults:', error);
      return ['Root', 'Element', 'Text', 'Button', 'Box', 'FlexBox'];
    }
  };

  /**
   * Call the export API to generate and download the project
   */
  const callExportAPI = async () => {
    try {
      setIsExporting(true);
      
      // Prepare export data
      const projectData = getCurrentProjectData();
      const componentList = getUsedComponents();
      
      console.log('📦 Starting export via API...', {
        projectName,
        pagesCount: projectData.pages.length,
        componentsCount: componentList.length
      });
      
      // Call the export API
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectName: projectName.trim(),
          projectData,
          componentList,
          exportType: 'complete'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Export failed');
      }
      
      // Get the ZIP blob
      const zipBlob = await response.blob();
      
      // Create download link
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}-complete-export.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      message.success('Project exported successfully! 🎉');
      setExportModalVisible(false);
      
    } catch (error) {
      console.error('Export error:', error);
      message.error(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Handle the export process
   */
  const handleExport = async () => {
    if (!projectName.trim()) {
      message.error('Please enter a project name');
      return;
    }
    
    await callExportAPI();
  };

  return (
    <>
      <Tooltip title="Export Complete Project">
        <Button
          icon={<ExportOutlined />}
          size="small"
          type="text"
          onClick={() => setExportModalVisible(true)}
          className="hover:bg-purple-50 hover:text-purple-600 transition-colors"
        />
      </Tooltip>

      <Modal
        title={
          <Space>
            <CodeOutlined />
            <span>Export Complete Project</span>
          </Space>
        }
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => setExportModalVisible(false)}
          >
            Cancel
          </Button>,
          <Button 
            key="export" 
            type="primary" 
            loading={isExporting}
            onClick={handleExport}
            icon={<DownloadOutlined />}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isExporting ? 'Exporting...' : 'Export Complete Project'}
          </Button>
        ]}
        width={700}
        destroyOnClose
      >
        <div style={{ marginBottom: '24px' }}>
          <Typography.Paragraph>
            Export your complete project as a standalone application. This creates a 1:1 copy of your project 
            with a data folder containing your saved project, and a clean [[...slug]] page based on the Preview template (without the header section).
          </Typography.Paragraph>
        </div>

        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>Project Name</Text>
            <Input
              placeholder="my-exported-project"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              style={{ marginTop: '8px' }}
              prefix={<FolderOutlined />}
            />
          </div>

          <div>
            <Text strong>Project Pages</Text>
            <div style={{ marginTop: '8px', maxHeight: '150px', overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: '6px', padding: '8px' }}>
              {currentProjectPages.length > 0 ? (
                currentProjectPages.map(page => (
                  <div key={page.key} style={{ marginBottom: '4px', fontSize: '12px' }}>
                    <Text>{page.title}</Text> 
                    <Text type="secondary" style={{ marginLeft: '8px' }}>
                      {page.folderPath ? `/${page.folderPath}` : '/'}
                    </Text>
                  </div>
                ))
              ) : (
                <Text type="secondary">No pages available. Current page will be exported as home.</Text>
              )}
            </div>
          </div>

          <div style={{ 
            background: '#f8f9fa', 
            padding: '16px', 
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <Space direction="vertical" size="small">
              <Text strong>📦 Export will include:</Text>
              <Text>• Complete project structure (1:1 copy via server-side file operations)</Text>
              <Text>• All Components and public assets (actual file copying)</Text>
              <Text>• Data folder with your saved project (replaces localStorage)</Text>
              <Text>• Clean [[...slug]] page based on Preview template</Text>
              <Text>• Production-ready Next.js configuration</Text>
              <Text strong style={{ color: '#dc3545' }}>✗ Excludes: Editor folder, Preview folder, git files</Text>
            </Space>
          </div>

          <div style={{ 
            background: '#e8f4fd', 
            padding: '12px', 
            borderRadius: '6px',
            border: '1px solid #91caff'
          }}>
            <Space direction="vertical" size="small">
              <Text strong style={{ color: '#1677ff' }}>ℹ️ Server-Side Export:</Text>
              <Text style={{ color: '#1677ff' }}>This export uses server-side file operations to copy your entire <code>Components/</code> and <code>public/</code> folders from the original project to the exported project for a complete working copy.</Text>
            </Space>
          </div>
        </Space>
      </Modal>
    </>
  );
};

export default ExportManager;
