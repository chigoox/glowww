"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Modal, Form, Input, Button, message, Divider, Typography, Space, Tag, Alert, Tooltip, List, Tabs, theme, Card, Badge } from 'antd';
import PaymentProvidersSettings from '@/app/dashboard/Admin/Componets/Sections/PaymentProvidersSettings';
import { CopyOutlined, GlobalOutlined, EditOutlined, LinkOutlined, SettingOutlined, CheckOutlined, StopOutlined, EyeOutlined, ExclamationCircleOutlined, InfoCircleOutlined, CloudUploadOutlined, LinkOutlined as LinkIcon, TagsOutlined, CodeOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
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
  const [subdomainValue, setSubdomainValue] = useState('');
  const [domains, setDomains] = useState([]);
  const [addingDomain, setAddingDomain] = useState(false);
  const [verifying, setVerifying] = useState(null);
  const [removing, setRemoving] = useState(null);
  const retryTimer = useRef(null);
  const [published, setPublished] = useState(site?.isPublished || false);
  const [publishing, setPublishing] = useState(false);
  const [claimSub, setClaimSub] = useState('');
  const [claiming, setClaiming] = useState(false); // loading state for availability + claim
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [lastSubdomainSaved, setLastSubdomainSaved] = useState(site?.subdomain || '');
  const [justChangedSubdomain, setJustChangedSubdomain] = useState(false);
  const [subdomainUpdateError, setSubdomainUpdateError] = useState('');
  // SEO state (prefill when site changes)
  const [seoPreview, setSeoPreview] = useState({ title: '', description: '', url: '' });

  useEffect(() => {
    if (site) {
      setSeoPreview({
        title: site.seoTitle || site.name || '',
        description: site.seoDescription || site.description || '',
        url: publicUrl
      });
      // seed form values lazily (avoid wiping user unsaved edits on each re-render)
      form.setFieldsValue({
        seoTitle: site.seoTitle || site.name || '',
        seoDescription: site.seoDescription || site.description || '',
        seoKeywords: (site.seoKeywords || []).join(', '),
        seoIndex: site.seoIndex !== false,
        seoSocialTitle: site.seoSocialTitle || '',
        seoSocialDescription: site.seoSocialDescription || '',
        seoCanonical: site.seoCanonical || '',
        seoTwitterCard: site.seoTwitterCard || 'summary_large_image',
        seoGoogleVerification: site.seoGoogleVerification || '',
        seoStructuredData: site.seoStructuredData ? (() => { try { return JSON.stringify(JSON.parse(site.seoStructuredData), null, 2); } catch { return ''; } })() : '',
      });
    }
  }, [site, publicUrl]);

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
  // determine platform root domain (example: gloweditor.com)
  const hostParts = window.location.hostname.split('.');
  const platformDomain = hostParts.length > 1 ? hostParts.slice(-2).join('.') : window.location.hostname;
  const subdomainHost = site.subdomain && !site.subdomain.includes('.') ? `${site.subdomain}.${platformDomain}` : (site.subdomain || '');
  setPreviewUrl(''); // preview is removed; keep empty for now
  setPublicUrl(subdomainHost ? `${window.location.protocol}//${subdomainHost}` : `${baseUrl}/u/${username}/${siteName}`);
  setSubdomainValue(site.subdomain || site.name);
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
      // Prepare SEO fields
      const parseKeywords = (raw) => {
        if (!raw) return [];
        return raw.split(/[,\n]/).map(k=>k.trim().toLowerCase()).filter(Boolean).slice(0,15);
      };
      let structuredData = values.seoStructuredData;
      if (structuredData) {
        try {
          const parsed = JSON.parse(structuredData);
          structuredData = JSON.stringify(parsed); // normalized
        } catch {
          message.error('Structured Data JSON invalid; ignoring');
          structuredData = undefined;
        }
      }
      const updatedData = {
        name: values.name.trim(),
        description: values.description?.trim() || '',
        subdomain: values.subdomain.trim(),
        customDomain: values.customDomain?.trim() || null,
        isPublished: published,
        publishedAt: published && !site.isPublished ? new Date() : site.publishedAt,
        // SEO
        seoTitle: values.seoTitle?.trim() || values.name.trim(),
        seoDescription: values.seoDescription?.trim() || values.description?.trim() || '',
        seoKeywords: parseKeywords(values.seoKeywords),
        seoImage: values.seoImage?.trim() || null,
        seoIndex: values.seoIndex !== false && values.seoIndex !== 'false',
        seoCanonical: values.seoCanonical?.trim() || null,
        seoSocialTitle: values.seoSocialTitle?.trim() || null,
        seoSocialDescription: values.seoSocialDescription?.trim() || null,
        seoTwitterCard: values.seoTwitterCard || 'summary_large_image',
        seoGoogleVerification: values.seoGoogleVerification?.trim() || null,
        seoStructuredData: structuredData,
        seoAdditionalMeta: Array.isArray(values.seoAdditionalMeta) ? values.seoAdditionalMeta.filter(m=>m && m.name && m.value) : [],
      };

      await updateSite(user.uid, site.id, updatedData);
      
  const subdomainChanged = site.subdomain !== updatedData.subdomain;
  message.success(subdomainChanged ? `Subdomain updated to ${updatedData.subdomain}` : 'Site settings updated successfully!');
  if (subdomainUpdateError) setSubdomainUpdateError('');
      setLastSubdomainSaved(updatedData.subdomain);
      setJustChangedSubdomain(subdomainChanged);
      if (subdomainChanged) {
        // auto-clear the indicator after a short delay for UX clarity
        setTimeout(() => setJustChangedSubdomain(false), 5000);
      }
      
      // Refresh the URLs with new subdomain
      const baseUrl = window.location.origin;
      const username = user.username || user.displayName || 'user';
      setPublicUrl(`${baseUrl}/u/${username}/${values.subdomain}`);
      
      // Notify parent component
  if (onSiteUpdated) onSiteUpdated({ ...site, ...updatedData });
      
    } catch (error) {
      console.error('Error updating site:', error);
      const attemptedSub = form.getFieldValue('subdomain');
      if (attemptedSub && attemptedSub !== lastSubdomainSaved) {
        setSubdomainUpdateError(`Failed to update subdomain to "${attemptedSub}". ${error.message || ''}`.trim());
      }
      message.error('Failed to update site settings');
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
      title={null}
      open={visible}
      onCancel={onClose}
      footer={null}
      className="site-settings-modal"
      width={720}
      bodyStyle={{ padding: 0 }}
      destroyOnClose
    >
      {/* Gradient / brand header */}
      <div className="ssm-header" role="banner">
        <div className="ssm-header-main">
          <div className="ssm-header-left">
            <div className="ssm-avatar" aria-hidden>
              {site.name?.slice(0,1)?.toUpperCase() || 'S'}
            </div>
            <div className="ssm-heading">
              <h2 className="ssm-title">Site Settings</h2>
              <div className="ssm-subline">
                <Badge color={published ? 'green' : 'orange'} text={published ? 'Published' : 'Draft'} />
                <span className="ssm-dot" />
                <span className="ssm-site-name" title={site.name}>{site.name}</span>
              </div>
            </div>
          </div>
          <Space size="small" wrap>
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
            <Button size="small" onClick={onClose} aria-label="Close settings">Close</Button>
          </Space>
        </div>
        <div className="ssm-summary" role="contentinfo">
          <div className="ssm-summary-row">
            <span className="ssm-summary-label">Public URL</span>
            <span className="ssm-summary-value" aria-live="polite">
              <code className="ssm-code">{publicUrl}</code>
              <Tooltip title="Copy public URL">
                <Button
                  aria-label="Copy public URL"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(publicUrl, 'Public URL')}
                />
              </Tooltip>
              <Tooltip title="Open in new tab">
                <Button
                  aria-label="Open public URL in new tab"
                  size="small"
                  icon={<GlobalOutlined />}
                  onClick={() => openInNewTab(publicUrl)}
                />
              </Tooltip>
            </span>
          </div>
        </div>
      </div>

      <div className="ssm-body">
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
        <Tabs
          defaultActiveKey="general"
          className="ssm-tabs"
          items={[
            {
              key: 'general',
              label: <span className="ssm-tab-label"><InfoCircleOutlined /> <span>General</span></span>,
              children: (
                <div className="ssm-tab-panel">
                  <Card size="small" title={<span><EditOutlined /> Basic Information</span>} className="ssm-card">
                    <Form.Item
                      name="name"
                      label="Site Name"
                      rules={[
                        { required: true, message: 'Please enter a site name' },
                        { min: 2, max: 50, message: 'Site name must be between 2 and 50 characters' }
                      ]}
                    >
                      <Input placeholder="My Awesome Site" aria-label="Site name" />
                    </Form.Item>
                    <Form.Item name="description" label="Description (optional)">
                      <TextArea rows={3} showCount maxLength={500} placeholder="Brief description of your website..." aria-label="Site description" />
                    </Form.Item>
                  </Card>

                  <Card size="small" title={<span><CloudUploadOutlined /> Publishing</span>} className="ssm-card">
                    <Alert
                      message={published ? 'Your site is live & accessible to the public.' : 'Your site is draft-only and not publicly visible.'}
                      type={published ? 'success' : 'warning'}
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    <PaymentProvidersSettings
                      userId={user?.uid}
                      siteId={site?.id}
                      onSaved={() => message.success('Payment providers updated')}
                    />
                  </Card>

                  <Card size="small" title={<span><InfoCircleOutlined /> Site Metadata</span>} className="ssm-card">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div><Text type="secondary">Created:</Text> <Text>{new Date(site.createdAt.toDate()).toLocaleDateString()}</Text></div>
                      <div><Text type="secondary">Last Updated:</Text> <Text>{new Date(site.updatedAt.toDate()).toLocaleDateString()}</Text></div>
                      {site.publishedAt && <div><Text type="secondary">Published:</Text> <Text>{new Date(site.publishedAt.toDate()).toLocaleDateString()}</Text></div>}
                      <div><Text type="secondary">Site ID:</Text> <Text code copyable>{site.id}</Text></div>
                    </Space>
                  </Card>
                </div>
              )
            },
            {
              key: 'url',
              label: <span className="ssm-tab-label"><LinkIcon /> <span>URL</span></span>,
              children: (
                <div className="ssm-tab-panel">
                  <Card size="small" title={<span><LinkOutlined /> Subdomain & URLs</span>} className="ssm-card">
                    <Form.Item
                      name="subdomain"
                      label="Subdomain"
                      extra="Used in your primary public URL"
                      rules={[
                        { required: true, message: 'Please enter a subdomain' },
                        { pattern: /^[a-z0-9-]+$/, message: 'Only lowercase letters, numbers, and hyphens allowed' },
                        { min: 2, max: 30, message: 'Subdomain must be between 2 and 30 characters' }
                      ]}
                    >
                      <Input
                        placeholder={site.subdomain || site.name || 'my-site'}
                        prefix={<LinkOutlined />}
                        aria-label="Subdomain"
                        onChange={(e) => {
                          const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                          if (value !== e.target.value) {
                            form.setFieldsValue({ subdomain: value });
                            setSubdomainValue(value);
                          } else {
                            setSubdomainValue(value);
                          }
                        }}
                      />
                    </Form.Item>
                    {subdomainValue !== (site.subdomain || '') && (
                      <Alert type="info" showIcon message="Subdomain changed" description="Remember to save changes to apply the new subdomain." style={{ marginBottom: 12 }} />
                    )}
                    <div className="ssm-claim">
                      <Text type="secondary">Claim a platform subdomain</Text>
                      <Space.Compact style={{ width: '100%', marginTop: 8 }}>
                        <Input
                          placeholder={site.subdomain || 'desired-subdomain'}
                          aria-label="Desired subdomain"
                          value={claimSub}
                          onChange={(e) => {
                            const v = (e.target.value || '').toLowerCase().replace(/[^a-z0-9-]/g, '-');
                            setClaimSub(v);
                          }}
                          disabled={claiming}
                        />
                        <Button
                          type="primary"
                          loading={claiming}
                          aria-busy={claiming}
                          onClick={async () => {
                            const v = (claimSub || '').toString().trim().toLowerCase();
                            if (!v) return message.warning('Enter a subdomain to check');
                            setIsCheckingAvailability(true);
                            message.loading({ content: 'Checking availability...', key: 'claim-check' });
                            try {
                              setClaiming(true);
                              const res = await fetch(`/api/subdomain-available?subdomain=${encodeURIComponent(v)}`);
                              const json = await res.json();
                              if (!res.ok || !json.ok) {
                                message.error(json.error || 'Availability check failed');
                                return;
                              }
                              if (!json.available) {
                                message.error(json.reason === 'reserved' ? 'That subdomain is reserved' : 'Subdomain not available');
                                return;
                              }
                              message.success({ content: 'Subdomain available! Claiming…', key: 'claim-check', duration: 2 });
                              await updateSite(user.uid, site.id, { subdomain: v });
                              message.success('Subdomain claimed and saved');
                              form.setFieldsValue({ subdomain: v });
                              setClaimSub('');
                              const baseUrl = window.location.origin;
                              const username = user.username || user.displayName || 'user';
                              setPublicUrl(`${baseUrl}/u/${username}/${v}`);
                              if (onSiteUpdated) onSiteUpdated({ ...site, subdomain: v });
                              setLastSubdomainSaved(v);
                              setJustChangedSubdomain(true);
                              setTimeout(() => setJustChangedSubdomain(false), 5000);
                            } catch (e) {
                              console.error('Claim failed', e);
                              const msg = e?.message || 'Failed to claim subdomain';
                              message.error(msg);
                              setSubdomainUpdateError(`Subdomain claim failed${claimSub ? ` for "${claimSub}"` : ''}. ${msg}`.trim());
                            } finally {
                              setClaiming(false);
                              setIsCheckingAvailability(false);
                            }
                          }}
                        >{claiming ? 'Claiming' : 'Claim'}</Button>
                      </Space.Compact>
                      <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>Saves immediately & reserves the subdomain for this site.</Text>
                    </div>
                    <Alert
                      type="info"
                      showIcon
                      message="URL Preview"
                      description={<div><Text strong>Public:</Text> <Text code>{publicUrl}</Text></div>}
                      style={{ marginTop: 16 }}
                    />
                  </Card>
                </div>
              )
            },
            {
              key: 'domains',
              label: <span className="ssm-tab-label"><GlobalOutlined /> <span>Domains</span></span>,
              children: (
                <div className="ssm-tab-panel">
                  <Card size="small" title={<span><GlobalOutlined /> Custom Domain</span>} className="ssm-card">
                    <Alert
                      type="info"
                      showIcon
                      message="Connect a domain"
                      description={
                        <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                          <div><strong>1.</strong> Add root domain (e.g. <Text code>myshop.com</Text>).</div>
                          <div><strong>2.</strong> Create TXT record: host <Text code>_glow-verify.yourdomain.com</Text> value <Text code>glow-xxxxxxxx</Text>.</div>
                          <div><strong>3.</strong> Verify (may take minutes).</div>
                          <div><strong>4.</strong> DNS: <Text code>@</Text> A <Text code>76.76.21.21</Text>, <Text code>www</Text> CNAME <Text code>cname.vercel-dns.com</Text>.</div>
                        </div>
                      }
                      style={{ marginBottom: 12 }}
                    />
                    <Form.Item
                      label="Domain"
                      name="customDomain"
                      rules={[({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value) return Promise.resolve();
                          const norm = normalizeDomain(value);
                          if (!domainPattern.test(norm)) return Promise.reject(new Error('Invalid domain format'));
                          return Promise.resolve();
                        }
                      })]}
                      extra={<span style={{ fontSize: 12 }}>Root only (no protocol, paths, or trailing slash)</span>}
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
                                <Text type="secondary" style={{ fontSize: 11 }}>Verified. Attaching… retry if not active in a minute.</Text>
                              )}
                              {d.lastError && !active && d.status !== 'verified' && (
                                <Text type="secondary" style={{ fontSize: 11 }}>Last check: {d.lastError}</Text>
                              )}
                              {active && (
                                <Text type="secondary" style={{ fontSize: 11 }}>Active. DNS may take up to 24h globally.</Text>
                              )}
                            </Space>
                          </List.Item>
                        );
                      }}
                    />
                  </Card>
                </div>
              )
            },
            {
              key: 'seo',
              label: <span className="ssm-tab-label"><TagsOutlined /> <span>SEO</span></span>,
              children: (
                <div className="ssm-tab-panel">
                  <Card size="small" title={<span><InfoCircleOutlined /> Search Basics</span>} className="ssm-card">
                    <Form.Item name="seoTitle" label="SEO Title" rules={[{ max: 70, message: 'Max 70 chars' }]}> 
                      <Input placeholder="Title shown in search results" onChange={(e)=> setSeoPreview(p=>({...p, title: e.target.value}))} />
                    </Form.Item>
                    <Form.Item name="seoDescription" label="Meta Description" rules={[{ max: 170, message: 'Max 170 chars' }]}> 
                      <TextArea rows={3} placeholder="Short compelling description for search snippets" onChange={(e)=> setSeoPreview(p=>({...p, description: e.target.value}))} />
                    </Form.Item>
                    <Form.Item name="seoIndex" valuePropName="checked" label="Indexable?" tooltip="Uncheck to add noindex"> 
                      <Input type="checkbox" />
                    </Form.Item>
                    <Form.Item name="seoKeywords" label="Keywords (comma separated)" tooltip="Optional, most search engines ignore; keep it short (<=15)"> 
                      <Input placeholder="design, portfolio, freelance" />
                    </Form.Item>
                  </Card>
                  <Card size="small" title={<span><GlobalOutlined /> Social Sharing</span>} className="ssm-card">
                    <Form.Item name="seoSocialTitle" label="Social Title" rules={[{ max: 100 }]}>
                      <Input placeholder="Override title for social cards" />
                    </Form.Item>
                    <Form.Item name="seoSocialDescription" label="Social Description" rules={[{ max: 200 }]}>
                      <TextArea rows={2} placeholder="Custom description for social shares" />
                    </Form.Item>
                    <Form.Item name="seoImage" label="Social / OG Image URL" tooltip="Recommended 1200x630 .jpg or .png">
                      <Input placeholder="https://.../image.jpg" />
                    </Form.Item>
                    <Form.Item name="seoTwitterCard" label="Twitter Card">
                      <select style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--ant-color-border)' }}>
                        <option value="summary">summary</option>
                        <option value="summary_large_image">summary_large_image</option>
                      </select>
                    </Form.Item>
                  </Card>
                  <Card size="small" title={<span><SafetyCertificateOutlined /> Verification</span>} className="ssm-card">
                    <Form.Item name="seoGoogleVerification" label="Google Verification Code" tooltip="Value from Google Search Console (content attribute)">
                      <Input placeholder="google-site-verification string" />
                    </Form.Item>
                  </Card>
                  <Card size="small" title={<span><LinkOutlined /> Advanced</span>} className="ssm-card">
                    <Form.Item name="seoCanonical" label="Canonical Override" tooltip="Leave blank to auto-generate">
                      <Input placeholder="https://primary-domain.com/path" />
                    </Form.Item>
                    <Form.Item name="seoStructuredData" label="Structured Data (JSON-LD)" tooltip="Provide a valid JSON object">
                      <TextArea rows={6} placeholder='{"@context":"https://schema.org","@type":"WebSite"}' />
                    </Form.Item>
                  </Card>
                  <Card size="small" title={<span><CodeOutlined /> Additional Meta</span>} className="ssm-card">
                    <Form.List name="seoAdditionalMeta">
                      {(fields, { add, remove }) => (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {fields.map(field => (
                            <Space key={field.key} align="baseline" style={{ display: 'flex' }}>
                              <Form.Item {...field} name={[field.name, 'name']} rules={[{ required: true }]}> <Input placeholder="meta name" /> </Form.Item>
                              <Form.Item {...field} name={[field.name, 'value']} rules={[{ required: true }]}> <Input placeholder="value" /> </Form.Item>
                              <Button size="small" danger onClick={() => remove(field.name)}>Remove</Button>
                            </Space>
                          ))}
                          <Button size="small" onClick={()=> add()}>Add Meta</Button>
                        </div>
                      )}
                    </Form.List>
                  </Card>
                  <Card size="small" title={<span><EyeOutlined /> Preview</span>} className="ssm-card">
                    <div className="seo-preview-serp">
                      <div className="seo-serp-title">{(seoPreview.title || '').slice(0,70) || 'Title preview'}</div>
                      <div className="seo-serp-url">{publicUrl || seoPreview.url}</div>
                      <div className="seo-serp-desc">{(seoPreview.description || '').slice(0,170) || 'Description preview shows here.'}</div>
                    </div>
                  </Card>
                </div>
              )
            }
          ]}
        />

        <div className="ssm-footer" role="toolbar" aria-label="Actions">
          {(subdomainUpdateError && !justChangedSubdomain) && (
            <Alert
              type="error"
              showIcon
              message="Subdomain update failed"
              description={subdomainUpdateError}
              style={{ marginBottom: 12 }}
              closable
              onClose={() => setSubdomainUpdateError('')}
            />
          )}
          {justChangedSubdomain && (
            <Alert
              type="success"
              showIcon
              message="Subdomain updated"
              description={`Your site is now accessible via the new subdomain: ${lastSubdomainSaved}`}
              style={{ marginBottom: 12 }}
            />
          )}
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>Save Changes</Button>
          </Space>
        </div>
      </Form>
      </div>
      <style jsx global>{`
        .site-settings-modal .ant-modal-content { border-radius: 18px; overflow: hidden; }
        .site-settings-modal .ant-modal-body { background: ${token.colorBgContainer}; }
        .ssm-header { background: linear-gradient(135deg, ${token.colorPrimary}22, ${token.colorPrimary}11); padding: 16px 20px 8px; border-bottom: 1px solid ${token.colorBorderSecondary}; }
        .ssm-header-main { display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; }
        .ssm-header-left { display:flex; align-items:center; gap:14px; }
        .ssm-avatar { width:44px; height:44px; background:${token.colorPrimary}; color:#fff; font-weight:600; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:18px; box-shadow:0 4px 14px rgba(0,0,0,.15); }
        .ssm-title { margin:0; font-size:20px; font-weight:600; letter-spacing:.5px; }
        .ssm-subline { display:flex; align-items:center; gap:8px; font-size:12px; opacity:.85; }
        .ssm-site-name { font-weight:500; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .ssm-dot { width:4px; height:4px; background:${token.colorTextSecondary}; border-radius:50%; opacity:.5; }
        .ssm-summary { margin-top:10px; background: ${token.colorFillTertiary}; border:1px solid ${token.colorBorderSecondary}; border-radius:12px; padding:10px 14px; }
        .ssm-summary-row { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
        .ssm-summary-label { font-size:12px; text-transform:uppercase; letter-spacing:.5px; color:${token.colorTextSecondary}; font-weight:600; }
        .ssm-summary-value { display:flex; align-items:center; gap:6px; font-size:13px; }
        .ssm-code { background:${token.colorFillQuaternary}; padding:2px 6px; border-radius:6px; font-size:12px; }
        .ssm-body { padding: 16px 20px 80px; max-height:70vh; overflow-y:auto; }
        .ssm-tabs .ant-tabs-nav::before { border-bottom:none; }
        .ssm-tab-label { display:inline-flex; align-items:center; gap:6px; font-weight:600; }
        .ssm-tabs .ant-tabs-tab { padding:4px 0; }
        .ssm-tabs .ant-tabs-tab-btn { padding:8px 14px; background:${token.colorFillTertiary}; border-radius:10px; transition:all .2s; }
        .ssm-tabs .ant-tabs-tab-active .ant-tabs-tab-btn { background:${token.colorPrimary}22; box-shadow:0 2px 6px rgba(0,0,0,.06); }
        .ssm-tab-panel { display:flex; flex-direction:column; gap:18px; }
        .ssm-card { border-radius:14px; box-shadow:0 2px 8px rgba(0,0,0,.04); }
        .ssm-card .ant-card-head { min-height:40px; padding:0 16px; }
        .ssm-card .ant-card-head-title { padding:10px 0; font-weight:600; }
        .ssm-footer { position:sticky; bottom:0; left:0; right:0; background:linear-gradient(180deg, transparent, ${token.colorBgContainer}); padding:12px 20px 16px; border-top:1px solid ${token.colorBorderSecondary}; margin-top:24px; backdrop-filter:blur(6px); }
        .ssm-claim { margin-top:4px; }
        @media (max-width: 640px) { .site-settings-modal .ant-modal { width:100% !important; max-width:100% !important; } .ssm-header-main { flex-direction:column; align-items:flex-start; } }
        .site-settings-modal .ant-form-item-label > label { font-weight:600; }
        .site-settings-modal .ant-alert-info { background:${token.colorFillTertiary}; }
        /* Focus rings */
        .site-settings-modal button:focus-visible, .site-settings-modal .ant-input:focus-visible { outline:2px solid ${token.colorPrimary}; outline-offset:2px; }
      `}</style>
    </Modal>
  );
};

export default SiteSettingsModal;
