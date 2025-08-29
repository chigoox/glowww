import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, Space, Typography, Tooltip, message, Image, Statistic, Row, Col } from 'antd';
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
  LinkOutlined,
  MailOutlined,
  BarChartOutlined,
  UserOutlined,
  CalendarOutlined,
  HeartOutlined,
  FireOutlined,
  StarOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { getCachedOrGenerateThumbnail, getThumbnailPlaceholder, clearThumbnailCache } from '../../../lib/thumbnails';

const { Text, Paragraph } = Typography;

/**
 * Flip Site Card Component - Trading Card Style
 * 
 * Features:
 * - Front: Full thumbnail with site name and basic stats
 * - Back: All buttons, description, and detailed stats
 * - Click to flip between front and back
 * - Smaller, more compact design
 */
const FlipSiteCard = ({
  site,
  user,
  onEdit,
  onDelete,
  onPublish,
  onViewAnalytics,
  onSettings,
  onManageEmails,
  loading = false
}) => {
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const username = user?.username || user?.displayName || 'user';
  const siteName = site.subdomain || site.name;
  const origin = (typeof window !== 'undefined') ? window.location.origin : '';
  const basePath = `${origin}/u/${username}/${siteName}`;
  const homePath = `${basePath}/home`;
  const [publicUrl, setPublicUrl] = useState(basePath);
  const [previewUrl, setPreviewUrl] = useState(basePath);

  // Use real analytics data when available, fallback to mock for unpublished sites or loading states
  const statsData = analyticsData || {
    totalViews: site.isPublished ? (analyticsLoading ? '...' : 'No data') : Math.floor(Math.random() * 5000) + 100, // Mock data for unpublished sites
    uniqueVisitors: site.isPublished ? (analyticsLoading ? '...' : 'No data') : Math.floor(Math.random() * 2000) + 50,
    bounceRate: site.isPublished ? (analyticsLoading ? '...' : 'No data') : Math.floor(Math.random() * 40) + 30,
    avgSession: site.isPublished ? (analyticsLoading ? '...' : 'No data') : '1:23'
  };

  // RPG-style tier system based on views
  const getTierInfo = (views) => {
    if (views >= 50000) return { 
      tier: 'Legendary', 
      color: '#ff6b35', 
      glow: '#ff6b35', 
      icon: <FireOutlined />,
      gradient: 'linear-gradient(135deg, #ff6b35, #f7931e)'
    };
    if (views >= 1000000) return { 
      tier: 'Epic', 
      color: '#9c27b0', 
      glow: '#9c27b0', 
      icon: <StarOutlined />,
      gradient: 'linear-gradient(135deg, #9c27b0, #673ab7)'
    };
    if (views >= 100000) return { 
      tier: 'Rare', 
      color: '#2196f3', 
      glow: '#2196f3', 
      icon: <ThunderboltOutlined />,
      gradient: 'linear-gradient(135deg, #2196f3, #1976d2)'
    };
    if (views >= 10000) return { 
      tier: 'Uncommon', 
      color: '#4caf50', 
      glow: '#4caf50', 
      icon: <RocketOutlined />,
      gradient: 'linear-gradient(135deg, #4caf50, #388e3c)'
    };
    return { 
      tier: 'Common', 
      color: '#9e9e9e', 
      glow: '#9e9e9e', 
      icon: <GlobalOutlined />,
      gradient: 'linear-gradient(135deg, #9e9e9e, #616161)'
    };
  };

  const tierInfo = getTierInfo(statsData.totalViews);

  useEffect(() => {
    let mounted = true;
    async function ok(url) {
      try {
        const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
        return res.ok;
      } catch (e) {
        return false;
      }
    }
    async function resolve() {
      if (!origin) return;
      if (await ok(basePath)) {
        if (!mounted) return;
        setPublicUrl(basePath);
        setPreviewUrl(basePath);
        return;
      }
      if (await ok(homePath)) {
        if (!mounted) return;
        setPublicUrl(homePath);
        setPreviewUrl(homePath);
        return;
      }
      if (!mounted) return;
      setPublicUrl(homePath);
      setPreviewUrl(homePath);
    }
    resolve();
    return () => { mounted = false; };
  }, [origin, basePath, homePath]);

  useEffect(() => {
    loadThumbnail();
    loadAnalyticsData();
  }, [site.id, site.updatedAt, site.isPublished, publicUrl]);

  const loadAnalyticsData = async () => {
    if (!site.isPublished || !user?.username) {
      setAnalyticsData(null);
      return;
    }

    try {
      setAnalyticsLoading(true);
      const siteName = site.subdomain || site.name;
      
      // Add authentication headers for GA API access
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add user token if available for authenticated requests
      if (user?.accessToken) {
        headers['Authorization'] = `Bearer ${user.accessToken}`;
      }
      
      const response = await fetch(`/api/sites/${encodeURIComponent(user.username)}/${encodeURIComponent(siteName)}/analytics/summary`, {
        headers,
        cache: 'no-store' // Ensure fresh data
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setAnalyticsData({
            totalViews: data.totalViews || 0,
            uniqueVisitors: data.kpis?.totalUsers || 0,
            bounceRate: Math.round(data.kpis?.bounceRate || 0),
            avgSession: formatSessionDuration(data.kpis?.averageSessionDuration || 0)
          });
        } else {
          console.warn('Analytics API returned error:', data.error);
          setAnalyticsData(null);
        }
      } else {
        console.warn('Analytics API request failed:', response.status, response.statusText);
        setAnalyticsData(null);
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
      setAnalyticsData(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const formatSessionDuration = (seconds) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const loadThumbnail = async () => {
    if (!site.isPublished) {
      setThumbnail(getThumbnailPlaceholder(site));
      return;
    }

    try {
      setThumbnailLoading(true);
      setThumbnailError(false);
      
      const pageKey = publicUrl && publicUrl.endsWith('/home') ? 'home' : undefined;
      const thumbnailData = await getCachedOrGenerateThumbnail(site, username, { pageKey });
      
      if (thumbnailData) {
        setThumbnail(thumbnailData);
      } else {
        throw new Error('Failed to generate thumbnail');
      }
    } catch (error) {
      console.error('Error loading thumbnail:', error);
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

  const handleCardClick = (e) => {
    // Don't flip if clicking on buttons or interactive elements
    if (e.target.closest('button') || e.target.closest('.ant-btn') || e.target.closest('[role="button"]')) {
      return;
    }
    setIsFlipped(!isFlipped);
  };

  return (
    <div 
      className="site-flip-card"
      style={{
        perspective: '1000px',
        width: '225px',
        height: '315px',
        margin: '8px'
      }}
      data-theme-immune="true"
    >
      {/* RPG Tier Ring */}
      <div
        style={{
          position: 'absolute',
          inset: '-1px',
          borderRadius: '17px',
          padding: '1px',
          background: tierInfo.gradient,
          boxShadow: `0 0 6px ${tierInfo.glow}20, 0 0 12px ${tierInfo.glow}10`,
          animation: `glow-${tierInfo.tier.toLowerCase()} 2s ease-in-out infinite alternate`,
          zIndex: -1
        }}
      >
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: '16px',
          background: '#1a1a1a'
        }} />
      </div>

      <div
        className={`site-flip-card-inner ${isFlipped ? 'flipped' : ''}`}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          textAlign: 'center',
          transition: 'transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          cursor: 'pointer'
        }}
        onClick={handleCardClick}
      >
        {/* Front of card */}
        <div
          className="site-flip-card-front"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            borderRadius: 16,
            overflow: 'hidden',
            background: '#0a0a0a',
            border: `1px solid ${tierInfo.color}`,
            boxShadow: `0 8px 32px ${tierInfo.glow}20, inset 0 1px 0 rgba(255,255,255,0.1)`
          }}
        >
          {/* Full-screen thumbnail */}
          <div style={{ 
            position: 'absolute',
            inset: 0,
            background: thumbnailLoading ? 
              'linear-gradient(45deg, #1a1a1a, #2a2a2a)' : 
              'transparent'
          }}>
            {thumbnailLoading ? (
              <div style={{ 
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: `3px solid ${tierInfo.color}30`,
                  borderTop: `3px solid ${tierInfo.color}`,
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 12px'
                }}></div>
                <Text style={{ color: tierInfo.color, fontSize: '12px' }}>
                  Generating...
                </Text>
              </div>
            ) : thumbnail ? (
              <div style={{
                width: '100%',
                height: '100%',
                backgroundImage: `url(${thumbnail})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'brightness(0.9) contrast(1.1)'
              }} />
            ) : (
              <div style={{ 
                width: '100%', 
                height: '100%', 
                background: tierInfo.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column'
              }}>
                {tierInfo.icon && React.cloneElement(tierInfo.icon, {
                  style: { fontSize: 64, color: 'rgba(255,255,255,0.9)', marginBottom: 16 }
                })}
                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: 600 }}>
                  {site.name}
                </Text>
              </div>
            )}

            {/* Tier badge - top left */}
            <div style={{
              position: 'absolute',
              top: 12,
              left: 12,
              background: `linear-gradient(135deg, ${tierInfo.color}, ${tierInfo.color}cc)`,
              color: 'white',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: `0 2px 8px ${tierInfo.glow}50`,
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              {tierInfo.icon && React.cloneElement(tierInfo.icon, { style: { fontSize: 10 } })}
              {tierInfo.tier}
            </div>

            {/* Status badge - top right */}
            <div style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: site.isPublished ? 
                'linear-gradient(135deg, #52c41a, #389e0d)' : 
                'linear-gradient(135deg, #fa8c16, #d48806)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '10px',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(10px)'
            }}>
              {site.isPublished ? 'LIVE' : 'DRAFT'}
            </div>

            {/* Floating stats - bottom overlay */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
              backdropFilter: 'blur(20px)',
              padding: '20px 16px 16px',
              color: 'white'
            }}>
              {/* Site name */}
              <div style={{ marginBottom: 12, textAlign: 'center' }}>
                <Text style={{ 
                  color: 'white', 
                  fontSize: '18px', 
                  fontWeight: 700,
                  display: 'block',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}>
                  {site.name}
                </Text>
                <Text style={{ 
                  color: 'rgba(255,255,255,0.8)', 
                  fontSize: '11px',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                }}>
                  {siteName}.glow.as
                </Text>
              </div>

              {/* Floating stats */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8,
                  background: 'rgba(255,255,255,0.1)',
                  padding: '6px 10px',
                  borderRadius: '12px',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  <EyeOutlined style={{ color: '#52c41a', fontSize: 14 }} />
                  <span style={{ 
                    color: 'white', 
                    fontSize: '13px', 
                    fontWeight: 600 
                  }}>
                    {statsData.totalViews.toLocaleString()}
                  </span>
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8,
                  background: 'rgba(255,255,255,0.1)',
                  padding: '6px 10px',
                  borderRadius: '12px',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  <UserOutlined style={{ color: '#1890ff', fontSize: 14 }} />
                  <span style={{ 
                    color: 'white', 
                    fontSize: '13px', 
                    fontWeight: 600 
                  }}>
                    {statsData.uniqueVisitors.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Click hint */}
              <div style={{ 
                marginTop: 10, 
                fontSize: '9px', 
                color: 'rgba(255,255,255,0.6)',
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                ← Click to flip →
              </div>
            </div>
          </div>
        </div>

        {/* Back of card */}
        <div
          className="site-flip-card-back"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: 16,
            overflow: 'hidden',
            background: '#0a0a0a',
            border: `1px solid ${tierInfo.color}`,
            boxShadow: `0 8px 32px ${tierInfo.glow}15, inset 0 1px 0 rgba(255,255,255,0.1)`,
            color: 'white',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Fixed Header - Always Visible */}
          <div style={{
            position: 'relative',
            padding: '16px 16px 12px 16px',
            textAlign: 'center',
            background: 'rgba(0,0,0,0.3)',
            borderBottom: `1px solid ${tierInfo.color}30`,
            backdropFilter: 'blur(10px)',
            flex: '0 0 auto'
          }}>
            {/* Tier badge */}
            <div style={{
              position: 'absolute',
              top: -4,
              left: '50%',
              transform: 'translateX(-50%)',
              background: tierInfo.gradient,
              color: 'white',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '9px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: `0 2px 6px ${tierInfo.glow}30`,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              zIndex: 10
            }}>
              {tierInfo.icon && React.cloneElement(tierInfo.icon, { style: { fontSize: 9 } })}
              {tierInfo.tier}
            </div>

            <div style={{ marginTop: 8 }}>
              <Text style={{ 
                fontSize: '18px', 
                fontWeight: 700, 
                display: 'block',
                color: 'rgba(255,255,255,0.95)',
                marginBottom: 2,
                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
              }}>
                {site.name}
              </Text>
              <Text style={{ 
                fontSize: '10px',
                color: 'rgba(255,255,255,0.8)',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}>
                {siteName}.glow.as
              </Text>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div 
            className="scrollable-card-back"
            style={{ 
              flex: '1 1 auto',
              display: 'flex', 
              flexDirection: 'column',
              padding: '12px 16px 16px 16px',
              overflowY: 'auto',
              overflowX: 'hidden'
            }}
          >

            {/* Description */}
            <div style={{ marginBottom: 12, flex: '0 0 auto' }}>
              <Paragraph 
                ellipsis={{ rows: 2 }} 
                style={{ 
                  fontSize: '11px', 
                  marginBottom: 12, 
                  color: 'rgba(255,255,255,0.95)',
                  lineHeight: 1.4
                }}
              >
                {site.description || 'No description provided for this site.'}
              </Paragraph>

              {/* Detailed stats grid */}
              <div style={{ 
                background: 'rgba(255,255,255,0.05)', 
                padding: '10px', 
                borderRadius: '10px',
                marginBottom: 10,
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <Row gutter={[8, 8]}>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        color: tierInfo.color, 
                        fontSize: '16px', 
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 3
                      }}>
                        <EyeOutlined />
                        {statsData.totalViews.toLocaleString()}
                      </div>
                      <div style={{ 
                        fontSize: '8px', 
                        color: 'white',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginTop: 1
                      }}>
                        Total Views
                      </div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        color: '#1890ff', 
                        fontSize: '16px', 
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 3
                      }}>
                        <UserOutlined />
                        {statsData.uniqueVisitors.toLocaleString()}
                      </div>
                      <div style={{ 
                        fontSize: '8px', 
                        color: 'rgba(255,255,255,0.9)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginTop: 1
                      }}>
                        Visitors
                      </div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        color: '#52c41a', 
                        fontSize: '16px', 
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 3
                      }}>
                        <HeartOutlined />
                        {statsData.bounceRate}%
                      </div>
                      <div style={{ 
                        fontSize: '8px', 
                        color: 'rgba(255,255,255,0.9)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginTop: 1
                      }}>
                        Bounce Rate
                      </div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        color: '#fa8c16', 
                        fontSize: '16px', 
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 3
                      }}>
                        <CalendarOutlined />
                        {statsData.avgSession}
                      </div>
                      <div style={{ 
                        fontSize: '8px', 
                        color: 'rgba(255,255,255,0.9)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginTop: 1
                      }}>
                        Avg Session
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ flex: '0 0 auto', paddingBottom: '8px' }}>
              <Row gutter={[8, 8]} style={{ marginBottom: 8 }}>
                <Col span={12}>
                  <Tooltip title="Edit Site">
                    <Button 
                      type="primary" 
                      size="small" 
                      block
                      icon={<EditOutlined />}
                      style={{
                        background: '#404040',
                        border: '1px solid #525252',
                        borderRadius: '8px',
                        height: '32px',
                        fontWeight: 600,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        transition: 'all 0.2s ease'
                      }}
                      className="flip-card-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onEdit) onEdit(site);
                      }}
                    />
                  </Tooltip>
                </Col>
                <Col span={12}>
                  <Tooltip title={site.isPublished ? "View Site" : "Publish Site"}>
                    <Button 
                      size="small" 
                      block
                      icon={site.isPublished ? <EyeOutlined /> : <RocketOutlined />}
                      style={{
                        background: '#383838',
                        border: '1px solid #525252',
                        borderRadius: '8px',
                        height: '32px',
                        fontWeight: 600,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        transition: 'all 0.2s ease'
                      }}
                      className="flip-card-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (site.isPublished) {
                          openInNewTab(publicUrl);
                        } else {
                          handlePublishToggle();
                        }
                      }}
                    />
                  </Tooltip>
                </Col>
                <Col span={8}>
                  <Tooltip title="Settings">
                    <Button 
                      size="small" 
                      block
                      icon={<SettingOutlined />}
                      style={{
                        background: '#383838',
                        border: '1px solid #525252',
                        borderRadius: '8px',
                        height: '28px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        transition: 'all 0.2s ease'
                      }}
                      className="flip-card-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSettings) onSettings(site);
                      }}
                    />
                  </Tooltip>
                </Col>
                <Col span={8}>
                  <Tooltip title="Analytics">
                    <Button 
                      size="small" 
                      block
                      icon={<BarChartOutlined />}
                      style={{
                        background: '#383838',
                        border: '1px solid #525252',
                        borderRadius: '8px',
                        height: '28px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        transition: 'all 0.2s ease'
                      }}
                      className="flip-card-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onViewAnalytics) onViewAnalytics(site);
                      }}
                    />
                  </Tooltip>
                </Col>
                <Col span={8}>
                  <Tooltip title="Manage Emails">
                    <Button 
                      size="small" 
                      block
                      icon={<MailOutlined />}
                      style={{
                        background: '#383838',
                        border: '1px solid #525252',
                        borderRadius: '8px',
                        height: '28px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        transition: 'all 0.2s ease'
                      }}
                      className="flip-card-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onManageEmails) onManageEmails(site);
                      }}
                    />
                  </Tooltip>
                </Col>
              </Row>

              {/* Copy URL button */}
              <Tooltip title="Copy Site URL">
                <Button 
                  size="small" 
                  block
                  icon={<CopyOutlined />}
                  style={{
                    background: '#383838',
                    border: '1px solid #525252',
                    borderRadius: '8px',
                    height: '28px',
                    marginBottom: 8,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    transition: 'all 0.2s ease'
                  }}
                  className="flip-card-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyUrl(publicUrl, 'Site URL');
                  }}
                />
              </Tooltip>

              {/* Delete button */}
              <Tooltip title="Delete Site">
                <Button 
                  danger 
                  size="small" 
                  block
                  icon={<DeleteOutlined />}
                  style={{
                    background: '#d73527',
                    border: '1px solid #e74c3c',
                    borderRadius: '8px',
                    height: '28px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    transition: 'all 0.2s ease'
                  }}
                  className="flip-card-button flip-card-button-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDelete) onDelete(site);
                  }}
                />
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlipSiteCard;
