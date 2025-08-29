'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserSites, createSite, deleteSite, updateSite, canCreateSite, syncUserSiteCount } from '../../lib/sites';
import { signOut } from '../../lib/auth';
import { PRICING_PLANS, createCheckoutSession, createSetupIntent, setDefaultPaymentMethod, getSubscriptionStatus, cancelSubscriptionAtPeriodEnd, resumeSubscription, switchSubscriptionPlan, startStripeConnectOnboarding, getStripeConnectedAccount, disconnectStripeAccount } from '../../lib/stripe';
import { startPaypalOnboarding } from '../../lib/paypal';
import { updateUserData, checkUsernameExists } from '../../lib/auth';
import { auth } from '@/lib/firebase';
import { updateProfile } from 'firebase/auth';
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { loadStripe as loadStripeJs } from '@stripe/stripe-js';
import { ensureUserSubscription, getUserSubscription } from '../../lib/subscriptions';
import SiteCard from '../Components/ui/SiteCard';
import dynamic from 'next/dynamic';
const SiteEmailManager = dynamic(() => import('../Components/email/SiteEmailManager'), { ssr: false });
import SiteSettingsModal from '../Components/ui/SiteSettingsModal';
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
  LogoutOutlined,
  CheckCircleOutlined,
  LockOutlined,
  CreditCardOutlined
} from '@ant-design/icons';
import {
  UserOutlined,
  SafetyOutlined,
  PhoneOutlined,
  MailOutlined,
  KeyOutlined
} from '@ant-design/icons';
import { ResponsiveContainer, LineChart as RechartsLineChart, Line as RechartsLine, XAxis as RechartsXAxis, YAxis as RechartsYAxis, Tooltip as RechartsTooltip, CartesianGrid as RechartsCartesianGrid, Legend as RechartsLegend } from 'recharts';
import { Admin } from './Admin/Admin';

const { Title, Text, Paragraph } = Typography;

