/**
 * Template Collections Component
 * Displays template collections with filtering, search, and discovery features
 */

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Button, 
  Input, 
  Select, 
  Space, 
  Typography, 
  Tag, 
  Avatar, 
  Modal,
  Carousel,
  Divider,
  Badge,
  Tooltip,
  Rate,
  Skeleton,
  Empty,
  Pagination,
  Drawer,
  Tabs,
  Statistic,
  Progress,
  Alert
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  StarOutlined,
  DownloadOutlined,
  EyeOutlined,
  HeartOutlined,
  ShoppingCartOutlined,
  FireOutlined,
  TrophyOutlined,
  CrownOutlined,
  ThunderboltOutlined,
  GiftOutlined,
  RightOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getTemplateCollections, 
  getFeaturedCollections, 
  updateCollectionAnalytics,
  COLLECTION_TYPES,
  SEASONAL_THEMES 
} from '../../lib/templateCollections';
import { getTemplatesByIds } from '../../lib/templateMarketplace';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

/**
 * Template Collections Browser
 */
const TemplateCollections = ({ embedded = false, selectedCategory = null }) => {
  const { user } = useAuth();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState([]);
  const [featuredCollections, setFeaturedCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  // Filters and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [totalCollections, setTotalCollections] = useState(0);

  // Collection templates
  const [collectionTemplates, setCollectionTemplates] = useState({});

  // Load data on component mount and filter changes
  useEffect(() => {
    loadCollections();
    loadFeaturedCollections();
  }, [activeTab, filterType, sortBy, currentPage, searchQuery]);

  /**
   * Load template collections with current filters
   */
  const loadCollections = async () => {
    setLoading(true);
    try {
      const filters = {
        limit: pageSize,
        sortBy: sortBy === 'featured' ? 'updatedAt' : sortBy,
        sortOrder: 'desc'
      };

      // Add type filter
      if (activeTab !== 'all') {
        filters.type = activeTab;
      } else if (filterType !== 'all') {
        filters.type = filterType;
      }

      // Add category filter
      if (selectedCategory) {
        filters.category = selectedCategory;
      }

      // Add featured filter for featured tab
      if (activeTab === 'featured') {
        filters.featured = true;
      }

      const result = await getTemplateCollections(filters);
      
      if (result.success) {
        let filteredCollections = result.collections;
        
        // Apply search filter
        if (searchQuery) {
          filteredCollections = filteredCollections.filter(collection =>
            collection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            collection.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            collection.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
          );
        }
        
        setCollections(filteredCollections);
        setTotalCollections(filteredCollections.length);
        
        // Load templates for each collection
        loadCollectionTemplates(filteredCollections);
      } else {
        console.error('Failed to load collections:', result.error);
        setCollections([]);
      }
    } catch (error) {
      console.error('Error loading collections:', error);
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load featured collections
   */
  const loadFeaturedCollections = async () => {
    try {
      const result = await getFeaturedCollections();
      
      if (result.success) {
        setFeaturedCollections(result.collections.slice(0, 6));
      }
    } catch (error) {
      console.error('Error loading featured collections:', error);
    }
  };

  /**
   * Load templates for collections preview
   */
  const loadCollectionTemplates = async (collectionsToLoad) => {
    try {
      const templatePromises = collectionsToLoad.map(async (collection) => {
        if (collection.templateIds?.length > 0) {
          const result = await getTemplatesByIds(collection.templateIds.slice(0, 4)); // Load first 4 for preview
          return {
            collectionId: collection.id,
            templates: result.success ? result.templates : []
          };
        }
        return { collectionId: collection.id, templates: [] };
      });

      const templateResults = await Promise.all(templatePromises);
      const templatesMap = {};
      
      templateResults.forEach(({ collectionId, templates }) => {
        templatesMap[collectionId] = templates;
      });

      setCollectionTemplates(templatesMap);
    } catch (error) {
      console.error('Error loading collection templates:', error);
    }
  };

  /**
   * Handle collection preview
   */
  const handlePreviewCollection = async (collection) => {
    setSelectedCollection(collection);
    setPreviewVisible(true);
    
    // Track analytics
    updateCollectionAnalytics(collection.id, 'view');
  };

  /**
   * Handle collection details view
   */
  const handleViewDetails = async (collection) => {
    setSelectedCollection(collection);
    setDetailsVisible(true);
    
    // Track analytics
    updateCollectionAnalytics(collection.id, 'click');
  };

  /**
   * Get collection type icon
   */
  const getCollectionTypeIcon = (type) => {
    const icons = {
      [COLLECTION_TYPES.BUNDLE]: <ShoppingCartOutlined />,
      [COLLECTION_TYPES.CURATED]: <CrownOutlined />,
      [COLLECTION_TYPES.SEASONAL]: <GiftOutlined />,
      [COLLECTION_TYPES.TRENDING]: <FireOutlined />,
      [COLLECTION_TYPES.CATEGORY]: <TagOutlined />,
      [COLLECTION_TYPES.CREATOR]: <TrophyOutlined />
    };
    
    return icons[type] || <StarOutlined />;
  };

  /**
   * Get collection type color
   */
  const getCollectionTypeColor = (type) => {
    const colors = {
      [COLLECTION_TYPES.BUNDLE]: '#52c41a',
      [COLLECTION_TYPES.CURATED]: '#722ed1',
      [COLLECTION_TYPES.SEASONAL]: '#faad14',
      [COLLECTION_TYPES.TRENDING]: '#ff4d4f',
      [COLLECTION_TYPES.CATEGORY]: '#1677ff',
      [COLLECTION_TYPES.CREATOR]: '#d48806'
    };
    
    return colors[type] || '#8c8c8c';
  };

  /**
   * Render collection card
   */
  const renderCollectionCard = (collection) => {
    const templates = collectionTemplates[collection.id] || [];
    const isBundle = collection.type === COLLECTION_TYPES.BUNDLE;
    const isSeasonal = collection.type === COLLECTION_TYPES.SEASONAL;
    const isTrending = collection.type === COLLECTION_TYPES.TRENDING;

    return (
      <Card
        key={collection.id}
        hoverable
        className="collection-card"
        style={{ height: '100%' }}
        cover={
          <div 
            style={{ 
              height: 200, 
              background: `linear-gradient(45deg, ${getCollectionTypeColor(collection.type)}15, ${getCollectionTypeColor(collection.type)}05)`,
              position: 'relative',
              overflow: 'hidden'
            }}
            onClick={() => handlePreviewCollection(collection)}
          >
            {/* Template Previews */}
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '4px',
                padding: '8px',
                height: '100%'
              }}
            >
              {templates.slice(0, 4).map((template, index) => (
                <div
                  key={template.id}
                  style={{
                    backgroundImage: template.thumbnail ? `url(${template.thumbnail})` : 'none',
                    backgroundColor: template.thumbnail ? 'transparent' : '#f0f0f0',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#8c8c8c',
                    fontSize: '12px'
                  }}
                >
                  {!template.thumbnail && `Template ${index + 1}`}
                </div>
              ))}
            </div>

            {/* Overlay */}
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 0.3s ease'
              }}
              className="collection-overlay"
            >
              <Button 
                type="primary" 
                icon={<EyeOutlined />}
                shape="round"
                size="large"
              >
                Preview Collection
              </Button>
            </div>

            {/* Collection Type Badge */}
            <div style={{ position: 'absolute', top: 8, left: 8 }}>
              <Tag 
                color={getCollectionTypeColor(collection.type)} 
                icon={getCollectionTypeIcon(collection.type)}
              >
                {collection.type.charAt(0).toUpperCase() + collection.type.slice(1)}
              </Tag>
            </div>

            {/* Featured Badge */}
            {collection.featured && (
              <div style={{ position: 'absolute', top: 8, right: 8 }}>
                <Badge.Ribbon text="Featured" color="gold" />
              </div>
            )}

            {/* Bundle Discount Badge */}
            {isBundle && collection.metadata?.discount && (
              <div style={{ position: 'absolute', bottom: 8, right: 8 }}>
                <Tag color="red" icon={<ThunderboltOutlined />}>
                  {collection.metadata.discount}% OFF
                </Tag>
              </div>
            )}
          </div>
        }
        actions={[
          <Tooltip title="View Details" key="details">
            <Button 
              type="text" 
              icon={<RightOutlined />}
              onClick={() => handleViewDetails(collection)}
            />
          </Tooltip>,
          <Tooltip title="Downloads" key="downloads">
            <Space>
              <DownloadOutlined />
              <Text>{collection.downloadCount || 0}</Text>
            </Space>
          </Tooltip>,
          <Tooltip title="Views" key="views">
            <Space>
              <EyeOutlined />
              <Text>{collection.viewCount || 0}</Text>
            </Space>
          </Tooltip>
        ]}
      >
        <Card.Meta
          title={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text strong ellipsis style={{ flex: 1, marginRight: 8 }}>
                {collection.name}
              </Text>
              {isTrending && <FireOutlined style={{ color: '#ff4d4f' }} />}
              {isSeasonal && <GiftOutlined style={{ color: '#faad14' }} />}
            </div>
          }
          description={
            <div>
              <Paragraph 
                ellipsis={{ rows: 2 }} 
                style={{ marginBottom: 8, fontSize: '12px', color: '#666' }}
              >
                {collection.description}
              </Paragraph>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space size="small">
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    {collection.templateCount} templates
                  </Text>
                  {collection.createdBy !== 'system' && (
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      by {collection.createdBy}
                    </Text>
                  )}
                </Space>
                
                {isBundle && (
                  <div style={{ textAlign: 'right' }}>
                    <div>
                      <Text delete style={{ fontSize: '11px', color: '#999' }}>
                        ${collection.metadata?.originalPrice?.toFixed(2)}
                      </Text>
                    </div>
                    <Text strong style={{ color: '#52c41a', fontSize: '14px' }}>
                      ${collection.metadata?.bundlePrice?.toFixed(2)}
                    </Text>
                  </div>
                )}
              </div>

              {/* Tags */}
              {collection.tags?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <Space size={[0, 4]} wrap>
                    {collection.tags.slice(0, 3).map(tag => (
                      <Tag key={tag} size="small">{tag}</Tag>
                    ))}
                    {collection.tags.length > 3 && (
                      <Tag size="small">+{collection.tags.length - 3} more</Tag>
                    )}
                  </Space>
                </div>
              )}
            </div>
          }
        />
      </Card>
    );
  };

  /**
   * Render featured collections carousel
   */
  const renderFeaturedCarousel = () => {
    if (featuredCollections.length === 0) return null;

    return (
      <Card 
        title={
          <Space>
            <StarOutlined style={{ color: '#faad14' }} />
            <span>Featured Collections</span>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Carousel 
          autoplay 
          dots={false} 
          slidesToShow={3} 
          slidesToScroll={1}
          responsive={[
            { breakpoint: 1024, settings: { slidesToShow: 2 } },
            { breakpoint: 768, settings: { slidesToShow: 1 } }
          ]}
        >
          {featuredCollections.map(collection => (
            <div key={collection.id} style={{ padding: '0 8px' }}>
              {renderCollectionCard(collection)}
            </div>
          ))}
        </Carousel>
      </Card>
    );
  };

  if (!embedded) {
    return (
      <div className="template-collections-page">
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <Title level={2}>Template Collections</Title>
          <Text type="secondary">
            Discover curated template collections, bundles, and trending designs
          </Text>
        </div>

        {/* Featured Collections */}
        {!embedded && renderFeaturedCarousel()}

        {/* Controls */}
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={8} md={6}>
              <Input
                placeholder="Search collections..."
                prefix={<SearchOutlined />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={24} sm={8} md={4}>
              <Select
                style={{ width: '100%' }}
                placeholder="Collection Type"
                value={filterType}
                onChange={setFilterType}
              >
                <Option value="all">All Types</Option>
                <Option value={COLLECTION_TYPES.BUNDLE}>Bundles</Option>
                <Option value={COLLECTION_TYPES.CURATED}>Curated</Option>
                <Option value={COLLECTION_TYPES.SEASONAL}>Seasonal</Option>
                <Option value={COLLECTION_TYPES.TRENDING}>Trending</Option>
                <Option value={COLLECTION_TYPES.CATEGORY}>Categories</Option>
              </Select>
            </Col>
            <Col xs={24} sm={8} md={4}>
              <Select
                style={{ width: '100%' }}
                placeholder="Sort By"
                value={sortBy}
                onChange={setSortBy}
              >
                <Option value="featured">Featured First</Option>
                <Option value="downloadCount">Most Downloaded</Option>
                <Option value="viewCount">Most Viewed</Option>
                <Option value="createdAt">Newest</Option>
                <Option value="name">Name</Option>
              </Select>
            </Col>
            <Col xs={24} sm={24} md={10}>
              <Space style={{ float: 'right' }}>
                <Button icon={<FilterOutlined />}>
                  More Filters
                </Button>
                <Text type="secondary">
                  {totalCollections} collections
                </Text>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Collection Tabs */}
        <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ marginBottom: 24 }}>
          <TabPane tab="All Collections" key="all" />
          <TabPane tab={<Badge count={featuredCollections.length}><span>Featured</span></Badge>} key="featured" />
          <TabPane tab="Bundles" key={COLLECTION_TYPES.BUNDLE} />
          <TabPane tab="Trending" key={COLLECTION_TYPES.TRENDING} />
          <TabPane tab="Seasonal" key={COLLECTION_TYPES.SEASONAL} />
          <TabPane tab="Curated" key={COLLECTION_TYPES.CURATED} />
        </Tabs>

        {/* Collections Grid */}
        {loading ? (
          <Row gutter={[16, 16]}>
            {Array.from({ length: 8 }).map((_, index) => (
              <Col xs={24} sm={12} md={8} lg={6} key={index}>
                <Card>
                  <Skeleton active />
                </Card>
              </Col>
            ))}
          </Row>
        ) : collections.length > 0 ? (
          <>
            <Row gutter={[16, 16]}>
              {collections.map(collection => (
                <Col xs={24} sm={12} md={8} lg={6} key={collection.id}>
                  {renderCollectionCard(collection)}
                </Col>
              ))}
            </Row>
            
            {/* Pagination */}
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={totalCollections}
                onChange={setCurrentPage}
                showSizeChanger={false}
                showQuickJumper
                showTotal={(total, range) => 
                  `${range[0]}-${range[1]} of ${total} collections`
                }
              />
            </div>
          </>
        ) : (
          <Empty 
            description="No collections found" 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}

        {/* Collection Preview Modal */}
        <Modal
          title={selectedCollection?.name}
          visible={previewVisible}
          onCancel={() => setPreviewVisible(false)}
          width={800}
          footer={[
            <Button key="close" onClick={() => setPreviewVisible(false)}>
              Close
            </Button>,
            <Button 
              key="details" 
              type="primary" 
              onClick={() => {
                setPreviewVisible(false);
                handleViewDetails(selectedCollection);
              }}
            >
              View Details
            </Button>
          ]}
        >
          {selectedCollection && (
            <div>
              <Paragraph>{selectedCollection.description}</Paragraph>
              
              <Divider>Collection Templates</Divider>
              
              <Row gutter={[8, 8]}>
                {(collectionTemplates[selectedCollection.id] || []).map(template => (
                  <Col span={6} key={template.id}>
                    <Card
                      size="small"
                      cover={
                        <div 
                          style={{ 
                            height: 80, 
                            backgroundImage: template.thumbnail ? `url(${template.thumbnail})` : 'none',
                            backgroundColor: '#f0f0f0',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }} 
                        />
                      }
                    >
                      <Card.Meta 
                        title={<Text ellipsis style={{ fontSize: '11px' }}>{template.name}</Text>}
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          )}
        </Modal>

        {/* Collection Details Drawer */}
        <Drawer
          title={selectedCollection?.name}
          visible={detailsVisible}
          onClose={() => setDetailsVisible(false)}
          width={500}
        >
          {selectedCollection && (
            <div>
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div>
                  <Title level={4}>{selectedCollection.name}</Title>
                  <Paragraph>{selectedCollection.description}</Paragraph>
                  
                  <Space wrap>
                    <Tag color={getCollectionTypeColor(selectedCollection.type)} icon={getCollectionTypeIcon(selectedCollection.type)}>
                      {selectedCollection.type.charAt(0).toUpperCase() + selectedCollection.type.slice(1)}
                    </Tag>
                    {selectedCollection.featured && (
                      <Tag color="gold" icon={<CrownOutlined />}>Featured</Tag>
                    )}
                  </Space>
                </div>

                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic title="Templates" value={selectedCollection.templateCount} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="Downloads" value={selectedCollection.downloadCount || 0} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="Views" value={selectedCollection.viewCount || 0} />
                  </Col>
                </Row>

                {selectedCollection.type === COLLECTION_TYPES.BUNDLE && selectedCollection.metadata && (
                  <Card title="Bundle Pricing" size="small">
                    <Row gutter={16}>
                      <Col span={12}>
                        <Statistic 
                          title="Bundle Price" 
                          value={selectedCollection.metadata.bundlePrice} 
                          precision={2}
                          prefix="$" 
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic 
                          title="You Save" 
                          value={selectedCollection.metadata.discount} 
                          suffix="%" 
                          valueStyle={{ color: '#3f8600' }}
                        />
                      </Col>
                    </Row>
                  </Card>
                )}

                {selectedCollection.tags?.length > 0 && (
                  <div>
                    <Title level={5}>Tags</Title>
                    <Space wrap>
                      {selectedCollection.tags.map(tag => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </Space>
                  </div>
                )}

                <div>
                  <Title level={5}>Templates in Collection</Title>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {(collectionTemplates[selectedCollection.id] || []).map(template => (
                      <Card key={template.id} size="small">
                        <Card.Meta
                          avatar={<Avatar src={template.thumbnail} icon={<EyeOutlined />} />}
                          title={template.name}
                          description={
                            <Space>
                              <Text type="secondary">{template.downloadCount || 0} downloads</Text>
                              <Rate disabled value={template.averageRating} style={{ fontSize: '12px' }} />
                            </Space>
                          }
                        />
                      </Card>
                    ))}
                  </Space>
                </div>
              </Space>
            </div>
          )}
        </Drawer>
      </div>
    );
  }

  // Embedded version for other components
  return (
    <div className="template-collections-embedded">
      {collections.length > 0 ? (
        <Row gutter={[16, 16]}>
          {collections.slice(0, 4).map(collection => (
            <Col xs={24} sm={12} lg={6} key={collection.id}>
              {renderCollectionCard(collection)}
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description="No collections available" />
      )}
    </div>
  );
};

export default TemplateCollections;