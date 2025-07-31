'use client';

import React, { useState, useEffect } from 'react';
import { Select, Button, Modal, Input, message } from 'antd';
import { PlusOutlined, FolderOutlined } from '@ant-design/icons';
import { useAuth } from '../../../contexts/AuthContext';
import { getSitePages, createPage } from '../../../lib/sites';

const { Option } = Select;

/**
 * SitePageSelector - A simple page selector for the site editor
 * This component DOES NOT interfere with CraftJS editor state
 * It only manages page metadata and lets the parent handle content loading
 */
const SitePageSelector = ({ siteId, currentPageId, onPageChange }) => {
  const { user } = useAuth();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newPageModalVisible, setNewPageModalVisible] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [creating, setCreating] = useState(false);

  // Load pages from Firebase
  const loadPages = async () => {
    if (!user?.uid || !siteId) return;
    
    try {
      setLoading(true);
      const firebasePages = await getSitePages(user.uid, siteId);
      setPages(firebasePages || []);
    } catch (error) {
      console.error('Error loading pages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, [user?.uid, siteId]);

  // Create new page (metadata only)
  const handleCreatePage = async () => {
    if (!newPageName.trim()) {
      message.error('Please enter a page name');
      return;
    }
    
    setCreating(true);
    
    try {
      const pageSlug = newPageName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      // Check if page with same slug already exists
      if (pages.find(p => p.slug === pageSlug)) {
        message.error('A page with this URL already exists');
        return;
      }
      
      const defaultContent = {
        "ROOT": {
          "type": { "resolvedName": "Root" },
          "nodes": [],
          "props": { "canvas": true },
          "custom": {},
          "parent": null,
          "displayName": "Root",
          "isCanvas": true
        }
      };

      const newPage = await createPage(user.uid, siteId, {
        name: newPageName,
        slug: pageSlug,
        isHome: false,
        content: defaultContent,
        seoTitle: newPageName,
        seoDescription: `${newPageName} page`,
        path: `/${pageSlug}`
      });

      // Reload pages to include the new page
      await loadPages();
      
      // Clear the parent's page cache to ensure fresh loading
      if (window.refreshPageCache) {
        window.refreshPageCache();
      }
      
      message.success(`Page "${newPageName}" created successfully`);
      setNewPageModalVisible(false);
      setNewPageName('');
      
      // Notify parent about the new page
      if (onPageChange) {
        onPageChange(newPage.id);
      }
      
    } catch (error) {
      console.error('Error creating page:', error);
      message.error('Failed to create page: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-xs font-medium text-gray-700">Page:</span>
      
      <Select
        value={currentPageId}
        onChange={onPageChange}
        loading={loading}
        style={{ minWidth: 120 }}
        size="small"
        placeholder="Select page"
      >
        {pages.map(page => (
          <Option key={page.id} value={page.id}>
            {page.isHome ? '🏠 ' : '📄 '}{page.name}
          </Option>
        ))}
      </Select>
      
      <Button
        type="text"
        size="small"
        icon={<PlusOutlined />}
        onClick={() => setNewPageModalVisible(true)}
        title="Add new page"
      />

      {/* New Page Modal */}
      <Modal
        title="Create New Page"
        open={newPageModalVisible}
        onOk={handleCreatePage}
        onCancel={() => {
          setNewPageModalVisible(false);
          setNewPageName('');
        }}
        okText="Create Page"
        confirmLoading={creating}
        width={400}
      >
        <div>
          <label style={{ display: 'block', marginBottom: 8 }}>
            Page Name
          </label>
          <Input
            value={newPageName}
            onChange={(e) => setNewPageName(e.target.value)}
            placeholder="e.g., About, Contact, Services"
            onPressEnter={handleCreatePage}
          />
          
          {newPageName && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              URL: /{newPageName.toLowerCase().replace(/[^a-z0-9]/g, '-')}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default SitePageSelector;