export default function Dashboard() {
  const { token } = theme.useToken();
  const { user, userData, loading: authLoading } = useAuth();
  // Seller orders state (multi-tenant ecommerce)
  const [sellerOrders, setSellerOrders] = useState([]);
  const [sellerOrdersLoading, setSellerOrdersLoading] = useState(false);
  const [sellerOrdersCursor, setSellerOrdersCursor] = useState(null);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
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
  const [accountForm] = Form.useForm();
  const [savingAccount, setSavingAccount] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  // Account settings UX enhancements
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null }); // available: true|false|null
  const [accountHasChanges, setAccountHasChanges] = useState(false);
  const currentCanonicalUsername = (userData?.username || user?.username || '').toLowerCase();
  
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
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState('pro');
  const [showUpdatePaymentModal, setShowUpdatePaymentModal] = useState(false);
  const [stripePromise] = useState(() => {
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    return pk ? loadStripeJs(pk) : null;
  });
  const [clientSecret, setClientSecret] = useState(null);
  const [customerId, setCustomerId] = useState(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [managing, setManaging] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [stripeConnect, setStripeConnect] = useState(null);
  const [paypalConnect, setPaypalConnect] = useState(null);
  const [connectConfig, setConnectConfig] = useState({ stripe: { configured: true, missing: [] }, paypal: { configured: true, missing: [] } });
  const [connectConfigLoading, setConnectConfigLoading] = useState(false);
  const [stripeSummary, setStripeSummary] = useState(null);
  const [stripeSummaryLoading, setStripeSummaryLoading] = useState(false);
  const [paypalSummary, setPaypalSummary] = useState(null);
  const [paypalSummaryLoading, setPaypalSummaryLoading] = useState(false);
  const [stripeMetrics, setStripeMetrics] = useState(null);
  const [stripeMetricsLoading, setStripeMetricsLoading] = useState(false);
  const [metricsDays, setMetricsDays] = useState(30);
  const [activeTab, setActiveTab] = useState('overview');
  const [isDark, setIsDark] = useState(false);

  // Load recent seller orders (paginated) when overview tab active
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

  // Passive site usage reconciliation (runs once when sites & subscription loaded) to prevent stale usage allowing extra sites
  useEffect(() => {
    if (!user?.uid) return;
    if (!subscription) return; // wait for subscription fetch
    // Only reconcile for finite tiers and when we have sites loaded
    if (subscription?.tier === 'admin') return;
    // Defer slightly to avoid blocking initial paint
    const handle = setTimeout(() => {
      syncUserSiteCount(user.uid).catch(()=>{});
    }, 1500);
    return () => clearTimeout(handle);
  }, [user?.uid, subscription?.tier]);

  // Sync with global theme classes set by ThemeInitializer (dark-theme / light-theme)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains('dark-theme'));
    update();
    const obs = new MutationObserver(update);
    obs.observe(root, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
    return () => obs.disconnect();
  }, []);

  // Initialize active tab from URL (?tab=overview|sites|payments|insights)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const allowed = new Set(['overview', 'sites', 'payments', 'insights', 'ecommerce']);
    const sp = new URLSearchParams(window.location.search);
    const t = (sp.get('tab') || '').toLowerCase();
    if (allowed.has(t)) {
      setActiveTab(t);
    }
  }, []);

  const onTabChange = (key) => {
    setActiveTab(key);
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      sp.set('tab', key);
      const next = `${window.location.pathname}?${sp.toString()}`;
      window.history.replaceState({}, '', next);
    }
  };

  // Load user sites and subscription on component mount
  useEffect(() => {
    if (user && !authLoading) {
      loadUserSites();
      loadUserSubscription();
  loadConnectConfig();
  loadPaymentConnections();
      // Stripe OAuth fallback: if Stripe redirected here with code/state, forward to server callback
      try {
        const search = new URLSearchParams(window.location.search);
        const hasConnectFlag = search.has('connect');
        const code = search.get('code');
        const state = search.get('state');
        if (!hasConnectFlag && code && state) {
          const origin = window.location.origin;
          const error = search.get('error');
          const params = new URLSearchParams();
          if (code) params.set('code', code);
          if (state) params.set('state', state);
          if (error) params.set('error', error);
          window.location.replace(`${origin}/api/connect/stripe/oauth/callback?${params.toString()}`);
          return; // stop further processing; navigation will occur
        }
      } catch {}
      const search = new URLSearchParams(window.location.search);
      const flag = search.get('connect');
      if (flag === 'stripe_success') {
        message.success('Stripe account connected');
        search.delete('connect');
        const next = `${window.location.pathname}${search.toString() ? '?' + search.toString() : ''}`;
        window.history.replaceState({}, '', next);
      } else if (flag === 'paypal_success') {
        message.success('PayPal connected');
        search.delete('connect');
        const next = `${window.location.pathname}${search.toString() ? '?' + search.toString() : ''}`;
        window.history.replaceState({}, '', next);
      }
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

  const loadUserSubscription = async () => {
    try {
      setSubscriptionLoading(true);
      // Ensure user has proper subscription data in Firebase
      const userSubscription = await ensureUserSubscription(user.uid);
      setSubscription(userSubscription);
      console.log('User subscription loaded:', userSubscription);
      try {
        const status = await getSubscriptionStatus({ email: user.email });
        setSubscriptionInfo(status.data);
      } catch {}
    } catch (error) {
      console.error('Error loading subscription:', error);
      // Set default free tier if error
      setSubscription({
        tier: 'free',
        limits: {
          maxStorage: 100 * 1024 * 1024,
          maxImages: 20,
          maxVideos: 5,
          maxSites: 1
        },
        usage: {
          storageUsed: 0,
          imageCount: 0,
          videoCount: 0,
          sitesCount: 0
        }
      });
    } finally {
      setSubscriptionLoading(false);
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
      if (!values?.name || typeof values.name !== 'string' || values.name.trim() === '') {
        message.error('Please enter a valid site name');
        return;
      }
      const canCreate = await canCreateSite(user.uid);
      if (!canCreate.allowed) {
        showUpgradeModalHandler(canCreate.reason);
        return;
      }
      const newSite = await createSite(user.uid, {
        name: values.name.trim(),
        description: values.description?.trim() || '',
        isPublished: false,
      });
      message.success('Site created successfully!');
      setIsCreateModalVisible(false);
      createForm.resetFields();
      loadUserSites();
      window.location.href = `/Editor/site?site=${newSite.id}`;
    } catch (error) {
      console.error('Error creating site:', error);
      message.error('Failed to create site: ' + (error?.message || 'Unknown error'));
    } finally {
      setProcessingCreate(false);
    }
  };

  // Delete site handlers
  const handleDeleteSite = (site, event) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    setSiteToDelete(site);
    setIsDeleteModalVisible(true);
  };

  const confirmDeleteSite = async () => {
    if (!siteToDelete) return;
    try {
      await deleteSite(user.uid, siteToDelete.id);
      message.success(`Site "${siteToDelete.name}" deleted successfully`);
      await loadUserSites();
    } catch (error) {
      console.error('Error deleting site:', error);
      message.error(`Failed to delete site: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsDeleteModalVisible(false);
      setSiteToDelete(null);
    }
  };



  // Publish/unpublish a site and optionally generate a thumbnail when publishing
  const handleTogglePublish = async (site) => {
    try {
      const isPublishing = !site.isPublished;
      await updateSite(user.uid, site.id, {
        isPublished: isPublishing,
        publishedAt: isPublishing ? new Date() : null
      });
      message.success(site.isPublished ? 'Site unpublished' : 'Site published successfully');
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
      await loadUserSites();
    } catch (error) {
      console.error('Error updating site:', error);
      message.error('Failed to update site');
    }
  };

  const handleSiteSettings = (site) => {
    setSelectedSite(site);
    setShowSiteSettings(true);
  };

  const loadPaymentConnections = async () => {
    try {
      const s = await getStripeConnectedAccount(user.uid);
      setStripeConnect(s);
      if (s?.connected) {
        setStripeSummaryLoading(true);
        fetch(`/api/connect/stripe/summary?userId=${encodeURIComponent(user.uid)}`)
          .then(r => r.json())
          .then(setStripeSummary)
          .catch(() => setStripeSummary(null))
          .finally(() => setStripeSummaryLoading(false));
  // also load metrics
  loadStripeMetrics(user.uid, metricsDays);
      } else { setStripeSummary(null); }
      const p = await fetch(`/api/connect/paypal/status?userId=${encodeURIComponent(user.uid)}`).then(r => r.json()).catch(() => ({ connected: false }));
      setPaypalConnect(p);
      if (p?.connected) {
        setPaypalSummaryLoading(true);
        fetch(`/api/connect/paypal/summary?userId=${encodeURIComponent(user.uid)}`)
          .then(r => r.json())
          .then(setPaypalSummary)
          .catch(() => setPaypalSummary(null))
          .finally(() => setPaypalSummaryLoading(false));
      } else { setPaypalSummary(null); }
    } catch (e) {
      // ignore
    }
  };

  const loadStripeMetrics = async (uid, days) => {
    if (!uid) return;
    try {
      setStripeMetricsLoading(true);
      const data = await fetch(`/api/connect/stripe/metrics?userId=${encodeURIComponent(uid)}&days=${days}`).then(r => r.json());
      setStripeMetrics(data?.connected ? data : null);
    } catch {
      setStripeMetrics(null);
    } finally {
      setStripeMetricsLoading(false);
    }
  };

  const loadConnectConfig = async () => {
    try {
      setConnectConfigLoading(true);
      const cfg = await fetch('/api/connect/config').then(r => r.json());
      // Fallback shape protection
      setConnectConfig({
        stripe: cfg?.stripe || { configured: false, missing: [] },
        paypal: cfg?.paypal || { configured: false, missing: [] }
      });
    } catch {
      setConnectConfig({ stripe: { configured: false, missing: [] }, paypal: { configured: false, missing: [] } });
    } finally {
      setConnectConfigLoading(false);
    }
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
    try {
      setShowUpgradeModal(false);
  const plan = selectedUpgradePlan === 'business' ? PRICING_PLANS.business : PRICING_PLANS.pro;
  await handleUpgrade(plan);
    } catch (e) {
      // handleUpgrade already shows an error toast; keep this minimal
    }
  };

  const handleUpgrade = async (plan) => {
    try {
      const successUrl = `${window.location.origin}/dashboard?upgrade=success`;
      const cancelUrl = `${window.location.origin}/dashboard?upgrade=cancelled`;
      
      // Use priceId if configured; else build price_data from plan
      const usingPriceId = !!plan.priceId && plan.priceId.startsWith('price_');
      const priceData = usingPriceId ? undefined : {
        currency: 'usd',
        productName: `${plan.name} Plan`,
        unit_amount: Math.round(plan.price * 100),
        interval: 'month'
      };

      const sessionUrl = await createCheckoutSession(
        usingPriceId ? plan.priceId : undefined,
        user.uid,
        successUrl,
        cancelUrl,
        user.email,
        priceData
      );
      
      // Redirect to Stripe checkout
      window.location.href = sessionUrl;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      message.error('Failed to start checkout process');
    }
  };

  const openUpdatePayment = async () => {
    try {
      const { clientSecret: cs, customerId: cid } = await createSetupIntent(user.email, user.uid);
      setClientSecret(cs);
      setCustomerId(cid);
      setShowUpdatePaymentModal(true);
    } catch (e) {
      message.error('Unable to start payment update');
    }
  };

  const UpdatePaymentForm = () => {
    const stripe = useStripe();
    const elements = useElements();

    const [saving, setSaving] = useState(false);

    const onSubmit = async () => {
      if (!stripe || !elements) return;
      setSaving(true);
      const result = await stripe.confirmSetup({
        elements,
        redirect: 'if_required'
      });
      if (result.error) {
        message.error(result.error.message || 'Failed to update card');
        setSaving(false);
        return;
      }
      const setupIntent = result.setupIntent;
      const pmId = setupIntent.payment_method;
      try {
        await setDefaultPaymentMethod(customerId, pmId);
        message.success('Payment method updated');
        setShowUpdatePaymentModal(false);
      } catch (e) {
        message.error('Could not set default payment method');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div>
        <PaymentElement options={{ layout: 'tabs' }} />
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={() => setShowUpdatePaymentModal(false)}>Cancel</Button>
          <Button type="primary" onClick={onSubmit} loading={saving}>Save</Button>
        </div>
      </div>
    );
  };

  const copyPublicUrl = (site) => {
    const publicUrl = `${window.location.origin}/u/${user.username}/${site.name}`;
    navigator.clipboard.writeText(publicUrl);
    message.success('Public URL copied to clipboard');
  };

  const handleViewAnalytics = (site) => {
    // Set the site and show the analytics modal
    setSelectedAnalyticsSite(site);
    setIsAnalyticsModalVisible(true);
  };

  const handleManageEmails = (site) => {
    setSelectedEmailSite(site);
    setIsEmailManagerOpen(true);
  };

  // Get user's current plan info from subscription data
  const getCurrentPlan = () => {
    if (!subscription) {
      // Fallback to free plan if subscription not loaded yet
      return PRICING_PLANS.free;
    }
    
    // Map subscription tiers to pricing plans
    switch (subscription.tier) {
      case 'pro':
        return PRICING_PLANS.pro;
      case 'business':
        return PRICING_PLANS.business;
      case 'admin':
        // Admin uses pro plan limits for display purposes
        return { ...PRICING_PLANS.pro, name: 'Admin', maxSites: -1 };
      case 'free':
      default:
        return PRICING_PLANS.free;
    }
  };

  if (authLoading || loading || subscriptionLoading) {
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
  // Derive usage with fallback to actual sites array length if usage missing or zero while sites exist
  const rawUsage = subscription ? subscription.usage.sitesCount : undefined;
  const siteUsage = (typeof rawUsage === 'number' && rawUsage >= 0) ? rawUsage : sites.length;
  const maxSites = subscription ? subscription.limits.maxSites : currentPlan.maxSites;
  const needsSync = subscription && subscription.tier !== 'admin' && rawUsage !== undefined && rawUsage !== sites.length;
  const usagePercentage = maxSites === -1 ? 0 : (siteUsage / maxSites) * 100;
  const atSiteLimit = maxSites !== -1 && siteUsage >= maxSites;

  // Debug logging for admin users
  if (subscription?.tier === 'admin') {
    console.log('Admin user detected:', {
      tier: subscription.tier,
      maxSites: maxSites,
      siteUsage: siteUsage,
      subscriptionLimits: subscription.limits
    });
  }

  // NOTE: Passive usage sync effect removed for now to avoid hook order mismatch.
  // We'll reintroduce after moving all hooks above conditional early returns.

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
    <div style={{ padding: '24px 10px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
    <div className='md:flex' style={{ marginBottom: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
      <Title level={2} style={{ margin: 0, letterSpacing: -0.2 }}>Welcome back, {user.displayName || user.email}!</Title>
      <Text type="secondary">Manage your sites, billing, and payouts</Text>
        </div>
        <Space>
          <Button 
            icon={<SettingOutlined />}
            onClick={() => {
              accountForm.setFieldsValue({
                fullName: user.fullName || user.displayName || '',
                // Use Firestore userData.username; Firebase auth user object lacks this custom field
                username: (userData?.username || user?.username || '').toLowerCase(),
                email: user.email,
                phone: userData?.phone || ''
              });
              setShowAccountSettings(true);
            }}
          >
            Account
          </Button>
          <Button 
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            type="text"
            size="large"
            style={{ color: token.colorTextSecondary }}
          >
            Logout
          </Button>
        </Space>
      </div>

      {/* Primary navigation */}
      <div className="tabs-sticky ">
        <Tabs
          activeKey={activeTab}
          onChange={onTabChange}
          className="dashboard-tabs "
          size="large"
          tabBarGutter={8}
          items={[
            { key: 'overview', label: 'Overview' },
            { key: 'sites', label: 'Sites' },
            { key: 'payments', label: 'Payments' },
            { key: 'insights', label: 'Insights' },
            { key: 'ecommerce', label: 'E-commerce' }
          ]}
        />
      </div>
      {/* Scoped styling for a modern, pill-style tab bar and to remove the white/broken underline */}
      <style jsx global>{`
/* --- Modern Sleek Tabs --- */

/* Kill default lines/ink bar */
.dashboard-tabs .ant-tabs-nav::before { border-bottom: none !important; }
.dashboard-tabs .ant-tabs-ink-bar { display: none !important; }

/* Equal width + centered text */
.dashboard-tabs .ant-tabs-nav-list { width: 100%; }
.dashboard-tabs .ant-tabs-tab { flex: 1 1 0; min-width: 0; justify-content: center; }
.dashboard-tabs .ant-tabs-tab .ant-tabs-tab-btn { width: 100%; text-align: center; }

/* Pill base */
/* Re-skin to match dark side menu */
.dashboard-tabs .ant-tabs-nav-list { gap: 6px; }
.dashboard-tabs .ant-tabs-tab {
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
}
.dashboard-tabs .ant-tabs-nav-wrap,
.dashboard-tabs .ant-tabs-nav-list,
.dashboard-tabs .ant-tabs-tab,
.dashboard-tabs .ant-tabs-nav,
.dashboard-tabs .ant-tabs-nav::before { border: none !important; box-shadow: none !important; background: transparent !important; }
.dashboard-tabs .ant-tabs-tab::before,
.dashboard-tabs .ant-tabs-tab::after { display: none !important; }
.dashboard-tabs .ant-tabs-nav { border: none !important; box-shadow: none !important; background: transparent !important; }
.dashboard-tabs .ant-tabs-tab .ant-tabs-tab-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 10px 22px;
  background: #232323;
  border: 1px solid #2f2f2f;
  border-radius: 18px;
  color: #d0d0d0;
  font-weight: 600;
  letter-spacing: .01em;
  position: relative;
  transition: background .25s, color .25s, border-color .25s, box-shadow .25s;
}
.dark-theme .dashboard-tabs .ant-tabs-tab .ant-tabs-tab-btn { background: #1c1c1c; border-color: #2a2a2a; }
.dashboard-tabs .ant-tabs-tab .ant-tabs-tab-btn:hover { background: #2d2d2d; color: #fff; border-color: #3a3a3a; }
.dashboard-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
  background: linear-gradient(145deg,#151515,#090909);
  border-color: #303030;
  color: #fff !important;
  box-shadow: 0 0 0 1px #303030, 0 4px 14px -4px rgba(0,0,0,.6);
}
.dashboard-tabs .ant-tabs-tab-active .ant-tabs-tab-btn::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(circle at 30% 20%, rgba(255,255,255,.08), transparent 70%);
  pointer-events: none;
}
.dashboard-tabs .ant-tabs-tab .ant-tabs-tab-btn:focus-visible,
.dashboard-tabs .ant-tabs-tab:focus-visible { outline: none !important; box-shadow: 0 0 0 2px rgba(22,119,255,.55); }
.dashboard-tabs .ant-tabs-tab:focus { outline: none !important; }
.dashboard-tabs .ant-tabs-tab-disabled .ant-tabs-tab-btn { opacity: .45; }

/* Remove noisy rings; keep accessible focus for keyboard */
.dashboard-tabs .ant-tabs-tab:focus,
.dashboard-tabs .ant-tabs-tab .ant-tabs-tab-btn:focus { outline: none !important; }
.dashboard-tabs .ant-tabs-tab:focus-visible,
.dashboard-tabs .ant-tabs-tab .ant-tabs-tab-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color, #1677ff) 60%, transparent);
  border-color: transparent;
}

/* No pseudo artifacts */
.dashboard-tabs .ant-tabs-tab::before,
.dashboard-tabs .ant-tabs-tab::after { content: none !important; }

/* Compact sticky bar */
.dashboard-tabs .ant-tabs-nav { margin: 0; }
.tabs-sticky {
  position: sticky; top: 0; z-index: 20;
  background: var(--bg-primary, #fff);
  padding: 6px 0 10px;
}
.tabs-sticky::after {
  content: ""; display: block; height: 1px;
  background: var(--border-color, rgba(0,0,0,.1)); opacity: .2; margin-top: 8px;
}

/* Motion-friendly */
@media (prefers-reduced-motion: reduce) {
  .dashboard-tabs .ant-tabs-tab { transition: none; }
  .dashboard-tabs .ant-tabs-tab .ant-tabs-tab-btn { transition: none; }
}

/* Optional: tidy elevation cards */
.elevated-card {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--accent-color, #1677ff) 6%, var(--panel-bg, #fff)) 0%,
    var(--panel-bg, #fff) 85%
  );
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
}

      `}</style>
      {/* Global styles for Account Settings (moved out to avoid nested styled-jsx) */}
      <style jsx global>{`
        .as-grid { display: flex; flex-direction: column; gap: 20px; }
        @media (min-width: 720px) { .as-grid { display: grid; grid-template-columns: 1fr 1fr; align-items: flex-start; gap: 28px; } }
        .as-section { background: var(--panel-bg); border: 1px solid var(--border-color); padding: 16px 18px 18px; border-radius: 14px; position: relative; }
        .as-section-title { margin: 0 0 12px; font-size: 13px; font-weight: 600; letter-spacing: .5px; text-transform: uppercase; color: var(--text-secondary); }
        .as-mini-card { background: linear-gradient(145deg, color-mix(in srgb,var(--accent-color,#1677ff) 10%, var(--panel-bg)), var(--panel-bg)); border: 1px solid color-mix(in srgb, var(--accent-color,#1677ff) 35%, var(--panel-bg)); padding: 12px 14px; border-radius: 10px; }
        .as-savebar { position: sticky; bottom: -16px; margin-top: 24px; background: linear-gradient(180deg, rgba(255,255,255,0) 0%, var(--bg-primary) 38%); padding: 18px 4px 4px; backdrop-filter: blur(6px); display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; border-top: 1px solid var(--border-color); }
        .dark-theme .as-savebar { background: linear-gradient(180deg, rgba(0,0,0,0) 0%, var(--bg-primary) 40%); }
        .as-savebar-status { font-size: 12px; color: var(--text-secondary); }
  .as-savebar-actions { display: flex; gap: 8px; }
  /* Account Settings modal refinements */
  .account-settings-modal .ant-modal-content { background: transparent; box-shadow: none; }
  .account-settings-modal .ant-modal-header { padding: 14px 20px 10px; border-bottom: 1px solid var(--border-color); background: transparent; }
  .account-settings-modal .ant-modal-body { background: transparent; }
  .account-settings-modal .ant-tabs-nav::before { display: none !important; }
  .account-settings-modal .ant-tabs-nav { margin: 0 0 12px; border: 0; }
  .account-settings-modal .ant-tabs-tab { border: 0 !important; background: transparent !important; padding: 6px 10px !important; }
  .account-settings-modal .ant-tabs-tab + .ant-tabs-tab { margin-left: 4px; }
  .account-settings-modal .ant-tabs-tab-active { background: color-mix(in srgb, var(--accent-color,#1677ff) 14%, transparent) !important; border-radius: 6px; }
  .dark-theme .account-settings-modal .ant-tabs-tab-active { background: color-mix(in srgb, var(--accent-color,#1677ff) 26%, transparent) !important; }
  .account-settings-modal .ant-tabs-tab:hover { background: color-mix(in srgb, var(--accent-color,#1677ff) 10%, transparent) !important; border-radius: 6px; }
      `}</style>

      {/* Overview */}
      {activeTab === 'overview' && (
        <>
          <Card className="elevated-card" style={{ marginBottom: '16px', borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }} styles={{ body: { padding: 16 } }}>
            <Row gutter={[16, 16]} align="middle">
              <Col flex="auto">
                <Space direction="vertical" size={0}>
                  <Text strong>
                    Current Plan: {currentPlan.name}
                    {subscription?.tier === 'admin' && (
                      <span style={{ marginLeft: 8, color: token.colorPrimary }}>👑</span>
                    )}
                  </Text>
                  <Text type="secondary">
                    {siteUsage} of {maxSites === -1 ? '∞' : maxSites} sites used
                  </Text>
                  {maxSites !== -1 && (
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
              {currentPlan.id !== 'free' && (
                <Col>
                  <Space>
                    <Button onClick={openUpdatePayment}>Update payment method</Button>
                    {subscriptionInfo?.status && (
                      subscriptionInfo.cancelAtPeriodEnd ? (
                        <Button loading={managing} onClick={async () => {
                          try {
                            setManaging(true);
                            await resumeSubscription(subscriptionInfo.id);
                            const status = await getSubscriptionStatus({ email: user.email });
                            setSubscriptionInfo(status.data);
                            message.success('Cancellation reversed');
                          } catch { message.error('Failed to resume'); } finally { setManaging(false); }
                        }}>Resume</Button>
                      ) : (
                        <Button danger loading={managing} onClick={async () => {
                          try {
                            setManaging(true);
                            await cancelSubscriptionAtPeriodEnd(subscriptionInfo.id);
                            const status = await getSubscriptionStatus({ email: user.email });
                            setSubscriptionInfo(status.data);
                            message.success('Will cancel at period end');
                          } catch { message.error('Failed to cancel'); } finally { setManaging(false); }
                        }}>Cancel at period end</Button>
                      )
                    )}
                    {subscriptionInfo?.status && currentPlan.id !== 'free' && (
                      currentPlan.id === 'pro' && PRICING_PLANS.business.priceId ? (
                        <Button loading={managing} onClick={async () => {
                          try {
                            setManaging(true);
                            await switchSubscriptionPlan(subscriptionInfo.id, PRICING_PLANS.business.priceId);
                            const status = await getSubscriptionStatus({ email: user.email });
                            setSubscriptionInfo(status.data);
                            message.success('Switched to Business');
                          } catch { message.error('Failed to switch plan'); } finally { setManaging(false); }
                        }}>Switch to Business</Button>
                      ) : null
                    )}
                    {subscriptionInfo?.status && currentPlan.id === 'business' && PRICING_PLANS.pro.priceId && (
                      <Button loading={managing} onClick={async () => {
                        try {
                          setManaging(true);
                          await switchSubscriptionPlan(subscriptionInfo.id, PRICING_PLANS.pro.priceId);
                          const status = await getSubscriptionStatus({ email: user.email });
                          setSubscriptionInfo(status.data);
                          message.success('Switched to Pro');
                        } catch { message.error('Failed to switch plan'); } finally { setManaging(false); }
                      }}>Switch to Pro</Button>
                    )}
                    <Button onClick={async () => {
                      try {
                        const { sessionUrl } = await fetch('/api/stripe/create-portal-session', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: user.email, returnUrl: window.location.href })
                        }).then(r => r.json());
                        window.location.href = sessionUrl;
                      } catch (e) {
                        message.error('Unable to open billing portal');
                      }
                    }}>Manage billing</Button>
                  </Space>
                </Col>
              )}
            </Row>
          </Card>

          <Row gutter={12}>
            <Col>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => atSiteLimit ? showUpgradeModalHandler('Upgrade to create more sites') : setIsCreateModalVisible(true)}
                size="large"
                disabled={atSiteLimit}
              >
                {atSiteLimit ? 'Site Limit Reached' : 'Create New Site'}
              </Button>
            </Col>
            <Col>
              <Button icon={<SettingOutlined />} size="large" onClick={() => {
                accountForm.setFieldsValue({
                  fullName: user.fullName || user.displayName || '',
                      // Prefer Firestore userData for canonical username
                      username: (userData?.username || user?.username || '').toLowerCase(),
                  email: user.email,
                  phone: userData?.phone || ''
                });
                setShowAccountSettings(true);
              }}>
                Account Settings
              </Button>
            </Col>
          </Row>
        </>
      )}

      {/* Sites */}
      {activeTab === 'sites' && (
        <>
          <div style={{ marginBottom: 16 }}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              disabled={atSiteLimit}
              onClick={() => atSiteLimit ? showUpgradeModalHandler('Upgrade to create more sites') : setIsCreateModalVisible(true)}
            >
              {atSiteLimit ? 'Site Limit Reached' : 'Create New Site'}
            </Button>
          </div>
          {sites.length === 0 ? (
            <Card style={{ borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }}>
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={atSiteLimit ? 'Free plan site limit reached' : 'No sites yet'}>
                {!atSiteLimit && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalVisible(true)}>
                    Create Your First Site
                  </Button>
                )}
                {atSiteLimit && (
                  <Button type="primary" icon={<CrownOutlined />} onClick={() => showUpgradeModalHandler('Upgrade to create more sites')}>
                    Upgrade to add sites
                  </Button>
                )}
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
                    onManageEmails={handleManageEmails}
                    loading={loading}
                  />
                </Col>
              ))}
            </Row>
          )}
        </>
      )}

      {/* Payments */}
      {activeTab === 'payments' && (
        <Card
          className="elevated-card"
          style={{ marginBottom: 24, borderRadius: 16, border: `1px solid ${token.colorBorderSecondary}` }}
          styles={{ body: { padding: 20 } }}
          title={<span style={{ fontWeight: 600 }}>Payments</span>}
        >
          <Row gutter={[16,16]}>
            <Col xs={24} md={12}>
              <Card
                size="small"
                style={{ height: '100%', borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }}
                styles={{ header: { background: token.colorFillTertiary, borderBottom: `1px solid ${token.colorBorderSecondary}`, borderTopLeftRadius: 12, borderTopRightRadius: 12 }, body: { paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 12 } }}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" height={2} style={{ opacity: 0.9, height: 18 }} />
                    <span style={{ fontWeight: 600 }}>Connect</span>
                    <Tag color="blue">Standard</Tag>
                    {stripeConnect?.connected && <Tag color="green">Connected</Tag>}
                  </div>
                }
              >
                <Text type="secondary">Accept payments and receive payouts to your bank via Stripe.</Text>
                {!connectConfig.stripe.configured && (
                  <Alert
                    style={{ marginTop: 4 }}
                    type="warning"
                    showIcon
                    message="Stripe Connect is not fully configured"
                    description={<div>
                      Add missing env: <Text code>{connectConfig.stripe.missing.join(', ') || '—'}</Text>
                    </div>}
                  />
                )}
                {stripeConnect?.connected ? (
                  <div style={{
                    border: `1px dashed ${token.colorBorderSecondary}`,
                    borderRadius: 8,
                    padding: 12,
                    background: token.colorFillTertiary
                  }}>
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <Text style={{ display: 'block' }}>
                        Connected account: <Text code>{stripeConnect.accountId}</Text>
                      </Text>
                      <Space wrap>
                        <Tag color={stripeConnect.charges_enabled ? 'green' : 'orange'}>Charges {stripeConnect.charges_enabled ? 'enabled' : 'disabled'}</Tag>
                        <Tag color={stripeConnect.payouts_enabled ? 'green' : 'orange'}>Payouts {stripeConnect.payouts_enabled ? 'enabled' : 'disabled'}</Tag>
                      </Space>
                      {stripeSummaryLoading ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          {[1,2,3,4].map(i => (
                            <div key={i} style={{ height: 46, borderRadius: 8, background: token.colorFill, animation: 'pulse 1.4s ease-in-out infinite' }} />
                          ))}
                          {null}
                        </div>
                      ) : stripeSummary?.connected ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <Card size="small" styles={{ body: { padding: 10 } }} style={{ borderRadius: 8, border: `1px solid ${token.colorBorderSecondary}` }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Available</Text>
                            <div style={{ fontWeight: 600, fontSize: 16 }}>
                              {(stripeSummary.available/100).toLocaleString(undefined, { style: 'currency', currency: stripeSummary.currency || 'USD' })}
                            </div>
                          </Card>
                          <Card size="small" styles={{ body: { padding: 10 } }} style={{ borderRadius: 8, border: `1px solid ${token.colorBorderSecondary}` }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Pending</Text>
                            <div style={{ fontWeight: 600, fontSize: 16 }}>
                              {(stripeSummary.pending/100).toLocaleString(undefined, { style: 'currency', currency: stripeSummary.currency || 'USD' })}
                            </div>
                          </Card>
                          <Card size="small" styles={{ body: { padding: 10 } }} style={{ borderRadius: 8, border: `1px solid ${token.colorBorderSecondary}` }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Business</Text>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{stripeSummary.businessName || '—'}</div>
                          </Card>
                          <Card size="small" styles={{ body: { padding: 10 } }} style={{ borderRadius: 8, border: `1px solid ${token.colorBorderSecondary}` }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Status</Text>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>
                              {stripeSummary.chargesEnabled ? 'Charges enabled' : 'Charges disabled'} / {stripeSummary.payoutsEnabled ? 'Payouts enabled' : 'Payouts disabled'}
                            </div>
                          </Card>
                        </div>
                      ) : null}
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <Button onClick={loadPaymentConnections}>Refresh</Button>
                        <Button onClick={async ()=>{
                          setConnectLoading(true);
                          try { await disconnectStripeAccount(user.uid); await loadPaymentConnections(); message.success('Disconnected'); }
                          catch { message.error('Failed to disconnect'); }
                          finally { setConnectLoading(false); }
                        }} danger loading={connectLoading}>Disconnect</Button>
                      </div>
                    </Space>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button type="primary" disabled={!connectConfig.stripe.configured || connectConfigLoading} onClick={async ()=>{
                      try {
                        setConnectLoading(true);
                        const url = await startStripeConnectOnboarding(user.uid, user.email, '/dashboard');
                        window.location.href = url;
                      } catch (e) { message.error(e?.message || 'Unable to start Stripe Connect'); } finally { setConnectLoading(false); }
                    }} loading={connectLoading}>
                      Connect Stripe
                    </Button>
                  </div>
                )}
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card
                size="small"
                style={{ height: '100%', borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }}
                styles={{ header: { background: token.colorFillTertiary, borderBottom: `1px solid ${token.colorBorderSecondary}`, borderTopLeftRadius: 12, borderTopRightRadius: 12 }, body: { paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 12 } }}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b7/PayPal_Logo_Icon_2014.svg" alt="PayPal" height={2} style={{ opacity: 0.95, height: 18 }} />
                    <Tag color="geekblue">PPCP</Tag>
                    {paypalConnect?.connected && <Tag color="green">Connected</Tag>}
                  </div>
                }
              >
                <Text type="secondary">Onboard your PayPal Business account to accept PayPal payments.</Text>
                {!connectConfig.paypal.configured && (
                  <Alert
                    style={{ marginTop: 4 }}
                    type="warning"
                    showIcon
                    message="PayPal is not fully configured"
                    description={<div>
                      Add missing env: <Text code>{connectConfig.paypal.missing.join(', ') || '—'}</Text>
                    </div>}
                  />
                )}
                {paypalConnect?.connected ? (
                  <div style={{
                    border: `1px dashed ${token.colorBorderSecondary}`,
                    borderRadius: 8,
                    padding: 12,
                    background: token.colorFillTertiary
                  }}>
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      {paypalSummaryLoading ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          {[1,2].map(i => (
                            <div key={i} style={{ height: 46, borderRadius: 8, background: token.colorFill, animation: 'pulse 1.4s ease-in-out infinite' }} />
                          ))}
                          {null}
                        </div>
                      ) : paypalSummary?.connected ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%' }}>
                          <Card size="small" styles={{ body: { padding: 10 } }} style={{ borderRadius: 8, border: `1px solid ${token.colorBorderSecondary}` }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Merchant ID</Text>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>
                              {paypalSummary.merchantIdInPayPal || '—'}
                            </div>
                          </Card>
                          <Card size="small" styles={{ body: { padding: 10 } }} style={{ borderRadius: 8, border: `1px solid ${token.colorBorderSecondary}` }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Status</Text>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>Connected via PPCP</div>
                          </Card>
                        </div>
                      ) : (
                        <Text>Merchant ID: <Text code>{paypalConnect.merchantIdInPayPal}</Text></Text>
                      )}
                      <Text type="secondary">Disconnect via your PayPal dashboard if needed.</Text>
                    </Space>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button disabled={!connectConfig.paypal.configured || connectConfigLoading} onClick={async ()=>{
                      try {
                        setConnectLoading(true);
                        const url = await startPaypalOnboarding(user.uid, user.email, '/dashboard');
                        window.location.href = url;
                      } catch (e) { message.error(e?.message || 'Unable to start PayPal onboarding'); } finally { setConnectLoading(false); }
                    }} loading={connectLoading}>
                      Connect PayPal
                    </Button>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </Card>
      )}

      {/* Insights */}
      {activeTab === 'insights' && (
        stripeConnect?.connected ? (
          <Card
            className="elevated-card"
            style={{ marginBottom: 24, borderRadius: 16, border: `1px solid ${token.colorBorderSecondary}` }}
            styles={{ body: { padding: 20 } }}
            title={<span style={{ fontWeight: 600 }}>Payments Insights</span>}
            extra={
              <Space>
                <Button size="small" onClick={() => loadStripeMetrics(user.uid, metricsDays)} loading={stripeMetricsLoading}>Refresh</Button>
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
                {null}
              </div>
            ) : stripeMetrics ? (
              <>
                <Row gutter={[12,12]}>
                  <Col span={24}>
                    <Card size="small" styles={{ body: { padding: 12 } }} style={{ borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Revenue & Payouts</Text>
                      <div style={{ width: '100%', height: 260, marginTop: 8 }}>
                        <ResponsiveContainer>
                          <RechartsLineChart data={stripeMetrics.series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={token.colorPrimary} stopOpacity={0.35} />
                                <stop offset="100%" stopColor={token.colorPrimary} stopOpacity={0.02} />
                              </linearGradient>
                              <linearGradient id="payoutsGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={token.colorSuccess} stopOpacity={0.3} />
                                <stop offset="100%" stopColor={token.colorSuccess} stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <RechartsCartesianGrid strokeDasharray="3 3" stroke={token.colorBorder} />
                            <RechartsXAxis dataKey="date" tickFormatter={(d)=>{
                              try { const dt = new Date(d); return `${(dt.getMonth()+1)}/${dt.getDate()}`; } catch { return d; }
                            }} stroke={token.colorTextSecondary} tick={{ fontSize: 12 }} />
                            <RechartsYAxis tickFormatter={(v)=> v.toLocaleString(undefined, { style:'currency', currency: stripeMetrics.currency })} stroke={token.colorTextSecondary} tick={{ fontSize: 12 }} width={80} />
                            <RechartsTooltip formatter={(v)=> (typeof v==='number' ? v.toLocaleString(undefined,{style:'currency', currency: stripeMetrics.currency}) : v)} labelFormatter={(d)=>d} contentStyle={{ borderRadius: 8 }} />
                            <RechartsLegend />
                            <RechartsLine type="monotone" dataKey="net" name="Net" stroke={token.colorPrimary} strokeOpacity={0.9} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                            <RechartsLine type="monotone" dataKey="payouts" name="Payouts" stroke={token.colorSuccess} strokeOpacity={0.9} strokeWidth={2} dot={false} />
                          </RechartsLineChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} md={12}>
                    <Card size="small" styles={{ body: { padding: 12 } }} style={{ borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Net Revenue</Text>
                      <div style={{ fontWeight: 700, fontSize: 22 }}>
                        {stripeMetrics.net.toLocaleString(undefined, { style: 'currency', currency: stripeMetrics.currency })}
                      </div>
                      {(() => {
                        const series = stripeMetrics.series || [];
                        const maxNet = Math.max(1, ...series.map(s => s.net || 0));
                        return (
                          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 60, marginTop: 8 }}>
                            {series.map((p, idx) => {
                              const ratio = Math.max(0, (p.net || 0) / maxNet);
                              const heightPct = Math.max(2, ratio * 100);
                              const opacity = 0.2 + Math.min(0.8, ratio);
                              return (
                                <div
                                  key={idx}
                                  title={`${p.date}: ${p.net.toFixed(2)}`}
                                  style={{ width: '100%', background: token.colorPrimary, opacity, height: `${heightPct}%`, borderRadius: 2 }}
                                />
                              );
                            })}
                          </div>
                        );
                      })()}
                    </Card>
                  </Col>
                  <Col xs={24} md={12}>
                    <Card size="small" styles={{ body: { padding: 12 } }} style={{ borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Payouts</Text>
                      <div style={{ fontWeight: 700, fontSize: 22 }}>
                        {stripeMetrics.payouts.toLocaleString(undefined, { style: 'currency', currency: stripeMetrics.currency })}
                      </div>
                      {(() => {
                        const series = stripeMetrics.series || [];
                        const maxPayout = Math.max(1, ...series.map(s => s.payouts || 0));
                        return (
                          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 60, marginTop: 8 }}>
                            {series.map((p, idx) => {
                              const ratio = Math.max(0, (p.payouts || 0) / maxPayout);
                              const heightPct = Math.max(2, ratio * 100);
                              const opacity = 0.2 + Math.min(0.8, ratio);
                              return (
                                <div
                                  key={idx}
                                  title={`${p.date}: ${p.payouts.toFixed(2)}`}
                                  style={{ width: '100%', background: token.colorSuccess, opacity, height: `${heightPct}%`, borderRadius: 2 }}
                                />
                              );
                            })}
                          </div>
                        );
                      })()}
                    </Card>
                  </Col>
                </Row>
                <Row gutter={[12,12]} style={{ marginTop: 12 }}>
                  <Col xs={24} md={12}>
                    <Card size="small" styles={{ body: { padding: 12 } }} style={{ borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Payment Methods</Text>
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(stripeMetrics.methodBreakdown || []).slice(0,5).map((m) => (
                          <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 4, background: token.colorPrimary }} />
                            <Text style={{ flex: 1, textTransform: 'capitalize' }}>{m.name}</Text>
                            <Text strong>{m.amount.toLocaleString(undefined, { style: 'currency', currency: stripeMetrics.currency })}</Text>
                          </div>
                        ))}
                        {(!stripeMetrics.methodBreakdown || stripeMetrics.methodBreakdown.length===0) && <Text type="secondary">No payments yet</Text>}
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} md={12}>
                    <Card size="small" styles={{ body: { padding: 12 } }} style={{ borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Recent Payments</Text>
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(stripeMetrics.recent || []).map((p) => (
                          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center' }}>
                            <div>
                              <Text code>{p.id}</Text>
                              <div style={{ fontSize: 12, color: token.colorTextSecondary }}>{new Date(p.created*1000).toLocaleString()}</div>
                            </div>
                            <Tag color={p.status==='succeeded' ? 'green' : 'orange'}>{p.status}</Tag>
                            <div style={{ fontWeight: 600 }}>
                              {p.amount.toLocaleString(undefined, { style: 'currency', currency: p.currency })}
                            </div>
                          </div>
                        ))}
                        {(!stripeMetrics.recent || stripeMetrics.recent.length===0) && <Text type="secondary">No recent payments</Text>}
                      </div>
                    </Card>
                  </Col>
                </Row>
              </>
            ) : (
              <Alert type="info" showIcon message="No metrics yet" description="Connect Stripe and process payments to see insights here." />
            )}
          </Card>
        ) : (
          <Alert type="info" showIcon message="Connect Stripe to view insights" />
        )
      )}

      {activeTab === 'ecommerce' &&  <Admin /> }

      

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
            name="subdomain"
            label="Preferred subdomain (optional)"
            extra="Your site will be available at sitename.gloweditor.com"
          >
            <Input
              placeholder="sitename"
              onChange={async (e) => {
                const v = (e.target.value || '').toString().trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
                createForm.setFieldsValue({ subdomain: v });
                if (!v) return;
                try {
                  const res = await fetch(`/api/subdomain-available?subdomain=${encodeURIComponent(v)}`);
                  const json = await res.json();
                  if (res.ok && json.ok) {
                    if (!json.available) {
                      createForm.setFields([{ name: 'subdomain', errors: [json.reason === 'reserved' ? 'That subdomain is reserved' : 'Subdomain not available'] }]);
                    } else {
                      createForm.setFields([{ name: 'subdomain', errors: [] }]);
                    }
                  }
                } catch (e) { /* ignore */ }
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
                disabled={atSiteLimit}
                onClick={(e)=>{ if(atSiteLimit){ e.preventDefault(); showUpgradeModalHandler('Upgrade to create more sites'); } }}
              >
                {atSiteLimit ? 'Upgrade to add more' : 'Create Site'}
              </Button>
            </Col>
          </Row>
          {atSiteLimit && (
            <Alert style={{ marginTop: 16 }} type="warning" showIcon message="Free plan site limit reached" description="Upgrade your plan to create additional sites." />
          )}
        </Form>
      </Modal>
      {/* Site Email Manager */}
      {selectedEmailSite && (
        <SiteEmailManager
          site={selectedEmailSite}
          open={isEmailManagerOpen}
          onClose={() => { setIsEmailManagerOpen(false); setSelectedEmailSite(null); }}
        />
      )}

      {/* Delete Site Confirmation Modal */}
      <Modal
        title="Delete Site"
        open={isDeleteModalVisible}
        onCancel={() => {
          setIsDeleteModalVisible(false);
          setSiteToDelete(null);
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setIsDeleteModalVisible(false);
            setSiteToDelete(null);
          }}>
            Cancel
          </Button>,
          <Button 
            key="delete" 
            type="primary" 
            danger
            onClick={confirmDeleteSite}
          >
            Delete Forever
          </Button>
        ]}
        centered
        width={500}
      >
        {siteToDelete && (
          <div>
            <p>Are you sure you want to delete <strong>"{siteToDelete.name}"</strong>?</p>
            <p style={{ color: '#ff4d4f', marginTop: 12 }}>
              ⚠️ This action cannot be undone. All pages and content will be permanently deleted.
            </p>
            <p style={{ marginTop: 12, padding: '8px 12px', backgroundColor: '#f5f5f5', borderRadius: '4px', fontSize: '12px' }}>
              <strong>Public URL:</strong> <code>{`${window.location.origin}/u/${user.username}/${siteToDelete.name}`}</code>
            </p>
          </div>
        )}
      </Modal>

  {/* Analytics Modal */}
      <Modal
        title={selectedAnalyticsSite ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RocketOutlined style={{ color: '#52c41a' }} />
            <span>Analytics for "{selectedAnalyticsSite.name}"</span>
          </div>
        ) : 'Analytics'}
        open={isAnalyticsModalVisible}
        onCancel={() => {
          setIsAnalyticsModalVisible(false);
          setSelectedAnalyticsSite(null);
          setSiteAnalytics(null);
          setAnalyticsError(null);
        }}
        footer={[
          <Button key="close" type="primary" onClick={() => {
            setIsAnalyticsModalVisible(false);
            setSelectedAnalyticsSite(null);
            setSiteAnalytics(null);
            setAnalyticsError(null);
          }}>
            Close
          </Button>
        ]}
        width={840}
        centered
      >
        {selectedAnalyticsSite && (
          <div>
            {/* Site Overview */}
            <div style={{ marginBottom: 16 }}>
              <Title level={5}>Site Overview</Title>
              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <Text strong>Status: </Text>
                  <Tag color={selectedAnalyticsSite.isPublished ? 'green' : 'orange'}>
                    {selectedAnalyticsSite.isPublished ? 'Published' : 'Draft'}
                  </Tag>
                </Col>
                <Col span={12}>
                  <Text strong>Created: </Text>
                  <Text>{new Date(selectedAnalyticsSite.createdAt.toDate()).toLocaleDateString()}</Text>
                </Col>
                <Col span={24}>
                  <Text strong>Public URL: </Text>
                  <div style={{ marginTop: 4 }}>
                    <Input
                      value={`${window.location.origin}/u/${user.username}/${selectedAnalyticsSite.name}`}
                      readOnly
                      size="small"
                      addonAfter={
                        <Button
                          type="link"
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/u/${user.username}/${selectedAnalyticsSite.name}`);
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
            <div style={{ marginBottom: 16 }}>
              <Title level={5}>Quick Actions</Title>
              <Space wrap>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setIsAnalyticsModalVisible(false);
                    setSelectedAnalyticsSite(null);
                    window.location.href = `/Editor/site?site=${selectedAnalyticsSite.id}`;
                  }}
                >
                  Edit Site
                </Button>
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => window.open(`/u/${user.username}/${selectedAnalyticsSite.name}`, '_blank')}
                  disabled={!selectedAnalyticsSite.isPublished}
                >
                  View Live
                </Button>
                <Button
                  icon={<ShareAltOutlined />}
                  onClick={() => {
                    copyPublicUrl(selectedAnalyticsSite);
                    message.success('URL copied to clipboard');
                  }}
                >
                  Share URL
                </Button>
              </Space>
            </div>

            {/* Analytics Content */}
            {analyticsLoading ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {[1,2,3].map((i) => (
                  <div key={i} style={{ height: i===2 ? 180 : 60, borderRadius: 8, background: token.colorFill, animation: 'pulse 1.4s ease-in-out infinite' }} />
                ))}
              </div>
            ) : analyticsError ? (
              <Alert type="error" showIcon message="Analytics unavailable" description={analyticsError} />
            ) : siteAnalytics ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Card size="small" styles={{ body: { padding: 12 } }} style={{ borderRadius: 10, border: `1px solid ${token.colorBorderSecondary}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Total page views (last 30 days)</Text>
                      <div style={{ fontWeight: 700, fontSize: 22 }}>{(siteAnalytics.totalViews || 0).toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 180, marginTop: 8 }}>
                    <ResponsiveContainer>
                      <RechartsLineChart data={(siteAnalytics.series || []).map(s => {
                        const d = String(s.date || '');
                        const y = d.slice(0,4), m = d.slice(4,6), day = d.slice(6,8);
                        const label = `${m}/${day}`;
                        return { label, views: s.views };
                      })} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <RechartsCartesianGrid strokeDasharray="3 3" stroke={token.colorBorder} />
                        <RechartsXAxis dataKey="label" stroke={token.colorTextSecondary} tick={{ fontSize: 12 }} />
                        <RechartsYAxis stroke={token.colorTextSecondary} tick={{ fontSize: 12 }} allowDecimals={false} width={36} />
                        <RechartsTooltip contentStyle={{ borderRadius: 8 }} />
                        <RechartsLine type="monotone" dataKey="views" stroke={token.colorPrimary} strokeWidth={2} dot={false} activeDot={{ r: 3 }} name="Views" />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Top pages and events */}
                <Row gutter={[12,12]}>
                  <Col xs={24} md={12}>
                    <Card size="small" styles={{ body: { padding: 12 } }} style={{ borderRadius: 10, border: `1px solid ${token.colorBorderSecondary}` }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Top pages</Text>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                        {(siteAnalytics.pages || []).length === 0 && (
                          <Text type="secondary">No page views yet</Text>
                        )}
                        {(siteAnalytics.pages || []).slice(0,6).map((p, idx) => (
                          <div key={`${p.title}-${idx}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
                            <Text style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title || '(untitled)'}</Text>
                            <Tag color="geekblue">{p.views}</Tag>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} md={12}>
                    <Card size="small" styles={{ body: { padding: 12 } }} style={{ borderRadius: 10, border: `1px solid ${token.colorBorderSecondary}` }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Top events</Text>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                        {(siteAnalytics.events || []).length === 0 && (
                          <Text type="secondary">No events yet</Text>
                        )}
                        {(siteAnalytics.events || []).slice(0,6).map((ev) => (
                          <div key={`${ev.event}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
                            <Text code>{ev.event}</Text>
                            <Tag>{ev.count}</Tag>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </Col>
                </Row>

                {/* Devices and Countries */}
                <Row gutter={[12,12]}>
                  <Col xs={24} md={12}>
                    <Card size="small" styles={{ body: { padding: 12 } }} style={{ borderRadius: 10, border: `1px solid ${token.colorBorderSecondary}` }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Devices</Text>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                        {(siteAnalytics.devices || []).length === 0 && <Text type="secondary">—</Text>}
                        {(() => {
                          const total = Math.max(1, (siteAnalytics.devices || []).reduce((s, d) => s + (d.views || 0), 0));
                          return (siteAnalytics.devices || []).map((d) => {
                            const pct = Math.round(((d.views || 0) / total) * 100);
                            return (
                              <div key={d.category} style={{ display: 'grid', gridTemplateColumns: '90px 1fr auto', gap: 8, alignItems: 'center' }}>
                                <Text style={{ textTransform: 'capitalize' }}>{d.category}</Text>
                                <div style={{ height: 6, background: token.colorFillSecondary, borderRadius: 4, overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: token.colorPrimary, opacity: 0.6 }} />
                                </div>
                                <Text type="secondary">{pct}%</Text>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} md={12}>
                    <Card size="small" styles={{ body: { padding: 12 } }} style={{ borderRadius: 10, border: `1px solid ${token.colorBorderSecondary}` }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Countries</Text>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                        {(siteAnalytics.countries || []).length === 0 && <Text type="secondary">—</Text>}
                        {(siteAnalytics.countries || []).slice(0,6).map((c) => (
                          <div key={`${c.country}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
                            <Text>{c.country}</Text>
                            <Tag>{c.views}</Tag>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </Col>
                </Row>

                <Row gutter={[12,12]}>
                  <Col xs={24} md={12}>
                    <Card size="small" styles={{ body: { padding: 12 } }} style={{ borderRadius: 10, border: `1px solid ${token.colorBorderSecondary}` }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Top items</Text>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                        {(siteAnalytics.items || []).length === 0 && (
                          <Text type="secondary">No item views yet</Text>
                        )}
                        {(siteAnalytics.items || []).map((it) => (
                          <div key={`${it.item_id}-${it.item_name}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
                            <div>
                              <Text strong>{it.item_name || it.item_id || 'Untitled item'}</Text>
                              {it.item_id ? <div style={{ fontSize: 12, color: token.colorTextSecondary }}>ID: {it.item_id}</div> : null}
                            </div>
                            <Tag color="blue">{it.views}</Tag>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} md={12}>
                    <Card size="small" styles={{ body: { padding: 12 } }} style={{ borderRadius: 10, border: `1px solid ${token.colorBorderSecondary}` }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Top referrers</Text>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                        {(siteAnalytics.referrers || []).length === 0 && (
                          <Text type="secondary">No referrers yet</Text>
                        )}
                        {(siteAnalytics.referrers || []).map((r) => (
                          <div key={`${r.referrer}-${r.views}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
                            <Text style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.referrer || '(direct)'}</Text>
                            <Tag>{r.views}</Tag>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </Col>
                </Row>

                {/* Traffic sources */}
                <Row gutter={[12,12]}>
                  <Col span={24}>
                    <Card size="small" styles={{ body: { padding: 12 } }} style={{ borderRadius: 10, border: `1px solid ${token.colorBorderSecondary}` }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Traffic sources</Text>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                        {(siteAnalytics.traffic || []).length === 0 && <Text type="secondary">—</Text>}
                        {(siteAnalytics.traffic || []).slice(0,8).map((t) => (
                          <div key={`${t.sourceMedium}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
                            <Text>{t.sourceMedium}</Text>
                            <Tag color="purple">{t.sessions}</Tag>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </Col>
                </Row>
                {/* Advanced Email Analytics (last 30 days) */}
                <Divider plain style={{ margin:'8px 0 4px' }}>Email Analytics (last 30d)</Divider>
                {emailAnalytics ? (
                  <Row gutter={[12,12]}>
                    {/* Main Metrics Overview */}
                    <Col span={24}>
                      <Card size="small" styles={{ body: { padding: 12 } }} style={{ borderRadius: 10, border: `1px solid ${token.colorBorderSecondary}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <Text type="secondary" style={{ fontSize:12 }}>Performance Overview</Text>
                          {emailAnalytics.comparison && (
                            <Text type="secondary" style={{ fontSize:11 }}>vs. previous period</Text>
                          )}
                        </div>
                        <Row gutter={[16,8]}>
                          <Col xs={12} sm={6}>
                            <div>
                              <div style={{ fontWeight:700, fontSize:20 }}>{emailAnalytics.current.totalSent}</div>
                              <Text type="secondary" style={{ fontSize:11 }}>Sent</Text>
                              {emailAnalytics.comparison && (
                                <div style={{ fontSize:10, color: emailAnalytics.current.totalSent > emailAnalytics.comparison.totalSent ? token.colorSuccess : token.colorError }}>
                                  {emailAnalytics.current.totalSent > emailAnalytics.comparison.totalSent ? '↗' : '↘'} 
                                  {Math.abs(emailAnalytics.current.totalSent - emailAnalytics.comparison.totalSent)}
                                </div>
                              )}
                            </div>
                          </Col>
                          <Col xs={12} sm={6}>
                            <div>
                              <div style={{ fontWeight:700, fontSize:20, color: token.colorSuccess }}>{emailAnalytics.current.openRate}%</div>
                              <Text type="secondary" style={{ fontSize:11 }}>Open Rate</Text>
                              {emailAnalytics.comparison && (
                                <div style={{ fontSize:10, color: emailAnalytics.current.openRate > emailAnalytics.comparison.openRate ? token.colorSuccess : token.colorError }}>
                                  {emailAnalytics.current.openRate > emailAnalytics.comparison.openRate ? '↗' : '↘'} 
                                  {Math.abs(emailAnalytics.current.openRate - emailAnalytics.comparison.openRate).toFixed(1)}%
                                </div>
                              )}
                            </div>
                          </Col>
                          <Col xs={12} sm={6}>
                            <div>
                              <div style={{ fontWeight:700, fontSize:20, color: token.colorWarning }}>{emailAnalytics.current.clickRate}%</div>
                              <Text type="secondary" style={{ fontSize:11 }}>Click Rate</Text>
                              {emailAnalytics.comparison && (
                                <div style={{ fontSize:10, color: emailAnalytics.current.clickRate > emailAnalytics.comparison.clickRate ? token.colorSuccess : token.colorError }}>
                                  {emailAnalytics.current.clickRate > emailAnalytics.comparison.clickRate ? '↗' : '↘'} 
                                  {Math.abs(emailAnalytics.current.clickRate - emailAnalytics.comparison.clickRate).toFixed(1)}%
                                </div>
                              )}
                            </div>
                          </Col>
                          <Col xs={12} sm={6}>
                            <div>
                              <div style={{ fontWeight:700, fontSize:20, color: emailAnalytics.current.bounceRate > 5 ? token.colorError : token.colorText }}>{emailAnalytics.current.bounceRate}%</div>
                              <Text type="secondary" style={{ fontSize:11 }}>Bounce Rate</Text>
                              {emailAnalytics.comparison && (
                                <div style={{ fontSize:10, color: emailAnalytics.current.bounceRate < emailAnalytics.comparison.bounceRate ? token.colorSuccess : token.colorError }}>
                                  {emailAnalytics.current.bounceRate < emailAnalytics.comparison.bounceRate ? '↘' : '↗'} 
                                  {Math.abs(emailAnalytics.current.bounceRate - emailAnalytics.comparison.bounceRate).toFixed(1)}%
                                </div>
                              )}
                            </div>
                          </Col>
                        </Row>
                      </Card>
                    </Col>

                    {/* Enhanced Time Series Chart */}
                    <Col xs={24} lg={16}>
                      <Card size="small" styles={{ body: { padding: 12 } }} style={{ borderRadius: 10, border: `1px solid ${token.colorBorderSecondary}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Text type="secondary" style={{ fontSize:12 }}>Email Performance Trends</Text>
                          {emailAnalytics.predictions && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Text style={{ fontSize: 10, color: token.colorTextSecondary }}>
                                Trend: {emailAnalytics.predictions.trend}
                              </Text>
                              <Tag size="small" color={emailAnalytics.predictions.confidence === 'high' ? 'green' : emailAnalytics.predictions.confidence === 'medium' ? 'orange' : 'default'}>
                                {emailAnalytics.predictions.confidence} confidence
                              </Tag>
                            </div>
                          )}
                        </div>
                        <div style={{ width:'100%', height:200, marginTop:8 }}>
                          <ResponsiveContainer>
                            <RechartsLineChart data={emailAnalytics.current.series} margin={{ top:4, right:8, left:0, bottom:0 }}>
                              <RechartsCartesianGrid strokeDasharray="3 3" stroke={token.colorBorder} />
                              <RechartsXAxis dataKey="date" stroke={token.colorTextSecondary} tick={{ fontSize:11 }} hide />
                              <RechartsYAxis stroke={token.colorTextSecondary} tick={{ fontSize:11 }} width={34} />
                              <RechartsTooltip 
                                contentStyle={{ borderRadius:8 }}
                                formatter={(value, name) => [value, name === 'sent' ? 'Sent' : name === 'uniqueOpens' ? 'Unique Opens' : name === 'uniqueClicks' ? 'Unique Clicks' : name]}
                              />
                              <RechartsLegend wrapperStyle={{ fontSize:10 }} />
                              <RechartsLine type="monotone" dataKey="sent" stroke={token.colorPrimary} strokeWidth={2} dot={false} name="Sent" />
                              <RechartsLine type="monotone" dataKey="uniqueOpens" stroke={token.colorSuccess} strokeWidth={2} dot={false} name="Unique Opens" />
                              <RechartsLine type="monotone" dataKey="uniqueClicks" stroke={token.colorWarning} strokeWidth={2} dot={false} name="Unique Clicks" />
                              <RechartsLine type="monotone" dataKey="delivered" stroke={token.colorInfo} strokeWidth={1} dot={false} name="Delivered" />
                              <RechartsLine type="monotone" dataKey="bounced" stroke={token.colorError} strokeWidth={1} dot={false} name="Bounced" />
                            </RechartsLineChart>
                          </ResponsiveContainer>
                        </div>
                        {emailAnalytics.predictions && (
                          <div style={{ marginTop: 8, padding: 8, backgroundColor: token.colorBgLayout, borderRadius: 4 }}>
                            <Text style={{ fontSize: 11, color: token.colorTextSecondary }}>
                              Predicted next 7 days: ~{emailAnalytics.predictions.predictedDailySent} emails/day • 
                              ~{emailAnalytics.predictions.predictedOpenRate}% open rate
                            </Text>
                          </div>
                        )}
                      </Card>
                    </Col>

                    {/* Insights & Alerts */}
                    <Col xs={24} lg={8}>
                      <Card size="small" styles={{ body: { padding: 12 } }} style={{ borderRadius: 10, border: `1px solid ${token.colorBorderSecondary}` }}>
                        <Text type="secondary" style={{ fontSize:12 }}>Insights & Alerts</Text>
                        <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:8, maxHeight: 180, overflow: 'auto' }}>
                          {(emailAnalytics.insights||[]).length === 0 && <Text type="secondary" style={{ fontSize: 11 }}>No insights yet</Text>}
                          {(emailAnalytics.insights||[]).map((insight, idx) => (
                            <div key={idx} style={{ 
                              padding: 6, 
                              borderRadius: 4, 
                              border: `1px solid ${insight.type === 'positive' ? token.colorSuccess : insight.type === 'negative' ? token.colorError : token.colorWarning}`,
                              backgroundColor: insight.type === 'positive' ? token.colorSuccessBg : insight.type === 'negative' ? token.colorErrorBg : token.colorWarningBg
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                <span style={{ 
                                  fontSize: 10,
                                  color: insight.type === 'positive' ? token.colorSuccess : insight.type === 'negative' ? token.colorError : token.colorWarning
                                }}>
                                  {insight.type === 'positive' ? '✓' : insight.type === 'negative' ? '✗' : '⚠'}
                                </span>
                                <Text style={{ fontSize: 10, fontWeight: 600 }}>{insight.metric}</Text>
                                {insight.change && (
                                  <Tag size="small" color={insight.change > 0 ? 'green' : 'red'}>
                                    {insight.change > 0 ? '+' : ''}{insight.change.toFixed(1)}%
                                  </Tag>
                                )}
                              </div>
                              <Text style={{ fontSize: 10 }}>{insight.message}</Text>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </Col>

                    {/* Enhanced Template Performance */}
                    <Col xs={24} lg={12}>
                      <Card size="small" styles={{ body: { padding: 12 } }} style={{ borderRadius: 10, border: `1px solid ${token.colorBorderSecondary}` }}>
                        <Text type="secondary" style={{ fontSize:12 }}>Template Performance</Text>
                        <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8, maxHeight: 160, overflow: 'auto' }}>
                          {(emailAnalytics.current.templates||[]).slice(0,8).map(t => {
                            const openRate = t.sent > 0 ? (t.uniqueOpens / t.sent) * 100 : 0;
                            const clickRate = t.sent > 0 ? (t.uniqueClicks / t.sent) * 100 : 0;
                            const avgOpenTime = t.avgTimeToOpen ? `${Math.round(t.avgTimeToOpen)}m` : null;
                            
                            return (
                              <div key={t.templateKey} style={{ 
                                display:'grid', 
                                gridTemplateColumns:'1fr auto', 
                                gap:8, 
                                alignItems:'center',
                                padding: 6,
                                borderRadius: 4,
                                backgroundColor: openRate > emailAnalytics.current.openRate ? token.colorSuccessBg : openRate < emailAnalytics.current.openRate * 0.7 ? token.colorErrorBg : 'transparent'
                              }}>
                                <div>
                                  <Text code style={{ fontSize: 11 }}>{t.templateKey}</Text>
                                  <div style={{ fontSize:10, color:token.colorTextSecondary, marginTop: 2 }}>
                                    <span style={{ color: openRate > emailAnalytics.current.openRate ? token.colorSuccess : openRate < emailAnalytics.current.openRate * 0.7 ? token.colorError : 'inherit' }}>
                                      {openRate.toFixed(1)}% open
                                    </span>
                                    {clickRate > 0 && <span> • {clickRate.toFixed(1)}% click</span>}
                                    {avgOpenTime && <span> • avg {avgOpenTime}</span>}
                                    {t.bounced > 0 && <span> • {((t.bounced/t.sent)*100).toFixed(1)}% bounce</span>}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <Tag>{t.sent}</Tag>
                                  {openRate > emailAnalytics.current.openRate * 1.2 && (
                                    <div style={{ fontSize: 10, color: token.colorSuccess }}>★ Top</div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {(emailAnalytics.current.templates||[]).length===0 && <Text type="secondary" style={{ fontSize: 11 }}>No emails yet</Text>}
                        </div>
                      </Card>
                    </Col>

                    {/* Recommendations */}
                    <Col xs={24} lg={12}>
                      <Card size="small" styles={{ body: { padding: 12 } }} style={{ borderRadius: 10, border: `1px solid ${token.colorBorderSecondary}` }}>
                        <Text type="secondary" style={{ fontSize:12 }}>Recommendations</Text>
                        <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8, maxHeight: 160, overflow: 'auto' }}>
                          {(emailAnalytics.recommendations||[]).length === 0 && <Text type="secondary" style={{ fontSize: 11 }}>All good! No recommendations.</Text>}
                          {(emailAnalytics.recommendations||[]).slice(0,5).map((rec, idx) => (
                            <div key={idx} style={{ 
                              padding: 6, 
                              borderRadius: 4, 
                              border: `1px solid ${rec.priority === 'high' ? token.colorError : rec.priority === 'medium' ? token.colorWarning : token.colorInfo}`,
                              backgroundColor: rec.priority === 'high' ? token.colorErrorBg : rec.priority === 'medium' ? token.colorWarningBg : token.colorInfoBg
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                <Tag 
                                  size="small" 
                                  color={rec.priority === 'high' ? 'red' : rec.priority === 'medium' ? 'orange' : 'blue'}
                                >
                                  {rec.priority}
                                </Tag>
                                <Text style={{ fontSize: 10, fontWeight: 600 }}>{rec.title}</Text>
                              </div>
                              <Text style={{ fontSize: 10, marginBottom: 2 }}>{rec.description}</Text>
                              <Text style={{ fontSize: 9, color: token.colorTextSecondary, fontStyle: 'italic' }}>
                                Action: {rec.action}
                              </Text>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </Col>

                    {/* Send Time Heatmap */}
                    {emailAnalytics.heatmap && (
                      <Col span={24}>
                        <Card size="small" styles={{ body: { padding: 12 } }} style={{ borderRadius: 10, border: `1px solid ${token.colorBorderSecondary}` }}>
                          <Text type="secondary" style={{ fontSize:12 }}>Send Time Analysis</Text>
                          <Row gutter={[16, 8]} style={{ marginTop: 8 }}>
                            <Col xs={24} sm={12}>
                              <div style={{ marginBottom: 4 }}>
                                <Text style={{ fontSize: 11 }}>By Hour (24h)</Text>
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                {emailAnalytics.heatmap.byHour.map(h => {
                                  const maxCount = Math.max(...emailAnalytics.heatmap.byHour.map(x => x.count));
                                  const intensity = maxCount > 0 ? h.count / maxCount : 0;
                                  return (
                                    <div key={h.hour} style={{
                                      width: 16, height: 16, borderRadius: 2,
                                      backgroundColor: intensity > 0 ? `rgba(22, 119, 255, ${intensity})` : token.colorBgLayout,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: 8, color: intensity > 0.5 ? 'white' : token.colorText,
                                      cursor: 'help',
                                      title: `${h.hour}:00 - ${h.count} emails`
                                    }}>
                                      {h.hour}
                                    </div>
                                  );
                                })}
                              </div>
                            </Col>
                            <Col xs={24} sm={12}>
                              <div style={{ marginBottom: 4 }}>
                                <Text style={{ fontSize: 11 }}>By Day of Week</Text>
                              </div>
                              <div style={{ display: 'flex', gap: 4 }}>
                                {emailAnalytics.heatmap.byDay.map(d => {
                                  const maxCount = Math.max(...emailAnalytics.heatmap.byDay.map(x => x.count));
                                  const intensity = maxCount > 0 ? d.count / maxCount : 0;
                                  return (
                                    <div key={d.day} style={{
                                      flex: 1, height: 20, borderRadius: 4,
                                      backgroundColor: intensity > 0 ? `rgba(22, 119, 255, ${intensity})` : token.colorBgLayout,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: 9, color: intensity > 0.5 ? 'white' : token.colorText,
                                      cursor: 'help',
                                      title: `${d.day} - ${d.count} emails`
                                    }}>
                                      {d.day}
                                    </div>
                                  );
                                })}
                              </div>
                            </Col>
                          </Row>
                        </Card>
                      </Col>
                    )}
                  </Row>
                ) : (
                  <Text type="secondary">No email activity</Text>
                )}
              </div>
            ) : (
              <Alert type="info" showIcon message="No analytics yet" description="Once your site gets traffic, you'll see metrics here." />
            )}
          </div>
        )}
      </Modal>

      {/* Upgrade Modal with plan selection (polished) */}
      <Modal
        title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CrownOutlined style={{ color: '#ffd700' }} />
          <span>Choose your plan</span>
        </span>}
        open={showUpgradeModal}
        onCancel={() => setShowUpgradeModal(false)}
        footer={null}
        width={820}
        centered
        zIndex={10000}
      >
        <Row gutter={[16, 16]}>
          {[PRICING_PLANS.pro, PRICING_PLANS.business].map((plan) => {
            const selected = selectedUpgradePlan === plan.id;
            const isPro = plan.id === 'pro';
            const headerGradient = isPro
              ? 'linear-gradient(135deg, #fff7ae, #ffd700)'
              : 'linear-gradient(135deg, #7c3aed, #22d3ee)';
            const accent = isPro ? '#b8860b' : '#7c3aed';

            return (
              <Col xs={24} md={12} key={plan.id}>
                <Card
                  hoverable
                  onClick={() => setSelectedUpgradePlan(plan.id)}
                  style={{
                    borderRadius: 20,
                    border: selected ? `2px solid ${token.colorPrimary}` : `1px solid ${token.colorBorderSecondary}`,
                    boxShadow: selected ? token.boxShadowSecondary : token.boxShadowTertiary,
                    transition: 'box-shadow .25s, border-color .25s'
                  }}
                  styles={{ body: { padding: 0 } }}
                >
                  <div style={{ background: headerGradient, padding: '16px 16px 12px 16px' }}>
                    <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Space align="center">
                        <CrownOutlined style={{ color: isPro ? '#8b8000' : '#fff', fontSize: 18 }} />
                        <Title level={4} style={{ margin: 0, color: isPro ? '#000' : '#fff' }}>{plan.name}</Title>
                      </Space>
                      {isPro && (
                        <Tag color="#000" style={{ background: '#ffd700', borderColor: '#ffd700', color: '#000' }}>Popular</Tag>
                      )}
                    </Space>
                    <div style={{ marginTop: 8 }}>
                      <Title level={2} style={{ margin: 0, color: isPro ? '#000' : '#fff' }}>
                        ${plan.price}
                        <Text style={{ fontSize: 14, marginLeft: 4, color: isPro ? '#4a4a4a' : '#e6f7ff' }}>/month</Text>
                      </Title>
                    </div>
                  </div>
                  <div style={{ padding: 16 }}>
                    <Space direction="vertical" size={10} style={{ width: '100%' }}>
                      {plan.features.slice(0, 6).map((f, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          <Text>{f}</Text>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button 
                          type={selected ? 'primary' : 'default'}
                          onClick={() => setSelectedUpgradePlan(plan.id)}
                          style={{ minWidth: 160 }}
                        >
                          {selected ? 'Selected' : `Choose ${plan.name}`}
                        </Button>
                      </div>
                    </Space>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
        <Alert
          style={{ marginTop: 16 }}
          type="success"
          showIcon
          message={
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LockOutlined />
              Secure checkout powered by Stripe. Cancel anytime.
            </span>
          }
        />
        <Divider />
        <Row justify="end" gutter={8}>
          <Col>
            <Button onClick={() => setShowUpgradeModal(false)}>Cancel</Button>
          </Col>
          <Col>
            <Button type="primary" onClick={handleUpgradeConfirm}>
              Continue to Checkout
            </Button>
          </Col>
        </Row>
      </Modal>

      {/* Account Settings Modal */}
      <Modal
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SettingOutlined style={{ color: token.colorPrimary }} />
            <span>Account Settings</span>
          </span>
        }
        className="account-settings-modal"
        open={showAccountSettings}
        onCancel={() => setShowAccountSettings(false)}
        footer={null}
        width={'32rem'}
        styles={{
          body: { padding: '12px 20px 20px', maxHeight: '32rem', overflowY: 'auto' },
          content: { borderRadius: 0, overflow: 'hidden', padding: 0, background: 'transparent', boxShadow: 'none' }
        }}
        destroyOnHidden
        destroyOnClose
      >
        <Tabs
          defaultActiveKey="profile"
          items={[
            {
              key: 'profile',
              label: (
                <span><UserOutlined /> Profile</span>
              ),
              children: (
                <Form
                  form={accountForm}
                  layout="vertical"
                  onValuesChange={() => {
                    // Detect diff vs current
                    const v = accountForm.getFieldsValue();
                    const nextFullName = (v.fullName || '').trim();
                    const nextPhone = (v.phone || '').trim();
                    const nextUsername = (v.username || '').trim().toLowerCase();
                    const changed =
                      nextFullName !== (userData?.fullName || user.fullName || user.displayName || '').trim() ||
                      nextPhone !== (userData?.phone || '').trim() ||
                      nextUsername !== currentCanonicalUsername;
                    setAccountHasChanges(changed);
                    // Trigger username availability debounce
                    if (nextUsername && nextUsername !== currentCanonicalUsername) {
                      setUsernameStatus(s => ({ ...s, checking: true, available: null }));
                      clearTimeout(window.__usernameCheckTimer);
                      window.__usernameCheckTimer = setTimeout(async () => {
                        try {
                          const exists = await checkUsernameExists(nextUsername);
                          setUsernameStatus({ checking: false, available: !exists });
                        } catch {
                          setUsernameStatus({ checking: false, available: null });
                        }
                      }, 450);
                    } else {
                      // reset if unchanged or empty
                      setUsernameStatus({ checking: false, available: null });
                    }
                  }}
                  onFinish={async (values) => {
                    try {
                      setSavingAccount(true);
                      const nextFullName = (values.fullName || '').trim();
                      const desiredUsernameRaw = (values.username || '').trim().toLowerCase();
                      const desiredUsername = desiredUsernameRaw.replace(/[^a-z0-9-_]/g, '-');
                      // Normalize phone: allow digits + plus + basic separators, collapse spaces
                      const phoneRaw = (values.phone || '').trim();
                      const phone = phoneRaw.replace(/[^0-9+()\-\s]/g, '').replace(/\s+/g, ' ');

                      const email = user.email; // read-only

                      if (!desiredUsername) {
                        message.error('Username is required');
                        return;
                      }
                      if (desiredUsername.length < 2 || desiredUsername.length > 30) {
                        message.error('Username must be between 2 and 30 characters');
                        return;
                      }

                      const currentUsername = (userData?.username || user?.username || '').toLowerCase();
                      const currentFullName = (userData?.fullName || user.fullName || user.displayName || '').trim();
                      const currentPhone = (userData?.phone || '').trim();

                      // Detect if anything actually changed to avoid unnecessary writes
                      const changed = desiredUsername !== currentUsername || nextFullName !== currentFullName || phone !== currentPhone;
                      if (!changed) {
                        message.info('No changes to save');
                        return;
                      }

                      // Only check uniqueness if username changed
                      if (desiredUsername !== currentUsername) {
                        // If we already know it's taken from live check, short-circuit
                        if (usernameStatus.available === false) {
                          message.error('That username is already taken');
                          return;
                        }
                        const exists = await checkUsernameExists(desiredUsername);
                        if (exists) {
                          message.error('That username is already taken');
                          return;
                        }
                      }

                      const updatePayload = {
                        username: desiredUsername,
                        email
                      };
                      if (nextFullName || currentFullName) updatePayload.fullName = nextFullName || currentFullName;
                      if (phone) updatePayload.phone = phone;

                      await updateUserData(user.uid, updatePayload);

                      // Update Firebase Auth displayName for welcome header
                      try {
                        if (auth.currentUser && nextFullName && nextFullName !== auth.currentUser.displayName) {
                          await updateProfile(auth.currentUser, { displayName: nextFullName });
                        }
                      } catch {}

                      message.success('Account updated');
                      setShowAccountSettings(false);
                      window.location.reload();
                    } catch (e) {
                      console.error(e);
                      message.error('Failed to update account');
                    } finally {
                      setSavingAccount(false);
                    }
                  }}
                  initialValues={{
                    fullName: user.fullName || user.displayName || '',
                    username: (userData?.username || user?.username || '').toLowerCase(),
                    email: user.email,
                    phone: userData?.phone || ''
                  }}
                >
                  <div style={{
                    background: 'linear-gradient(135deg, var(--panel-bg) 0%, color-mix(in srgb, var(--accent-color, #1677ff) 18%, var(--panel-bg)) 100%)',
                    padding: '12px 16px',
                    borderRadius: 12,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16
                  }}>
                    <div aria-hidden="true" style={{
                      width: 54,
                      height: 54,
                      borderRadius: '50%',
                      background: 'linear-gradient(145deg, var(--accent-color, #1677ff), color-mix(in srgb, var(--accent-color, #1677ff) 40%, black))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: 20,
                      color: '#fff',
                      boxShadow: '0 4px 10px rgba(0,0,0,.18)'
                    }}>{(currentCanonicalUsername || 'U').slice(0,1).toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text strong style={{ fontSize: 16 }}>{user.fullName || user.displayName || 'Your profile'}</Text>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{user.email}</div>
                    </div>
                    <Tag color={accountHasChanges ? 'gold' : 'default'} style={{ alignSelf: 'flex-start' }}>
                      {accountHasChanges ? 'Unsaved changes' : 'Up to date'}
                    </Tag>
                  </div>
                  <Form.Item label="Email" name="email">
                    <Input prefix={<MailOutlined />} disabled />
                  </Form.Item>
                  <div className="as-grid">
                    <div className="as-section">
                      <h4 className="as-section-title">Identity</h4>
                      <Form.Item
                        label="Full name"
                        name="fullName"
                        tooltip="Optional. Shown in greetings and receipts"
                        rules={[{ max: 80, message: 'Name too long' }]}
                      >
                        <Input prefix={<UserOutlined />} placeholder="Your name" />
                      </Form.Item>
                      <Form.Item
                        label={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Username {usernameStatus.checking && <Spin size="small" style={{ marginLeft: 4 }} />}{usernameStatus.available && usernameStatus.available === true && <Tag color="green" style={{ marginLeft: 4 }}>Available</Tag>}{usernameStatus.available === false && <Tag color="red" style={{ marginLeft: 4 }}>Taken</Tag>}</span>}
                        name="username"
                        extra={<span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Your public URLs: <code>/u/{(accountForm.getFieldValue('username') || currentCanonicalUsername) || 'username'}/[site]</code></span>}
                        rules={[
                          { required: true, message: 'Please choose a username' },
                          { pattern: /^[a-z0-9-_]+$/, message: 'Use lowercase letters, numbers, hyphens or underscores' },
                          { min: 2, max: 30, message: '2 to 30 characters' }
                        ]}
                      >
                        <Input placeholder="your-username" maxLength={30} onChange={(e) => {
                          const v = e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
                          accountForm.setFieldsValue({ username: v });
                        }} />
                      </Form.Item>
                      <div aria-live="polite" style={{ fontSize: 12, minHeight: 18, color: usernameStatus.available === false ? 'var(--error-color, #ff4d4f)' : 'var(--text-secondary)' }}>
                        {usernameStatus.available === false && 'Username unavailable'}
                        {usernameStatus.available === true && accountHasChanges && 'Username is available'}
                      </div>
                    </div>
                    <div className="as-section">
                      <h4 className="as-section-title">Contact</h4>
                      <Form.Item
                        label="Phone"
                        name="phone"
                        tooltip="Optional. For receipts & transactional messages"
                        rules={[
                          { pattern: /^[0-9+()\-\s]{7,20}$/, message: 'Enter a valid phone number' }
                        ]}
                      >
                        <Input prefix={<PhoneOutlined />} placeholder="e.g. +1 (555) 123-4567" />
                      </Form.Item>
                      <div className="as-hint" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>We never share your phone number.</div>
                      <Divider style={{ margin: '20px 0 12px' }} />
                      <div className="as-mini-card">
                        <strong style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Profile Tips</strong>
                        <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 12, lineHeight: 1.5 }}>
                          <li>Keep your username short & memorable.</li>
                          <li>Avoid personal data (PII) in usernames.</li>
                          <li>Use a consistent name across sites.</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="as-savebar">
                    <div className="as-savebar-status" aria-live="polite">
                      {savingAccount ? 'Saving…' : accountHasChanges ? 'Unsaved changes' : 'All changes saved'}
                    </div>
                    <div className="as-savebar-actions">
                      <Button onClick={() => setShowAccountSettings(false)}>Close</Button>
                      <Button type="primary" htmlType="submit" loading={savingAccount} disabled={!accountHasChanges || usernameStatus.checking || usernameStatus.available === false}>Save changes</Button>
                    </div>
                  </div>

                </Form>
              )
            },
            {
              key: 'security',
              label: (
                <span><SafetyOutlined /> Security</span>
              ),
              children: (
                <SecuritySection user={user} token={token} changingPassword={changingPassword} setChangingPassword={setChangingPassword} />
              )
            }
          ]}
        />
      </Modal>

      {/* Update Payment Method Modal */}
      <Modal
        title="Update payment method"
        open={showUpdatePaymentModal}
        onCancel={() => setShowUpdatePaymentModal(false)}
        footer={null}
        width={520}
        destroyOnClose
      >
        {stripePromise && clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <UpdatePaymentForm />
          </Elements>
        ) : (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Spin />
          </div>
        )}
      </Modal>

      {/* Site Settings Modal */}
      <SiteSettingsModal
        visible={showSiteSettings}
        onClose={() => setShowSiteSettings(false)}
        site={selectedSite}
        user={user}
        onSiteUpdated={handleSiteUpdated}
      />
      {/* Seller Orders (Overview) */}
      {activeTab === 'overview' && (
        <Card style={{ marginTop: 24, borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }} title="Recent Orders" extra={<Button size="small" disabled={!sellerOrdersCursor || sellerOrdersLoading} loading={sellerOrdersLoading} onClick={()=>{
          // trigger pagination load
          (async()=>{
            try {
              setSellerOrdersLoading(true);
              const params = new URLSearchParams({ sellerUserId: user.uid, limit: '10' });
              if(sellerOrdersCursor) params.set('cursor', String(sellerOrdersCursor));
              const res = await fetch(`/api/seller/orders?${params.toString()}`);
              const json = await res.json();
              if(res.ok && json.ok) {
                setSellerOrders(prev => [...prev, ...json.orders]);
                setSellerOrdersCursor(json.nextCursor || null);
              }
            } catch(e){ console.warn(e); } finally { setSellerOrdersLoading(false); }
          })();
        }}>Load more</Button>}>
          <Table
            size="small"
            rowKey="id"
            dataSource={sellerOrders}
            loading={sellerOrdersLoading}
            pagination={false}
            locale={{ emptyText: sellerOrdersLoading ? 'Loading...' : 'No orders yet' }}
            columns={[
              { title:'Order', dataIndex:'id', key:'id', width:160, render:(v)=> <code style={{ fontSize:12 }}>{v}</code> },
              { title:'Status', dataIndex:'status', key:'status', width:110, render:(v)=> <Tag color={v==='paid'?'green': v==='pending'?'gold': v==='refunded'?'blue':'red'}>{v}</Tag> },
              { title:'Total', dataIndex:'total', key:'total', width:110, render:(v,r)=> `${(v/100).toFixed(2)} ${r.currency||'USD'}` },
              { title:'Discount', dataIndex:'discountAmount', key:'discountAmount', width:110, render:(v)=> v ? (v/100).toFixed(2) : '0.00' },
              { title:'Created', dataIndex:'createdAt', key:'createdAt', render:(v)=> v ? new Date(v).toLocaleString() : '' }
            ]}
          />
        </Card>
      )}
  </div>
  </ConfigProvider>
  );
}


// Security section as an inline component to keep one file
function SecuritySection({ user, token, changingPassword, setChangingPassword }) {
  const [form] = Form.useForm();
  const isPasswordProvider = !!auth.currentUser?.providerData?.some(p => p.providerId === 'password');

  const handleChangePassword = async (values) => {
    try {
      setChangingPassword(true);
      const { currentPassword, newPassword, confirmPassword } = values;
      if (newPassword !== confirmPassword) {
        message.error('New passwords do not match');
        return;
      }
      // Re-authenticate
      const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import('firebase/auth');
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      message.success('Password updated');
      form.resetFields();
    } catch (e) {
      console.error(e);
      const msg = e?.code === 'auth/wrong-password' ? 'Current password is incorrect' : (e?.message || 'Failed to update password');
      message.error(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  const sendReset = async () => {
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, user.email);
      message.success('Password reset email sent');
    } catch (e) {
      console.error(e);
      message.error('Failed to send reset email');
    }
  };

  return (
    <div>
      {isPasswordProvider ? (
        <Form layout="vertical" form={form} onFinish={handleChangePassword}>
          <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Update your password" />
          <Form.Item name="currentPassword" label="Current password" rules={[{ required: true, message: 'Enter current password' }]}>
            <Input.Password prefix={<KeyOutlined />} placeholder="Current password" />
          </Form.Item>
          <Form.Item name="newPassword" label="New password" rules={[{ required: true, message: 'Enter new password' }, { min: 6, message: 'Minimum 6 characters' }]}>
            <Input.Password prefix={<KeyOutlined />} placeholder="New password" />
          </Form.Item>
          <Form.Item name="confirmPassword" label="Confirm new password" dependencies={["newPassword"]} rules={[{ required: true, message: 'Confirm new password' }]}>
            <Input.Password prefix={<KeyOutlined />} placeholder="Confirm new password" />
          </Form.Item>
          <Space style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button type="link" onClick={sendReset}>Forgot your current password?</Button>
            <Button type="primary" htmlType="submit" loading={changingPassword}>Change Password</Button>
          </Space>
        </Form>
      ) : (
        <>
          <Alert
            type="info"
            showIcon
            message="Your account uses a social provider"
            description="Password is managed by your sign-in provider. You can still set a password to enable email login."
            style={{ marginBottom: 12 }}
          />
          <Button type="primary" onClick={sendReset}>Send password setup email</Button>
        </>
      )}
    </div>
  );
}
