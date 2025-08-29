'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Table, 
  Button, 
  Select, 
  DatePicker, 
  Alert, 
  Space, 
  Tag, 
  Typography, 
  Modal,
  Tooltip,
  Progress,
  Empty,
  Spin,
  Tabs
} from 'antd';
import {
  BarChartOutlined,
  EyeOutlined,
  UserOutlined,
  GlobalOutlined,
  CalendarOutlined,
  ReloadOutlined,
  CodeOutlined,
  QuestionCircleOutlined,
  RiseOutlined,
  FallOutlined,
  LineChartOutlined,
  TeamOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

export default function UserAnalyticsDashboard({ preSelectedSiteId = null }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [userSites, setUserSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(preSelectedSiteId);
  const [dateRange, setDateRange] = useState('30d');
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const [realtimeData, setRealtimeData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user?.uid) {
      loadAnalyticsData();
      loadRealtimeData();
      
      // Set up realtime data refresh
      const realtimeInterval = setInterval(loadRealtimeData, 30000); // Every 30 seconds
      return () => clearInterval(realtimeInterval);
    }
  }, [user, dateRange, selectedSite]);

  const loadAnalyticsData = async () => {
    if (!user?.accessToken) return;
    
    setLoading(true);
    try {
      const type = selectedSite ? 'site' : 'overview';
      const params = new URLSearchParams({
        userId: user.uid,
        range: dateRange,
        type
      });
      
      if (selectedSite) {
        params.append('siteId', selectedSite);
      }

      const response = await fetch(`/api/user/analytics?${params}`, {
        headers: {
          'Authorization': `Bearer ${user.accessToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data.analytics);
        setUserSites(data.userSites);
      } else {
        console.error('Failed to load analytics data');
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRealtimeData = async () => {
    if (!user?.accessToken) return;
    
    try {
      const response = await fetch(`/api/user/analytics?userId=${user.uid}&type=realtime`, {
        headers: {
          'Authorization': `Bearer ${user.accessToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRealtimeData(data.analytics);
      }
    } catch (error) {
      console.error('Error loading realtime data:', error);
    }
  };

  const loadTrackingCode = async (siteId) => {
    if (!user?.accessToken) return;
    
    try {
      const response = await fetch(`/api/user/analytics/tracking?userId=${user.uid}&siteId=${siteId}`, {
        headers: {
          'Authorization': `Bearer ${user.accessToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTrackingCode(data.trackingCode);
        setTrackingModalOpen(true);
      }
    } catch (error) {
      console.error('Error loading tracking code:', error);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  const getChangeIcon = (value) => {
    if (value > 0) return <RiseOutlined style={{ color: '#52c41a' }} />;
    if (value < 0) return <FallOutlined style={{ color: '#ff4d4f' }} />;
    return null;
  };

  if (loading && !analyticsData) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p style={{ marginTop: '16px' }}>Loading your analytics...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <BarChartOutlined style={{ marginRight: '8px' }} />
          Analytics Dashboard
        </Title>
        <Text type="secondary">
          Track your site performance with real-time Google Analytics data
        </Text>
      </div>

      {/* Analytics Status */}
      {analyticsData && !analyticsData.success && (
        <Alert
          message="Analytics Configuration"
          description={
            <div>
              <p><strong>Good news!</strong> Analytics tracking is automatically enabled for all your sites.</p>
              <p>No manual setup required - just create your sites and analytics data will start flowing within 24-48 hours.</p>
              {userSites.length === 0 && (
                <Button type="primary" href="/dashboard?tab=sites">
                  Create Your First Site
                </Button>
              )}
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: '24px' }}
        />
      )}

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Space>
              <Text strong>Time Range:</Text>
              <Select value={dateRange} onChange={setDateRange} style={{ width: 120 }}>
                <Option value="7d">Last 7 days</Option>
                <Option value="30d">Last 30 days</Option>
                <Option value="90d">Last 90 days</Option>
                <Option value="1y">Last year</Option>
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space>
              <Text strong>Site:</Text>
              <Select 
                value={selectedSite} 
                onChange={setSelectedSite} 
                style={{ width: 200 }}
                placeholder="All sites"
                allowClear
              >
                {userSites.map(site => (
                  <Option key={site.id} value={site.id}>
                    {site.name}
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={24} md={8} style={{ textAlign: 'right' }}>
            <Space>
              <Button 
                icon={<CodeOutlined />} 
                onClick={() => loadTrackingCode(selectedSite || userSites[0]?.id)}
                disabled={userSites.length === 0}
              >
                View Tracking Info
              </Button>
              <Button 
                type="primary" 
                icon={<ReloadOutlined />} 
                onClick={loadAnalyticsData}
                loading={loading}
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Overview" key="overview">
          {/* Real-time Stats */}
          {realtimeData && realtimeData.success && (
            <Card 
              title={
                <Space>
                  <TeamOutlined />
                  Real-time Activity
                  <Tag color="green">LIVE</Tag>
                </Space>
              }
              style={{ marginBottom: '24px' }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <Statistic
                    title="Active Users"
                    value={realtimeData.totalActiveUsers}
                    prefix={<UserOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Statistic
                    title="Current Page Views"
                    value={realtimeData.totalCurrentViews}
                    prefix={<EyeOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col xs={24} md={12}>
                  {realtimeData.sites && realtimeData.sites.length > 0 && (
                    <div>
                      <Text strong>Active Sites:</Text>
                      <div style={{ marginTop: '8px' }}>
                        {realtimeData.sites.slice(0, 3).map(site => (
                          <Tag key={site.siteId} color="blue" style={{ marginBottom: '4px' }}>
                            {site.siteName}: {site.activeUsers} users
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                </Col>
              </Row>
            </Card>
          )}

          {/* Main Metrics */}
          {analyticsData && analyticsData.success && (
            <>
              <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic
                      title="Total Page Views"
                      value={formatNumber(analyticsData.totalPageViews)}
                      prefix={<EyeOutlined />}
                      valueStyle={{ color: '#1890ff' }}
                    />
                    <div style={{ marginTop: '8px' }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {dateRange === '7d' ? 'Last 7 days' : 
                         dateRange === '30d' ? 'Last 30 days' : 
                         dateRange === '90d' ? 'Last 90 days' : 'Last year'}
                      </Text>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic
                      title="Unique Visitors"
                      value={formatNumber(analyticsData.totalUsers)}
                      prefix={<UserOutlined />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic
                      title="Sessions"
                      value={formatNumber(analyticsData.totalSessions)}
                      prefix={<LineChartOutlined />}
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic
                      title="Active Sites"
                      value={analyticsData.sites?.length || 0}
                      prefix={<GlobalOutlined />}
                      valueStyle={{ color: '#fa8c16' }}
                    />
                  </Card>
                </Col>
              </Row>

              {/* Sites Performance */}
              <Card 
                title="Site Performance" 
                style={{ marginBottom: '24px' }}
                extra={
                  analyticsData.hasCustomDimensions ? 
                    <Tag color="green">Real Data</Tag> : 
                    <Tag color="orange">Add Tracking Code</Tag>
                }
              >
                {analyticsData.sites && analyticsData.sites.length > 0 ? (
                  <Table
                    dataSource={analyticsData.sites}
                    rowKey="siteId"
                    columns={[
                      {
                        title: 'Site',
                        dataIndex: 'name',
                        key: 'name',
                        render: (name, record) => (
                          <Space>
                            <div>
                              <div style={{ fontWeight: 500 }}>{name}</div>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {record.domain}
                              </Text>
                            </div>
                          </Space>
                        )
                      },
                      {
                        title: 'Page Views',
                        dataIndex: 'pageViews',
                        key: 'pageViews',
                        render: (views) => formatNumber(views),
                        sorter: (a, b) => (a.pageViews || 0) - (b.pageViews || 0),
                        defaultSortOrder: 'descend'
                      },
                      {
                        title: 'Visitors',
                        dataIndex: 'users',
                        key: 'users',
                        render: (users) => formatNumber(users)
                      },
                      {
                        title: 'Sessions',
                        dataIndex: 'sessions',
                        key: 'sessions',
                        render: (sessions) => formatNumber(sessions)
                      },
                      {
                        title: 'Actions',
                        key: 'actions',
                        render: (_, record) => (
                          <Space>
                            <Button 
                              size="small" 
                              onClick={() => {
                                setSelectedSite(record.siteId);
                                setActiveTab('site-details');
                              }}
                            >
                              View Details
                            </Button>
                            <Button 
                              size="small" 
                              icon={<CodeOutlined />}
                              onClick={() => loadTrackingCode(record.siteId)}
                            >
                              View Info
                            </Button>
                          </Space>
                        )
                      }
                    ]}
                    pagination={{ pageSize: 10 }}
                  />
                ) : (
                  <Empty 
                    description="No analytics data available. Add tracking code to your sites to see data here."
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </Card>
            </>
          )}
        </TabPane>

        <TabPane tab="Site Details" key="site-details" disabled={!selectedSite}>
          {selectedSite && analyticsData && (
            <Card title={`Detailed Analytics: ${analyticsData.siteName || 'Selected Site'}`}>
              {/* Site-specific analytics would go here */}
              <Alert 
                message="Site Details"
                description="Detailed site analytics including daily trends, top countries, and device breakdowns will be displayed here."
                type="info"
                showIcon
              />
            </Card>
          )}
        </TabPane>
      </Tabs>

      {/* Tracking Code Modal */}
      <Modal
        title="Analytics Tracking Information"
        open={trackingModalOpen}
        onCancel={() => setTrackingModalOpen(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setTrackingModalOpen(false)}>
            Close
          </Button>
        ]}
      >
        <div style={{ marginBottom: '16px' }}>
          <Alert
            message="Automatic Analytics Tracking"
            description="Analytics tracking is automatically enabled for all your sites. No manual code insertion required!"
            type="success"
            showIcon
          />
        </div>

        <div style={{ marginTop: '16px' }}>
          <Title level={4}>How it works:</Title>
          <ol>
            <li><strong>Automatic Integration:</strong> When you create a site, analytics tracking is automatically added</li>
            <li><strong>No Setup Required:</strong> Your sites start tracking visitors immediately</li>
            <li><strong>Custom Dimensions:</strong> Each site's data is properly separated using custom dimensions</li>
            <li><strong>Real-time Data:</strong> View your analytics in the dashboard within 24-48 hours</li>
          </ol>
        </div>

        {trackingCode && (
          <div style={{ marginTop: '24px' }}>
            <Title level={4}>Technical Details (for developers):</Title>
            <Text type="secondary">This is the tracking code automatically injected into your sites:</Text>
            <div style={{ 
              background: '#f5f5f5', 
              padding: '12px', 
              borderRadius: '4px', 
              marginTop: '8px',
              fontFamily: 'monospace',
              fontSize: '12px',
              maxHeight: '300px',
              overflow: 'auto'
            }}>
              <pre>{trackingCode}</pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
