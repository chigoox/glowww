'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserSites, createSite, deleteSite, updateSite, canCreateSite, syncUserSiteCount } from '../../lib/sites';
import { signOut } from '../../lib/auth';
import { PRICING_PLANS, createCheckoutSession, createSetupIntent, setDefaultPaymentMethod, getSubscriptionStatus, cancelSubscriptionAtPeriodEnd, resumeSubscription, switchSubscriptionPlan, startStripeConnectOnboarding, getStripeConnectedAccount, disconnectStripeAccount, getStripeMetrics } from '../../lib/stripe';
import { startPaypalOnboarding } from '../../lib/paypal';
import { updateUserData, checkUsernameExists } from '../../lib/auth';
import { auth } from '@/lib/firebase';
import { updateProfile } from 'firebase/auth';
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { loadStripe as loadStripeJs } from '@stripe/stripe-js';
import { ensureUserSubscription, getUserSubscription } from '../../lib/subscriptions';
import SiteCard from '../Components/ui/SiteCard';
import FlipSiteCard from '../Components/ui/FlipSiteCard';
import dynamic from 'next/dynamic';
const SiteEmailManager = dynamic(() => import('../Components/email/SiteEmailManager'), { ssr: false });
const UserAnalyticsDashboard = dynamic(() => import('../Components/UserAnalyticsDashboard'), { ssr: false });
const EmailManager = dynamic(() => import('../Components/EmailManager'), { ssr: false });
import SiteSettingsModal from '../Components/ui/SiteSettingsModal';
import { Admin } from './Admin/Admin';
import useIsMobile from '../Hooks/useIsMobile';
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
  Divider,
  Row,
  Col,
  Table,
  theme,
  Tabs,
  ConfigProvider,
  Progress,
  Tag,
  Alert,
  Layout,
  Menu,
  Statistic,
  Avatar,
  Tooltip,
  Dropdown,
  Popconfirm,
  Drawer
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
  LogoutOutlined,
  CheckCircleOutlined,
  LockOutlined,
  CreditCardOutlined,
  BarChartOutlined,
  LineChartOutlined,
  UserOutlined,
  SafetyOutlined,
  PhoneOutlined,
  MailOutlined,
  KeyOutlined,
  DashboardOutlined,
  WalletOutlined,
  ShoppingOutlined,
  MenuOutlined,
  HomeOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { ResponsiveContainer, LineChart as RechartsLineChart, Line as RechartsLine, XAxis as RechartsXAxis, YAxis as RechartsYAxis, Tooltip as RechartsTooltip, CartesianGrid as RechartsCartesianGrid, Legend as RechartsLegend } from 'recharts';

const { Title, Text, Paragraph } = Typography;
const { Header, Content, Sider } = Layout;

