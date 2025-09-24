/**
 * Template Save Modal Component
 * Handles saving current page as a marketplace template
 */

'use client';

import React, { useState } from 'react';
import {
  Modal, Form, Input, Select, Switch, InputNumber, Upload, Button,
  message, Space, Typography, Alert, Tag, Divider
} from 'antd';
import { 
  PlusOutlined, UploadOutlined, ShopOutlined, 
  EyeOutlined, TagsOutlined 
} from '@ant-design/icons';
import { useAuth } from '../../../contexts/AuthContext';
import { useEditor } from '@craftjs/core';

const { TextArea } = Input;
const { Text, Title } = Typography;
const { Option } = Select;

const TemplateSaveModal = ({ visible, onCancel, pageData }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [customTags, setCustomTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  
  const { user } = useAuth();
  const { query } = useEditor();

  // Analyze page data for AI metadata
  const analyzePageForAI = (jsonData) => {
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      
      const componentTypes = [];
      const extractComponents = (node) => {
        if (node.type && !componentTypes.includes(node.type.resolvedName)) {
          componentTypes.push(node.type.resolvedName);
        }
        if (node.nodes) {
          node.nodes.forEach(nodeId => {
            if (data[nodeId]) {
              extractComponents(data[nodeId]);
            }
          });
        }
      };
      
      if (data.ROOT) {
        extractComponents(data.ROOT);
      }
      
      // Detect layout style
      const hasGrid = componentTypes.some(type => type?.includes('Grid'));
      const hasFlex = componentTypes.some(type => type?.includes('Flex'));
      const layoutStyle = hasGrid ? 'grid' : hasFlex ? 'flexbox' : 'basic';
      
      // Detect color scheme (simplified analysis)
      let colorScheme = 'mixed';
      const hasText = componentTypes.includes('Text');
      const hasButton = componentTypes.includes('CraftButton');
      
      if (hasText && hasButton) {
        colorScheme = 'professional';
      }
      
      return {
        componentTypes: componentTypes.filter(Boolean),
        layoutStyle,
        businessTypes: [], // Can be enhanced based on content analysis
        colorScheme,
        isResponsive: true // Assume responsive by default
      };
    } catch (error) {
      console.error('Error analyzing page:', error);
      return {
        componentTypes: [],
        layoutStyle: 'basic',
        businessTypes: [],
        colorScheme: 'mixed',
        isResponsive: true
      };
    }
  };

  const handleSave = async (values) => {
    if (!user) {
      message.error('Please sign in to save templates');
      return;
    }

    setSaving(true);
    try {
      // Generate AI metadata
      const aiMetadata = analyzePageForAI(pageData);
      
      // Combine form tags with custom tags
      const allTags = [...(values.tags || []), ...customTags];
      
      const templateData = {
        name: values.name,
        description: values.description,
        category: values.category,
        tags: allTags,
        jsonData: pageData,
        thumbnail: previewImage?.url || '',
        type: values.type || 'free',
        price: values.price || 0,
        isListed: values.isListed || false,
        aiMetadata
      };

      const response = await fetch('/api/templates?action=save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData)
      });

      const result = await response.json();
      
      if (result.success) {
        message.success('Template saved successfully!');
        form.resetFields();
        setCustomTags([]);
        setPreviewImage(null);
        onCancel();
      } else {
        message.error(result.error || 'Failed to save template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      message.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file) => {
    // Simulate image upload - replace with actual upload logic
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage({
        url: e.target.result,
        file
      });
      message.success('Preview image added');
    };
    reader.readAsDataURL(file);
    return false; // Prevent auto upload
  };

  const handleAddCustomTag = () => {
    if (newTag.trim() && !customTags.includes(newTag.trim())) {
      setCustomTags([...customTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveCustomTag = (tagToRemove) => {
    setCustomTags(customTags.filter(tag => tag !== tagToRemove));
  };

  return (
    <Modal
      title={
        <Space>
          <ShopOutlined />
          Save as Template
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={700}
      footer={null}
      centered
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={{
          type: 'free',
          isListed: false
        }}
      >
        <Alert
          message="Share Your Creation"
          description="Save this page as a template in our marketplace. High-quality templates with good ratings may be featured and used by our AI system."
          type="info"
          style={{ marginBottom: 16 }}
        />

        <Form.Item
          name="name"
          label="Template Name"
          rules={[{ required: true, message: 'Please enter a template name' }]}
        >
          <Input placeholder="e.g., Modern Business Landing Page" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          rules={[{ required: true, message: 'Please enter a description' }]}
        >
          <TextArea
            rows={3}
            placeholder="Describe your template, its purpose, and key features..."
          />
        </Form.Item>

        <Form.Item
          name="category"
          label="Category"
          rules={[{ required: true, message: 'Please select a category' }]}
        >
          <Select placeholder="Choose the best category">
            <Option value="landing">Landing Page</Option>
            <Option value="business">Business</Option>
            <Option value="portfolio">Portfolio</Option>
            <Option value="ecommerce">E-commerce</Option>
            <Option value="blog">Blog</Option>
            <Option value="events">Events</Option>
            <Option value="personal">Personal</Option>
            <Option value="other">Other</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="tags"
          label="Tags"
        >
          <Select
            mode="multiple"
            placeholder="Select relevant tags"
            style={{ width: '100%' }}
          >
            <Option value="modern">Modern</Option>
            <Option value="minimal">Minimal</Option>
            <Option value="colorful">Colorful</Option>
            <Option value="professional">Professional</Option>
            <Option value="creative">Creative</Option>
            <Option value="responsive">Responsive</Option>
            <Option value="dark-theme">Dark Theme</Option>
            <Option value="light-theme">Light Theme</Option>
          </Select>
        </Form.Item>

        {/* Custom Tags */}
        <Form.Item label="Custom Tags">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space>
              <Input
                placeholder="Add custom tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onPressEnter={handleAddCustomTag}
                style={{ width: 200 }}
              />
              <Button 
                icon={<PlusOutlined />} 
                onClick={handleAddCustomTag}
                disabled={!newTag.trim()}
              >
                Add
              </Button>
            </Space>
            {customTags.length > 0 && (
              <div>
                {customTags.map(tag => (
                  <Tag 
                    key={tag} 
                    closable 
                    onClose={() => handleRemoveCustomTag(tag)}
                    style={{ marginBottom: 4 }}
                  >
                    {tag}
                  </Tag>
                ))}
              </div>
            )}
          </Space>
        </Form.Item>

        <Divider />

        <Form.Item
          name="type"
          label="Template Type"
        >
          <Select>
            <Option value="free">Free</Option>
            <Option value="paid">Paid</Option>
            <Option value="premium">Premium</Option>
          </Select>
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => 
            prevValues.type !== currentValues.type
          }
        >
          {({ getFieldValue }) => {
            const templateType = getFieldValue('type');
            return (templateType === 'paid' || templateType === 'premium') ? (
              <Form.Item
                name="price"
                label="Price (USD)"
                rules={[{ required: true, message: 'Please enter a price' }]}
              >
                <InputNumber
                  min={1}
                  max={999}
                  precision={2}
                  formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            ) : null;
          }}
        </Form.Item>

        {/* Preview Image Upload */}
        <Form.Item label="Preview Image (Optional)">
          <Upload
            listType="picture-card"
            showUploadList={false}
            beforeUpload={handleImageUpload}
            accept="image/*"
          >
            {previewImage ? (
              <img 
                src={previewImage.url} 
                alt="preview" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <div>
                <UploadOutlined />
                <div style={{ marginTop: 8 }}>Upload</div>
              </div>
            )}
          </Upload>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Add a preview image to make your template more appealing
          </Text>
        </Form.Item>

        <Form.Item
          name="isListed"
          valuePropName="checked"
        >
          <Switch /> <Text>List in marketplace immediately</Text>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={saving}
              icon={<ShopOutlined />}
            >
              Save Template
            </Button>
            <Button onClick={onCancel}>
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TemplateSaveModal;