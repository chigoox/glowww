import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, message, Divider, Typography, Space, Tag, Alert, Tooltip, List, theme } from 'antd';
import { CopyOutlined, GlobalOutlined, EditOutlined, LinkOutlined, SettingOutlined, CheckOutlined, StopOutlined, EyeOutlined } from '@ant-design/icons';
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
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [publicUrl, setPublicUrl] = useState('');
  const [domains, setDomains] = useState([]);
  const [addingDomain, setAddingDomain] = useState(false);
  const [verifying, setVerifying] = useState(null);
  const [published, setPublished] = useState(site?.isPublished || false);
  const [publishing, setPublishing] = useState(false);

  // Initialize form and URLs when site changes
  useEffect(() => {
    if (site && user) {
      form.setFieldsValue({
        name: site.name,
        description: site.description || '',
        subdomain: site.subdomain || site.name,
        customDomain: site.customDomain || '',
      });

      // Generate URLs
      const baseUrl = window.location.origin;
      const username = user.username || user.displayName || 'user';
      const siteName = site.subdomain || site.name;
      
      setPreviewUrl(`${baseUrl}/Preview`);
      setPublicUrl(`${baseUrl}/u/${username}/${siteName}`);
      setPublished(!!site.isPublished);
    }
  }, [site, user, form]);

  const loadDomains = async () => {
    try {
      if (!user || !site) return;
      const res = await fetch(`/api/domains?userId=${encodeURIComponent(user.uid)}&siteId=${encodeURIComponent(site.id)}`);
      const json = await res.json();
      if (json.ok) setDomains(json.domains || []);
    } catch (e) { /* ignore */ }
  };

  useEffect(() => { loadDomains(); }, [site?.id, user?.uid]);

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
        isPublished: published,
        publishedAt: published && !site.isPublished ? new Date() : site.publishedAt,
      };

      await updateSite(user.uid, site.id, updatedData);
      
      message.success('Site settings updated successfully!');
      
      // Refresh the URLs with new subdomain
      const baseUrl = window.location.origin;
      const username = user.username || user.displayName || 'user';
      setPublicUrl(`${baseUrl}/u/${username}/${values.subdomain}`);
      
      // Notify parent component
  if (onSiteUpdated) onSiteUpdated({ ...site, ...updatedData });
      
    } catch (error) {
      console.error('Error updating site:', error);
      message.error('Failed to update site settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async () => {
    try {
      const domain = (form.getFieldValue('customDomain') || '').trim().toLowerCase();
      if (!domain) return message.warning('Enter a domain first');
      setAddingDomain(true);
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, siteId: site.id, domain }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Failed to add domain');
      message.success('Domain added. Add the TXT record, then click Verify.');
      await loadDomains();
    } catch (e) {
      message.error(e.message);
    } finally {
      setAddingDomain(false);
    }
  };

  const handleVerify = async (domain) => {
    try {
      setVerifying(domain);
      const res = await fetch('/api/domains/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, siteId: site.id, domain }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Verification failed');
      message.success('Domain verified and attached. DNS may take time to propagate.');
      await loadDomains();
    } catch (e) {
      message.error(e.message);
    } finally {
      setVerifying(null);
    }
  };

  const handleRemove = async (domain) => {
    try {
      const res = await fetch(`/api/domains/${encodeURIComponent(domain)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, siteId: site.id }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Failed to remove');
      message.success('Domain removed');
      await loadDomains();
    } catch (e) {
      message.error(e.message);
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SettingOutlined />
            <span style={{ fontWeight: 600 }}>Site Settings</span>
            <Tag color={published ? 'green' : 'orange'} style={{ marginInlineStart: 6 }}>
              {published ? 'Published' : 'Draft'}
            </Tag>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
            <Button size="small" icon={<EyeOutlined />} onClick={() => window.open(publicUrl, '_blank')}>
              View
            </Button>
            <Button
              size="small"
              type={published ? 'default' : 'primary'}
              icon={published ? <StopOutlined /> : <CheckOutlined />}
              loading={publishing}
              onClick={async () => {
                try {
                  setPublishing(true);
                  const next = !published;
                  await updateSite(user.uid, site.id, {
                    isPublished: next,
                    publishedAt: next && !site.isPublished ? new Date() : site.publishedAt,
                  });
                  setPublished(next);
                  message.success(next ? 'Site published' : 'Site unpublished');
                  if (onSiteUpdated) onSiteUpdated({ ...site, isPublished: next, publishedAt: next ? new Date() : site.publishedAt });
                } catch (e) {
                  message.error(e.message || 'Failed to update publish state');
                } finally {
                  setPublishing(false);
                }
              }}
            >{published ? 'Unpublish' : 'Publish'}</Button>
          </div>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      className="site-settings-modal"
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

  {/* Removed old inline custom domain input to avoid duplication — managed below */}

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
        <Alert
          message={published ? 'Your site is live and accessible to the public' : 'Your site is in draft mode and only visible to you'}
          type={published ? 'success' : 'warning'}
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

  {/* Custom Domain */}
        <Divider />
        <Title level={5}>Custom Domain</Title>
        <Alert
          type="info"
          showIcon
          message="Connect your own domain"
          description={
            <div>
              <div style={{ marginBottom: 8 }}>
                1) Add a TXT record to verify ownership:
                <div>
                  <Text code>_glow-verify.yourdomain.com</Text> → <Text code>glow-xxxxxxxxxxxx</Text>
                </div>
              </div>
              <div>
                2) After verification, point DNS:
                <div><Text code>@</Text> (apex) A → <Text code>76.76.21.21</Text></div>
                <div><Text code>www</Text> CNAME → <Text code>cname.vercel-dns.com</Text></div>
              </div>
            </div>
          }
          style={{ marginBottom: 12 }}
        />

        <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
          <Input placeholder="mydomain.com" value={form.getFieldValue('customDomain')} onChange={(e)=> form.setFieldsValue({ customDomain: e.target.value })} />
          <Button type="primary" onClick={handleAddDomain} loading={addingDomain}>Add</Button>
        </Space.Compact>

        <List
          bordered
          dataSource={domains}
          locale={{ emptyText: 'No custom domains yet' }}
          renderItem={(d) => (
            <List.Item
              actions={[
                <Button key="verify" size="small" onClick={() => handleVerify(d.domain)} loading={verifying===d.domain} disabled={d.status==='active'}>Verify</Button>,
                <Button key="remove" size="small" danger onClick={() => handleRemove(d.domain)}>Remove</Button>,
              ]}
            >
              <Space direction="vertical" size={0}>
                <Space>
                  <Text strong>{d.domain}</Text>
                  <Tag color={d.status==='active' ? 'green' : d.status==='error' ? 'red' : 'orange'}>{d.status}</Tag>
                </Space>
                {d.verificationToken && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    TXT host: <Text code>_glow-verify.{d.domain}</Text> value: <Text code>{d.verificationToken}</Text>
                  </Text>
                )}
              </Space>
            </List.Item>
          )}
        />

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
      <style jsx global>{`
        .site-settings-modal .ant-modal-content {
          border-radius: 14px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.08);
        }
        .site-settings-modal .ant-modal-header {
          padding: 12px 16px;
          border-bottom: 1px solid ${token.colorBorderSecondary};
          background: ${token.colorFillTertiary};
          border-top-left-radius: 14px;
          border-top-right-radius: 14px;
        }
        .site-settings-modal .ant-modal-title {
          width: 100%;
        }
        .site-settings-modal .ant-form-item-label > label {
          font-weight: 600;
        }
        .site-settings-modal .ant-alert-info {
          background: ${token.colorFillTertiary};
          border-color: ${token.colorBorderSecondary};
        }
        .site-settings-modal .ant-divider-horizontal {
          margin: 16px 0;
        }
        .site-settings-modal .ant-list-bordered {
          border-radius: 10px;
        }
      `}</style>
    </Modal>
  );
};

export default SiteSettingsModal;
