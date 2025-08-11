import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Switch, Button, message, Divider, Typography, Space, Tag, Alert, Tooltip } from 'antd';
import { CopyOutlined, GlobalOutlined, EditOutlined, LinkOutlined, SettingOutlined } from '@ant-design/icons';
import { updateSite } from '../../../lib/sites';

const { Text, Title } = Typography;
const { TextArea } = Input;

/**
 * Site Settings Modal Component
 * 
 * Allows users to configure site settings like name, description, 
 * subdomain, custom domain, and publishing status
 */
const SiteSettingsModal = ({ 
  visible, 
  onClose, 
  site, 
  user, 
  onSiteUpdated 
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [publicUrl, setPublicUrl] = useState('');

  // Initialize form and URLs when site changes
  useEffect(() => {
    if (site && user) {
      form.setFieldsValue({
        name: site.name,
        description: site.description || '',
        subdomain: site.subdomain || site.name,
        customDomain: site.customDomain || '',
        isPublished: site.isPublished,
      });

      // Generate URLs
      const baseUrl = window.location.origin;
      const username = user.username || user.displayName || 'user';
      const siteName = site.subdomain || site.name;
      
      setPreviewUrl(`${baseUrl}/Preview`);
      setPublicUrl(`${baseUrl}/u/${username}/${siteName}`);
    }
  }, [site, user, form]);

  const handleSave = async (values) => {
    try {
      setLoading(true);
      
      // Validate subdomain format
      const subdomain = values.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      if (subdomain !== values.subdomain) {
        values.subdomain = subdomain;
        form.setFieldsValue({ subdomain });
        message.warning('Subdomain has been auto-formatted to use only letters, numbers, and hyphens.');
      }

      // Update site data
      const updatedData = {
        name: values.name.trim(),
        description: values.description?.trim() || '',
        subdomain: values.subdomain.trim(),
        customDomain: values.customDomain?.trim() || null,
        isPublished: values.isPublished,
        publishedAt: values.isPublished && !site.isPublished ? new Date() : site.publishedAt,
      };

      await updateSite(user.uid, site.id, updatedData);
      
      message.success('Site settings updated successfully!');
      
      // Refresh the URLs with new subdomain
      const baseUrl = window.location.origin;
      const username = user.username || user.displayName || 'user';
      setPublicUrl(`${baseUrl}/u/${username}/${values.subdomain}`);
      
      // Notify parent component
      if (onSiteUpdated) {
        onSiteUpdated({ ...site, ...updatedData });
      }
      
    } catch (error) {
      console.error('Error updating site:', error);
      message.error('Failed to update site settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    message.success(`${label} copied to clipboard!`);
  };

  const openInNewTab = (url) => {
    window.open(url, '_blank');
  };

  if (!site || !user) return null;

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          <span>Site Settings</span>
          <Tag color={site.isPublished ? 'green' : 'orange'}>
            {site.isPublished ? 'Published' : 'Draft'}
          </Tag>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
  width={'32rem'}
  bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={{
          name: site.name,
          description: site.description || '',
          subdomain: site.subdomain || site.name,
          customDomain: site.customDomain || '',
          isPublished: site.isPublished,
        }}
      >
        {/* Basic Information */}
        <Title level={5}>Basic Information</Title>
        
        <Form.Item
          name="name"
          label="Site Name"
          rules={[
            { required: true, message: 'Please enter a site name' },
            { min: 2, max: 50, message: 'Site name must be between 2 and 50 characters' }
          ]}
        >
          <Input 
            placeholder="My Awesome Site"
            prefix={<EditOutlined />}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
        >
          <TextArea 
            placeholder="Brief description of your website..."
            rows={3}
            showCount
            maxLength={500}
          />
        </Form.Item>

        <Divider />

        {/* URL Configuration */}
        <Title level={5}>URL Configuration</Title>
        
        <Form.Item
          name="subdomain"
          label="Subdomain"
          help="This will be used in your public URL"
          rules={[
            { required: true, message: 'Please enter a subdomain' },
            { 
              pattern: /^[a-z0-9-]+$/, 
              message: 'Only lowercase letters, numbers, and hyphens allowed' 
            },
            { min: 2, max: 30, message: 'Subdomain must be between 2 and 30 characters' }
          ]}
        >
          <Input 
            placeholder="my-site"
            prefix={<LinkOutlined />}
            addonBefore={`${window.location.origin}/u/${user.username || user.displayName || 'user'}/`}
            onChange={(e) => {
              const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
              if (value !== e.target.value) {
                form.setFieldsValue({ subdomain: value });
              }
            }}
          />
        </Form.Item>

        <Form.Item
          name="customDomain"
          label="Custom Domain (Optional)"
          help="Connect your own domain (e.g., mysite.com)"
        >
          <Input 
            placeholder="mysite.com"
            prefix={<GlobalOutlined />}
          />
        </Form.Item>

        {/* URL Preview */}
        <Alert
          message="URL Preview"
          description={
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Public URL: </Text>
                <Text code copyable={{ onCopy: () => copyToClipboard(publicUrl, 'Public URL') }}>
                  {publicUrl}
                </Text>
                <Tooltip title="Open in new tab">
                  <Button 
                    type="link" 
                    size="small" 
                    icon={<GlobalOutlined />}
                    onClick={() => openInNewTab(publicUrl)}
                  />
                </Tooltip>
              </div>
              <div>
                <Text strong>Preview URL: </Text>
                <Text code copyable={{ onCopy: () => copyToClipboard(previewUrl, 'Preview URL') }}>
                  {previewUrl}
                </Text>
                <Tooltip title="Open in new tab">
                  <Button 
                    type="link" 
                    size="small" 
                    icon={<EditOutlined />}
                    onClick={() => openInNewTab(previewUrl)}
                  />
                </Tooltip>
              </div>
            </Space>
          }
          type="info"
          style={{ marginBottom: 16 }}
        />

        <Divider />

        {/* Publishing */}
        <Title level={5}>Publishing</Title>
        
        <Form.Item
          name="isPublished"
          valuePropName="checked"
        >
          <Space>
            <Switch />
            <Text>Publish this site</Text>
          </Space>
        </Form.Item>

        <Alert
          message={site.isPublished ? "Your site is live and accessible to the public" : "Your site is in draft mode and only visible to you"}
          type={site.isPublished ? "success" : "warning"}
          style={{ marginBottom: 16 }}
        />

        {/* Site Stats */}
        <Divider />
        <Title level={5}>Site Information</Title>
        
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text type="secondary">Created: </Text>
            <Text>{new Date(site.createdAt.toDate()).toLocaleDateString()}</Text>
          </div>
          <div>
            <Text type="secondary">Last Updated: </Text>
            <Text>{new Date(site.updatedAt.toDate()).toLocaleDateString()}</Text>
          </div>
          {site.publishedAt && (
            <div>
              <Text type="secondary">Published: </Text>
              <Text>{new Date(site.publishedAt.toDate()).toLocaleDateString()}</Text>
            </div>
          )}
          <div>
            <Text type="secondary">Site ID: </Text>
            <Text code copyable>{site.id}</Text>
          </div>
        </Space>

        {/* Action Buttons */}
        <Divider />
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
          >
            Save Changes
          </Button>
        </Space>
      </Form>
    </Modal>
  );
};

export default SiteSettingsModal;