export default function Dashboard() {
  const { token } = theme.useToken();
  const { user, userData, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  
  // Layout state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Core dashboard state
  const [activeTab, setActiveTab] = useState('overview');
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [totalSiteVisits, setTotalSiteVisits] = useState(0);
  const [totalSiteVisitsLoading, setTotalSiteVisitsLoading] = useState(false);
  
  // Seller orders state (multi-tenant ecommerce)
  const [sellerOrders, setSellerOrders] = useState([]);
  const [sellerOrdersLoading, setSellerOrdersLoading] = useState(false);
  const [sellerOrdersCursor, setSellerOrdersCursor] = useState(null);
  
  // Modal states
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isAnalyticsModalVisible, setIsAnalyticsModalVisible] = useState(false);
  const [selectedAnalyticsSite, setSelectedAnalyticsSite] = useState(null);
  const [siteAnalytics, setSiteAnalytics] = useState(null);
  const [emailAnalytics, setEmailAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [isEmailManagerOpen, setIsEmailManagerOpen] = useState(false);
  const [selectedEmailSite, setSelectedEmailSite] = useState(null);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [showSiteSettings, setShowSiteSettings] = useState(false);
  
  // Forms
  const [accountForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [savingAccount, setSavingAccount] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [processingCreate, setProcessingCreate] = useState(false);
  
  // Account settings UX enhancements
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null });
  const [accountHasChanges, setAccountHasChanges] = useState(false);
  const currentCanonicalUsername = (userData?.username || user?.username || '').toLowerCase();
  
  // Stripe/Payment states
  const [stripeConnect, setStripeConnect] = useState(null);
  const [paypalConnect, setPaypalConnect] = useState(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectConfig, setConnectConfig] = useState({ 
    stripe: { configured: true, missing: [] }, 
    paypal: { configured: true, missing: [] } 
  });
  const [connectConfigLoading, setConnectConfigLoading] = useState(false);
  const [stripePromise] = useState(() => {
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    return pk ? loadStripeJs(pk) : null;
  });
  const [clientSecret, setClientSecret] = useState(null);
  const [customerId, setCustomerId] = useState(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [managing, setManaging] = useState(false);
  const [showUpdatePaymentModal, setShowUpdatePaymentModal] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState('pro');
  const [upgradeReason, setUpgradeReason] = useState('');
  
  // Insights and metrics
  const [stripeMetrics, setStripeMetrics] = useState(null);
  const [stripeMetricsLoading, setStripeMetricsLoading] = useState(false);
  const [metricsDays, setMetricsDays] = useState(30);
  const [stripeSummary, setStripeSummary] = useState(null);
  const [stripeSummaryLoading, setStripeSummaryLoading] = useState(false);
  const [paypalSummary, setPaypalSummary] = useState(null);
  const [paypalSummaryLoading, setPaypalSummaryLoading] = useState(false);

  // Sidebar menu items
  const menuItems = [
    {
      key: 'overview',
      icon: <HomeOutlined />,
      label: 'Overview',
    },
    {
      key: 'sites',
      icon: <GlobalOutlined />,
      label: 'Sites',
    },
    {
      key: 'analytics',
      icon: <BarChartOutlined />,
      label: 'Analytics',
    },
    {
      key: 'emails',
      icon: <MailOutlined />,
      label: 'Emails',
    },
    {
      key: 'payments',
      icon: <WalletOutlined />,
      label: 'Payments',
    },
    {
      key: 'ecommerce',
      icon: <ShoppingOutlined />,
      label: 'E-commerce',
    },
  ];

  // Initialize active tab from URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const allowed = new Set(['overview', 'sites', 'payments', 'analytics', 'ecommerce', 'emails']);
    const sp = new URLSearchParams(window.location.search);
    const t = (sp.get('tab') || '').toLowerCase();
    if (allowed.has(t)) {
      setActiveTab(t);
    }
  }, []);

  // Sync with global theme classes
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains('dark-theme'));
    update();
    const obs = new MutationObserver(update);
    obs.observe(root, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
    return () => obs.disconnect();
  }, []);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
    }
  }, [user, authLoading]);

  // Load user data and subscription
  useEffect(() => {
    if (!user?.uid) return;
    const load = async () => {
      try {
        setLoading(true);
        await Promise.all([
          loadUserSites(),
          loadSubscription()
        ]);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        message.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.uid]);

  // Load recent seller orders when overview tab is active
  useEffect(() => {
    if(!user?.uid) return;
    if(activeTab !== 'overview') return;
    let cancelled = false;
    const load = async (append=false) => {
      try {
        setSellerOrdersLoading(true);
        const params = new URLSearchParams({ sellerUserId: user.uid, limit: '10' });
        if(append && sellerOrdersCursor) params.set('cursor', String(sellerOrdersCursor));
        const res = await fetch(`/api/seller/orders?${params.toString()}`);
        const json = await res.json();
        if(cancelled) return;
        if(res.ok && json.ok) {
          setSellerOrders(prev => append ? [...prev, ...json.orders] : json.orders);
          setSellerOrdersCursor(json.nextCursor || null);
        }
      } catch(e) { if(!cancelled) console.warn('load seller orders failed', e); }
      finally { if(!cancelled) setSellerOrdersLoading(false); }
    };
    load(false);
    return () => { cancelled = true; };
  }, [user?.uid, activeTab]);

  // Fetch site analytics when the Analytics modal opens
  useEffect(() => {
    let aborted = false;
    const loadAnalytics = async () => {
      if (!isAnalyticsModalVisible || !selectedAnalyticsSite || !user?.username) return;
      try {
        setAnalyticsLoading(true);
        setAnalyticsError(null);
        setSiteAnalytics(null);
        const url = `/api/sites/${encodeURIComponent(user.username)}/${encodeURIComponent(selectedAnalyticsSite.name)}/analytics/summary`;
        const res = await fetch(url);
        const data = await res.json();
        if (aborted) return;
        if (!res.ok || data?.ok === false) {
          throw new Error(data?.error || `Failed to load analytics (${res.status})`);
        }
        setSiteAnalytics(data);
        // Fetch email analytics
        try {
          const eaRes = await fetch(`/api/email/analytics/summary?siteId=${encodeURIComponent(selectedAnalyticsSite.id)}&compareToEnd=true&segments=template,device,location`);
          const eaJson = await eaRes.json();
          if (eaJson.ok) setEmailAnalytics(eaJson); else setEmailAnalytics(null);
        } catch { setEmailAnalytics(null); }
      } catch (e) {
        if (!aborted) setAnalyticsError(e?.message || 'Failed to load analytics');
      } finally {
        if (!aborted) setAnalyticsLoading(false);
      }
    };
    loadAnalytics();
    return () => { aborted = true; };
  }, [isAnalyticsModalVisible, selectedAnalyticsSite, user?.username]);

  // Passive site usage reconciliation
  useEffect(() => {
    if (!user?.uid) return;
    if (!subscription) return;
    // Skip for admin users
    const isAdmin = userData?.tier === 'admin' || 
                   userData?.subscriptionTier === 'admin' || 
                   subscription?.tier === 'admin';
    if (isAdmin) return;
    
    const handle = setTimeout(() => {
      syncUserSiteCount(user.uid).catch(()=>{});
    }, 1500);
    return () => clearTimeout(handle);
  }, [user?.uid, userData?.tier, userData?.subscriptionTier, subscription?.tier]);

  const onTabChange = (key) => {
    setActiveTab(key);
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      sp.set('tab', key);
      const newUrl = `${window.location.pathname}?${sp.toString()}`;
      window.history.replaceState(null, '', newUrl);
    }
  };

  const loadUserSites = async () => {
    if (!user?.uid) return;
    try {
      const userSites = await getUserSites(user.uid);
      setSites(userSites);
    } catch (error) {
      console.error('Error loading sites:', error);
      message.error('Failed to load sites');
    }
  };

  const loadSubscription = async () => {
    if (!user?.uid) return;
    try {
      setSubscriptionLoading(true);
      
      // Ensure user has proper subscription data (handles migration)
      await ensureUserSubscription(user.uid);
      
      const sub = await getUserSubscription(user.uid);
      setSubscription(sub);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const loadStripeMetrics = async (userId, days = 30) => {
    try {
      setStripeMetricsLoading(true);
      const data = await getStripeMetrics(userId, days);
      setStripeMetrics(data);
    } catch (error) {
      console.error('Error loading Stripe metrics:', error);
      setStripeMetrics(null);
    } finally {
      setStripeMetricsLoading(false);
    }
  };

  // Helper functions
  const handleLogout = async () => {
    try {
      await signOut();
      message.success('Logged out successfully');
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      message.error('Failed to logout');
    }
  };

  const handleSiteEdit = (site) => {
    window.location.href = `/Editor/site?site=${site.id}`;
  };

  const handleViewAnalytics = (site) => {
    setActiveTab('analytics');
  };

  const handleManageEmails = (site) => {
    setActiveTab('emails');
  };

  const handleSiteSettings = (site) => {
    setSelectedSite(site);
    setShowSiteSettings(true);
  };

  const handleDeleteSite = (site) => {
    setSiteToDelete(site);
    setIsDeleteModalVisible(true);
  };

  const handleTogglePublish = async (site) => {
    try {
      const updatedSite = { ...site, isPublished: !site.isPublished };
      await updateSite(updatedSite);
      await loadUserSites();
      message.success(`Site ${updatedSite.isPublished ? 'published' : 'unpublished'} successfully`);
    } catch (error) {
      message.error('Failed to update site');
    }
  };

  const confirmDeleteSite = async () => {
    if (!siteToDelete) return;
    try {
      await deleteSite(siteToDelete.id, user.uid);
      await loadUserSites();
      message.success('Site deleted successfully');
      setIsDeleteModalVisible(false);
      setSiteToDelete(null);
    } catch (error) {
      message.error('Failed to delete site');
    }
  };

  const handleCreateSite = async (values) => {
    if (!user?.uid) return;
    try {
      setProcessingCreate(true);
      
      const canCreate = await canCreateSite(user.uid);
      if (!canCreate.allowed) {
        message.error(canCreate.reason);
        if (canCreate.reason.includes('upgrade')) {
          setUpgradeReason('create_site');
          setShowUpgradeModal(true);
        }
        return;
      }

      const siteData = {
        name: values.siteName,
        url: values.siteUrl,
        isPublished: false
      };

      await createSite(siteData, user.uid);
      await loadUserSites();
      message.success('Site created successfully!');
      setIsCreateModalVisible(false);
      createForm.resetFields();
    } catch (error) {
      console.error('Error creating site:', error);
      message.error('Failed to create site');
    } finally {
      setProcessingCreate(false);
    }
  };

  const copyPublicUrl = (site) => {
    const publicUrl = `${window.location.origin}/u/${user.username}/${site.name}`;
    navigator.clipboard.writeText(publicUrl);
    message.success('Public URL copied to clipboard');
  };

  // Get current plan info
  const getCurrentPlan = () => {
    // Check for admin tier first - check both userData and subscription
    const isAdmin = userData?.tier === 'admin' || 
                   userData?.subscriptionTier === 'admin' || 
                   subscription?.tier === 'admin';
    
    if (isAdmin) {
      return { name: 'Admin', maxSites: -1, sitesIncluded: -1 };
    }
    
    // Check subscription tier if available
    const tier = subscription?.tier || userData?.subscriptionTier || userData?.tier;
    
    if (!tier) {
      return PRICING_PLANS.find(p => p.id === 'free') || { name: 'Free', sitesIncluded: 1, maxSites: 1 };
    }
    
    switch (tier) {
      case 'pro':
        return PRICING_PLANS.find(p => p.id === 'pro') || { name: 'Pro', maxSites: 5 };
      case 'business':
        return PRICING_PLANS.find(p => p.id === 'business') || { name: 'Business', maxSites: 25 };
      case 'admin':
        return { name: 'Admin', maxSites: -1, sitesIncluded: -1 };
      case 'free':
      default:
        return PRICING_PLANS.find(p => p.id === 'free') || { name: 'Free', maxSites: 1 };
    }
  };

  const loadTotalSiteVisits = async () => {
    if (!user?.uid) return;
    
    try {
      setTotalSiteVisitsLoading(true);
      
      // Get overview analytics for all user sites
      const params = new URLSearchParams({
        userId: user.uid,
        range: '30d',
        type: 'overview'
      });

      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (user?.accessToken) {
        headers['Authorization'] = `Bearer ${user.accessToken}`;
      }

      const response = await fetch(`/api/user/analytics?${params}`, {
        headers,
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.analytics?.totalViews) {
          setTotalSiteVisits(data.analytics.totalViews);
        }
      }
    } catch (error) {
      console.error('Error loading total site visits:', error);
    } finally {
      setTotalSiteVisitsLoading(false);
    }
  };

  // Load total site visits data
  useEffect(() => {
    if (user?.uid && activeTab === 'overview') {
      loadTotalSiteVisits();
    }
  }, [user?.uid, activeTab, sites.length]); // Refresh when sites change

  const getTotalSiteVisits = () => {
    if (totalSiteVisitsLoading) return '...';
    
    // Format the number nicely
    if (totalSiteVisits >= 1000000) {
      return `${(totalSiteVisits / 1000000).toFixed(1)}M`;
    } else if (totalSiteVisits >= 1000) {
      return `${(totalSiteVisits / 1000).toFixed(1)}K`;
    } else {
      return totalSiteVisits.toString() || '0';
    }
  };

  const currentPlan = getCurrentPlan();
  const rawUsage = subscription ? subscription.usage?.sitesCount : undefined;
  const siteUsage = (typeof rawUsage === 'number' && rawUsage >= 0) ? rawUsage : sites.length;
  const maxSites = subscription ? subscription.limits?.maxSites : currentPlan.maxSites;
  const usagePercentage = maxSites === -1 ? 0 : (siteUsage / maxSites) * 100;
  const atSiteLimit = currentPlan.name !== 'Admin' && maxSites !== -1 && siteUsage >= maxSites;

  // Responsive Menu Component
  const ResponsiveDashboardMenu = () => {
    const menuContent = (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ 
          padding: isMobile ? '24px 24px 16px' : '16px', 
          textAlign: 'center', 
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <Title level={4} style={{ color: 'white', margin: 0, fontWeight: 600 }}>
            Dashboard
          </Title>
        </div>
        
        {/* Menu Items */}
        <div style={{ flex: 1, padding: '16px 0' }}>
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={[activeTab]}
            onClick={({ key }) => {
              onTabChange(key);
              if (isMobile) setMobileMenuOpen(false);
            }}
            items={menuItems}
            style={{ 
              border: 'none',
              background: 'transparent'
            }}
          />
        </div>

        {/* User Profile Section */}
        <div style={{ 
          padding: sidebarCollapsed && !isMobile ? '12px 8px' : '16px',
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          background: 'rgba(0,0,0,0.02)'
        }}>
          {sidebarCollapsed && !isMobile ? (
            // Collapsed sidebar - just avatar and icon buttons
            <Space direction="vertical" style={{ width: '100%' }} size={8} align="center">
              <Avatar 
                size={32} 
                src={user?.photoURL} 
                icon={<UserOutlined />}
                style={{ backgroundColor: token.colorPrimary }}
              />
              
              <Tooltip title="Account Settings" placement="right">
                <Button 
                  icon={<SettingOutlined />} 
                  onClick={() => {
                    accountForm.setFieldsValue({
                      fullName: user.fullName || user.displayName || '',
                      username: currentCanonicalUsername,
                      email: user.email,
                      phone: userData?.phone || ''
                    });
                    setShowAccountSettings(true);
                  }}
                  type="text"
                  size="small"
                  style={{ width: 32, height: 32 }}
                />
              </Tooltip>
              
              <Tooltip title="Logout" placement="right">
                <Button 
                  icon={<LogoutOutlined />}
                  onClick={handleLogout}
                  type="text"
                  danger
                  size="small"
                  style={{ width: 32, height: 32 }}
                />
              </Tooltip>
            </Space>
          ) : (
            // Expanded sidebar - full profile section
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12,
                padding: '12px',
                borderRadius: '8px',
                background: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.06)'
              }}>
                <Avatar 
                  size={isMobile ? 48 : 40} 
                  src={user?.photoURL} 
                  icon={<UserOutlined />}
                  style={{ backgroundColor: token.colorPrimary }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontWeight: 600, 
                    fontSize: isMobile ? 16 : 14, 
                    color: token.colorText,
                    marginBottom: 2
                  }}>
                    {userData?.displayName || user?.displayName || 'User'}
                  </div>
                  <div style={{ 
                    color: token.colorTextSecondary, 
                    fontSize: isMobile ? 13 : 12 
                  }}>
                    {user?.email}
                  </div>
                  <div style={{ 
                    color: token.colorPrimary, 
                    fontSize: isMobile ? 12 : 11,
                    fontWeight: 500
                  }}>
                    {currentPlan.name} Plan
                  </div>
                </div>
              </div>
              
              <Button 
                icon={<SettingOutlined />} 
                onClick={() => {
                  accountForm.setFieldsValue({
                    fullName: user.fullName || user.displayName || '',
                    username: currentCanonicalUsername,
                    email: user.email,
                    phone: userData?.phone || ''
                  });
                  setShowAccountSettings(true);
                  if (isMobile) setMobileMenuOpen(false);
                }}
                size={isMobile ? 'large' : 'default'}
                style={{
                  height: isMobile ? 48 : 36,
                  fontSize: isMobile ? 16 : 14
                }}
                block
              >
                Account Settings
              </Button>
              
              <Button 
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                type="text"
                danger
                size={isMobile ? 'large' : 'default'}
                style={{
                  height: isMobile ? 48 : 36,
                  fontSize: isMobile ? 16 : 14
                }}
                block
              >
                Logout
              </Button>
            </Space>
          )}
        </div>
      </div>
    );

    if (isMobile) {
      return (
        <Drawer
          placement="bottom"
          closable={true}
          onClose={() => setMobileMenuOpen(false)}
          open={mobileMenuOpen}
          height="80vh"
          styles={{
            body: { padding: 0 }
          }}
        >
          {menuContent}
        </Drawer>
      );
    } else {
      return (
        <Sider 
          collapsible 
          collapsed={sidebarCollapsed} 
          onCollapse={setSidebarCollapsed}
          theme="light"
          width={280}
          style={{
            boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
            background: 'white'
          }}
        >
          {menuContent}
        </Sider>
      );
    }
  };

  if (authLoading || loading || subscriptionLoading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <Spin size="large" />
        <Text>Loading dashboard...</Text>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorText: 'var(--text-primary)',
          colorTextSecondary: 'var(--text-secondary)',
          colorBgLayout: 'var(--bg-primary)',
          colorBgContainer: 'var(--panel-bg)',
          colorBorder: 'var(--border-color)',
          borderRadius: 12
        }
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        {/* Desktop Sidebar / Mobile Drawer */}
        <ResponsiveDashboardMenu />

        <Layout>
          {/* Header */}
          <Header style={{ 
            background: 'white', 
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Mobile Menu Toggle */}
              {isMobile && (
                <Button 
                  icon={<MenuOutlined />} 
                  onClick={() => setMobileMenuOpen(true)}
                  type="text"
                  size="large"
                />
              )}
              
              <Title level={3} style={{ margin: 0, color: token.colorText }}>
                {activeTab === 'overview' && 'Dashboard Overview'}
                {activeTab === 'sites' && 'Site Management'}
                {activeTab === 'analytics' && 'Analytics & Insights'}
                {activeTab === 'emails' && 'Email Management'}
                {activeTab === 'payments' && 'Payment Settings'}
                {activeTab === 'ecommerce' && 'E-commerce'}
              </Title>
            </div>
            
            {/* Desktop Header Actions */}
            {!isMobile && (
              <Space size={16}>
                <Dropdown
                  trigger={['click']}
                  placement="bottomRight"
                  menu={{
                    items: [
                      {
                        key: 'profile',
                        label: (
                          <div style={{ padding: '8px 4px' }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>
                              {userData?.displayName || user?.displayName || 'User'}
                            </div>
                            <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
                              {currentPlan.name} Plan
                            </div>
                          </div>
                        ),
                        disabled: true
                      },
                      {
                        type: 'divider'
                      },
                      {
                        key: 'settings',
                        icon: <SettingOutlined />,
                        label: 'Account Settings',
                        onClick: () => {
                          accountForm.setFieldsValue({
                            fullName: user.fullName || user.displayName || '',
                            username: currentCanonicalUsername,
                            email: user.email,
                            phone: userData?.phone || ''
                          });
                          setShowAccountSettings(true);
                        }
                      },
                      {
                        type: 'divider'
                      },
                      {
                        key: 'logout',
                        icon: <LogoutOutlined />,
                        label: 'Logout',
                        danger: true,
                        onClick: handleLogout
                      }
                    ]
                  }}
                >
                  <Space style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 8 }}>
                    <Avatar 
                      size={32} 
                      src={user?.photoURL} 
                      icon={<UserOutlined />}
                      style={{ backgroundColor: token.colorPrimary }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <Text style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>
                        {userData?.displayName?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'User'}
                      </Text>
                      <Text style={{ fontSize: 11, color: token.colorTextSecondary, lineHeight: 1 }}>
                        {currentPlan.name}
                      </Text>
                    </div>
                  </Space>
                </Dropdown>
              </Space>
            )}
          </Header>

          {/* Main Content */}
          <Content style={{ 
            padding: '2px 4px', 
            background: token.colorBgLayout,
            minHeight: 'calc(100vh - 64px)',
            overflow: 'auto'
          }}>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                {/* Welcome Section */}
                <Card 
                  style={{ 
                    marginBottom: 24, 
                    borderRadius: 12, 
                    border: `1px solid ${token.colorBorderSecondary}`,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  }}
                  styles={{ body: { padding: '24px 32px' } }}
                >
                  <Row align="middle" justify="space-between">
                    <Col>
                      <Space direction="vertical" size={4}>
                        <Title level={2} style={{ color: 'white', margin: 0 }}>
                          Welcome back, {userData?.displayName || user?.displayName || user?.email || 'User'}!
                        </Title>
                        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>
                          Here's what's happening with your sites today.
                        </Text>
                      </Space>
                    </Col>
                    <Col>
                      <Button 
                        type="primary" 
                        size="large"
                        icon={<PlusOutlined />} 
                        onClick={() => setIsCreateModalVisible(true)}
                        disabled={atSiteLimit}
                        style={{
                          background: atSiteLimit ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
                          borderColor: 'rgba(255,255,255,0.3)',
                          backdropFilter: 'blur(10px)'
                        }}
                      >
                        {atSiteLimit ? 'Upgrade to Create' : 'Create New Site'}
                      </Button>
                    </Col>
                  </Row>
                </Card>

                {/* Key Metrics */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  <Col xs={24} sm={12} lg={6}>
                    <Card 
                      style={{ 
                        borderRadius: 12, 
                        border: `1px solid ${token.colorBorderSecondary}`,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        overflow: 'hidden'
                      }}
                      styles={{ 
                        body: { padding: 20 },
                        header: { borderRadius: '12px 12px 0 0' }
                      }}
                    >
                      <Statistic
                        title={<span style={{ color: 'rgba(255,255,255,0.9)' }}>Total Sites</span>}
                        value={sites.length}
                        valueStyle={{ color: 'white' }}
                        prefix={<GlobalOutlined style={{ color: 'white' }} />}
                        suffix={
                          <Text style={{ color: 'rgba(255,255,255,0.7)' }}>
                            / {maxSites === -1 ? '∞' : maxSites}
                          </Text>
                        }
                      />
                      {maxSites !== -1 && (
                        <Progress 
                          percent={usagePercentage} 
                          strokeColor="rgba(255,255,255,0.8)"
                          trailColor="rgba(255,255,255,0.2)"
                          showInfo={false}
                          style={{ marginTop: 8 }}
                        />
                      )}
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card 
                      style={{ 
                        borderRadius: 12, 
                        border: `1px solid ${token.colorBorderSecondary}`,
                        overflow: 'hidden'
                      }}
                      styles={{ 
                        body: { padding: 20 },
                        header: { borderRadius: '12px 12px 0 0' }
                      }}
                    >
                      <Statistic
                        title="Published Sites"
                        value={sites.filter(site => site.isPublished).length}
                        prefix={<EyeOutlined style={{ color: token.colorSuccess }} />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card 
                      style={{ 
                        borderRadius: 12, 
                        border: `1px solid ${token.colorBorderSecondary}`,
                        overflow: 'hidden'
                      }}
                      styles={{ 
                        body: { padding: 20 },
                        header: { borderRadius: '12px 12px 0 0' }
                      }}
                    >
                      <Statistic
                        title="Current Plan"
                        value={currentPlan.name}
                        prefix={<CrownOutlined style={{ color: token.colorWarning }} />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card 
                      style={{ 
                        borderRadius: 12, 
                        border: `1px solid ${token.colorBorderSecondary}`,
                        overflow: 'hidden'
                      }}
                      styles={{ 
                        body: { padding: 20 },
                        header: { borderRadius: '12px 12px 0 0' }
                      }}
                    >
                      <Statistic
                        title="Total Visits"
                        value={getTotalSiteVisits()}
                        suffix="this month"
                        prefix={<BarChartOutlined style={{ color: token.colorInfo }} />}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* Recent Sites and Activity */}
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={16}>
                    <Card
                      title={
                        <Space>
                          <GlobalOutlined />
                          <span>Recent Sites</span>
                        </Space>
                      }
                      extra={
                        <Button type="link" onClick={() => onTabChange('sites')}>
                          View All
                        </Button>
                      }
                      style={{ 
                        borderRadius: 12, 
                        border: `1px solid ${token.colorBorderSecondary}`,
                        overflow: 'hidden'
                      }}
                      styles={{ 
                        body: { padding: 20 },
                        header: { borderRadius: '12px 12px 0 0' }
                      }}
                    >
                      {sites.length === 0 ? (
                        <Empty
                          description="No sites created yet"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        >
                          <Button 
                            type="primary" 
                            icon={<PlusOutlined />} 
                            onClick={() => setIsCreateModalVisible(true)}
                            disabled={atSiteLimit}
                          >
                            {atSiteLimit ? 'Upgrade to Create Site' : 'Create Your First Site'}
                          </Button>
                        </Empty>
                      ) : (
                        <div style={{ 
                          display: 'flex', 
                          flexWrap: 'wrap', 
                          gap: '16px',
                          justifyContent: 'flex-start'
                        }}>
                          {sites.slice(0, 4).map(site => (
                            <FlipSiteCard
                              key={site.id}
                              site={site}
                              user={user}
                              onEdit={handleSiteEdit}
                              onDelete={handleDeleteSite}
                              onPublish={handleTogglePublish}
                              onViewAnalytics={handleViewAnalytics}
                              onSettings={handleSiteSettings}
                              onManageEmails={handleManageEmails}
                              loading={false}
                            />
                          ))}
                        </div>
                      )}
                    </Card>
                  </Col>
                  <Col xs={24} lg={8}>
                    <Card
                      title={
                        <Space>
                          <ShoppingOutlined />
                          <span>Recent Orders</span>
                        </Space>
                      }
                      style={{ 
                        borderRadius: 12, 
                        border: `1px solid ${token.colorBorderSecondary}`,
                        overflow: 'hidden'
                      }}
                      styles={{ 
                        body: { padding: 20 },
                        header: { borderRadius: '12px 12px 0 0' }
                      }}
                    >
                      {sellerOrdersLoading ? (
                        <Spin />
                      ) : sellerOrders.length === 0 ? (
                        <Empty
                          description="No orders yet"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {sellerOrders.slice(0, 5).map(order => (
                            <div key={order.id} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 0',
                              borderBottom: '1px solid #f0f0f0'
                            }}>
                              <div>
                                <Text strong>#{order.id.slice(-8)}</Text>
                                <div>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {new Date(order.created).toLocaleDateString()}
                                  </Text>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 600 }}>
                                  ${(order.total / 100).toFixed(2)}
                                </div>
                                <Tag color={order.status === 'paid' ? 'green' : 'orange'}>
                                  {order.status}
                                </Tag>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </Col>
                </Row>
              </div>
            )}

            {/* Sites Tab */}
            {activeTab === 'sites' && (
              <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <Card
                  title={
                    <Space>
                      <GlobalOutlined />
                      <span>Your Sites</span>
                      <Tag color="blue">{sites.length}</Tag>
                    </Space>
                  }
                  extra={
                    <Space>
                      {maxSites !== -1 && (
                        <Text type="secondary">
                          {siteUsage}/{maxSites} sites used
                        </Text>
                      )}
                      <Button 
                        type="primary" 
                        icon={<PlusOutlined />} 
                        onClick={() => setIsCreateModalVisible(true)}
                        disabled={atSiteLimit}
                      >
                        {atSiteLimit ? 'Upgrade to Create' : 'Create Site'}
                      </Button>
                    </Space>
                  }
                  style={{ borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }}
                >
                  {atSiteLimit && (
                    <Alert
                      type="warning"
                      message="Site Limit Reached"
                      description={`You've reached your limit of ${maxSites} sites. Upgrade your plan to create more sites.`}
                      action={
                        <Button type="primary" size="small" onClick={() => setShowUpgradeModal(true)}>
                          Upgrade Plan
                        </Button>
                      }
                      style={{ marginBottom: 16 }}
                      showIcon
                    />
                  )}
                  
                  {sites.length === 0 ? (
                    <Empty
                      description="No sites created yet"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    >
                      <Button 
                        type="primary" 
                        icon={<PlusOutlined />} 
                        onClick={() => setIsCreateModalVisible(true)}
                        disabled={atSiteLimit}
                      >
                        {atSiteLimit ? 'Upgrade to Create Site' : 'Create Your First Site'}
                      </Button>
                    </Empty>
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: '16px',
                      justifyContent: 'flex-start'
                    }}>
                      {sites.map(site => (
                        <FlipSiteCard
                          key={site.id}
                          site={site}
                          user={user}
                          onEdit={handleSiteEdit}
                          onDelete={handleDeleteSite}
                          onPublish={handleTogglePublish}
                          onViewAnalytics={handleViewAnalytics}
                          onSettings={handleSiteSettings}
                          onManageEmails={handleManageEmails}
                          loading={false}
                        />
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <Tabs 
                  defaultActiveKey="site-analytics" 
                  size="large"
                  style={{ marginBottom: 16 }}
                  items={[
                    {
                      key: 'site-analytics',
                      label: (
                        <Space>
                          <BarChartOutlined />
                          <span>Site Analytics</span>
                        </Space>
                      ),
                      children: (
                        <Card style={{ borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }}>
                          <UserAnalyticsDashboard user={user} userData={userData} />
                        </Card>
                      )
                    },
                    {
                      key: 'payment-analytics',
                      label: (
                        <Space>
                          <LineChartOutlined />
                          <span>Payment Analytics</span>
                        </Space>
                      ),
                      children: (
                        stripeConnect?.connected ? (
                          <Card
                            className="elevated-card"
                            style={{ borderRadius: 16, border: `1px solid ${token.colorBorderSecondary}` }}
                            styles={{ body: { padding: 20 } }}
                            title={<span style={{ fontWeight: 600 }}>Payments Insights</span>}
                            extra={
                              <Space>
                                <Button size="small" onClick={() => loadStripeMetrics(user.uid, metricsDays)} loading={stripeMetricsLoading}>
                                  <ReloadOutlined /> Refresh
                                </Button>
                                <Space size={4}>
                                  <Text type="secondary">Range:</Text>
                                  <Button size="small" type={metricsDays===7?'primary':'default'} onClick={()=>{setMetricsDays(7); loadStripeMetrics(user.uid, 7);}}>7d</Button>
                                  <Button size="small" type={metricsDays===30?'primary':'default'} onClick={()=>{setMetricsDays(30); loadStripeMetrics(user.uid, 30);}}>30d</Button>
                                  <Button size="small" type={metricsDays===90?'primary':'default'} onClick={()=>{setMetricsDays(90); loadStripeMetrics(user.uid, 90);}}>90d</Button>
                                </Space>
                              </Space>
                            }
                          >
                            {stripeMetricsLoading ? (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                {[1,2,3].map(i => (
                                  <div key={i} style={{ height: 120, borderRadius: 8, background: token.colorFill, animation: 'pulse 1.4s ease-in-out infinite' }} />
                                ))}
                              </div>
                            ) : stripeMetrics ? (
                              <Row gutter={[16, 16]}>
                                <Col xs={24} md={12}>
                                  <Card 
                                    size="small" 
                                    title="Total Revenue"
                                    style={{ 
                                      borderRadius: 8,
                                      overflow: 'hidden'
                                    }}
                                    styles={{ 
                                      body: { padding: 16 },
                                      header: { borderRadius: '8px 8px 0 0' }
                                    }}
                                  >
                                    <Statistic 
                                      value={stripeMetrics.net || 0} 
                                      precision={2} 
                                      prefix="$" 
                                      valueStyle={{ color: token.colorSuccess }}
                                    />
                                  </Card>
                                </Col>
                                <Col xs={24} md={12}>
                                  <Card 
                                    size="small" 
                                    title="Total Payouts"
                                    style={{ 
                                      borderRadius: 8,
                                      overflow: 'hidden'
                                    }}
                                    styles={{ 
                                      body: { padding: 16 },
                                      header: { borderRadius: '8px 8px 0 0' }
                                    }}
                                  >
                                    <Statistic 
                                      value={stripeMetrics.payouts || 0} 
                                      precision={2} 
                                      prefix="$" 
                                      valueStyle={{ color: token.colorPrimary }}
                                    />
                                  </Card>
                                </Col>
                              </Row>
                            ) : (
                              <Alert
                                message="No payment metrics available"
                                description="Complete some transactions to see payment insights here."
                                type="info"
                                showIcon
                              />
                            )}
                          </Card>
                        ) : (
                          <Alert
                            message="Stripe not connected"
                            description="Connect your Stripe account to view payment analytics and insights."
                            type="warning"
                            showIcon
                            action={
                              <Button 
                                type="primary" 
                                onClick={() => onTabChange('payments')}
                              >
                                Connect Stripe
                              </Button>
                            }
                          />
                        )
                      )
                    }
                  ]}
                />
              </div>
            )}

            {/* Emails Tab */}
            {activeTab === 'emails' && (
              <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <Card 
                  title={
                    <Space>
                      <MailOutlined />
                      <span>Email Management</span>
                    </Space>
                  }
                  style={{ borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }}
                >
                  <EmailManager />
                </Card>
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <Card
                  title={
                    <Space>
                      <WalletOutlined />
                      <span>Payment Settings</span>
                    </Space>
                  }
                  style={{ borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }}
                >
                  <Alert
                    type="info"
                    message="Payment Integration Setup"
                    description="Connect your Stripe or PayPal account to start accepting payments on your sites."
                    showIcon
                    style={{ marginBottom: 24 }}
                  />
                  
                  <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                      <Card 
                        title="Stripe Integration" 
                        size="small"
                        style={{ borderRadius: 8 }}
                      >
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Text>Accept credit cards, digital wallets, and more with Stripe.</Text>
                          <Button 
                            type="primary"
                            loading={connectLoading}
                            onClick={async () => {
                              try {
                                setConnectLoading(true);
                                const url = await startStripeConnectOnboarding(user.uid, user.email, '/dashboard?tab=payments');
                                window.location.href = url;
                              } catch (e) {
                                message.error(e?.message || 'Unable to start Stripe onboarding');
                              } finally {
                                setConnectLoading(false);
                              }
                            }}
                          >
                            Connect Stripe
                          </Button>
                        </Space>
                      </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                      <Card 
                        title="PayPal Integration" 
                        size="small"
                        style={{ borderRadius: 8 }}
                      >
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Text>Accept PayPal payments and other payment methods.</Text>
                          <Button 
                            disabled={connectConfigLoading}
                            loading={connectLoading}
                            onClick={async () => {
                              try {
                                setConnectLoading(true);
                                const url = await startPaypalOnboarding(user.uid, user.email, '/dashboard?tab=payments');
                                window.location.href = url;
                              } catch (e) {
                                message.error(e?.message || 'Unable to start PayPal onboarding');
                              } finally {
                                setConnectLoading(false);
                              }
                            }}
                          >
                            Connect PayPal
                          </Button>
                        </Space>
                      </Card>
                    </Col>
                  </Row>
                </Card>
              </div>
            )}

            {/* E-commerce Tab */}
            {activeTab === 'ecommerce' && (
              <div style={{ height: '100%' }}>
                <Admin />
              </div>
            )}
          </Content>
        </Layout>
      </Layout>

      {/* Modals */}
      
      {/* Account Settings Responsive Drawer */}
      <Drawer
        title={
          <Space>
            <SettingOutlined />
            <span>Account Settings</span>
          </Space>
        }
        placement={isMobile ? 'bottom' : 'right'}
        closable={true}
        onClose={() => setShowAccountSettings(false)}
        open={showAccountSettings}
        width={isMobile ? undefined : 600}
        height={isMobile ? '80vh' : undefined}
        styles={{
          body: { padding: isMobile ? '16px' : '24px' }
        }}
      >
        <Tabs
          defaultActiveKey="profile"
          size={isMobile ? 'large' : 'default'}
          tabPosition={isMobile ? 'top' : 'top'}
          items={[
            {
              key: 'profile',
              label: (
                <Space>
                  <UserOutlined />
                  <span>Profile</span>
                </Space>
              ),
              children: (
                <Form
                  form={accountForm}
                  layout="vertical"
                  onValuesChange={() => setAccountHasChanges(true)}
                  onFinish={async (values) => {
                    try {
                      setSavingAccount(true);
                      
                      // Check username availability if changed
                      if (values.username !== currentCanonicalUsername) {
                        const isAvailable = await checkUsernameExists(values.username);
                        if (isAvailable) {
                          message.error('Username is already taken');
                          return;
                        }
                      }

                      // Update user data
                      await updateUserData(user.uid, {
                        fullName: values.fullName,
                        username: values.username,
                        phone: values.phone
                      });

                      // Update auth profile
                      await updateProfile(auth.currentUser, {
                        displayName: values.fullName
                      });

                      message.success('Profile updated successfully');
                      setAccountHasChanges(false);
                      setShowAccountSettings(false);
                    } catch (error) {
                      console.error('Error updating profile:', error);
                      message.error('Failed to update profile');
                    } finally {
                      setSavingAccount(false);
                    }
                  }}
                >
                  <Form.Item 
                    label="Full Name" 
                    name="fullName"
                    rules={[{ required: true, message: 'Please enter your full name' }]}
                  >
                    <Input placeholder="Your full name" size={isMobile ? 'large' : 'default'} />
                  </Form.Item>
                  
                  <Form.Item 
                    label="Username" 
                    name="username"
                    rules={[
                      { required: true, message: 'Please enter a username' },
                      { pattern: /^[a-z0-9_-]+$/, message: 'Username can only contain lowercase letters, numbers, hyphens, and underscores' }
                    ]}
                  >
                    <Input placeholder="your-username" size={isMobile ? 'large' : 'default'} />
                  </Form.Item>
                  
                  <Form.Item label="Email" name="email">
                    <Input disabled size={isMobile ? 'large' : 'default'} />
                  </Form.Item>
                  
                  <Form.Item label="Phone" name="phone">
                    <Input placeholder="+1 (555) 123-4567" size={isMobile ? 'large' : 'default'} />
                  </Form.Item>
                  
                  <Form.Item>
                    <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: '100%' }}>
                      <Button 
                        type="primary" 
                        htmlType="submit" 
                        loading={savingAccount}
                        disabled={!accountHasChanges}
                        size={isMobile ? 'large' : 'default'}
                        block={isMobile}
                      >
                        Save Changes
                      </Button>
                      <Button 
                        onClick={() => setShowAccountSettings(false)}
                        size={isMobile ? 'large' : 'default'}
                        block={isMobile}
                      >
                        Cancel
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              )
            },
            {
              key: 'security',
              label: (
                <Space>
                  <LockOutlined />
                  <span>Security</span>
                </Space>
              ),
              children: (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text>Password and security settings</Text>
                  <Alert
                    message="Password Management"
                    description="For security, password changes must be done through your email. Click the button below to receive a password reset email."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <Button 
                    type="default" 
                    loading={changingPassword}
                    size={isMobile ? 'large' : 'default'}
                    block={isMobile}
                    onClick={async () => {
                      try {
                        setChangingPassword(true);
                        // Trigger password reset email
                        const auth = await import('firebase/auth');
                        await auth.sendPasswordResetEmail(auth.getAuth(), user.email);
                        message.success('Password reset email sent! Check your inbox.');
                      } catch (error) {
                        message.error('Failed to send password reset email');
                      } finally {
                        setChangingPassword(false);
                      }
                    }}
                  >
                    Send Password Reset Email
                  </Button>
                </Space>
              )
            },
            {
              key: 'plan',
              label: (
                <Space>
                  <CrownOutlined />
                  <span>Plan & Billing</span>
                </Space>
              ),
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  <Card size="small">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <Text strong>Current Plan</Text>
                        <div style={{ marginTop: 8 }}>
                          <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
                            {currentPlan.name} Plan
                          </Tag>
                        </div>
                      </div>
                      
                      <div>
                        <Text strong>Site Usage</Text>
                        <div style={{ marginTop: 8 }}>
                          <Text>{siteUsage} of {maxSites === -1 ? '∞' : maxSites} sites used</Text>
                          {maxSites !== -1 && (
                            <Progress 
                              percent={usagePercentage} 
                              status={atSiteLimit ? 'exception' : 'normal'}
                              style={{ marginTop: 4 }}
                            />
                          )}
                        </div>
                      </div>
                      
                      {currentPlan.name !== 'Admin' && (
                        <Button 
                          type="primary"
                          icon={<CrownOutlined />}
                          onClick={() => {
                            setShowAccountSettings(false);
                            setShowUpgradeModal(true);
                          }}
                          size={isMobile ? 'large' : 'default'}
                          block={isMobile}
                        >
                          Upgrade Plan
                        </Button>
                      )}
                    </Space>
                  </Card>
                </Space>
              )
            }
          ]}
        />
      </Drawer>

      {/* Create Site Modal */}
      <Modal
        title={
          <Space>
            <PlusOutlined />
            <span>Create New Site</span>
          </Space>
        }
        open={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          createForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateSite}
        >
          <Form.Item
            label="Site Name"
            name="siteName"
            rules={[
              { required: true, message: 'Please enter a site name' },
              { max: 50, message: 'Site name must be less than 50 characters' }
            ]}
          >
            <Input placeholder="My Awesome Site" />
          </Form.Item>
          
          <Form.Item
            label="Site URL"
            name="siteUrl"
            rules={[
              { required: true, message: 'Please enter a site URL' },
              { pattern: /^[a-z0-9-]+$/, message: 'URL can only contain lowercase letters, numbers, and hyphens' }
            ]}
          >
            <Input 
              placeholder="my-site" 
              addonBefore={`${window?.location?.origin || ''}/u/${user?.username || userData?.username || 'username'}/`}
            />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={processingCreate}
                disabled={atSiteLimit}
              >
                {atSiteLimit ? 'Upgrade Required' : 'Create Site'}
              </Button>
              <Button onClick={() => {
                setIsCreateModalVisible(false);
                createForm.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
          
          {atSiteLimit && (
            <Alert
              type="warning"
              message="Site Limit Reached"
              description={`You've reached your limit of ${maxSites} sites. Upgrade your plan to create more.`}
              action={
                <Button type="link" onClick={() => {
                  setIsCreateModalVisible(false);
                  setShowUpgradeModal(true);
                }}>
                  Upgrade Now
                </Button>
              }
              showIcon
            />
          )}
        </Form>
      </Modal>

      {/* Delete Site Confirmation Modal */}
      <Modal
        title="Delete Site"
        open={isDeleteModalVisible}
        onOk={confirmDeleteSite}
        onCancel={() => {
          setIsDeleteModalVisible(false);
          setSiteToDelete(null);
        }}
        okText="Delete"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to delete "{siteToDelete?.name}"?</p>
        <p>This action cannot be undone.</p>
      </Modal>

      {/* Site Settings Modal */}
      {selectedSite && (
        <SiteSettingsModal
          site={selectedSite}
          visible={showSiteSettings}
          onClose={() => {
            setShowSiteSettings(false);
            setSelectedSite(null);
          }}
          onSave={async (updatedSite) => {
            try {
              await updateSite(updatedSite);
              await loadUserSites();
              message.success('Site settings updated');
              setShowSiteSettings(false);
              setSelectedSite(null);
            } catch (error) {
              message.error('Failed to update site settings');
            }
          }}
        />
      )}
    </ConfigProvider>
  );
}