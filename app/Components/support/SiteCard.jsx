import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, Space, Typography, Tooltip, message, Image } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  GlobalOutlined,
  SettingOutlined,
  ShareAltOutlined,
  CopyOutlined,
  RocketOutlined,
  PlayCircleOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { getCachedOrGenerateThumbnail, getThumbnailPlaceholder, clearThumbnailCache } from '../../../lib/thumbnails';

const { Text, Paragraph } = Typography;

/**
 * Enhanced Site Card Component with Thumbnails
 * 
 * Features:
 * - Website thumbnail generation and caching
 * - Prominent public URL display
 * - Site settings access
 * - Quick actions (edit, preview, publish, etc.)
 */
const SiteCard = ({
  site,
  user,
  onEdit,
  onDelete,
  onPublish,
  onViewAnalytics,
  onSettings,
  loading = false
}) => {
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);

  const username = user?.username || user?.displayName || 'user';
  const siteName = site.subdomain || site.name;
  const publicUrl = `${window.location.origin}/u/${username}/${siteName}`;
  const previewUrl = `${window.location.origin}/Preview`;

  // Load thumbnail when component mounts or site changes
  useEffect(() => {
    loadThumbnail();
  }, [site.id, site.updatedAt, site.isPublished]);

  const loadThumbnail = async () => {
    if (!site.isPublished) {
      // Use placeholder for unpublished sites
      setThumbnail(getThumbnailPlaceholder(site));
      return;
    }

    try {
      setThumbnailLoading(true);
      setThumbnailError(false);
      
      // Try to get cached or generate thumbnail
      const thumbnailData = await getCachedOrGenerateThumbnail(site, username);
      
      if (thumbnailData) {
        setThumbnail(thumbnailData);
      } else {
        // If no thumbnail data, use placeholder
        setThumbnail(getThumbnailPlaceholder(site));
      }
    } catch (error) {
      console.warn('Thumbnail generation failed, using placeholder:', error.message);
      setThumbnailError(true);
      setThumbnail(getThumbnailPlaceholder(site));
    } finally {
      setThumbnailLoading(false);
    }
  };

  const refreshThumbnail = async () => {
    if (!site.isPublished) {
      message.warning('Please publish the site first to generate a thumbnail');
      return;
    }

    try {
      // Clear cached thumbnail
      clearThumbnailCache(site.id);
      setThumbnail(null);
      await loadThumbnail();
      message.success('Thumbnail refreshed successfully!');
    } catch (error) {
      message.error('Failed to refresh thumbnail');
    }
  };

  const copyUrl = (url, label) => {
    navigator.clipboard.writeText(url);
    message.success(`${label} copied to clipboard!`);
  };

  const openInNewTab = (url) => {
    window.open(url, '_blank');
  };

  const handlePublishToggle = () => {
    if (onPublish) {
      onPublish(site);
    }
  };

  return (
    <Card
      hoverable
      loading={loading}
      cover={
        <div style={{ 
          position: 'relative',
          height: 200, 
          background: thumbnailLoading ? '#f5f5f5' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          {thumbnailLoading ? (
            <div style={{ textAlign: 'center' }}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Generating thumbnail...
              </Text>
            </div>
          ) : thumbnail ? (
            <Image
              src={thumbnail}
              alt={`${site.name} thumbnail`}
              style={{ 
                width: '100%', 
                height: 200, 
                objectFit: 'cover' 
              }}
              preview={false}
              fallback={getThumbnailPlaceholder(site)}
            />
          ) : (
            <div style={{ 
              width: '100%', 
              height: 200, 
              background: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column'
            }}>
              <GlobalOutlined style={{ fontSize: 40, color: '#d9d9d9', marginBottom: 8 }} />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                No thumbnail available
              </Text>
            </div>
          )}
          
          {/* Overlay actions */}
          <div style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 4
          }}>
            <Tag color={site.isPublished ? 'green' : 'orange'} style={{ margin: 0 }}>
              {site.isPublished ? 'Live' : 'Draft'}
            </Tag>
          </div>

          {/* Thumbnail refresh button */}
          {site.isPublished && (
            <div style={{
              position: 'absolute',
              bottom: 8,
              right: 8
            }}>
              <Tooltip title="Refresh thumbnail">
                <Button 
                  size="small" 
                  type="primary" 
                  ghost
                  icon={<ShareAltOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    refreshThumbnail();
                  }}
                  style={{ opacity: 0.8 }}
                />
              </Tooltip>
            </div>
          )}
        </div>
      }
      actions={[
        <Tooltip title="Edit Site" key="edit">
          <EditOutlined onClick={() => onEdit && onEdit(site)} />
        </Tooltip>,
        <Tooltip title="Site Settings" key="settings">
          <SettingOutlined onClick={() => onSettings && onSettings(site)} />
        </Tooltip>,
        <Tooltip title={site.isPublished ? "View Live Site" : "Publish Site"} key="view">
          <EyeOutlined 
            onClick={() => site.isPublished 
              ? openInNewTab(publicUrl)
              : handlePublishToggle()
            }
          />
        </Tooltip>,
        <Tooltip title="View Analytics" key="analytics">
          <RocketOutlined 
            onClick={() => onViewAnalytics && onViewAnalytics(site)}
            style={{ color: '#52c41a' }}
          />
        </Tooltip>,
        <Tooltip title="Delete Site" key="delete">
          <DeleteOutlined 
            onClick={() => onDelete && onDelete(site)}
            style={{ color: '#ff4d4f' }}
          />
        </Tooltip>
      ]}
    >
      {/* Site Title and Description */}
      <Card.Meta
        title={
          <Space direction="vertical" size={0} style={{ width: '100%' }}>
            <Text ellipsis style={{ maxWidth: '100%', fontSize: '16px', fontWeight: 600 }}>
              {site.name}
            </Text>
          </Space>
        }
        description={
          <div>
            {/* Description */}
            <Paragraph 
              ellipsis={{ rows: 2 }} 
              style={{ marginBottom: 12, minHeight: 40 }}
            >
              {site.description || 'No description provided'}
            </Paragraph>

            {/* Public URL Section */}
            <div style={{ 
              background: '#f8f9fa', 
              padding: '8px 12px', 
              borderRadius: '6px',
              marginBottom: 8,
              border: '1px solid #e9ecef'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <GlobalOutlined style={{ color: '#52c41a', fontSize: '12px' }} />
                <Text strong style={{ fontSize: '12px', color: '#495057' }}>
                  Public URL
                </Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Text 
                  code 
                  style={{ 
                    fontSize: '11px', 
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {publicUrl}
                </Text>
                <Tooltip title="Copy URL">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<CopyOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      copyUrl(publicUrl, 'Public URL');
                    }}
                    style={{ padding: '2px', minWidth: 'auto' }}
                  />
                </Tooltip>
                <Tooltip title="Open in new tab">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<LinkOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      openInNewTab(publicUrl);
                    }}
                    style={{ padding: '2px', minWidth: 'auto' }}
                  />
                </Tooltip>
              </div>
            </div>

            {/* Quick Actions */}
            <Space size="small" style={{ width: '100%', justifyContent: 'space-between' }}>
              <div>
                <Button 
                  type="link" 
                  size="small" 
                  icon={<PlayCircleOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    openInNewTab(previewUrl);
                  }}
                  style={{ padding: 0, height: 'auto' }}
                >
                  Preview
                </Button>
              </div>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                Updated {new Date(site.updatedAt.toDate()).toLocaleDateString()}
              </Text>
            </Space>
          </div>
        }
      />
    </Card>
  );
};

export default SiteCard;
