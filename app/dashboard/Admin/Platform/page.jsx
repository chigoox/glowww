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
  Popconfirm
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
  FallOutlined
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { theme } from 'antd';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

export default function PlatformAdminPage() {
  const { token } = theme.useToken();
  const { user, userData } = useAuth();
  
  // Check if user is admin
  const isAdmin = userData?.tier === 'admin' || user?.roles?.includes('admin');
  
  // State management
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('30d');
  const [selectedSite, setSelectedSite] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  
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

  // Redirect if not admin
  if (!isAdmin) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <Alert
          type="error"
          message="Access Denied"
          description="You need admin privileges to access this page."
          showIcon
        />
      </div>
    );
  }

  // Get auth token for API calls
  const getAuthHeaders = () => {
    return user?.accessToken ? {
      'Authorization': `Bearer ${user.accessToken}`,
      'Content-Type': 'application/json'
    } : {};
  };

  // Load platform data
  useEffect(() => {
    if (isAdmin && user?.accessToken) {
      loadPlatformMetrics();
      loadSitesData();
      loadUsersData();
      loadEmailMetrics();
      loadTimeSeriesData();
      loadSystemHealth();
    }
  }, [isAdmin, user?.accessToken, dateRange]);

  const loadPlatformMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/platform/metrics?range=${dateRange}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.ok) {
        setPlatformMetrics(data.metrics);
        setTopSites(data.topSites);
        setRecentActivity(data.recentActivity);
      } else {
        message.error(data.error || 'Failed to load platform metrics');
      }
    } catch (error) {
      console.error('Error loading platform metrics:', error);
      message.error('Failed to load platform metrics');
    } finally {
      setLoading(false);
    }
  };

  const loadSitesData = async () => {
    try {
      const response = await fetch(`/api/admin/platform/sites?range=${dateRange}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.ok) {
        setSitesData(data.sites);
      } else {
        message.error(data.error || 'Failed to load sites data');
      }
    } catch (error) {
      console.error('Error loading sites data:', error);
      message.error('Failed to load sites data');
    }
  };

  const loadUsersData = async () => {
    try {
      const response = await fetch(`/api/admin/platform/users?range=${dateRange}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.ok) {
        setUsersData(data.users);
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
      const response = await fetch(`/api/admin/platform/email-metrics?range=${dateRange}`, {
        headers: getAuthHeaders()
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
      const response = await fetch(`/api/admin/platform/timeseries?range=${dateRange}`, {
        headers: getAuthHeaders()
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
      const response = await fetch('/api/admin/platform/health', {
        headers: getAuthHeaders()
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

  const handleEditSite = (site) => {
    setSelectedSite(site);
    setEditModalVisible(true);
  };

  const handleDeleteSite = async (siteId) => {
    try {
      const response = await fetch(`/api/admin/platform/sites/${siteId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
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
    // Redirect to editor with admin override
    window.open(`/Editor/site?site=${site.id}&adminOverride=true`, '_blank');
  };

  const exportData = async (type) => {
    try {
      const response = await fetch(`/api/admin/platform/export?type=${type}&range=${dateRange}`, {
        headers: getAuthHeaders()
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
      render: (tier) => (
        <Tag color={
          tier === 'admin' ? 'red' : 
          tier === 'business' ? 'blue' : 
          tier === 'pro' ? 'green' : 'default'
        }>
          {tier || 'free'}
        </Tag>
      )
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
    }
  ];

  const COLORS = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2'];

  return (
    <div style={{ padding: '24px', background: token.colorBgLayout, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <DashboardOutlined />
            Platform Admin Dashboard
          </Title>
          <Text type="secondary">
            Comprehensive platform analytics and site management
          </Text>
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
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* Overview Tab */}
        <Tabs.TabPane tab={<span><DashboardOutlined />Overview</span>} key="overview">
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
                  title="Total Visitors"
                  value={platformMetrics.totalVisitors}
                  prefix={<EyeOutlined />}
                  suffix={
                    <Tag color={platformMetrics.growth?.visitors >= 0 ? 'green' : 'red'} style={{ marginLeft: 8 }}>
                      {platformMetrics.growth?.visitors >= 0 ? <RiseOutlined /> : <FallOutlined />}
                      {Math.abs(platformMetrics.growth?.visitors || 0)}%
                    </Tag>
                  }
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Page Views"
                  value={platformMetrics.totalPageViews}
                  prefix={<BarChartOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {/* Charts Row */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} lg={16}>
              <Card title="Platform Growth Trends" loading={loading}>
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
              <Card title="System Health" loading={loading}>
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
              <Card title="Top Performing Sites" loading={loading}>
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
              <Card title="Recent Activity" loading={loading}>
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
        </Tabs.TabPane>

        {/* Sites Management Tab */}
        <Tabs.TabPane tab={<span><GlobalOutlined />Sites</span>} key="sites">
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
              loading={loading}
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
        </Tabs.TabPane>

        {/* Users Management Tab */}
        <Tabs.TabPane tab={<span><UserOutlined />Users</span>} key="users">
          <Card 
            title="Platform Users"
            extra={
              <Space>
                <Button icon={<FilterOutlined />}>Filter</Button>
                <Button icon={<ExportOutlined />} onClick={() => exportData('users')}>
                  Export
                </Button>
              </Space>
            }
          >
            <Table
              columns={usersColumns}
              dataSource={usersData}
              rowKey="uid"
              loading={loading}
              pagination={{
                total: usersData.length,
                pageSize: 50,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `Total ${total} users`
              }}
              scroll={{ x: 800 }}
            />
          </Card>
        </Tabs.TabPane>

        {/* Email Analytics Tab */}
        <Tabs.TabPane tab={<span><MailOutlined />Email</span>} key="email">
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

          <Card title="Email Performance Overview" loading={loading}>
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
        </Tabs.TabPane>

        {/* System Health Tab */}
        <Tabs.TabPane tab={<span><WarningOutlined />System</span>} key="system">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="Service Status" loading={loading}>
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
              <Card title="Resource Usage" loading={loading}>
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
        </Tabs.TabPane>
      </Tabs>

      {/* Site Edit Modal */}
      <Modal
        title={`Edit Site: ${selectedSite?.name}`}
        visible={editModalVisible}
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
    </div>
  );
}
