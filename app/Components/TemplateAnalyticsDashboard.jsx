import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Statistic,
  Table,
  Select,
  DatePicker,
  Space,
  Tag,
  Progress,
  Tooltip,
  Button,
  Modal,
  Rate,
  Chart,
  message,
  Tabs,
  List,
  Avatar,
  Badge
} from 'antd';
import {
  RiseOutlined,
  FallOutlined,
  EyeOutlined,
  DownloadOutlined,
  UserOutlined,
  StarOutlined,
  ThunderboltOutlined,
  RobotOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { Line, Column, Pie, Area } from '@ant-design/charts';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const TemplateAnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, 'day'),
    dayjs()
  ]);
  const [analytics, setAnalytics] = useState({
    overview: {
      totalTemplates: 0,
      totalDownloads: 0,
      totalViews: 0,
      activeUsers: 0,
      conversionRate: 0,
      averageRating: 0
    },
    trending: {
      templates: [],
      categories: [],
      searchQueries: []
    },
    performance: {
      downloadTrends: [],
      viewTrends: [],
      categoryPerformance: [],
      userEngagement: []
    },
    recommendations: {
      effectiveness: [],
      topReasons: [],
      userSatisfaction: 0
    },
    userBehavior: {
      searchPatterns: [],
      downloadPatterns: [],
      preferredCategories: [],
      sessionAnalytics: []
    }
  });

  // Load analytics data
  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      
      // In a real implementation, this would call your analytics API
      const mockAnalytics = generateMockAnalytics(dateRange);
      setAnalytics(mockAnalytics);
      
    } catch (error) {
      console.error('Error loading analytics:', error);
      message.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Chart configurations
  const downloadTrendsConfig = {
    data: analytics.performance.downloadTrends,
    xField: 'date',
    yField: 'downloads',
    smooth: true,
    color: '#1890ff',
    point: {
      size: 3,
      shape: 'circle'
    },
    tooltip: {
      formatter: (data) => ({
        name: 'Downloads',
        value: data.downloads.toLocaleString()
      })
    }
  };

  const categoryPerformanceConfig = {
    data: analytics.performance.categoryPerformance,
    xField: 'category',
    yField: 'downloads',
    colorField: 'category',
    columnBackground: {
      style: {
        fill: 'rgba(0,0,0,0.1)'
      }
    }
  };

  const userEngagementConfig = {
    data: analytics.performance.userEngagement,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'spider',
      labelHeight: 28,
      formatter: (data) => `${data.type}: ${data.value}%`
    }
  };

  const recommendationEffectivenessConfig = {
    data: analytics.recommendations.effectiveness,
    xField: 'date',
    yField: 'rate',
    seriesField: 'type',
    smooth: true
  };

  // Table columns for trending templates
  const trendingTemplatesColumns = [
    {
      title: 'Rank',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      render: (rank) => (
        <Badge count={rank} style={{ backgroundColor: rank <= 3 ? '#faad14' : '#d9d9d9' }} />
      )
    },
    {
      title: 'Template',
      key: 'template',
      render: (_, record) => (
        <Space>
          <Avatar src={record.thumbnail} size={40} shape="square" />
          <div>
            <Text strong>{record.name}</Text>
            <div>
              <Tag size="small">{record.category}</Tag>
              {record.isPremium && <Tag color="gold" size="small">Premium</Tag>}
            </div>
          </div>
        </Space>
      )
    },
    {
      title: 'Downloads',
      dataIndex: 'downloads',
      key: 'downloads',
      render: (downloads, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{downloads.toLocaleString()}</Text>
          <Text type={record.trend > 0 ? 'success' : 'danger'} style={{ fontSize: '12px' }}>
            {record.trend > 0 ? <RiseOutlined /> : <FallOutlined />}
            {Math.abs(record.trend)}%
          </Text>
        </Space>
      )
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating) => <Rate disabled value={rating} style={{ fontSize: 14 }} />
    },
    {
      title: 'Conversion',
      dataIndex: 'conversionRate',
      key: 'conversionRate',
      render: (rate) => (
        <Tooltip title="View to download ratio">
          <Progress percent={rate} size="small" />
        </Tooltip>
      )
    }
  ];

  // Search queries table columns
  const searchQueriesColumns = [
    {
      title: 'Query',
      dataIndex: 'query',
      key: 'query',
      render: (query) => <Text code>{query}</Text>
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
      render: (count) => count.toLocaleString()
    },
    {
      title: 'Success Rate',
      dataIndex: 'successRate',
      key: 'successRate',
      render: (rate) => (
        <Progress percent={rate} size="small" status={rate > 60 ? 'success' : rate > 30 ? 'normal' : 'exception'} />
      )
    },
    {
      title: 'Avg Results',
      dataIndex: 'avgResults',
      key: 'avgResults'
    }
  ];

  return (
    <div className="template-analytics-dashboard">
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>
              <BarChartOutlined /> Template Analytics Dashboard
            </Title>
            <Paragraph type="secondary">
              Comprehensive insights into template performance and user behavior
            </Paragraph>
          </Col>
          <Col>
            <Space>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                format="YYYY-MM-DD"
              />
              <Button icon={<ReloadOutlined />} onClick={loadAnalytics} loading={loading}>
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Tabs defaultActiveKey="overview" size="large">
        {/* Overview Tab */}
        <TabPane tab={<span><BarChartOutlined />Overview</span>} key="overview">
          {/* Key Metrics */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={4}>
              <Card>
                <Statistic
                  title="Total Templates"
                  value={analytics.overview.totalTemplates}
                  prefix={<EyeOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="Total Downloads"
                  value={analytics.overview.totalDownloads}
                  prefix={<DownloadOutlined />}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="Total Views"
                  value={analytics.overview.totalViews}
                  prefix={<EyeOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="Active Users"
                  value={analytics.overview.activeUsers}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="Conversion Rate"
                  value={analytics.overview.conversionRate}
                  suffix="%"
                  prefix={<ThunderboltOutlined />}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="Avg Rating"
                  value={analytics.overview.averageRating}
                  precision={1}
                  prefix={<StarOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Charts */}
          <Row gutter={16}>
            <Col span={16}>
              <Card title="Download Trends" extra={<LineChartOutlined />}>
                <Line {...downloadTrendsConfig} height={300} />
              </Card>
            </Col>
            <Col span={8}>
              <Card title="Category Performance" extra={<BarChartOutlined />}>
                <Column {...categoryPerformanceConfig} height={300} />
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* Trending Tab */}
        <TabPane tab={<span><RiseOutlined />Trending</span>} key="trending">
          <Row gutter={16}>
            <Col span={16}>
              <Card title="Trending Templates" extra={<RiseOutlined />}>
                <Table
                  columns={trendingTemplatesColumns}
                  dataSource={analytics.trending.templates}
                  pagination={{ pageSize: 10 }}
                  loading={loading}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card title="Popular Search Queries" extra={<Text type="secondary">Last 7 days</Text>}>
                <Table
                  columns={searchQueriesColumns}
                  dataSource={analytics.trending.searchQueries}
                  pagination={false}
                  size="small"
                  loading={loading}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* AI Recommendations Tab */}
        <TabPane tab={<span><RobotOutlined />AI Recommendations</span>} key="recommendations">
          <Row gutter={16}>
            <Col span={16}>
              <Card title="Recommendation Effectiveness Over Time">
                <Area {...recommendationEffectivenessConfig} height={300} />
              </Card>
            </Col>
            <Col span={8}>
              <Card title="User Satisfaction">
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <Progress
                    type="circle"
                    percent={analytics.recommendations.userSatisfaction}
                    size={120}
                    status={analytics.recommendations.userSatisfaction > 80 ? 'success' : 'normal'}
                    format={(percent) => `${percent}%`}
                  />
                  <div style={{ marginTop: 16 }}>
                    <Text type="secondary">Based on user feedback</Text>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Card title="Top Recommendation Reasons">
                <List
                  dataSource={analytics.recommendations.topReasons}
                  renderItem={(item, index) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Badge count={index + 1} style={{ backgroundColor: '#1890ff' }} />}
                        title={item.reason}
                        description={`${item.usage}% of recommendations • ${item.successRate}% success rate`}
                      />
                      <Progress percent={item.usage} size="small" />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* User Behavior Tab */}
        <TabPane tab={<span><UserOutlined />User Behavior</span>} key="behavior">
          <Row gutter={16}>
            <Col span={12}>
              <Card title="User Engagement Distribution">
                <Pie {...userEngagementConfig} height={300} />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Session Analytics">
                <List
                  dataSource={analytics.userBehavior.sessionAnalytics}
                  renderItem={item => (
                    <List.Item>
                      <List.Item.Meta
                        title={item.metric}
                        description={item.description}
                      />
                      <div style={{ textAlign: 'right' }}>
                        <Text strong>{item.value}</Text>
                        <br />
                        <Text type={item.trend > 0 ? 'success' : 'danger'} style={{ fontSize: '12px' }}>
                          {item.trend > 0 ? <RiseOutlined /> : <FallOutlined />}
                          {Math.abs(item.trend)}%
                        </Text>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={12}>
              <Card title="Search Patterns">
                <List
                  dataSource={analytics.userBehavior.searchPatterns}
                  renderItem={item => (
                    <List.Item>
                      <List.Item.Meta
                        title={item.pattern}
                        description={`${item.frequency}% of users`}
                      />
                      <Progress percent={item.frequency} size="small" />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Preferred Categories">
                <List
                  dataSource={analytics.userBehavior.preferredCategories}
                  renderItem={item => (
                    <List.Item>
                      <List.Item.Meta
                        title={item.category}
                        description={`${item.users} active users`}
                      />
                      <Tag color="blue">{item.growthRate > 0 ? '+' : ''}{item.growthRate}%</Tag>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
};

// Mock data generator for demonstration
const generateMockAnalytics = (dateRange) => {
  const days = dayjs().diff(dateRange[0], 'day');
  
  return {
    overview: {
      totalTemplates: 1247,
      totalDownloads: 45672,
      totalViews: 186543,
      activeUsers: 8924,
      conversionRate: 24.5,
      averageRating: 4.2
    },
    trending: {
      templates: Array.from({ length: 15 }, (_, i) => ({
        key: i,
        rank: i + 1,
        name: `Template ${i + 1}`,
        category: ['Business', 'Creative', 'Portfolio', 'E-commerce'][i % 4],
        downloads: Math.floor(Math.random() * 5000) + 1000,
        rating: 3 + Math.random() * 2,
        conversionRate: Math.floor(Math.random() * 100),
        trend: Math.floor(Math.random() * 200) - 100,
        isPremium: Math.random() > 0.7,
        thumbnail: '/placeholder-template.jpg'
      })),
      searchQueries: Array.from({ length: 10 }, (_, i) => ({
        key: i,
        query: ['landing page', 'portfolio', 'business card', 'restaurant menu', 'blog template'][i % 5],
        count: Math.floor(Math.random() * 1000) + 100,
        successRate: Math.floor(Math.random() * 100),
        avgResults: Math.floor(Math.random() * 50) + 10
      }))
    },
    performance: {
      downloadTrends: Array.from({ length: days }, (_, i) => ({
        date: dayjs().subtract(days - i, 'day').format('YYYY-MM-DD'),
        downloads: Math.floor(Math.random() * 500) + 200
      })),
      categoryPerformance: [
        { category: 'Business', downloads: 12340 },
        { category: 'Creative', downloads: 8765 },
        { category: 'Portfolio', downloads: 6543 },
        { category: 'E-commerce', downloads: 9876 },
        { category: 'Blog', downloads: 4321 }
      ],
      userEngagement: [
        { type: 'New Users', value: 35 },
        { type: 'Returning Users', value: 45 },
        { type: 'Power Users', value: 20 }
      ]
    },
    recommendations: {
      effectiveness: Array.from({ length: days }, (_, i) => {
        const date = dayjs().subtract(days - i, 'day').format('YYYY-MM-DD');
        return [
          { date, type: 'Category-based', rate: 60 + Math.random() * 20 },
          { date, type: 'Tag-based', rate: 50 + Math.random() * 25 },
          { date, type: 'Behavioral', rate: 70 + Math.random() * 15 },
          { date, type: 'Collaborative', rate: 55 + Math.random() * 20 }
        ];
      }).flat(),
      userSatisfaction: 82,
      topReasons: [
        { reason: 'Based on your interest in Business templates', usage: 35, successRate: 78 },
        { reason: 'Similar to templates you\'ve used', usage: 28, successRate: 82 },
        { reason: 'Trending in your category', usage: 22, successRate: 71 },
        { reason: 'Recommended by AI', usage: 15, successRate: 85 }
      ]
    },
    userBehavior: {
      searchPatterns: [
        { pattern: 'Category first, then refine', frequency: 45 },
        { pattern: 'Direct template search', frequency: 32 },
        { pattern: 'Browse trending first', frequency: 23 }
      ],
      preferredCategories: [
        { category: 'Business', users: 2840, growthRate: 15 },
        { category: 'Creative', users: 2156, growthRate: 8 },
        { category: 'Portfolio', users: 1892, growthRate: 12 },
        { category: 'E-commerce', users: 1634, growthRate: -3 }
      ],
      sessionAnalytics: [
        { metric: 'Avg Session Duration', value: '8m 34s', trend: 12, description: 'Time spent browsing templates' },
        { metric: 'Pages per Session', value: '4.2', trend: 5, description: 'Templates viewed per visit' },
        { metric: 'Bounce Rate', value: '32%', trend: -8, description: 'Single-page visits' },
        { metric: 'Download Rate', value: '18%', trend: 15, description: 'Visitors who download templates' }
      ]
    }
  };
};

export default TemplateAnalyticsDashboard;