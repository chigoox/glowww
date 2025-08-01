'use client';

import React, { useState } from 'react';
import { Modal, Button, Input, message, Alert, Space, Typography, Form, Radio } from 'antd';
import { DownloadOutlined, FileTextOutlined } from '@ant-design/icons';

const { Text } = Typography;

const PageExportModal = ({ visible, onCancel, onExport, pageName = 'page', pageData }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState('glow');

  const handleExport = async (values) => {
    setLoading(true);
    try {
      const fileName = values.fileName || pageName;
      await onExport(fileName, exportFormat);
      message.success(`Page exported as ${fileName}.${exportFormat}!`);
      onCancel();
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export page: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getFileSize = () => {
    if (!pageData) return 'Unknown';
    
    try {
      const dataSize = new Blob([pageData]).size;
      if (dataSize < 1024) return `${dataSize} bytes`;
      if (dataSize < 1024 * 1024) return `${(dataSize / 1024).toFixed(1)} KB`;
      return `${(dataSize / (1024 * 1024)).toFixed(1)} MB`;
    } catch {
      return 'Unknown';
    }
  };

  return (
    <Modal
      title="Export Page"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={500}
      centered
    >
      <Alert
        message="Export Current Page"
        description="Export the current page content to share or backup. The .glow format is compressed and optimized for re-importing."
        type="info"
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleExport}
        initialValues={{
          fileName: pageName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          format: 'glow'
        }}
      >
        <Form.Item
          name="fileName"
          label="File Name"
          rules={[
            { required: true, message: 'Please enter a file name' },
            { 
              pattern: /^[a-zA-Z0-9-_]+$/, 
              message: 'Only letters, numbers, hyphens, and underscores allowed' 
            }
          ]}
        >
          <Input 
            placeholder="my-page"
            suffix={`.${exportFormat}`}
          />
        </Form.Item>

        <Form.Item
          name="format"
          label="Export Format"
        >
          <Radio.Group 
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
          >
            <Space direction="vertical">
              <Radio value="glow">
                <Space>
                  <FileTextOutlined />
                  <div>
                    <Text strong>.glow</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Compressed format (recommended) - smaller file size, faster loading
                    </Text>
                  </div>
                </Space>
              </Radio>
              <Radio value="json">
                <Space>
                  <FileTextOutlined />
                  <div>
                    <Text strong>.json</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Raw JSON format - human readable, larger file size
                    </Text>
                  </div>
                </Space>
              </Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        <Alert
          message="File Information"
          description={
            <div>
              <p><Text strong>Current page:</Text> {pageName}</p>
              <p><Text strong>Estimated size:</Text> {getFileSize()}</p>
              <p><Text strong>Components:</Text> {pageData ? Object.keys(JSON.parse(pageData) || {}).length - 1 : 0} (excluding ROOT)</p>
            </div>
          }
          type="info"
          style={{ marginBottom: 16 }}
        />

        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="primary" 
            htmlType="submit"
            icon={<DownloadOutlined />}
            loading={loading}
          >
            Export Page
          </Button>
        </Space>
      </Form>

      <Alert
        message="Usage Tips"
        description={
          <div>
            <p>• .glow files can be loaded into any page using the Load function</p>
            <p>• Share .glow files with others to transfer page designs</p>
            <p>• Use .json format if you need to inspect or modify the data manually</p>
          </div>
        }
        type="info"
        style={{ marginTop: 16 }}
      />
    </Modal>
  );
};

export default PageExportModal;
