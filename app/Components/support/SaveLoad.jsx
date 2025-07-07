'use client';

import React, { useState } from 'react';
import { Button, Modal, Input, message, Tooltip } from 'antd';
import { 
  SaveOutlined, 
  FolderOpenOutlined, 
  CopyOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { useEditor } from '@craftjs/core';
import pako from 'pako';
import copy from 'copy-to-clipboard';

const SaveLoad = () => {
  const { actions, query } = useEditor();
  
  // State for modals
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [loadModalVisible, setLoadModalVisible] = useState(false);
  
  // State for inputs
  const [saveData, setSaveData] = useState('');
  const [loadData, setLoadData] = useState('');
  const [projectName, setProjectName] = useState('my-website');

  // Compression functions
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

  // Save functionality
  const handleSave = () => {
    try {
      const serialized = query.serialize();
      const compressed = compressData(serialized);
      setSaveData(compressed);
      setSaveModalVisible(true);
    } catch (error) {
      message.error('Failed to save: ' + error.message);
    }
  };

  const copyToClipboard = () => {
    copy(saveData);
    message.success('Saved state copied to clipboard!');
    setSaveModalVisible(false);
  };

  const downloadSaveFile = () => {
    const blob = new Blob([saveData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}-save.glow`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success('Save file downloaded!');
    setSaveModalVisible(false);
  };

  // Load functionality
  const handleLoad = () => {
    setLoadData('');
    setLoadModalVisible(true);
  };

  const loadFromData = () => {
    try {
      if (!loadData.trim()) {
        message.error('Please paste the save data');
        return;
      }
      
      const decompressed = decompressData(loadData.trim());
      actions.deserialize(decompressed);
      message.success('Project loaded successfully!');
      setLoadModalVisible(false);
      setLoadData('');
    } catch (error) {
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

  return (
    <div className="flex items-center space-x-1">
      {/* Save Button */}
      <Tooltip title="Save current project">
        <Button
          icon={<SaveOutlined />}
          size="small"
          type="text"
          onClick={handleSave}
          className="hover:bg-green-50 hover:text-green-600 transition-colors"
        />
      </Tooltip>

      {/* Load Button */}
      <Tooltip title="Load saved project">
        <Button
          icon={<FolderOpenOutlined />}
          size="small"
          type="text"
          onClick={handleLoad}
          className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
        />
      </Tooltip>

      {/* Save Modal */}
      <Modal
        title="Save Project"
        open={saveModalVisible}
        onCancel={() => setSaveModalVisible(false)}
        footer={[
          <Button key="copy" icon={<CopyOutlined />} onClick={copyToClipboard}>
            Copy to Clipboard
          </Button>,
          <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={downloadSaveFile}>
            Download File
          </Button>
        ]}
        width={600}
      >
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Project Name:</label>
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Enter project name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Save Data:</label>
          <Input.TextArea
            value={saveData}
            readOnly
            rows={6}
            placeholder="Your compressed save data will appear here..."
          />
          <p className="text-xs text-gray-500 mt-2">
            This compressed data contains your entire project. Save it to load your project later.
          </p>
        </div>
      </Modal>

      {/* Load Modal */}
      <Modal
        title="Load Project"
        open={loadModalVisible}
        onCancel={() => setLoadModalVisible(false)}
        onOk={loadFromData}
        okText="Load Project"
        width={600}
      >
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Upload Save File:</label>
          <input
            type="file"
            accept=".glow,.txt"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Or Paste Save Data:</label>
          <Input.TextArea
            value={loadData}
            onChange={(e) => setLoadData(e.target.value)}
            rows={6}
            placeholder="Paste your saved project data here..."
          />
          <p className="text-xs text-gray-500 mt-2">
            Paste the compressed data from a previous save or upload a .glow file.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default SaveLoad;
