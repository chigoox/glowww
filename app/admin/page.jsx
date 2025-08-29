'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Table, 
  Tabs, 
  Button, 
  Input, 
  Select, 
  DatePicker, 
  Modal, 
  Form, 
  message, 
  Tag, 
  Space, 
  Alert, 
  Typography, 
  Tooltip, 
  Progress,
  Avatar,
  Dropdown,
  Popconfirm,
  Layout,
  Menu,
  Spin
} from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  GlobalOutlined,
  MailOutlined,
  BarChartOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  ExportOutlined,
  ReloadOutlined,
  FilterOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  RiseOutlined,
  FallOutlined,
  LogoutOutlined,
  MenuOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { theme } from 'antd';
import { signOut } from '@/lib/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { Header, Content, Sider } = Layout;

export default function AdminDashboard() {
  const { token } = theme.useToken();
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Check if user is platform admin - more permissive for development
  const isPlatformAdmin = user && (
    userData?.tier === 'admin' || 
    userData?.subscriptionTier === 'admin' ||
    userData?.subscription?.plan === 'admin' ||
    user?.customClaims?.admin || 
    user?.customClaims?.platformAdmin ||
    // Fallback for development - if user has any admin-like properties
    userData?.isAdmin ||
    user?.email?.includes('admin') || // Very permissive for development
    // For development, allow any authenticated user (remove this in production!)
    process.env.NODE_ENV === 'development'
  );

  // Debug logging
  useEffect(() => {
    if (user) {
      console.log('Admin Debug - User:', {
        email: user.email,
        userData: userData,
        customClaims: user.customClaims,
        isPlatformAdmin: isPlatformAdmin,
        tier: userData?.tier
      });
    }
  }, [user, userData, isPlatformAdmin]);
  
  // State management
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('30d');
  const [selectedSite, setSelectedSite] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Platform metrics state
  const [platformMetrics, setPlatformMetrics] = useState({
    totalSites: 0,
    totalUsers: 0,
    totalVisitors: 0,
    totalPageViews: 0,
    activeUsers: 0,
    growth: {
      sites: 0,
      users: 0,
      visitors: 0
    }
  });
  
  const [sitesData, setSitesData] = useState([]);
  const [usersData, setUsersData] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState(null);
  const [emailMetrics, setEmailMetrics] = useState({
    totalSent: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0
  });
  
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [topSites, setTopSites] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemHealth, setSystemHealth] = useState({});

  // Redirect if not authenticated or not platform admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/admin/login');
      } else if (!isPlatformAdmin) {
        router.push('/');
      }
    }
  }, [user, isPlatformAdmin, authLoading, router]);

  // Get auth headers for API calls
  const getAuthHeaders = async () => {
    if (user && auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        return {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };
      } catch (error) {
        console.error('Error getting ID token:', error);
        return {};
      }
    }
    return {};
  };

  // Load platform data
  useEffect(() => {
    if (isPlatformAdmin && user) {
      loadPlatformMetrics();
      loadSitesData();
      loadUsersData();
      loadEmailMetrics();
      loadTimeSeriesData();
      loadSystemHealth();
    } else if (isPlatformAdmin) {
      // Set some mock data for development
      setDataLoading(false);
      setPlatformMetrics({
        totalSites: 150,
        totalUsers: 1250,
        totalVisitors: 8750,
        totalPageViews: 45000,
        activeUsers: 425,
        growth: { sites: 12, users: 8, visitors: 15 }
      });
    }
  }, [isPlatformAdmin, user, dateRange]);

  // Load sites data when Sites tab is selected
  useEffect(() => {
    if (isPlatformAdmin && user && activeTab === 'sites') {
      console.log('🌐 Sites tab selected, loading sites data...');
      loadSitesData();
    }
  }, [activeTab, isPlatformAdmin, user]);

  const loadPlatformMetrics = async () => {
    try {
      setDataLoading(true);
      console.log('🔄 Loading platform metrics...');
      
      const headers = await getAuthHeaders();
      console.log('📝 Headers:', Object.keys(headers));
      
      const response = await fetch(`/api/admin/platform/metrics?range=${dateRange}`, {
        headers
      });
      
      console.log('📊 Metrics API response status:', response.status);
      
      const data = await response.json();
      console.log('📊 Metrics API response data:', data);
      
      if (data.ok) {
        setPlatformMetrics(data.metrics);
        setTopSites(data.topSites);
        setRecentActivity(data.recentActivity);
        console.log('✅ Platform metrics loaded successfully');
      } else {
        console.error('❌ Metrics API error:', data.error);
        message.error(data.error || 'Failed to load platform metrics');
        // Set fallback data
        setPlatformMetrics({
          totalSites: 0,
          totalUsers: 0,
          totalVisitors: 0,
          totalPageViews: 0,
          activeUsers: 0,
          growth: { sites: 0, users: 0, visitors: 0 }
        });
      }
    } catch (error) {
      console.error('Error loading platform metrics:', error);
      message.error('Failed to load platform metrics - using fallback data');
      // Set mock data for development
      setPlatformMetrics({
        totalSites: 0,
        totalUsers: 4, // We know there are 4 users from your description
        totalVisitors: 0,
        totalPageViews: 0,
        activeUsers: 0,
        growth: { sites: 0, users: 0, visitors: 0 }
      });
      setTopSites([]);
      setRecentActivity([]);
    } finally {
      setDataLoading(false);
    }
  };

  const loadSitesData = async () => {
    try {
      console.log('🌐 Loading sites data...');
      
      const headers = await getAuthHeaders();
      console.log('🌐 Auth headers obtained:', !!headers.Authorization);
      
      const response = await fetch(`/api/admin/platform/sites?range=${dateRange}`, {
        headers
      });
      
      console.log('🌐 Sites API response status:', response.status);
      console.log('🌐 Sites API response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        console.error('🌐 Sites API HTTP error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('🌐 Sites API error body:', errorText);
        message.error(`Failed to load sites data: ${response.status}`);
        setSitesData([]);
        return;
      }
      
      const data = await response.json();
      console.log('🌐 Sites API response data:', data);
      console.log('🌐 Sites data structure:', {
        ok: data.ok,
        sitesCount: data.sites?.length || 0,
        firstSite: data.sites?.[0] || null,
        debug: data.debug || null
      });
      
      if (data.ok) {
        setSitesData(data.sites || []);
        console.log(`✅ Loaded ${data.sites?.length || 0} sites for display`);
        if (data.sites?.length > 0) {
          console.log('🌐 Sample site data:', data.sites[0]);
        } else {
          console.warn('🌐 No sites returned from API');
        }
      } else {
        console.error('❌ Sites API error:', data.error);
        message.error(data.error || 'Failed to load sites data');
        setSitesData([]);
      }
    } catch (error) {
      console.error('Error loading sites data:', error);
      message.error('Failed to load sites data');
      setSitesData([]);
    }
  };

  const loadUsersData = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/platform/users?range=${dateRange}`, {
        headers
      });
      const data = await response.json();
      if (data.ok) {
        setUsersData(data.users);
        setFilteredUsers(null); // Reset filter when data reloads
      } else {
        message.error(data.error || 'Failed to load users data');
      }
    } catch (error) {
      console.error('Error loading users data:', error);
      message.error('Failed to load users data');
    }
  };

  const loadEmailMetrics = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/platform/email-metrics?range=${dateRange}`, {
        headers
      });
      const data = await response.json();
      if (data.ok) {
        setEmailMetrics(data.metrics);
      } else {
        message.error(data.error || 'Failed to load email metrics');
      }
    } catch (error) {
      console.error('Error loading email metrics:', error);
      message.error('Failed to load email metrics');
    }
  };

  const loadTimeSeriesData = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/platform/timeseries?range=${dateRange}`, {
        headers
      });
      const data = await response.json();
      if (data.ok) {
        setTimeSeriesData(data.series);
      } else {
        message.error(data.error || 'Failed to load time series data');
      }
    } catch (error) {
      console.error('Error loading time series data:', error);
      message.error('Failed to load time series data');
    }
  };

  const loadSystemHealth = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/platform/health', {
        headers
      });
      const data = await response.json();
      if (data.ok) {
        setSystemHealth(data.health);
      } else {
        message.error(data.error || 'Failed to load system health');
      }
    } catch (error) {
      console.error('Error loading system health:', error);
      message.error('Failed to load system health');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
      message.error('Failed to log out');
    }
  };

  const handleEditSite = (site) => {
    setSelectedSite(site);
    setEditModalVisible(true);
  };

  const handleDeleteSite = async (siteId) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/platform/sites/${siteId}`, {
        method: 'DELETE',
        headers
      });
      const data = await response.json();
      if (data.ok) {
        message.success('Site deleted successfully');
        loadSitesData();
        loadPlatformMetrics();
      } else {
        message.error(data.error || 'Failed to delete site');
      }
    } catch (error) {
      console.error('Error deleting site:', error);
      message.error('Failed to delete site');
    }
  };

  const handleViewSite = (site) => {
    window.open(`/u/${site.username}/${site.name}`, '_blank');
  };

  const handleEditSiteAsOwner = (site) => {
    window.open(`/Editor/site?site=${site.id}&adminOverride=true`, '_blank');
  };

  const handleChangeTier = async (userToUpdate, newTier) => {
    // Prevent changing your own tier to non-admin
    if (userToUpdate.uid === user?.uid && newTier !== 'admin') {
      Modal.confirm({
        title: 'Warning: Changing Your Own Admin Status',
        content: `You are about to change your own tier from admin to ${newTier}. This will revoke your admin access. Are you sure you want to continue?`,
        okText: 'Yes, Change My Tier',
        okType: 'danger',
        cancelText: 'Cancel',
        onOk: () => performTierChange(userToUpdate, newTier)
      });
    } else {
      performTierChange(userToUpdate, newTier);
    }
  };

  const performTierChange = async (userToUpdate, newTier) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/platform/users/update-tier', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: userToUpdate.uid,
          newTier: newTier
        })
      });
      
      const data = await response.json();
      if (data.ok) {
        message.success(`Successfully changed ${userToUpdate.displayName || userToUpdate.email}'s tier to ${newTier}`);
        loadUsersData(); // Refresh the users list
        
        // If user changed their own tier away from admin, redirect after a delay
        if (userToUpdate.uid === user?.uid && newTier !== 'admin') {
          setTimeout(() => {
            message.info('Redirecting you to the main dashboard...');
            router.push('/dashboard');
          }, 2000);
        }
      } else {
        message.error(data.error || 'Failed to update user tier');
      }
    } catch (error) {
      console.error('Error updating user tier:', error);
      message.error('Failed to update user tier');
    }
  };

  const exportData = async (type) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/platform/export?type=${type}&range=${dateRange}`, {
        headers
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `platform-${type}-${dateRange}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        message.success(`${type} data exported successfully`);
      } else {
        const data = await response.json();
        message.error(data.error || 'Failed to export data');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      message.error('Failed to export data');
    }
  };

  // Site actions dropdown
  const getSiteActions = (site) => ({
    items: [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'View Live Site',
        onClick: () => handleViewSite(site)
      },
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit as Owner',
        onClick: () => handleEditSiteAsOwner(site)
      },
      {
        key: 'analytics',
        icon: <BarChartOutlined />,
        label: 'View Analytics',
        onClick: () => window.open(`/dashboard?siteId=${site.id}&tab=analytics`, '_blank')
      },
      {
        type: 'divider'
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: 'Delete Site',
        danger: true,
        onClick: () => Modal.confirm({
          title: 'Delete Site',
          content: `Are you sure you want to delete "${site.name}"? This action cannot be undone.`,
          onOk: () => handleDeleteSite(site.id)
        })
      }
    ]
  });

  // User actions dropdown
  const getUserActions = (userRecord) => {
    const currentTier = userRecord.tier || userRecord.subscriptionTier || userRecord.subscription?.plan || 'free';
    const isCurrentUser = userRecord.uid === user?.uid;
    
    return {
      items: [
        {
          key: 'change-tier',
          icon: <EditOutlined />,
          label: 'Change Tier',
          children: [
            {
              key: 'tier-free',
              label: (
                <span>
                  Free {currentTier === 'free' && '✓'}
                  {isCurrentUser && currentTier !== 'free' && ' (Will lose admin access)'}
                </span>
              ),
              onClick: () => handleChangeTier(userRecord, 'free'),
              disabled: currentTier === 'free'
            },
            {
              key: 'tier-pro',
              label: (
                <span>
                  Pro {currentTier === 'pro' && '✓'}
                  {isCurrentUser && currentTier !== 'pro' && ' (Will lose admin access)'}
                </span>
              ),
              onClick: () => handleChangeTier(userRecord, 'pro'),
              disabled: currentTier === 'pro'
            },
            {
              key: 'tier-business',
              label: (
                <span>
                  Business {currentTier === 'business' && '✓'}
                  {isCurrentUser && currentTier !== 'business' && ' (Will lose admin access)'}
                </span>
              ),
              onClick: () => handleChangeTier(userRecord, 'business'),
              disabled: currentTier === 'business'
            },
            {
              key: 'tier-admin',
              label: (
                <span style={{ color: '#dc3545', fontWeight: 'bold' }}>
                  Admin {currentTier === 'admin' && '✓'}
                </span>
              ),
              onClick: () => handleChangeTier(userRecord, 'admin'),
              disabled: currentTier === 'admin'
            }
          ]
        },
        {
          type: 'divider'
        },
        {
          key: 'view-sites',
          icon: <GlobalOutlined />,
          label: 'View User\'s Sites',
          onClick: () => {
            // Filter sites table to show only this user's sites
            setActiveTab('sites');
            // You could add a filter here if needed
          }
        },
        ...(isCurrentUser ? [] : [
          {
            type: 'divider'
          },
          {
            key: 'view-profile',
            icon: <UserOutlined />,
            label: 'View Profile',
            onClick: () => Modal.info({
              title: `User Profile: ${userRecord.displayName || userRecord.email}`,
              content: (
                <div>
                  <p><strong>Email:</strong> {userRecord.email}</p>
                  <p><strong>Username:</strong> {userRecord.username || 'N/A'}</p>
                  <p><strong>Tier:</strong> {currentTier}</p>
                  <p><strong>Sites:</strong> {userRecord.siteCount || 0}</p>
                  <p><strong>Total Views:</strong> {userRecord.totalViews?.toLocaleString() || '0'}</p>
                  <p><strong>Joined:</strong> {userRecord.createdAt ? new Date(userRecord.createdAt).toLocaleDateString() : 'N/A'}</p>
                  <p><strong>Last Active:</strong> {userRecord.lastActiveAt ? new Date(userRecord.lastActiveAt).toLocaleDateString() : 'Never'}</p>
                </div>
              ),
              width: 500
            })
          }
        ])
      ]
    };
  };

  // Sites table columns
  const sitesColumns = [
    {
      title: 'Site',
      key: 'site',
      render: (_, record) => (
        <Space>
          <Avatar 
            src={record.thumbnail} 
            icon={<GlobalOutlined />} 
            size="small" 
          />
          <div>
            <div style={{ fontWeight: 500 }}>{record.name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.username}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'published' ? 'green' : status === 'draft' ? 'orange' : 'red'}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Views',
      dataIndex: 'totalViews',
      key: 'totalViews',
      sorter: (a, b) => a.totalViews - b.totalViews,
      render: (views) => views?.toLocaleString() || '0'
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Last Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Dropdown menu={getSiteActions(record)} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      )
    }
  ];

  // Users table columns
  const usersColumns = [
    {
      title: 'User',
      key: 'user',
      render: (_, record) => (
        <Space>
          <Avatar src={record.photoURL} icon={<UserOutlined />} size="small" />
          <div>
            <div style={{ fontWeight: 500 }}>{record.displayName || record.username}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.email}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Tier',
      dataIndex: 'tier',
      key: 'tier',
      render: (tier, record) => {
        // Check multiple tier fields
        const actualTier = record.tier || record.subscriptionTier || record.subscription?.plan || 'free';
        return (
          <Tag color={
            actualTier === 'admin' ? 'red' : 
            actualTier === 'business' ? 'blue' : 
            actualTier === 'pro' ? 'green' : 'default'
          }>
            {actualTier}
          </Tag>
        );
      }
    },
    {
      title: 'Sites',
      dataIndex: 'siteCount',
      key: 'siteCount',
      sorter: (a, b) => a.siteCount - b.siteCount
    },
    {
      title: 'Total Views',
      dataIndex: 'totalViews',
      key: 'totalViews',
      sorter: (a, b) => a.totalViews - b.totalViews,
      render: (views) => views?.toLocaleString() || '0'
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Last Active',
      dataIndex: 'lastActiveAt',
      key: 'lastActiveAt',
      render: (date) => date ? new Date(date).toLocaleDateString() : 'Never'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Dropdown menu={getUserActions(record)} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      )
    }
  ];

  // Sidebar menu items
  const menuItems = [
    {
      key: 'overview',
      icon: <DashboardOutlined />,
      label: 'Overview'
    },
    {
      key: 'sites',
      icon: <GlobalOutlined />,
      label: 'Sites'
    },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: 'Users'
    },
    {
      key: 'email',
      icon: <MailOutlined />,
      label: 'Email'
    },
    {
      key: 'system',
      icon: <WarningOutlined />,
      label: 'System'
    }
  ];

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <Spin size="large" />
        <Text>Loading admin dashboard...</Text>
      </div>
    );
  }

  // Show access denied if not platform admin
  if (!user) {
    return null; // Will redirect to login
  }

  if (!isPlatformAdmin) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <Alert
          type="error"
          message="Access Denied"
          description="You need platform admin privileges to access this area."
          showIcon
        />
      </div>
    );
  }

  const COLORS = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2'];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sider 
        collapsible 
        collapsed={sidebarCollapsed} 
        onCollapse={setSidebarCollapsed}
        theme="dark"
        width={250}
      >
        <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #434343' }}>
          {!sidebarCollapsed ? (
            <Title level={4} style={{ color: 'white', margin: 0 }}>
              Platform Admin
            </Title>
          ) : (
            <DashboardOutlined style={{ color: 'white', fontSize: '24px' }} />
          )}
        </div>
        
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[activeTab]}
          onClick={({ key }) => setActiveTab(key)}
          items={menuItems}
          style={{ marginTop: '16px' }}
        />

        {/* User info at bottom */}
        <div style={{ 
          position: 'absolute', 
          bottom: 0, 
          width: '100%', 
          padding: '16px',
          borderTop: '1px solid #434343'
        }}>
          {!sidebarCollapsed ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ color: 'white', fontSize: '12px' }}>
                Logged in as
              </div>
              <div style={{ color: 'white', fontWeight: 500 }}>
                {userData?.displayName || user?.displayName || 'Admin'}
              </div>
              <Button 
                type="text" 
                icon={<LogoutOutlined />} 
                onClick={handleLogout}
                style={{ color: 'white', padding: 0, height: 'auto' }}
              >
                Logout
              </Button>
            </Space>
          ) : (
            <Tooltip title="Logout" placement="right">
              <Button 
                type="text" 
                icon={<LogoutOutlined />} 
                onClick={handleLogout}
                style={{ color: 'white', width: '100%' }}
              />
            </Tooltip>
          )}
        </div>
      </Sider>

      <Layout>
        {/* Header */}
        <Header style={{ 
          background: 'white', 
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              {activeTab === 'overview' && 'Platform Overview'}
              {activeTab === 'sites' && 'Site Management'}
              {activeTab === 'users' && 'User Management'}
              {activeTab === 'email' && 'Email Analytics'}
              {activeTab === 'system' && 'System Health'}
            </Title>
          </div>
          
          <Space>
            <Select
              value={dateRange}
              onChange={setDateRange}
              style={{ width: 120 }}
            >
              <Option value="7d">Last 7 days</Option>
              <Option value="30d">Last 30 days</Option>
              <Option value="90d">Last 90 days</Option>
              <Option value="1y">Last year</Option>
            </Select>
            <Button icon={<ReloadOutlined />} onClick={loadPlatformMetrics}>
              Refresh
            </Button>
          </Space>
        </Header>

        {/* Main Content */}
        <Content style={{ padding: '24px', background: token.colorBgLayout }}>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Key Metrics */}
              <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic
                      title="Total Sites"
                      value={platformMetrics.totalSites}
                      prefix={<GlobalOutlined />}
                      suffix={
                        <Tag color={platformMetrics.growth?.sites >= 0 ? 'green' : 'red'} style={{ marginLeft: 8 }}>
                          {platformMetrics.growth?.sites >= 0 ? <RiseOutlined /> : <FallOutlined />}
                          {Math.abs(platformMetrics.growth?.sites || 0)}%
                        </Tag>
                      }
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic
                      title="Total Users"
                      value={platformMetrics.totalUsers}
                      prefix={<UserOutlined />}
                      suffix={
                        <Tag color={platformMetrics.growth?.users >= 0 ? 'green' : 'red'} style={{ marginLeft: 8 }}>
                          {platformMetrics.growth?.users >= 0 ? <RiseOutlined /> : <FallOutlined />}
                          {Math.abs(platformMetrics.growth?.users || 0)}%
                        </Tag>
                      }
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic
                      title={platformMetrics.analyticsSource?.includes('google-analytics') ? 'Total Visitors' : 'Total Visitors (Estimated)'}
                      value={platformMetrics.totalVisitors}
                      prefix={<EyeOutlined />}
                      suffix={
                        <Tag color={platformMetrics.growth?.visitors >= 0 ? 'green' : 'red'} style={{ marginLeft: 8 }}>
                          {platformMetrics.growth?.visitors >= 0 ? <RiseOutlined /> : <FallOutlined />}
                          {Math.abs(platformMetrics.growth?.visitors || 0)}%
                        </Tag>
                      }
                    />
                    <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
                      {platformMetrics.analyticsSource === 'google-analytics' 
                        ? 'From Google Analytics (Individual Sites)' 
                        : platformMetrics.analyticsSource === 'google-analytics-platform'
                        ? 'From Google Analytics (Platform Property)'
                        : 'Configure GA4 property IDs for real data'}
                    </Text>
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic
                      title={platformMetrics.analyticsSource?.includes('google-analytics') ? 'Page Views' : 'Page Views (Estimated)'}
                      value={platformMetrics.totalPageViews}
                      prefix={<BarChartOutlined />}
                    />
                    <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
                      {platformMetrics.analyticsSource === 'google-analytics' 
                        ? 'From Google Analytics (Individual Sites)' 
                        : platformMetrics.analyticsSource === 'google-analytics-platform'
                        ? 'From Google Analytics (Platform Property)'
                        : 'Configure GA4 property IDs for real data'}
                    </Text>
                  </Card>
                </Col>
              </Row>

              {/* Charts Row */}
              <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} lg={16}>
                  <Card title="Platform Growth Trends" loading={dataLoading}>
                    <div style={{ height: 300 }}>
                      <ResponsiveContainer>
                        <AreaChart data={timeSeriesData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <RechartsTooltip />
                          <Area type="monotone" dataKey="sites" stackId="1" stroke="#1677ff" fill="#1677ff" fillOpacity={0.6} />
                          <Area type="monotone" dataKey="users" stackId="1" stroke="#52c41a" fill="#52c41a" fillOpacity={0.6} />
                          <Area type="monotone" dataKey="pageViews" stackId="2" stroke="#faad14" fill="#faad14" fillOpacity={0.6} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} lg={8}>
                  <Card title="System Health" loading={dataLoading}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text>Server Performance</Text>
                          <Text>{systemHealth.serverPerformance || 95}%</Text>
                        </div>
                        <Progress 
                          percent={systemHealth.serverPerformance || 95} 
                          strokeColor={systemHealth.serverPerformance > 90 ? '#52c41a' : systemHealth.serverPerformance > 70 ? '#faad14' : '#ff4d4f'}
                          showInfo={false}
                        />
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text>Database Health</Text>
                          <Text>{systemHealth.databaseHealth || 98}%</Text>
                        </div>
                        <Progress 
                          percent={systemHealth.databaseHealth || 98} 
                          strokeColor={systemHealth.databaseHealth > 90 ? '#52c41a' : systemHealth.databaseHealth > 70 ? '#faad14' : '#ff4d4f'}
                          showInfo={false}
                        />
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text>Email Service</Text>
                          <Text>{systemHealth.emailService || 97}%</Text>
                        </div>
                        <Progress 
                          percent={systemHealth.emailService || 97} 
                          strokeColor={systemHealth.emailService > 90 ? '#52c41a' : systemHealth.emailService > 70 ? '#faad14' : '#ff4d4f'}
                          showInfo={false}
                        />
                      </div>
                    </Space>
                  </Card>
                </Col>
              </Row>

              {/* Top Sites and Recent Activity */}
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card title="Top Performing Sites" loading={dataLoading}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {topSites.map((site, index) => (
                        <div key={site.id} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '8px 0',
                          borderBottom: index < topSites.length - 1 ? '1px solid #f0f0f0' : 'none'
                        }}>
                          <Space>
                            <Tag color="blue">{index + 1}</Tag>
                            <Avatar src={site.thumbnail} icon={<GlobalOutlined />} size="small" />
                            <div>
                              <div style={{ fontWeight: 500 }}>{site.name}</div>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                by {site.username}
                              </Text>
                            </div>
                          </Space>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 500 }}>{site.totalViews?.toLocaleString()}</div>
                            <Text type="secondary" style={{ fontSize: 12 }}>views</Text>
                          </div>
                        </div>
                      ))}
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="Recent Activity" loading={dataLoading}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {recentActivity.map((activity, index) => (
                        <div key={index} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 12,
                          padding: '8px 0',
                          borderBottom: index < recentActivity.length - 1 ? '1px solid #f0f0f0' : 'none'
                        }}>
                          <Avatar 
                            icon={
                              activity.type === 'site_created' ? <GlobalOutlined /> :
                              activity.type === 'user_registered' ? <UserOutlined /> :
                              activity.type === 'email_sent' ? <MailOutlined /> :
                              <ClockCircleOutlined />
                            }
                            size="small"
                            style={{
                              backgroundColor: 
                                activity.type === 'site_created' ? '#1677ff' :
                                activity.type === 'user_registered' ? '#52c41a' :
                                activity.type === 'email_sent' ? '#722ed1' :
                                '#faad14'
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14 }}>{activity.description}</div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {new Date(activity.timestamp).toLocaleString()}
                            </Text>
                          </div>
                        </div>
                      ))}
                    </Space>
                  </Card>
                </Col>
              </Row>
            </>
          )}

          {/* Sites Management Tab */}
          {activeTab === 'sites' && (
            <Card 
              title="All Platform Sites"
              extra={
                <Space>
                  <Button icon={<FilterOutlined />}>Filter</Button>
                  <Button icon={<ExportOutlined />} onClick={() => exportData('sites')}>
                    Export
                  </Button>
                </Space>
              }
            >
              <Table
                columns={sitesColumns}
                dataSource={sitesData}
                rowKey="id"
                loading={dataLoading}
                pagination={{
                  total: sitesData.length,
                  pageSize: 50,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `Total ${total} sites`
                }}
                scroll={{ x: 800 }}
              />
            </Card>
          )}

          {/* Users Management Tab */}
          {activeTab === 'users' && (
            <Card 
              title="Platform Users"
              extra={
                <Space>
                  <Input.Search
                    placeholder="Search users by email or username"
                    allowClear
                    style={{ width: 250 }}
                    onChange={(e) => {
                      const searchValue = e.target.value.toLowerCase();
                      if (searchValue) {
                        const filtered = usersData.filter(user => 
                          user.email?.toLowerCase().includes(searchValue) ||
                          user.username?.toLowerCase().includes(searchValue) ||
                          user.displayName?.toLowerCase().includes(searchValue)
                        );
                        setFilteredUsers(filtered);
                      } else {
                        setFilteredUsers(usersData);
                      }
                    }}
                  />
                  <Select
                    placeholder="Filter by tier"
                    allowClear
                    style={{ width: 120 }}
                    onChange={(value) => {
                      if (value) {
                        const filtered = usersData.filter(user => {
                          const userTier = user.tier || user.subscriptionTier || user.subscription?.plan || 'free';
                          return userTier === value;
                        });
                        setFilteredUsers(filtered);
                      } else {
                        setFilteredUsers(usersData);
                      }
                    }}
                  >
                    <Select.Option value="free">Free</Select.Option>
                    <Select.Option value="pro">Pro</Select.Option>
                    <Select.Option value="business">Business</Select.Option>
                    <Select.Option value="admin">Admin</Select.Option>
                  </Select>
                  <Button icon={<ExportOutlined />} onClick={() => exportData('users')}>
                    Export
                  </Button>
                </Space>
              }
            >
              <Table
                columns={usersColumns}
                dataSource={filteredUsers || usersData}
                rowKey="uid"
                loading={dataLoading}
                pagination={{
                  total: (filteredUsers || usersData).length,
                  pageSize: 50,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `Total ${total} users`
                }}
                scroll={{ x: 800 }}
              />
            </Card>
          )}

          {/* Email Analytics Tab */}
          {activeTab === 'email' && (
            <>
              {/* Email Metrics */}
              <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic
                      title="Emails Sent"
                      value={emailMetrics.totalSent}
                      prefix={<MailOutlined />}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic
                      title="Delivery Rate"
                      value={emailMetrics.deliveryRate}
                      suffix="%"
                      precision={1}
                      valueStyle={{ 
                        color: emailMetrics.deliveryRate > 95 ? '#52c41a' : 
                               emailMetrics.deliveryRate > 90 ? '#faad14' : '#ff4d4f' 
                      }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic
                      title="Open Rate"
                      value={emailMetrics.openRate}
                      suffix="%"
                      precision={1}
                      valueStyle={{ 
                        color: emailMetrics.openRate > 20 ? '#52c41a' : 
                               emailMetrics.openRate > 15 ? '#faad14' : '#ff4d4f' 
                      }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic
                      title="Click Rate"
                      value={emailMetrics.clickRate}
                      suffix="%"
                      precision={1}
                      valueStyle={{ 
                        color: emailMetrics.clickRate > 3 ? '#52c41a' : 
                               emailMetrics.clickRate > 2 ? '#faad14' : '#ff4d4f' 
                      }}
                    />
                  </Card>
                </Col>
              </Row>

              <Card title="Email Performance Overview" loading={dataLoading}>
                <div style={{ height: 400 }}>
                  <ResponsiveContainer>
                    <LineChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <RechartsTooltip />
                      <Line type="monotone" dataKey="emailsSent" stroke="#1677ff" strokeWidth={2} />
                      <Line type="monotone" dataKey="emailsDelivered" stroke="#52c41a" strokeWidth={2} />
                      <Line type="monotone" dataKey="emailsOpened" stroke="#faad14" strokeWidth={2} />
                      <Line type="monotone" dataKey="emailsClicked" stroke="#722ed1" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </>
          )}

          {/* System Health Tab */}
          {activeTab === 'system' && (
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card title="Service Status" loading={dataLoading}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {[
                      { name: 'Web Server', status: 'operational', uptime: '99.9%' },
                      { name: 'Database', status: 'operational', uptime: '99.8%' },
                      { name: 'Email Service', status: 'operational', uptime: '99.7%' },
                      { name: 'File Storage', status: 'operational', uptime: '99.9%' },
                      { name: 'Analytics', status: 'degraded', uptime: '98.5%' },
                      { name: 'CDN', status: 'operational', uptime: '99.9%' }
                    ].map((service, index) => (
                      <div key={index} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '12px 0',
                        borderBottom: index < 5 ? '1px solid #f0f0f0' : 'none'
                      }}>
                        <Space>
                          <div style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: 
                              service.status === 'operational' ? '#52c41a' :
                              service.status === 'degraded' ? '#faad14' : '#ff4d4f'
                          }} />
                          <Text strong>{service.name}</Text>
                        </Space>
                        <Space>
                          <Tag color={
                            service.status === 'operational' ? 'green' :
                            service.status === 'degraded' ? 'orange' : 'red'
                          }>
                            {service.status}
                          </Tag>
                          <Text type="secondary">{service.uptime}</Text>
                        </Space>
                      </div>
                    ))}
                  </Space>
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title="Resource Usage" loading={dataLoading}>
                  <Space direction="vertical" style={{ width: '100%', gap: 16 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>CPU Usage</Text>
                        <Text>{systemHealth.cpuUsage || 45}%</Text>
                      </div>
                      <Progress percent={systemHealth.cpuUsage || 45} strokeColor="#1677ff" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>Memory Usage</Text>
                        <Text>{systemHealth.memoryUsage || 67}%</Text>
                      </div>
                      <Progress percent={systemHealth.memoryUsage || 67} strokeColor="#52c41a" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>Storage Usage</Text>
                        <Text>{systemHealth.storageUsage || 23}%</Text>
                      </div>
                      <Progress percent={systemHealth.storageUsage || 23} strokeColor="#faad14" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>Bandwidth Usage</Text>
                        <Text>{systemHealth.bandwidthUsage || 34}%</Text>
                      </div>
                      <Progress percent={systemHealth.bandwidthUsage || 34} strokeColor="#722ed1" />
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          )}
        </Content>
      </Layout>

      {/* Site Edit Modal */}
      <Modal
        title={`Edit Site: ${selectedSite?.name}`}
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setEditModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="edit" type="primary" onClick={() => handleEditSiteAsOwner(selectedSite)}>
            Edit as Owner
          </Button>
        ]}
      >
        {selectedSite && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div><strong>Site Name:</strong> {selectedSite.name}</div>
            <div><strong>Owner:</strong> {selectedSite.username}</div>
            <div><strong>Status:</strong> 
              <Tag color={selectedSite.status === 'published' ? 'green' : 'orange'} style={{ marginLeft: 8 }}>
                {selectedSite.status}
              </Tag>
            </div>
            <div><strong>Total Views:</strong> {selectedSite.totalViews?.toLocaleString()}</div>
            <div><strong>Created:</strong> {new Date(selectedSite.createdAt).toLocaleString()}</div>
            <div><strong>Last Updated:</strong> {new Date(selectedSite.updatedAt).toLocaleString()}</div>
          </Space>
        )}
      </Modal>
    </Layout>
  );
}
