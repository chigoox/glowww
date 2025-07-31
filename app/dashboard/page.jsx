'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserSites, createSite, deleteSite, updateSite, canCreateSite } from '../../lib/sites';
import { signOut } from '../../lib/auth';
import { PRICING_PLANS, createCheckoutSession } from '../../lib/stripe';
import { UpgradeBenefits } from '../Components/support/SubscriptionComponents';
import SiteCard from '../Components/support/SiteCard';
import SiteSettingsModal from '../Components/support/SiteSettingsModal';
import {
  Button,
  Card,
  Empty,
  Spin,
  message,
  Modal,
  Input,
  Form,
  Space,
  Typography,
  Tag,
  Tooltip,
  Divider,
  Row,
  Col,
  Progress,
  Alert
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  GlobalOutlined,
  CrownOutlined,
  RocketOutlined,
  SettingOutlined,
  ShareAltOutlined,
  CopyOutlined,
  LogoutOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { confirm } = Modal;

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Logout function
  const handleLogout = async () => {
    try {
      await signOut();
      message.success('Logged out successfully');
      // Redirect will happen automatically via AuthContext
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      message.error('Failed to logout');
    }
  };
  const [upgradeReason, setUpgradeReason] = useState('');
  const [createForm] = Form.useForm();
  const [processingCreate, setProcessingCreate] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [showSiteSettings, setShowSiteSettings] = useState(false);

  // Load user sites on component mount
  useEffect(() => {
    if (user && !authLoading) {
      loadUserSites();
    }
  }, [user, authLoading]);

  const loadUserSites = async () => {
    try {
      setLoading(true);
      const userSites = await getUserSites(user.uid);
      setSites(userSites);
      
      // Check for cached thumbnails
      if (userSites.length > 0) {
        checkCachedThumbnails(userSites);
      }
    } catch (error) {
      console.error('Error loading sites:', error);
      message.error('Failed to load your sites');
    } finally {
      setLoading(false);
    }
  };

  // Check for cached thumbnails for better user experience
  const checkCachedThumbnails = async (sitesData) => {
    const publishedSites = sitesData.filter(site => site.isPublished);
    
    if (publishedSites.length === 0) return;
    
    console.log('Checking cached thumbnails for', publishedSites.length, 'published sites');
    
    // Just check if thumbnails exist in cache - don't generate new ones
    publishedSites.forEach(site => {
      const cacheKey = `thumbnail_${site.id}`;
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        console.log(`Cached thumbnail found for site: ${site.name}`);
      } else {
        console.log(`No cached thumbnail for site: ${site.name}`);
      }
    });
  };

  const handleCreateSite = async (values) => {
    try {
      setProcessingCreate(true);
      
      // Validate form values
      if (!values.name || typeof values.name !== 'string' || values.name.trim() === '') {
        message.error('Please enter a valid site name');
        return;
      }
      
      // Check if user can create a new site
      const canCreate = await canCreateSite(user.uid);
      if (!canCreate.allowed) {
        // Show upgrade modal instead of creating site
        showUpgradeModalHandler(canCreate.reason);
        return;
      }

      // Create the site
      const newSite = await createSite(user.uid, {
        name: values.name.trim(),
        description: values.description?.trim() || '',
        isPublished: false
      });

      message.success('Site created successfully!');
      setIsCreateModalVisible(false);
      createForm.resetFields();
      loadUserSites(); // Refresh the list

      // Redirect to editor for the new site
      window.location.href = `/Editor/site?site=${newSite.id}`;
      
    } catch (error) {
      console.error('Error creating site:', error);
      message.error('Failed to create site: ' + error.message);
    } finally {
      setProcessingCreate(false);
    }
  };

  const handleDeleteSite = (site) => {
    confirm({
      title: 'Delete Site',
      content: (
        <div>
          <p>Are you sure you want to delete <strong>"{site.name}"</strong>?</p>
          <p style={{ color: '#ff4d4f', marginTop: 8 }}>
            ⚠️ This action cannot be undone. All pages and content will be permanently deleted.
          </p>
          <p style={{ marginTop: 8 }}>
            Public URL: <Text code>{`${window.location.origin}/u/${user.username}/${site.name}`}</Text>
          </p>
        </div>
      ),
      okText: 'Delete Forever',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deleteSite(user.uid, site.id);
          message.success(`Site "${site.name}" deleted successfully`);
          loadUserSites();
        } catch (error) {
          console.error('Error deleting site:', error);
          message.error(`Failed to delete site: ${error.message}`);
        }
      }
    });
  };

  const handleTogglePublish = async (site) => {
    try {
      const isPublishing = !site.isPublished;
      
      await updateSite(user.uid, site.id, {
        isPublished: isPublishing,
        publishedAt: isPublishing ? new Date() : null
      });
      
      message.success(site.isPublished ? 'Site unpublished' : 'Site published successfully');
      
      // Generate thumbnail when publishing
      if (isPublishing) {
        try {
          message.info('Generating thumbnail for published site...');
          const { generateSiteThumbnail } = await import('../../lib/thumbnails');
          const username = user?.username || user?.displayName || 'user';
          await generateSiteThumbnail(site, username);
          message.success('Thumbnail generated successfully!');
        } catch (thumbnailError) {
          console.error('Error generating thumbnail:', thumbnailError);
          message.warning('Site published but thumbnail generation failed');
        }
      }
      
      loadUserSites();
    } catch (error) {
      console.error('Error updating site:', error);
      message.error('Failed to update site');
    }
  };

  const handleSiteSettings = (site) => {
    setSelectedSite(site);
    setShowSiteSettings(true);
  };

  const handleSiteEdit = (site) => {
    window.location.href = `/Editor/site?site=${site.id}`;
  };

  const handleSiteUpdated = (updatedSite) => {
    setSites(prevSites => 
      prevSites.map(site => 
        site.id === updatedSite.id 
          ? { ...site, ...updatedSite }
          : site
      )
    );
  };

  const showUpgradeModalHandler = (reason) => {
    setUpgradeReason(reason);
    setShowUpgradeModal(true);
  };

  const handleUpgradeConfirm = async () => {
    // In a real app, this would integrate with a payment system
    message.info('Redirecting to payment...');
    setShowUpgradeModal(false);
    // For demo purposes, we'll just show a message
    // In production: window.location.href = '/upgrade' or open payment modal
  };

  const handleUpgrade = async (plan) => {
    try {
      const successUrl = `${window.location.origin}/dashboard?upgrade=success`;
      const cancelUrl = `${window.location.origin}/dashboard?upgrade=cancelled`;
      
      const sessionUrl = await createCheckoutSession(
        plan.priceId,
        user.uid,
        successUrl,
        cancelUrl
      );
      
      // Redirect to Stripe checkout
      window.location.href = sessionUrl;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      message.error('Failed to start checkout process');
    }
  };

  const copyPublicUrl = (site) => {
    const publicUrl = `${window.location.origin}/u/${user.username}/${site.name}`;
    navigator.clipboard.writeText(publicUrl);
    message.success('Public URL copied to clipboard');
  };

  const handleViewAnalytics = (site) => {
    // For now, show a comprehensive modal with site information and upcoming analytics
    Modal.info({
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RocketOutlined style={{ color: '#52c41a' }} />
          <span>Analytics for "{site.name}"</span>
        </div>
      ),
      content: (
        <div>
          {/* Site Overview */}
          <div style={{ marginBottom: 20 }}>
            <Title level={5}>Site Overview</Title>
            <Row gutter={[16, 8]}>
              <Col span={12}>
                <Text strong>Status: </Text>
                <Tag color={site.isPublished ? 'green' : 'orange'}>
                  {site.isPublished ? 'Published' : 'Draft'}
                </Tag>
              </Col>
              <Col span={12}>
                <Text strong>Created: </Text>
                <Text>{new Date(site.createdAt.toDate()).toLocaleDateString()}</Text>
              </Col>
              <Col span={24}>
                <Text strong>Public URL: </Text>
                <div style={{ marginTop: 4 }}>
                  <Input 
                    value={`${window.location.origin}/u/${user.username}/${site.name}`}
                    readOnly
                    size="small"
                    addonAfter={
                      <Button 
                        type="link" 
                        size="small" 
                        icon={<CopyOutlined />}
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/u/${user.username}/${site.name}`);
                          message.success('URL copied!');
                        }}
                      >
                        Copy
                      </Button>
                    }
                  />
                </div>
              </Col>
            </Row>
          </div>

          {/* Quick Actions */}
          <div style={{ marginBottom: 20 }}>
            <Title level={5}>Quick Actions</Title>
            <Space wrap>
              <Button 
                type="primary" 
                icon={<EditOutlined />}
                onClick={() => {
                  Modal.destroyAll();
                  window.location.href = `/Editor/site?site=${site.id}`;
                }}
              >
                Edit Site
              </Button>
              <Button 
                icon={<EyeOutlined />}
                onClick={() => window.open(`/u/${user.username}/${site.name}`, '_blank')}
                disabled={!site.isPublished}
              >
                View Live
              </Button>
              <Button 
                icon={<ShareAltOutlined />}
                onClick={() => {
                  copyPublicUrl(site);
                  message.success('URL copied to clipboard');
                }}
              >
                Share URL
              </Button>
            </Space>
          </div>

          {/* Coming Soon Analytics */}
          <Alert
            message="Advanced Analytics Coming Soon!"
            description={
              <div>
                <p>We're working on comprehensive analytics including:</p>
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  <li>Page views and unique visitors</li>
                  <li>Traffic sources and referrers</li>
                  <li>Geographic visitor data</li>
                  <li>Performance metrics</li>
                  <li>Mobile vs desktop usage</li>
                  <li>Conversion tracking</li>
                </ul>
                <p style={{ marginTop: 12 }}>
                  <Text strong>Stay tuned for these features in upcoming updates!</Text>
                </p>
              </div>
            }
            type="info"
            style={{ marginTop: 16 }}
          />
        </div>
      ),
      width: 600,
      okText: 'Close',
      icon: null
    });
  };

  // Get user's current plan info
  const getCurrentPlan = () => {
    const siteCount = sites.length;
    let currentPlan = PRICING_PLANS.free;
    
    // Determine plan based on site count (simplified logic)
    if (siteCount <= 1) {
      currentPlan = PRICING_PLANS.free;
    } else if (siteCount <= 5) {
      currentPlan = PRICING_PLANS.pro;
    } else {
      currentPlan = PRICING_PLANS.business;
    }
    
    return currentPlan;
  };

  if (authLoading || loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Title level={3}>Please sign in to access your dashboard</Title>
        <Button type="primary" href="/Login">
          Sign In
        </Button>
      </div>
    );
  }

  const currentPlan = getCurrentPlan();
  const siteUsage = sites.length;
  const maxSites = currentPlan.maxSites;
  const usagePercentage = maxSites === Infinity ? 0 : (siteUsage / maxSites) * 100;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Welcome back, {user.displayName || user.email}!</Title>
          <Text type="secondary">Manage your websites and upgrade your plan</Text>
        </div>
        <Button 
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          type="text"
          size="large"
          style={{ color: '#666' }}
        >
          Logout
        </Button>
      </div>

      {/* Plan Status Card */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Space direction="vertical" size={0}>
              <Text strong>Current Plan: {currentPlan.name}</Text>
              <Text type="secondary">
                {siteUsage} of {maxSites === Infinity ? '∞' : maxSites} sites used
              </Text>
              {maxSites !== Infinity && (
                <Progress 
                  percent={usagePercentage} 
                  size="small"
                  status={usagePercentage >= 80 ? 'warning' : 'normal'}
                />
              )}
            </Space>
          </Col>
          {currentPlan.id === 'free' && (
            <Col>
              <Button 
                type="primary" 
                icon={<CrownOutlined />}
                onClick={() => showUpgradeModalHandler('Upgrade to create more sites and unlock premium features')}
              >
                Upgrade Plan
              </Button>
            </Col>
          )}
        </Row>
      </Card>

      {/* Actions Bar */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalVisible(true)}
            size="large"
          >
            Create New Site
          </Button>
        </Col>
        <Col>
          <Button icon={<SettingOutlined />} size="large">
            Account Settings
          </Button>
        </Col>
      </Row>

      {/* Sites Grid */}
      {sites.length === 0 ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No sites yet"
          >
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setIsCreateModalVisible(true)}
            >
              Create Your First Site
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {sites.map(site => (
            <Col xs={24} sm={12} lg={8} xl={6} key={site.id}>
              <SiteCard
                site={site}
                user={user}
                onEdit={handleSiteEdit}
                onDelete={handleDeleteSite}
                onPublish={handleTogglePublish}
                onViewAnalytics={handleViewAnalytics}
                onSettings={handleSiteSettings}
                loading={loading}
              />
            </Col>
          ))}
        </Row>
      )}

      {/* Create Site Modal */}
      <Modal
        title="Create New Site"
        open={isCreateModalVisible}
        onCancel={() => setIsCreateModalVisible(false)}
        footer={null}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateSite}
        >
          <Form.Item
            name="name"
            label="Site Name"
            rules={[
              { required: true, message: 'Please enter a site name' },
              { 
                pattern: /^[a-zA-Z0-9-_]+$/, 
                message: 'Only letters, numbers, hyphens, and underscores allowed' 
              },
              {
                min: 2,
                max: 50,
                message: 'Site name must be between 2 and 50 characters'
              }
            ]}
          >
            <Input 
              placeholder="my-awesome-site"
              onChange={(e) => {
                // Auto-format the name as user types
                const value = e.target.value.toLowerCase().replace(/[^a-zA-Z0-9-_]/g, '-');
                createForm.setFieldsValue({ name: value });
              }}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description (Optional)"
          >
            <Input.TextArea 
              placeholder="Describe your website..."
              rows={3}
            />
          </Form.Item>

          <Alert
            message="Your site will be available at:"
            description={
              <Text code>{`${window.location.origin}/u/${user.username || 'username'}/[site-name]`}</Text>
            }
            type="info"
            style={{ marginBottom: 16 }}
          />

          <Row gutter={16}>
            <Col flex="auto">
              <Button onClick={() => setIsCreateModalVisible(false)}>
                Cancel
              </Button>
            </Col>
            <Col>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={processingCreate}
              >
                Create Site
              </Button>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Upgrade Modal */}
      <Modal
        title="Upgrade to Pro"
        open={showUpgradeModal}
        onCancel={() => setShowUpgradeModal(false)}
        footer={null}
        width={600}
        centered
        zIndex={10000}
      >
        <UpgradeBenefits
          onUpgrade={handleUpgradeConfirm}
          onCancel={() => setShowUpgradeModal(false)}
        />
      </Modal>

      {/* Site Settings Modal */}
      <SiteSettingsModal
        visible={showSiteSettings}
        onClose={() => setShowSiteSettings(false)}
        site={selectedSite}
        user={user}
        onSiteUpdated={handleSiteUpdated}
      />
    </div>
  );
}
