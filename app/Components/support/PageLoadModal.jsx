'use client';

import React, { useState } from 'react';
import { Modal, Button, Upload, Input, message, Alert, Tabs, Space, Typography } from 'antd';
import { UploadOutlined, FileTextOutlined, CopyOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Text } = Typography;

const PageLoadModal = ({ visible, onCancel, onLoad, mode = 'load' }) => {
  const [activeTab, setActiveTab] = useState('paste');
  const [pasteData, setPasteData] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasteLoad = async () => {
    if (!pasteData.trim()) {
      message.error('Please paste some page data');
      return;
    }

    setLoading(true);
    try {
      await onLoad(pasteData.trim());
      setPasteData('');
      onCancel();
    } catch (error) {
      console.error('Load error:', error);
      message.error('Failed to load page data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      setLoading(true);
      try {
        const fileContent = e.target.result;
        await onLoad(fileContent);
        onCancel();
        message.success('Page loaded successfully from file!');
      } catch (error) {
        console.error('File load error:', error);
        message.error('Failed to load file: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      message.error('Failed to read file');
    };

    reader.readAsText(file);
    return false; // Prevent default upload behavior
  };

  const validateGlowFile = (file) => {
    const isGlow = file.name.toLowerCase().endsWith('.glow');
    if (!isGlow) {
      message.error('Please select a .glow file');
      return false;
    }
    
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('File must be smaller than 10MB');
      return false;
    }
    
    return true;
  };

  const tabItems = [
    {
      key: 'paste',
      label: (
        <span>
          <CopyOutlined />
          Paste Data
        </span>
      ),
      children: (
        <div>
          <Alert
            message="Paste Page Data"
            description="Paste compressed page data or serialized JSON content below. This can be from a .glow file or imported page data."
            type="info"
            style={{ marginBottom: 16 }}
          />
          
          <TextArea
            value={pasteData}
            onChange={(e) => setPasteData(e.target.value)}
            placeholder="Paste your page data here...&#10;&#10;This can be:&#10;• Compressed data from a .glow file&#10;• Raw JSON serialized content&#10;• Exported page data from another site"
            rows={8}
            style={{ marginBottom: 16 }}
          />
          
          <Space>
            <Button 
              type="primary" 
              onClick={handlePasteLoad}
              loading={loading}
              disabled={!pasteData.trim()}
            >
              Import Page Data
            </Button>
            <Button onClick={() => setPasteData('')}>
              Clear
            </Button>
          </Space>
        </div>
      )
    },
    {
      key: 'upload',
      label: (
        <span>
          <UploadOutlined />
          Upload File
        </span>
      ),
      children: (
        <div>
          <Alert
            message="Upload .glow File"
            description="Select a .glow file exported from another page. These files contain compressed page data that can be loaded into the current page."
            type="info"
            style={{ marginBottom: 16 }}
          />
          
          <Upload.Dragger
            beforeUpload={handleFileUpload}
            accept=".glow"
            showUploadList={false}
            disabled={loading}
            style={{ marginBottom: 16 }}
          >
            <p className="ant-upload-drag-icon">
              <FileTextOutlined />
            </p>
            <p className="ant-upload-text">
              Click or drag a .glow file here
            </p>
            <p className="ant-upload-hint">
              Only .glow files are supported. Maximum file size: 10MB
            </p>
          </Upload.Dragger>
          
          <Text type="secondary" style={{ fontSize: '12px' }}>
            💡 Tip: .glow files are compressed page exports that preserve all component data and styling.
          </Text>
        </div>
      )
    }
  ];

  return (
    <Modal
      title="Import Page Data"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
      centered
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />
      
      <Alert
        message="Important Notes"
        description={
          <div>
            <p>• Importing page data will replace the current page content</p>
            <p>• Make sure to save your current work before importing</p>
            <p>• Invalid data will be rejected and you'll be prompted to try again</p>
            <p>• If importing fails, you can create a blank page instead</p>
          </div>
        }
        type="warning"
        style={{ marginTop: 16 }}
      />
    </Modal>
  );
};

export default PageLoadModal;
