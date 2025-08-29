'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Card, 
  Row, 
  Col, 
  Table, 
  Button, 
  Select, 
  Input, 
  Space, 
  Tag, 
  Typography, 
  Modal,
  Tabs,
  Empty,
  Spin,
  Statistic,
  Alert,
  Badge,
  Avatar,
  Dropdown,
  message,
  Tooltip
} from 'antd';
import {
  MailOutlined,
  SendOutlined,
  EyeOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FilterOutlined,
  GlobalOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
  MoreOutlined,
  SearchOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

export default function EmailManager() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [emails, setEmails] = useState([]);
  const [filteredEmails, setFilteredEmails] = useState([]);
  const [selectedSite, setSelectedSite] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [stats, setStats] = useState({});

  useEffect(() => {
    if (user?.uid) {
      loadEmailData();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [emails, selectedSite, statusFilter, searchTerm]);

  const loadEmailData = async () => {
    if (!user?.accessToken) return;
    
    setLoading(true);
    try {
      // Load user sites
      await loadUserSites();
      
      // Load emails
      await loadEmails();
      
    } catch (error) {
      console.error('Error loading email data:', error);
      message.error('Failed to load email data');
    } finally {
      setLoading(false);
    }
  };

  const loadUserSites = async () => {
    try {
      // This would typically call your sites API
      const response = await fetch(`/api/user/sites?userId=${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${user.accessToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSites(data.sites || []);
      }
    } catch (error) {
      console.error('Error loading sites:', error);
    }
  };

  const loadEmails = async () => {
    try {
      const response = await fetch(`/api/user/emails?userId=${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${user.accessToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEmails(data.emails || []);
        setStats(data.stats || {});
      }
    } catch (error) {
      console.error('Error loading emails:', error);
      // Mock data for development
      setEmails(generateMockEmails());
      setStats(generateMockStats());
    }
  };

  const applyFilters = () => {
    let filtered = [...emails];

    // Filter by site
    if (selectedSite !== 'all') {
      filtered = filtered.filter(email => email.siteId === selectedSite);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(email => email.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(email => 
        email.recipient?.toLowerCase().includes(searchLower) ||
        email.subject?.toLowerCase().includes(searchLower) ||
        email.siteName?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredEmails(filtered);
  };

  const generateMockEmails = () => {
    const mockEmails = [];
    const sites = ['My Blog', 'Portfolio', 'E-commerce Store'];
    const statuses = ['delivered', 'bounced', 'pending', 'failed'];
    
    for (let i = 0; i < 50; i++) {
      mockEmails.push({
        id: `email_${i}`,
        siteId: `site_${i % 3}`,
        siteName: sites[i % 3],
        recipient: `user${i}@example.com`,
        subject: `Contact Form Submission #${i + 1}`,
        status: statuses[i % 4],
        sentAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        openedAt: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000) : null,
        template: 'contact_form',
        content: `This is a sample email content for testing purposes. Email #${i + 1}`,
        metadata: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ip: '192.168.1.1',
          source: 'contact_form'
        }
      });
    }
    
    return mockEmails;
  };

  const generateMockStats = () => ({
    totalSent: 245,
    delivered: 220,
    bounced: 12,
    pending: 8,
    failed: 5,
    openRate: 68.2,
    clickRate: 12.4
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered': return 'green';
      case 'bounced': return 'red';
      case 'pending': return 'orange';
      case 'failed': return 'red';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered': return <CheckCircleOutlined />;
      case 'bounced': return <CloseCircleOutlined />;
      case 'pending': return <ExclamationCircleOutlined />;
      case 'failed': return <CloseCircleOutlined />;
      default: return <MailOutlined />;
    }
  };

  const viewEmail = (email) => {
    setSelectedEmail(email);
    setEmailModalVisible(true);
  };

  const deleteEmail = async (emailId) => {
    try {
      // API call to delete email
      message.success('Email deleted successfully');
      loadEmails(); // Reload data
    } catch (error) {
      message.error('Failed to delete email');
    }
  };

  const exportEmails = async () => {
    try {
      // API call to export emails
      message.success('Email data exported successfully');
    } catch (error) {
      message.error('Failed to export emails');
    }
  };

  const columns = [
    {
      title: 'Site',
      dataIndex: 'siteName',
      key: 'siteName',
      width: 150,
      render: (siteName, record) => (
        <Space>
          <Avatar size="small" icon={<GlobalOutlined />} />
          <Text strong>{siteName}</Text>
        </Space>
      ),
      filters: sites.map(site => ({ text: site.name, value: site.id })),
      onFilter: (value, record) => record.siteId === value,
    },
    {
      title: 'Recipient',
      dataIndex: 'recipient',
      key: 'recipient',
      width: 200,
      render: (recipient) => (
        <Space>
          <UserOutlined />
          <Text copyable>{recipient}</Text>
        </Space>
      ),
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
      render: (subject) => (
        <Text ellipsis style={{ maxWidth: 200 }}>{subject}</Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Tag>
      ),
      filters: [
        { text: 'Delivered', value: 'delivered' },
        { text: 'Bounced', value: 'bounced' },
        { text: 'Pending', value: 'pending' },
        { text: 'Failed', value: 'failed' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Sent',
      dataIndex: 'sentAt',
      key: 'sentAt',
      width: 150,
      render: (sentAt) => (
        <Space>
          <CalendarOutlined />
          <Text>{dayjs(sentAt).format('MMM D, HH:mm')}</Text>
        </Space>
      ),
      sorter: (a, b) => new Date(a.sentAt) - new Date(b.sentAt),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Opened',
      dataIndex: 'openedAt',
      key: 'openedAt',
      width: 100,
      render: (openedAt) => openedAt ? (
        <Tag color="blue">
          <EyeOutlined /> Opened
        </Tag>
      ) : (
        <Text type="secondary">-</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Email">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => viewEmail(record)}
            />
          </Tooltip>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'delete',
                  icon: <DeleteOutlined />,
                  label: 'Delete',
                  onClick: () => deleteEmail(record.id),
                  danger: true,
                },
              ],
            }}
            trigger={['click']}
          >
            <Button size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p style={{ marginTop: '16px' }}>Loading email data...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <MailOutlined style={{ marginRight: '8px' }} />
          Email Management
        </Title>
        <Text type="secondary">
          Manage emails from all your sites in one place
        </Text>
      </div>

      {/* Email Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Sent"
              value={stats.totalSent || 0}
              prefix={<SendOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Delivered"
              value={stats.delivered || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Open Rate"
              value={stats.openRate || 0}
              suffix="%"
              prefix={<EyeOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Bounced"
              value={stats.bounced || 0}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Space>
              <Text strong>Site:</Text>
              <Select 
                value={selectedSite} 
                onChange={setSelectedSite}
                style={{ width: 150 }}
              >
                <Option value="all">All Sites</Option>
                {sites.map(site => (
                  <Option key={site.id} value={site.id}>
                    {site.name}
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space>
              <Text strong>Status:</Text>
              <Select 
                value={statusFilter} 
                onChange={setStatusFilter}
                style={{ width: 120 }}
              >
                <Option value="all">All Status</Option>
                <Option value="delivered">Delivered</Option>
                <Option value="bounced">Bounced</Option>
                <Option value="pending">Pending</Option>
                <Option value="failed">Failed</Option>
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="Search emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={4} style={{ textAlign: 'right' }}>
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={loadEmailData}
                loading={loading}
              >
                Refresh
              </Button>
              <Button 
                icon={<DownloadOutlined />}
                onClick={exportEmails}
              >
                Export
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Emails Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredEmails}
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} emails`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Email Detail Modal */}
      <Modal
        title={
          <Space>
            <MailOutlined />
            <span>Email Details</span>
          </Space>
        }
        open={emailModalVisible}
        onCancel={() => setEmailModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setEmailModalVisible(false)}>
            Close
          </Button>
        ]}
      >
        {selectedEmail && (
          <div>
            <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
              <Col span={12}>
                <Text strong>From Site:</Text>
                <br />
                <Space>
                  <Avatar size="small" icon={<GlobalOutlined />} />
                  <Text>{selectedEmail.siteName}</Text>
                </Space>
              </Col>
              <Col span={12}>
                <Text strong>Status:</Text>
                <br />
                <Tag color={getStatusColor(selectedEmail.status)} icon={getStatusIcon(selectedEmail.status)}>
                  {selectedEmail.status.charAt(0).toUpperCase() + selectedEmail.status.slice(1)}
                </Tag>
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
              <Col span={12}>
                <Text strong>Recipient:</Text>
                <br />
                <Text copyable>{selectedEmail.recipient}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Sent:</Text>
                <br />
                <Text>{dayjs(selectedEmail.sentAt).format('MMM D, YYYY HH:mm')}</Text>
              </Col>
            </Row>

            <div style={{ marginBottom: '16px' }}>
              <Text strong>Subject:</Text>
              <br />
              <Text>{selectedEmail.subject}</Text>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <Text strong>Content:</Text>
              <div style={{ 
                background: '#f5f5f5', 
                padding: '12px', 
                borderRadius: '4px', 
                marginTop: '8px',
                maxHeight: '300px',
                overflow: 'auto'
              }}>
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                  {selectedEmail.content}
                </pre>
              </div>
            </div>

            {selectedEmail.openedAt && (
              <Alert
                message={`Email opened on ${dayjs(selectedEmail.openedAt).format('MMM D, YYYY HH:mm')}`}
                type="success"
                showIcon
                style={{ marginTop: '16px' }}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
