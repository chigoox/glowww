'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Tag, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Rate, 
  message, 
  Typography, 
  Row, 
  Col, 
  Statistic, 
  Avatar, 
  Tooltip, 
  Popconfirm,
  Badge,
  Tabs,
  Alert,
  DatePicker,
  Progress,
  List,
  Drawer,
  Switch,
  InputNumber
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  StarOutlined,
  DownloadOutlined,
  FlagOutlined,
  ShopOutlined,
  TrophyOutlined,
  BarChartOutlined,
  HeartOutlined,
  MessageOutlined,
  FilterOutlined,
  ExportOutlined,
  ReloadOutlined,
  WarningOutlined,
  FireOutlined,
  ThunderboltOutlined,
  DollarOutlined,
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { 
  getTemplatesByStatus, 
  updateTemplateStatus, 
  deleteTemplate,
  getTemplateStats,
  getFeaturedTemplates,
  setTemplateFeatured,
  getTemplateReports,
  resolveTemplateReport
} from '../../../lib/templateMarketplace';
import { getTemplateVersions } from '../../../lib/templateVersioning';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

/**
 * Template Moderation Dashboard for Platform Admins
 * Manages template marketplace submissions, reviews, and analytics
 */
const TemplateModeration = () => {
  // State management
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [analyticsVisible, setAnalyticsVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState([]);
  
  // Analytics data
  const [marketplaceStats, setMarketplaceStats] = useState({
    totalTemplates: 0,
    pendingReview: 0,
    approved: 0,
    rejected: 0,
    featured: 0,
    totalDownloads: 0,
    totalRevenue: 0,
    averageRating: 0
  });
  
  const [templateReports, setTemplateReports] = useState([]);
  const [featuredTemplates, setFeaturedTemplates] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);

  // Form instances
  const [reviewForm] = Form.useForm();

  // Load data on component mount
  useEffect(() => {
    loadTemplateData();
    loadMarketplaceStats();
    loadTemplateReports();
    loadFeaturedTemplates();
  }, [activeTab, filterStatus, searchQuery, dateRange]);

  /**
   * Load templates based on current filters
   */
  const loadTemplateData = async () => {
    setLoading(true);
    try {
      let status = activeTab;
      if (activeTab === 'all') status = null;
      if (activeTab === 'pending') status = 'pending';
      if (activeTab === 'approved') status = 'approved';
      if (activeTab === 'rejected') status = 'rejected';

      const result = await getTemplatesByStatus(status);
      
      if (result.success) {
        let filteredTemplates = result.templates;
        
        // Apply search filter
        if (searchQuery) {
          filteredTemplates = filteredTemplates.filter(template =>
            template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            template.creatorName.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        
        // Apply date range filter
        if (dateRange.length === 2) {
          filteredTemplates = filteredTemplates.filter(template => {
            const templateDate = new Date(template.createdAt);
            return templateDate >= dateRange[0] && templateDate <= dateRange[1];
          });
        }
        
        setTemplates(filteredTemplates);
      } else {
        message.error('Failed to load templates: ' + result.error);
        setTemplates([]);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      message.error('Failed to load templates');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load marketplace statistics
   */
  const loadMarketplaceStats = async () => {
    try {
      const result = await getTemplateStats();
      
      if (result.success) {
        setMarketplaceStats(result.stats);
        setPerformanceData(result.performanceData || []);
        setCategoryStats(result.categoryStats || []);
      }
    } catch (error) {
      console.error('Error loading marketplace stats:', error);
    }
  };

  /**
   * Load template reports
   */
  const loadTemplateReports = async () => {
    try {
      const result = await getTemplateReports();
      
      if (result.success) {
        setTemplateReports(result.reports);
      }
    } catch (error) {
      console.error('Error loading template reports:', error);
    }
  };

  /**
   * Load featured templates
   */
  const loadFeaturedTemplates = async () => {
    try {
      const result = await getFeaturedTemplates();
      
      if (result.success) {
        setFeaturedTemplates(result.templates);
      }
    } catch (error) {
      console.error('Error loading featured templates:', error);
    }
  };

  /**
   * Handle template approval
   */
  const handleApproveTemplate = async (templateId) => {
    try {
      const result = await updateTemplateStatus(templateId, 'approved', {
        reviewedAt: new Date().toISOString(),
        reviewNotes: 'Template approved for marketplace'
      });
      
      if (result.success) {
        message.success('Template approved successfully');
        loadTemplateData();
        loadMarketplaceStats();
      } else {
        message.error('Failed to approve template: ' + result.error);
      }
    } catch (error) {
      console.error('Error approving template:', error);
      message.error('Failed to approve template');
    }
  };

  /**
   * Handle template rejection
   */
  const handleRejectTemplate = async (templateId, reason = '') => {
    try {
      const result = await updateTemplateStatus(templateId, 'rejected', {
        reviewedAt: new Date().toISOString(),
        reviewNotes: reason || 'Template rejected',
        rejectionReason: reason
      });
      
      if (result.success) {
        message.success('Template rejected');
        loadTemplateData();
        loadMarketplaceStats();
      } else {
        message.error('Failed to reject template: ' + result.error);
      }
    } catch (error) {
      console.error('Error rejecting template:', error);
      message.error('Failed to reject template');
    }
  };

  /**
   * Handle template deletion
   */
  const handleDeleteTemplate = async (templateId) => {
    try {
      const result = await deleteTemplate(templateId);
      
      if (result.success) {
        message.success('Template deleted successfully');
        loadTemplateData();
        loadMarketplaceStats();
      } else {
        message.error('Failed to delete template: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      message.error('Failed to delete template');
    }
  };

  /**
   * Handle feature/unfeature template
   */
  const handleToggleFeatured = async (templateId, featured) => {
    try {
      const result = await setTemplateFeatured(templateId, featured);
      
      if (result.success) {
        message.success(`Template ${featured ? 'featured' : 'unfeatured'} successfully`);
        loadTemplateData();
        loadFeaturedTemplates();
      } else {
        message.error('Failed to update featured status: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating featured status:', error);
      message.error('Failed to update featured status');
    }
  };

  /**
   * Handle report resolution
   */
  const handleResolveReport = async (reportId, action) => {
    try {
      const result = await resolveTemplateReport(reportId, action);
      
      if (result.success) {
        message.success('Report resolved successfully');
        loadTemplateReports();
      } else {
        message.error('Failed to resolve report: ' + result.error);
      }
    } catch (error) {
      console.error('Error resolving report:', error);
      message.error('Failed to resolve report');
    }
  };

  /**
   * Open template preview
   */
  const handlePreviewTemplate = (template) => {
    setSelectedTemplate(template);
    setPreviewVisible(true);
  };

  /**
   * Open review modal
   */
  const handleReviewTemplate = (template) => {
    setSelectedTemplate(template);
    setReviewVisible(true);
    reviewForm.resetFields();
  };

  /**
   * Open analytics drawer
   */
  const handleViewAnalytics = (template) => {
    setSelectedTemplate(template);
    setAnalyticsVisible(true);
  };

  /**
   * Submit review
   */
  const handleSubmitReview = async () => {
    try {
      const values = await reviewForm.validateFields();
      
      const result = await updateTemplateStatus(selectedTemplate.id, values.status, {
        reviewedAt: new Date().toISOString(),
        reviewNotes: values.notes,
        adminRating: values.rating,
        rejectionReason: values.status === 'rejected' ? values.rejectionReason : undefined
      });
      
      if (result.success) {
        message.success(`Template ${values.status} successfully`);
        setReviewVisible(false);
        loadTemplateData();
        loadMarketplaceStats();
      } else {
        message.error('Failed to submit review: ' + result.error);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      message.error('Failed to submit review');
    }
  };

  // Table columns for templates
  const templateColumns = [
    {
      title: 'Template',
      key: 'template',
      render: (_, record) => (
        <Space>
          <Avatar 
            src={record.thumbnail} 
            icon={<ShopOutlined />} 
            size="large" 
            shape="square"
          />
          <div>
            <div style={{ fontWeight: 500, fontSize: '14px' }}>{record.name}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              by {record.creatorName}
            </Text>
            <div style={{ marginTop: '4px' }}>
              <Space size="small">
                <Tag color="blue">{record.category}</Tag>
                {record.tags?.slice(0, 2).map(tag => (
                  <Tag key={tag} size="small">{tag}</Tag>
                ))}
              </Space>
            </div>
          </div>
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const colors = {
          pending: 'orange',
          approved: 'green',
          rejected: 'red',
          featured: 'purple'
        };
        return <Tag color={colors[status]}>{status}</Tag>;
      }
    },
    {
      title: 'Quality Score',
      dataIndex: 'qualityScore',
      key: 'qualityScore',
      width: 120,
      sorter: (a, b) => a.qualityScore - b.qualityScore,
      render: (score) => (
        <div>
          <Progress 
            percent={score} 
            size="small" 
            strokeColor={score > 80 ? '#52c41a' : score > 60 ? '#faad14' : '#ff4d4f'}
          />
          <Text style={{ fontSize: '12px' }}>{score}/100</Text>
        </div>
      )
    },
    {
      title: 'Rating',
      key: 'rating',
      width: 100,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Rate disabled value={record.averageRating} style={{ fontSize: '12px' }} />
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {record.ratingCount} reviews
          </Text>
        </Space>
      )
    },
    {
      title: 'Downloads',
      dataIndex: 'downloadCount',
      key: 'downloadCount',
      width: 80,
      sorter: (a, b) => a.downloadCount - b.downloadCount,
      render: (count) => (
        <Space direction="vertical" size="small">
          <Text>{count.toLocaleString()}</Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>downloads</Text>
        </Space>
      )
    },
    {
      title: 'Revenue',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      width: 80,
      sorter: (a, b) => a.totalRevenue - b.totalRevenue,
      render: (revenue) => (
        <Space direction="vertical" size="small">
          <Text>${(revenue || 0).toFixed(2)}</Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>earned</Text>
        </Space>
      )
    },
    {
      title: 'Submitted',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 100,
      render: (date) => (
        <Space direction="vertical" size="small">
          <Text>{new Date(date).toLocaleDateString()}</Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {Math.floor((Date.now() - new Date(date)) / (1000 * 60 * 60 * 24))} days ago
          </Text>
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Space size="small">
            <Tooltip title="Preview">
              <Button 
                type="text" 
                icon={<EyeOutlined />} 
                size="small"
                onClick={() => handlePreviewTemplate(record)}
              />
            </Tooltip>
            <Tooltip title="Review">
              <Button 
                type="text" 
                icon={<EditOutlined />} 
                size="small"
                onClick={() => handleReviewTemplate(record)}
              />
            </Tooltip>
            <Tooltip title="Analytics">
              <Button 
                type="text" 
                icon={<BarChartOutlined />} 
                size="small"
                onClick={() => handleViewAnalytics(record)}
              />
            </Tooltip>
          </Space>
          <Space size="small">
            {record.status === 'pending' && (
              <>
                <Tooltip title="Approve">
                  <Button 
                    type="text" 
                    icon={<CheckOutlined />} 
                    size="small"
                    style={{ color: '#52c41a' }}
                    onClick={() => handleApproveTemplate(record.id)}
                  />
                </Tooltip>
                <Tooltip title="Reject">
                  <Button 
                    type="text" 
                    icon={<CloseOutlined />} 
                    size="small"
                    style={{ color: '#ff4d4f' }}
                    onClick={() => Modal.confirm({
                      title: 'Reject Template',
                      content: 'Why are you rejecting this template?',
                      okText: 'Reject',
                      okType: 'danger',
                      onOk: (reason) => handleRejectTemplate(record.id, reason)
                    })}
                  />
                </Tooltip>
              </>
            )}
            <Tooltip title={record.featured ? 'Unfeature' : 'Feature'}>
              <Button 
                type="text" 
                icon={<StarOutlined />} 
                size="small"
                style={{ color: record.featured ? '#faad14' : '#8c8c8c' }}
                onClick={() => handleToggleFeatured(record.id, !record.featured)}
              />
            </Tooltip>
            <Popconfirm
              title="Delete template permanently?"
              onConfirm={() => handleDeleteTemplate(record.id)}
              okText="Delete"
              okType="danger"
            >
              <Tooltip title="Delete">
                <Button 
                  type="text" 
                  icon={<DeleteOutlined />} 
                  size="small"
                  danger
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        </Space>
      )
    }
  ];

  const CHART_COLORS = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2'];

  return (
    <div className="template-moderation-dashboard">
      {/* Header Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={6} lg={3}>
          <Card>
            <Statistic
              title="Total Templates"
              value={marketplaceStats.totalTemplates}
              prefix={<ShopOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Card>
            <Statistic
              title="Pending Review"
              value={marketplaceStats.pendingReview}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Card>
            <Statistic
              title="Total Downloads"
              value={marketplaceStats.totalDownloads}
              prefix={<DownloadOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={marketplaceStats.totalRevenue}
              prefix={<DollarOutlined />}
              precision={2}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Card>
            <Statistic
              title="Featured"
              value={marketplaceStats.featured}
              prefix={<StarOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Card>
            <Statistic
              title="Average Rating"
              value={marketplaceStats.averageRating}
              prefix={<HeartOutlined />}
              precision={1}
              suffix="/ 5"
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Card
        title="Template Marketplace Management"
        extra={
          <Space>
            <Input.Search
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: 240 }}
            />
            <Button icon={<FilterOutlined />}>
              Filter
            </Button>
            <Button icon={<ExportOutlined />}>
              Export
            </Button>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={() => {
                loadTemplateData();
                loadMarketplaceStats();
              }}
            >
              Refresh
            </Button>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane 
            tab={
              <Badge count={marketplaceStats.pendingReview} offset={[10, 0]}>
                <span>Pending Review</span>
              </Badge>
            } 
            key="pending"
          />
          <TabPane 
            tab={`Approved (${marketplaceStats.approved})`} 
            key="approved" 
          />
          <TabPane 
            tab={`Rejected (${marketplaceStats.rejected})`} 
            key="rejected" 
          />
          <TabPane 
            tab={
              <Badge count={featuredTemplates.length} offset={[10, 0]}>
                <span>Featured</span>
              </Badge>
            } 
            key="featured"
          />
          <TabPane 
            tab={`All Templates (${marketplaceStats.totalTemplates})`} 
            key="all" 
          />
          <TabPane 
            tab={
              <Badge count={templateReports.length} offset={[10, 0]}>
                <span>Reports</span>
              </Badge>
            } 
            key="reports" 
          />
        </Tabs>

        {/* Templates Table */}
        {activeTab !== 'reports' && (
          <Table
            columns={templateColumns}
            dataSource={templates}
            rowKey="id"
            loading={loading}
            pagination={{
              total: templates.length,
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Total ${total} templates`
            }}
            scroll={{ x: 1200 }}
          />
        )}

        {/* Reports Tab Content */}
        {activeTab === 'reports' && (
          <List
            dataSource={templateReports}
            renderItem={(report) => (
              <List.Item
                actions={[
                  <Button
                    key="view"
                    type="link"
                    onClick={() => handlePreviewTemplate({ id: report.templateId })}
                  >
                    View Template
                  </Button>,
                  <Button
                    key="resolve"
                    type="link"
                    onClick={() => handleResolveReport(report.id, 'resolved')}
                  >
                    Resolve
                  </Button>,
                  <Button
                    key="dismiss"
                    type="link"
                    onClick={() => handleResolveReport(report.id, 'dismissed')}
                  >
                    Dismiss
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<FlagOutlined />} style={{ backgroundColor: '#ff4d4f' }} />}
                  title={
                    <Space>
                      <Text strong>{report.reason}</Text>
                      <Tag color="orange">{report.category}</Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <Paragraph ellipsis={{ rows: 2 }}>{report.description}</Paragraph>
                      <Space>
                        <Text type="secondary">
                          Reported by {report.reporterName} on {new Date(report.createdAt).toLocaleDateString()}
                        </Text>
                        <Text type="secondary">
                          Template: {report.templateName}
                        </Text>
                      </Space>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* Template Preview Modal */}
      <Modal
        title="Template Preview"
        visible={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={1000}
        footer={null}
      >
        {selectedTemplate && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div 
                  style={{ 
                    border: '1px solid #d9d9d9', 
                    borderRadius: '8px',
                    height: '400px',
                    background: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {selectedTemplate.thumbnail ? (
                    <img 
                      src={selectedTemplate.thumbnail} 
                      alt={selectedTemplate.name}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Text type="secondary">No preview available</Text>
                  )}
                </div>
              </Col>
              <Col span={12}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  <div>
                    <Title level={4}>{selectedTemplate.name}</Title>
                    <Text>by {selectedTemplate.creatorName}</Text>
                  </div>
                  
                  <div>
                    <Text strong>Category: </Text>
                    <Tag color="blue">{selectedTemplate.category}</Tag>
                  </div>
                  
                  <div>
                    <Text strong>Tags: </Text>
                    <Space wrap>
                      {selectedTemplate.tags?.map(tag => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </Space>
                  </div>
                  
                  <div>
                    <Text strong>Description:</Text>
                    <Paragraph>{selectedTemplate.description}</Paragraph>
                  </div>
                  
                  <Row gutter={16}>
                    <Col span={12}>
                      <Statistic title="Downloads" value={selectedTemplate.downloadCount} />
                    </Col>
                    <Col span={12}>
                      <Statistic 
                        title="Rating" 
                        value={selectedTemplate.averageRating} 
                        precision={1}
                        suffix={`/ 5 (${selectedTemplate.ratingCount})`}
                      />
                    </Col>
                  </Row>
                </Space>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      {/* Review Modal */}
      <Modal
        title="Review Template"
        visible={reviewVisible}
        onCancel={() => setReviewVisible(false)}
        onOk={handleSubmitReview}
        width={600}
      >
        <Form form={reviewForm} layout="vertical">
          <Form.Item
            name="status"
            label="Decision"
            rules={[{ required: true, message: 'Please select a decision' }]}
          >
            <Select>
              <Select.Option value="approved">Approve</Select.Option>
              <Select.Option value="rejected">Reject</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="rating"
            label="Admin Rating"
          >
            <Rate />
          </Form.Item>
          
          <Form.Item
            name="notes"
            label="Review Notes"
            rules={[{ required: true, message: 'Please provide review notes' }]}
          >
            <Input.TextArea rows={4} placeholder="Enter your review notes..." />
          </Form.Item>
          
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => 
              prevValues.status !== currentValues.status
            }
          >
            {({ getFieldValue }) => 
              getFieldValue('status') === 'rejected' ? (
                <Form.Item
                  name="rejectionReason"
                  label="Rejection Reason"
                  rules={[{ required: true, message: 'Please provide rejection reason' }]}
                >
                  <Select>
                    <Select.Option value="quality">Quality issues</Select.Option>
                    <Select.Option value="inappropriate">Inappropriate content</Select.Option>
                    <Select.Option value="copyright">Copyright violation</Select.Option>
                    <Select.Option value="duplicate">Duplicate template</Select.Option>
                    <Select.Option value="other">Other</Select.Option>
                  </Select>
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>

      {/* Analytics Drawer */}
      <Drawer
        title="Template Analytics"
        visible={analyticsVisible}
        onClose={() => setAnalyticsVisible(false)}
        width={600}
      >
        {selectedTemplate && (
          <div>
            <Title level={4}>{selectedTemplate.name}</Title>
            
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
              <Col span={8}>
                <Statistic title="Downloads" value={selectedTemplate.downloadCount} />
              </Col>
              <Col span={8}>
                <Statistic title="Views" value={selectedTemplate.viewCount || 0} />
              </Col>
              <Col span={8}>
                <Statistic title="Revenue" value={(selectedTemplate.totalRevenue || 0)} precision={2} prefix="$" />
              </Col>
            </Row>

            <Card title="Download Trends" style={{ marginBottom: '16px' }}>
              <div style={{ height: 200 }}>
                <ResponsiveContainer>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="downloads" stroke="#1677ff" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Rating Distribution">
              <div style={{ height: 200 }}>
                <ResponsiveContainer>
                  <BarChart data={[
                    { rating: '5★', count: 45 },
                    { rating: '4★', count: 32 },
                    { rating: '3★', count: 18 },
                    { rating: '2★', count: 8 },
                    { rating: '1★', count: 3 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="rating" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#52c41a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default TemplateModeration;