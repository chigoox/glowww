'use client';

import React, { useState, useEffect } from 'react';
import { 
  Modal, Button, Upload, Input, message, Alert, Tabs, Space, Typography, 
  Card, Row, Col, Rate, Avatar, Tag, Select, Spin, Empty, Tooltip,
  Badge, Divider 
} from 'antd';
import { 
  UploadOutlined, FileTextOutlined, CopyOutlined, ShopOutlined, 
  StarOutlined, EyeOutlined, DownloadOutlined, UserOutlined,
  SearchOutlined, FilterOutlined, MessageOutlined 
} from '@ant-design/icons';
import { useAuth } from '../../../contexts/AuthContext';
import TemplateRatingModal from './TemplateRatingModal';

const { TextArea, Search } = Input;
const { Text, Title } = Typography;
const { Option } = Select;

const PageLoadModalEnhanced = ({ visible, onCancel, onLoad, mode = 'load' }) => {
  const [activeTab, setActiveTab] = useState('paste');
  const [pasteData, setPasteData] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Template Marketplace State
  const [templates, setTemplates] = useState([]);
  const [myTemplates, setMyTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [marketplaceView, setMarketplaceView] = useState('marketplace'); // marketplace, my-templates
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  const { user } = useAuth();

  // Load templates when marketplace tab is opened
  useEffect(() => {
    if (activeTab === 'templates' && visible) {
      loadTemplates();
      if (user) {
        loadMyTemplates();
      }
    }
  }, [activeTab, visible, user, selectedCategory, selectedType, searchQuery]);

  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const params = new URLSearchParams({
        action: 'list',
        limit: '20',
        sortBy: 'rating'
      });
      
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedType) params.append('type', selectedType);
      if (searchQuery) params.append('searchQuery', searchQuery);
      
      const response = await fetch(`/api/templates?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.templates);
      } else {
        message.error('Failed to load templates');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      message.error('Failed to load templates');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const loadMyTemplates = async () => {
    if (!user) return;
    
    try {
      const params = new URLSearchParams({
        action: 'list',
        userId: user.uid,
        limit: '50'
      });
      
      const response = await fetch(`/api/templates?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setMyTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error loading my templates:', error);
    }
  };

  const handleTemplateLoad = async (template) => {
    setLoading(true);
    try {
      // Track usage
      await fetch('/api/templates?action=track-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          actionType: 'usage'
        })
      });
      
      await onLoad(template.jsonData);
      onCancel();
      message.success(`Template "${template.name}" loaded successfully!`);
    } catch (error) {
      console.error('Template load error:', error);
      message.error('Failed to load template: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateView = async (templateId) => {
    try {
      await fetch(`/api/templates?action=track-view&templateId=${templateId}`);
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const handleRatingUpdate = (templateId, newQualityScore) => {
    // Update template in state
    const updateTemplate = (templateList) => {
      return templateList.map(t => 
        t.id === templateId 
          ? { ...t, qualityScore: newQualityScore, averageRating: newQualityScore.average, totalRatings: newQualityScore.totalRatings }
          : t
      );
    };
    
    setTemplates(prev => updateTemplate(prev));
    setMyTemplates(prev => updateTemplate(prev));
  };

  const handlePasteLoad = async () => {
    if (!pasteData.trim()) {
      message.error('Please paste some page data');
      return;
    }

    setLoading(true);
    try {
      await onLoad(pasteData.trim());
      setPasteData('');
      onCancel();
    } catch (error) {
      console.error('Load error:', error);
      message.error('Failed to load page data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      setLoading(true);
      try {
        const fileContent = e.target.result;
        await onLoad(fileContent);
        onCancel();
        message.success('Page loaded successfully from file!');
      } catch (error) {
        console.error('File load error:', error);
        message.error('Failed to load file: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      message.error('Failed to read file');
    };

    reader.readAsText(file);
    return false; // Prevent default upload behavior
  };

  const validateGlowFile = (file) => {
    const isGlow = file.name.toLowerCase().endsWith('.glow');
    if (!isGlow) {
      message.error('Please select a .glow file');
      return false;
    }
    
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('File must be smaller than 10MB');
      return false;
    }
    
    return true;
  };

  // Template Card Component
  const TemplateCard = ({ template }) => {
    const [cardLoading, setCardLoading] = useState(false);

    const handleCardClick = async () => {
      await handleTemplateView(template.id);
    };

    const handleLoadTemplate = async (e) => {
      e.stopPropagation();
      setCardLoading(true);
      try {
        await handleTemplateLoad(template);
      } finally {
        setCardLoading(false);
      }
    };

    const handleRateTemplate = (e) => {
      e.stopPropagation();
      setSelectedTemplate(template);
      setRatingModalVisible(true);
    };

    return (
      <Card
        hoverable
        onClick={handleCardClick}
        cover={
          template.thumbnail ? (
            <div style={{ height: 180, overflow: 'hidden', position: 'relative' }}>
              <img
                alt={template.name}
                src={template.thumbnail}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover' 
                }}
              />
              <div style={{
                position: 'absolute',
                top: 8,
                right: 8,
                display: 'flex',
                gap: 4
              }}>
                {template.type === 'premium' && (
                  <Badge.Ribbon text="Premium" color="gold">
                    <div />
                  </Badge.Ribbon>
                )}
                {template.type === 'paid' && template.price > 0 && (
                  <Tag color="green">${template.price}</Tag>
                )}
              </div>
            </div>
          ) : (
            <div style={{
              height: 180,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f5f5f5',
              color: '#999'
            }}>
              <FileTextOutlined style={{ fontSize: 48 }} />
            </div>
          )
        }
        actions={[
          <Tooltip key="rating" title={`${template.averageRating || 0} stars (${template.totalRatings || 0} ratings)`}>
            <Button 
              type="text" 
              size="small" 
              onClick={handleRateTemplate}
              style={{ display: 'flex', alignItems: 'center', padding: 0 }}
            >
              <Rate 
                disabled 
                allowHalf 
                value={template.averageRating || 0} 
                style={{ fontSize: 12, marginRight: 4 }}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                ({template.totalRatings || 0})
              </Text>
            </Button>
          </Tooltip>,
          <Tooltip key="stats" title="Views / Downloads">
            <Space>
              <EyeOutlined />
              <Text style={{ fontSize: 11 }}>{template.viewCount || 0}</Text>
              <DownloadOutlined />
              <Text style={{ fontSize: 11 }}>{template.usageCount || 0}</Text>
            </Space>
          </Tooltip>,
          <Space key="actions">
            <Button
              type="text"
              size="small"
              icon={<MessageOutlined />}
              onClick={handleRateTemplate}
            >
              Reviews
            </Button>
            <Button
              type="primary"
              size="small"
              loading={cardLoading}
              onClick={handleLoadTemplate}
            >
              Use Template
            </Button>
          </Space>
        ]}
      >
        <Card.Meta
          title={
            <div>
              <Text strong ellipsis style={{ display: 'block' }}>
                {template.name}
              </Text>
              <Space size={4} wrap style={{ marginTop: 4 }}>
                <Tag color="blue" size="small">{template.category}</Tag>
                {template.tags?.slice(0, 2).map(tag => (
                  <Tag key={tag} size="small">{tag}</Tag>
                ))}
              </Space>
            </div>
          }
          description={
            <div>
              <Text ellipsis style={{ display: 'block', marginBottom: 8 }}>
                {template.description}
              </Text>
              <Space>
                <Avatar 
                  size="small" 
                  icon={<UserOutlined />}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {template.creatorDisplayName}
                </Text>
              </Space>
            </div>
          }
        />
      </Card>
    );
  };

  const tabItems = [
    {
      key: 'paste',
      label: (
        <span>
          <CopyOutlined />
          Paste Data
        </span>
      ),
      children: (
        <div>
          <Alert
            message="Paste Page Data"
            description="Paste compressed page data or serialized JSON content below. This can be from a .glow file or imported page data."
            type="info"
            style={{ marginBottom: 16 }}
          />
          
          <TextArea
            value={pasteData}
            onChange={(e) => setPasteData(e.target.value)}
            placeholder="Paste your page data here...&#10;&#10;This can be:&#10;• Compressed data from a .glow file&#10;• Raw JSON serialized content&#10;• Exported page data from another site"
            rows={8}
            style={{ marginBottom: 16 }}
          />
          
          <Space>
            <Button 
              type="primary" 
              onClick={handlePasteLoad}
              loading={loading}
              disabled={!pasteData.trim()}
            >
              Import Page Data
            </Button>
            <Button onClick={() => setPasteData('')}>
              Clear
            </Button>
          </Space>
        </div>
      )
    },
    {
      key: 'upload',
      label: (
        <span>
          <UploadOutlined />
          Upload File
        </span>
      ),
      children: (
        <div>
          <Alert
            message="Upload .glow File"
            description="Select a .glow file exported from another page. These files contain compressed page data that can be loaded into the current page."
            type="info"
            style={{ marginBottom: 16 }}
          />
          
          <Upload.Dragger
            beforeUpload={handleFileUpload}
            accept=".glow"
            showUploadList={false}
            disabled={loading}
            style={{ marginBottom: 16 }}
          >
            <p className="ant-upload-drag-icon">
              <FileTextOutlined />
            </p>
            <p className="ant-upload-text">
              Click or drag a .glow file here
            </p>
            <p className="ant-upload-hint">
              Only .glow files are supported. Maximum file size: 10MB
            </p>
          </Upload.Dragger>
          
          <Text type="secondary" style={{ fontSize: '12px' }}>
            💡 Tip: .glow files are compressed page exports that preserve all component data and styling.
          </Text>
        </div>
      )
    },
    {
      key: 'templates',
      label: (
        <span>
          <ShopOutlined />
          Templates
          <Badge count={templates.length} size="small" style={{ marginLeft: 4 }} />
        </span>
      ),
      children: (
        <div>
          {/* Template Marketplace Header */}
          <div style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={5} style={{ margin: 0 }}>
                  {marketplaceView === 'marketplace' ? 'Template Marketplace' : 'My Templates'}
                </Title>
                <Space>
                  {user && (
                    <Button
                      size="small"
                      type={marketplaceView === 'my-templates' ? 'primary' : 'default'}
                      onClick={() => setMarketplaceView(marketplaceView === 'marketplace' ? 'my-templates' : 'marketplace')}
                    >
                      {marketplaceView === 'marketplace' ? 'My Templates' : 'Marketplace'}
                    </Button>
                  )}
                </Space>
              </div>
              
              {marketplaceView === 'marketplace' && (
                <>
                  <Search
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onSearch={loadTemplates}
                    style={{ width: '100%' }}
                    suffix={<SearchOutlined />}
                  />
                  
                  <Space>
                    <Select
                      placeholder="Category"
                      value={selectedCategory}
                      onChange={setSelectedCategory}
                      allowClear
                      style={{ width: 120 }}
                    >
                      <Option value="landing">Landing</Option>
                      <Option value="business">Business</Option>
                      <Option value="portfolio">Portfolio</Option>
                      <Option value="ecommerce">E-commerce</Option>
                      <Option value="blog">Blog</Option>
                      <Option value="events">Events</Option>
                      <Option value="personal">Personal</Option>
                      <Option value="other">Other</Option>
                    </Select>
                    
                    <Select
                      placeholder="Type"
                      value={selectedType}
                      onChange={setSelectedType}
                      allowClear
                      style={{ width: 100 }}
                    >
                      <Option value="free">Free</Option>
                      <Option value="paid">Paid</Option>
                      <Option value="premium">Premium</Option>
                    </Select>
                    
                    <Button 
                      icon={<FilterOutlined />}
                      onClick={loadTemplates}
                      loading={templatesLoading}
                    >
                      Filter
                    </Button>
                  </Space>
                </>
              )}
            </Space>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          {/* Templates Grid */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {templatesLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>Loading templates...</div>
              </div>
            ) : (
              <Row gutter={[12, 12]}>
                {(marketplaceView === 'marketplace' ? templates : myTemplates).length === 0 ? (
                  <Col span={24}>
                    <Empty
                      description={
                        marketplaceView === 'marketplace' 
                          ? 'No templates found' 
                          : 'You haven\'t created any templates yet'
                      }
                      style={{ padding: 40 }}
                    />
                  </Col>
                ) : (
                  (marketplaceView === 'marketplace' ? templates : myTemplates).map((template) => (
                    <Col key={template.id} xs={24} sm={12} md={8}>
                      <TemplateCard template={template} />
                    </Col>
                  ))
                )}
              </Row>
            )}
          </div>

          {marketplaceView === 'marketplace' && (
            <Alert
              message="Template Marketplace"
              description="High-quality templates created by our community. All templates are rated by users to ensure quality. Use any template as a starting point for your page."
              type="info"
              style={{ marginTop: 16 }}
            />
          )}
        </div>
      )
    }
  ];

  return (
    <Modal
      title="Import Page Data"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      centered
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />
      
      <Alert
        message="Important Notes"
        description={
          <div>
            <p>• Importing page data will replace the current page content</p>
            <p>• Make sure to save your current work before importing</p>
            <p>• Invalid data will be rejected and you'll be prompted to try again</p>
            <p>• If importing fails, you can create a blank page instead</p>
          </div>
        }
        type="warning"
        style={{ marginTop: 16 }}
      />
      
      {/* Template Rating Modal */}
      <TemplateRatingModal
        visible={ratingModalVisible}
        onCancel={() => {
          setRatingModalVisible(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate}
        onRatingUpdate={(newQualityScore) => handleRatingUpdate(selectedTemplate?.id, newQualityScore)}
      />
    </Modal>
  );
};

export default PageLoadModalEnhanced;