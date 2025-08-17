import React, { useState, useEffect, useRef } from 'react';
import { Modal, Form, Input, Button, message, Divider, Typography, Space, Tag, Alert, Tooltip, List, theme } from 'antd';
import PaymentProvidersSettings from '@/app/dashboard/Admin/Componets/Sections/PaymentProvidersSettings';
import { CopyOutlined, GlobalOutlined, EditOutlined, LinkOutlined, SettingOutlined, CheckOutlined, StopOutlined, EyeOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
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
  const [removing, setRemoving] = useState(null);
  const retryTimer = useRef(null);
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

  const normalizeDomain = (raw) => {
    if (!raw) return '';
    let d = raw.trim().toLowerCase();
    d = d.replace(/^https?:\/\//, '');
    d = d.replace(/\/.*$/, ''); // strip path
    d = d.replace(/[#?].*$/, ''); // strip hash/query
    if (d.endsWith('.')) d = d.slice(0, -1);
    return d;
  };

  const domainPattern = /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,}$/; // simple FQDN pattern

  const handleAddDomain = async () => {
    try {
      let domain = normalizeDomain(form.getFieldValue('customDomain'));
      if (!domain) return message.warning('Enter a domain first');
      if (!domainPattern.test(domain)) return message.error('Enter a valid domain like mysite.com or shop.mysite.co');
      form.setFieldsValue({ customDomain: domain });
      setAddingDomain(true);
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, siteId: site.id, domain }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Failed to add domain');
      message.success('Domain added. Create the TXT record below, wait a few minutes, then click Verify.');
      form.setFieldsValue({ customDomain: '' });
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
      if (!json.ok) {
        // If still propagating, schedule another attempt (max 5 tries per session per domain could be implemented later)
        if (/not found yet/i.test(json.error)) {
          message.info('Still propagating. Will retry automatically in 30s.');
          retryTimer.current = setTimeout(() => handleVerify(domain), 30000);
        } else {
          message.error(json.error || 'Verification failed');
        }
      } else {
        message.success('Domain verified and attached. DNS may take time to fully propagate.');
      }
      await loadDomains();
    } catch (e) {
      message.error(e.message);
    } finally {
      setVerifying(null);
    }
  };

  const actuallyRemove = async (domain) => {
    try {
      setRemoving(domain);
      const res = await fetch(`/api/domains/${encodeURIComponent(domain)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, siteId: site.id }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Failed to remove');
      message.success('Domain removed');
      await loadDomains();
    } finally {
      setRemoving(null);
    }
  };

  const handleRemove = (domain) => {
    Modal.confirm({
      title: 'Remove domain?',
      icon: <ExclamationCircleOutlined />,
      content: `${domain} will stop pointing to this site.`,
      okType: 'danger',
      okText: 'Remove',
      centered: true,
      onOk: () => actuallyRemove(domain),
    });
  };

  // Cleanup any retry timer on unmount or site change
  useEffect(() => () => { if (retryTimer.current) clearTimeout(retryTimer.current); }, [site?.id]);

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

        {/* Payment Providers */}
        <Divider />
        <PaymentProvidersSettings
          userId={user?.uid}
          siteId={site?.id}
          onSaved={() => message.success('Payment providers updated')}
        />
        <Alert
          type="info"
          showIcon
          className="mt-3"
          message="Seller account requirement"
          description={<span style={{ fontSize:12 }}>Cart & checkout stay disabled until the site owner connects a Stripe account. After connecting, return here to enable providers.</span>}
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
          message="How to connect a domain"
          description={
            <div style={{ fontSize: 12, lineHeight: 1.5 }}>
              <div><strong>Step 1.</strong> Enter your root domain (example: <Text code>myshop.com</Text>) below and click <strong>Add</strong>.</div>
              <div><strong>Step 2.</strong> In your DNS provider create a TXT record to verify ownership:</div>
              <div style={{ margin: '4px 0 4px 12px' }}>
                Host: <Text code>_glow-verify.yourdomain.com</Text> → Value: <Text code>glow-xxxxxxxx</Text>
              </div>
              <div><strong>Step 3.</strong> Wait 1-5 minutes (sometimes longer) then click <strong>Verify</strong>. Once status becomes <Tag color="green" style={{ marginInline: 4 }}>active</Tag> continue.</div>
              <div><strong>Step 4.</strong> Point DNS to serve traffic:</div>
              <div style={{ margin: '4px 0 4px 12px' }}>
                <div><Text code>@</Text> A → <Text code>76.76.21.21</Text></div>
                <div><Text code>www</Text> CNAME → <Text code>cname.vercel-dns.com</Text></div>
              </div>
              <div><strong>Tip:</strong> Use <Text code>dig</Text> or <Text code>whatsmydns.net</Text> to inspect propagation.</div>
            </div>
          }
          style={{ marginBottom: 12 }}
        />

        <Form.Item
          label="Domain"
          name="customDomain"
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value) return Promise.resolve();
                const norm = normalizeDomain(value);
                if (!domainPattern.test(norm)) return Promise.reject(new Error('Invalid domain format'));
                return Promise.resolve();
              }
            })
          ]}
          extra={<span style={{ fontSize: 12 }}>Root only (no http://, paths, or trailing slash)</span>}
        >
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="mydomain.com"
              allowClear
              onBlur={(e)=> {
                const norm = normalizeDomain(e.target.value);
                form.setFieldsValue({ customDomain: norm });
              }}
            />
            <Button type="primary" onClick={handleAddDomain} loading={addingDomain}>Add</Button>
          </Space.Compact>
        </Form.Item>

        <List
          bordered
          dataSource={domains}
          rowKey={(d)=> d.domain}
          locale={{ emptyText: 'No custom domains yet' }}
          renderItem={(d) => {
            const active = d.status === 'active';
            const pending = d.status === 'pending';
            return (
              <List.Item
                actions={[
                  d.status === 'verified' && !active ? (
                    <Tooltip title="Attach domain (final step)" key="activate-tip">
                      <Button key="activate" size="small" type="primary" onClick={() => handleVerify(d.domain)} loading={verifying===d.domain}>Activate</Button>
                    </Tooltip>
                  ) : (
                    <Tooltip title={active ? 'Already active' : 'Verify TXT record'} key="verify-tip">
                      <Button key="verify" size="small" onClick={() => handleVerify(d.domain)} loading={verifying===d.domain} disabled={active}>{active ? 'Active' : 'Verify'}</Button>
                    </Tooltip>
                  ),
                  <Tooltip title="Remove domain" key="remove-tip">
                    <Button key="remove" size="small" danger onClick={() => handleRemove(d.domain)} loading={removing===d.domain} disabled={verifying===d.domain || removing===d.domain}>Remove</Button>
                  </Tooltip>,
                ]}
              >
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Space wrap>
                    <Text strong>{d.domain}</Text>
                    <Tag color={active ? 'green' : d.status==='error' ? 'red' : 'orange'}>{d.status}</Tag>
                  </Space>
                  {d.verificationToken && !active && (
                    <div style={{ fontSize: 12 }}>
                      TXT host: <Text code>_glow-verify.{d.domain}</Text> value: <Text code>{d.verificationToken}</Text>
                      <Button
                        type="link"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => copyToClipboard(d.verificationToken, 'Verification token')}
                        style={{ paddingInline: 4 }}
                      />
                    </div>
                  )}
                  {d.status === 'verified' && (
                    <Text type="secondary" style={{ fontSize: 11 }}>Verified. Attaching to infrastructure… retry if not active in a minute.</Text>
                  )}
                  {d.lastError && !active && d.status !== 'verified' && (
                    <Text type="secondary" style={{ fontSize: 11 }}>Last check: {d.lastError}</Text>
                  )}
                  {active && (
                    <Text type="secondary" style={{ fontSize: 11 }}>Active. DNS changes can take up to 24h globally.</Text>
                  )}
                </Space>
              </List.Item>
            );
          }}
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
