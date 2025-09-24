import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Button, 
  Skeleton, 
  Tag,
  Input,
  Select,
  Modal,
  Rate,
  Badge,
  Carousel,
  Divider,
  Tooltip,
  Space,
  AutoComplete,
  message,
  Empty
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  DownloadOutlined,
  HeartOutlined,
  HeartFilled,
  StarOutlined,
  TrophyOutlined,
  ThunderboltOutlined,
  RobotOutlined,
  BulbOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getPersonalizedRecommendations,
  smartTemplateSearch,
  trackUserInteraction
} from '../../lib/templateDiscovery';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const SmartTemplateRecommendations = ({
  embedded = false,
  showSearch = true,
  showFilters = true,
  maxRecommendations = 20,
  onTemplateSelect,
  className = ''
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSuggestions] = useState([]);
  const [activeView, setActiveView] = useState('recommendations'); // recommendations | search
  const [previewModal, setPreviewModal] = useState({ open: false, template: null });
  const [favorites, setFavorites] = useState(new Set());
  const [filters, setFilters] = useState({
    category: null,
    priceType: null,
    rating: null,
    sortBy: 'relevance'
  });

  // Load personalized recommendations
  const loadRecommendations = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      const result = await getPersonalizedRecommendations(user.uid, {
        limit: maxRecommendations,
        minQualityScore: 60
      });

      if (result.success) {
        setRecommendations(result.recommendations);
      } else {
        console.error('Failed to load recommendations:', result.error);
        message.error('Failed to load recommendations');
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
      message.error('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, maxRecommendations]);

  // Perform smart search
  const performSearch = useCallback(async (query = searchQuery) => {
    if (!query.trim()) {
      setActiveView('recommendations');
      return;
    }

    try {
      setSearchLoading(true);
      setActiveView('search');
      
      const result = await smartTemplateSearch(query, {
        userId: user?.uid,
        filters,
        limit: maxRecommendations
      });

      if (result.success) {
        setSearchResults(result.results);
        setSuggestions(result.suggestions || []);
      } else {
        console.error('Search failed:', result.error);
        message.error('Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      message.error('Search failed');
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, filters, user?.uid, maxRecommendations]);

  // Track user interactions
  const trackInteraction = useCallback(async (type, templateData) => {
    if (!user?.uid) return;

    try {
      await trackUserInteraction(user.uid, {
        type,
        templateId: templateData.id,
        category: templateData.category,
        tags: templateData.tags || [],
        searchQuery: activeView === 'search' ? searchQuery : null,
        metadata: {
          recommendationType: templateData.recommendationType,
          recommendationReason: templateData.recommendationReason
        }
      });
    } catch (error) {
      console.warn('Failed to track interaction:', error);
    }
  }, [user?.uid, activeView, searchQuery]);

  // Handle template actions
  const handleTemplateView = useCallback(async (template) => {
    await trackInteraction('view', template);
    setPreviewModal({ open: true, template });
  }, [trackInteraction]);

  const handleTemplateSelect = useCallback(async (template) => {
    await trackInteraction('download', template);
    onTemplateSelect?.(template);
  }, [trackInteraction, onTemplateSelect]);

  const handleToggleFavorite = useCallback(async (template, event) => {
    event.stopPropagation();
    const newFavorites = new Set(favorites);
    
    if (favorites.has(template.id)) {
      newFavorites.delete(template.id);
      await trackInteraction('unfavorite', template);
    } else {
      newFavorites.add(template.id);
      await trackInteraction('favorite', template);
    }
    
    setFavorites(newFavorites);
  }, [favorites, trackInteraction]);

  // Load initial data
  useEffect(() => {
    if (user?.uid) {
      loadRecommendations();
    }
  }, [user?.uid, loadRecommendations]);

  // Handle search input changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  // Render recommendation reason badge
  const renderReasonBadge = (template) => {
    const { recommendationType, recommendationReason } = template;
    
    const typeConfig = {
      category: { color: 'blue', icon: <BulbOutlined /> },
      tags: { color: 'green', icon: <StarOutlined /> },
      behavior: { color: 'purple', icon: <ThunderboltOutlined /> },
      collaborative: { color: 'orange', icon: <RobotOutlined /> },
      trending: { color: 'gold', icon: <TrophyOutlined /> }
    };

    const config = typeConfig[recommendationType] || typeConfig.category;

    return (
      <Tooltip title={recommendationReason}>
        <Tag 
          color={config.color} 
          icon={config.icon}
          style={{ fontSize: '11px' }}
        >
          AI Pick
        </Tag>
      </Tooltip>
    );
  };

  // Render template card
  const renderTemplateCard = (template, index) => (
    <Card
      key={template.id}
      hoverable
      className="template-card"
      cover={
        <div className="template-card-cover" onClick={() => handleTemplateView(template)}>
          <img
            src={template.thumbnailUrl || '/placeholder-template.jpg'}
            alt={template.name}
            style={{ height: 200, objectFit: 'cover' }}
          />
          <div className="template-card-overlay">
            <Space>
              <Button 
                type="primary" 
                icon={<EyeOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTemplateView(template);
                }}
              >
                Preview
              </Button>
              <Button 
                icon={<DownloadOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTemplateSelect(template);
                }}
              >
                Use Template
              </Button>
            </Space>
          </div>
        </div>
      }
      actions={[
        <Rate disabled defaultValue={template.averageRating || 0} style={{ fontSize: 14 }} />,
        <Text type="secondary">{template.downloadCount || 0} downloads</Text>,
        <Button
          type="text"
          icon={favorites.has(template.id) ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
          onClick={(e) => handleToggleFavorite(template, e)}
        />
      ]}
    >
      <Card.Meta
        title={
          <Space direction="vertical" size={2}>
            <Text strong style={{ fontSize: '16px' }}>
              {template.name}
            </Text>
            <div>
              {template.recommendationReason && renderReasonBadge(template)}
              <Tag color="default">{template.category}</Tag>
              {template.isPremium && <Tag color="gold">Premium</Tag>}
            </div>
          </Space>
        }
        description={
          <div>
            <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0 }}>
              {template.description}
            </Paragraph>
            {template.tags && (
              <div style={{ marginTop: 8 }}>
                {template.tags.slice(0, 3).map(tag => (
                  <Tag key={tag} size="small">{tag}</Tag>
                ))}
                {template.tags.length > 3 && (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    +{template.tags.length - 3} more
                  </Text>
                )}
              </div>
            )}
          </div>
        }
      />
    </Card>
  );

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Text type="secondary">Sign in to see personalized recommendations</Text>
      </div>
    );
  }

  return (
    <div className={`smart-recommendations ${className}`}>
      {/* Header */}
      {!embedded && (
        <div style={{ marginBottom: 24 }}>
          <Title level={2}>
            <RobotOutlined /> Smart Template Recommendations
          </Title>
          <Paragraph type="secondary">
            Discover templates tailored to your preferences and usage patterns
          </Paragraph>
        </div>
      )}

      {/* Search and Filters */}
      {showSearch && (
        <div style={{ marginBottom: 24 }}>
          <Row gutter={16} align="middle">
            <Col flex={1}>
              <AutoComplete
                size="large"
                options={searchSuggestions.map(suggestion => ({ value: suggestion }))}
                onSelect={(value) => {
                  setSearchQuery(value);
                  performSearch(value);
                }}
              >
                <Input
                  placeholder="Search templates with AI assistance..."
                  prefix={<SearchOutlined />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onPressEnter={() => performSearch()}
                  loading={searchLoading}
                />
              </AutoComplete>
            </Col>
            {showFilters && (
              <Col>
                <Space>
                  <Select
                    placeholder="Category"
                    style={{ width: 120 }}
                    allowClear
                    value={filters.category}
                    onChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                  >
                    <Option value="business">Business</Option>
                    <Option value="creative">Creative</Option>
                    <Option value="portfolio">Portfolio</Option>
                    <Option value="ecommerce">E-commerce</Option>
                    <Option value="blog">Blog</Option>
                  </Select>
                  <Select
                    placeholder="Sort by"
                    style={{ width: 120 }}
                    value={filters.sortBy}
                    onChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}
                  >
                    <Option value="relevance">Relevance</Option>
                    <Option value="downloads">Downloads</Option>
                    <Option value="rating">Rating</Option>
                    <Option value="newest">Newest</Option>
                  </Select>
                </Space>
              </Col>
            )}
          </Row>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <Row gutter={[16, 16]}>
          {Array.from({ length: 6 }, (_, index) => (
            <Col key={index} xs={24} sm={12} md={8} lg={6}>
              <Card>
                <Skeleton.Image style={{ width: '100%', height: 200 }} />
                <Skeleton active />
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <>
          {/* View Toggle */}
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Button
                type={activeView === 'recommendations' ? 'primary' : 'default'}
                icon={<BulbOutlined />}
                onClick={() => setActiveView('recommendations')}
              >
                AI Recommendations ({recommendations.length})
              </Button>
              {searchQuery && (
                <Button
                  type={activeView === 'search' ? 'primary' : 'default'}
                  icon={<SearchOutlined />}
                  onClick={() => setActiveView('search')}
                  loading={searchLoading}
                >
                  Search Results ({searchResults.length})
                </Button>
              )}
            </Space>
          </div>

          {/* Templates Grid */}
          {activeView === 'recommendations' ? (
            recommendations.length > 0 ? (
              <>
                {/* Featured Recommendations Carousel */}
                {recommendations.slice(0, 5).length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <Title level={4}>✨ Featured for You</Title>
                    <Carousel autoplay dots={{ className: 'custom-dots' }}>
                      {recommendations.slice(0, 5).map((template, index) => (
                        <div key={template.id}>
                          <div 
                            style={{ 
                              height: 300, 
                              background: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${template.thumbnailUrl || '/placeholder-template.jpg'})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              cursor: 'pointer',
                              borderRadius: 8
                            }}
                            onClick={() => handleTemplateView(template)}
                          >
                            <div style={{ textAlign: 'center' }}>
                              <Title level={2} style={{ color: 'white', margin: 0 }}>
                                {template.name}
                              </Title>
                              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
                                {template.recommendationReason}
                              </Text>
                              <div style={{ marginTop: 16 }}>
                                <Button type="primary" size="large" icon={<EyeOutlined />}>
                                  Preview Template
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </Carousel>
                    <Divider />
                  </div>
                )}

                {/* All Recommendations Grid */}
                <Row gutter={[16, 16]}>
                  {recommendations.map((template, index) => (
                    <Col key={template.id} xs={24} sm={12} md={8} lg={6}>
                      {renderTemplateCard(template, index)}
                    </Col>
                  ))}
                </Row>
              </>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No recommendations available yet. Use the editor more to get personalized suggestions!"
              />
            )
          ) : (
            searchResults.length > 0 ? (
              <Row gutter={[16, 16]}>
                {searchResults.map((template, index) => (
                  <Col key={template.id} xs={24} sm={12} md={8} lg={6}>
                    {renderTemplateCard(template, index)}
                  </Col>
                ))}
              </Row>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={searchLoading ? "Searching..." : "No search results found"}
              />
            )
          )}
        </>
      )}

      {/* Preview Modal */}
      <Modal
        title={previewModal.template?.name}
        open={previewModal.open}
        onCancel={() => setPreviewModal({ open: false, template: null })}
        width={800}
        footer={[
          <Button key="close" onClick={() => setPreviewModal({ open: false, template: null })}>
            Close
          </Button>,
          <Button
            key="use"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => {
              handleTemplateSelect(previewModal.template);
              setPreviewModal({ open: false, template: null });
            }}
          >
            Use This Template
          </Button>
        ]}
      >
        {previewModal.template && (
          <div>
            <img
              src={previewModal.template.previewUrl || previewModal.template.thumbnailUrl}
              alt={previewModal.template.name}
              style={{ width: '100%', marginBottom: 16, borderRadius: 8 }}
            />
            <div style={{ marginBottom: 16 }}>
              {previewModal.template.recommendationReason && renderReasonBadge(previewModal.template)}
              <Tag color="default">{previewModal.template.category}</Tag>
              {previewModal.template.isPremium && <Tag color="gold">Premium</Tag>}
            </div>
            <Paragraph>{previewModal.template.description}</Paragraph>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Rate disabled defaultValue={previewModal.template.averageRating || 0} />
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  ({previewModal.template.downloadCount || 0} downloads)
                </Text>
              </div>
              <Button
                icon={favorites.has(previewModal.template.id) ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
                onClick={(e) => handleToggleFavorite(previewModal.template, e)}
              >
                {favorites.has(previewModal.template.id) ? 'Favorited' : 'Add to Favorites'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SmartTemplateRecommendations;