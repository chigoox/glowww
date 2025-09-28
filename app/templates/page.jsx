'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Layout,
  Typography,
  Button,
  Space,
  Card,
  Row,
  Col,
  Tag,
  Statistic,
  Divider,
  ConfigProvider,
  theme
} from 'antd';
import {
  AppstoreOutlined,
  RocketOutlined,
  StarOutlined,
  CrownOutlined,
  TrophyOutlined,
  UserOutlined
} from '@ant-design/icons';
import dynamic from 'next/dynamic';

const SmartTemplateRecommendations = dynamic(() => import('../Components/SmartTemplateRecommendations'), { ssr: false });
const TemplateCollections = dynamic(() => import('../Components/TemplateCollections'), { ssr: false });

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;

export default function TemplatePage() {
  const { user } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const { token } = theme.useToken();

  // Sync with global theme classes
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains('dark-theme'));
    update();
    const obs = new MutationObserver(update);
    obs.observe(root, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
    return () => obs.disconnect();
  }, []);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorText: 'var(--text-primary)',
          colorTextSecondary: 'var(--text-secondary)',
          colorBgLayout: 'var(--bg-primary)',
          colorBgContainer: 'var(--panel-bg)',
          colorBorder: 'var(--border-color)',
          borderRadius: 12
        }
      }}
    >
      <Layout style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        {/* Header */}
        <Header style={{ 
          background: 'white', 
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AppstoreOutlined style={{ color: 'white', fontSize: 20 }} />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, color: token.colorText }}>
                Template Marketplace
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Discover amazing website templates
              </Text>
            </div>
          </div>
          
          <Space>
            {user ? (
              <Button 
                type="primary"
                icon={<UserOutlined />}
                onClick={() => window.location.href = '/dashboard?tab=templates'}
              >
                My Templates
              </Button>
            ) : (
              <Space>
                <Button onClick={() => window.location.href = '/login'}>
                  Sign In
                </Button>
                <Button type="primary" onClick={() => window.location.href = '/login'}>
                  Get Started
                </Button>
              </Space>
            )}
          </Space>
        </Header>

        <Content style={{ padding: '0' }}>
          {/* Hero Section */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '80px 24px',
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <Title level={1} style={{ color: 'white', fontSize: '3rem', marginBottom: 16 }}>
                Premium Website Templates
              </Title>
              <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.2rem', marginBottom: 32 }}>
                Discover professionally designed templates powered by AI recommendations. 
                Create stunning websites in minutes with our curated collection.
              </Paragraph>
              
              <Row gutter={32} justify="center" style={{ marginTop: 40 }}>
                <Col>
                  <Statistic
                    title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Templates</span>}
                    value={1200}
                    suffix="+"
                    valueStyle={{ color: 'white', fontSize: '2rem' }}
                    prefix={<AppstoreOutlined />}
                  />
                </Col>
                <Col>
                  <Statistic
                    title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Downloads</span>}
                    value={50000}
                    suffix="+"
                    valueStyle={{ color: 'white', fontSize: '2rem' }}
                    prefix={<RocketOutlined />}
                  />
                </Col>
                <Col>
                  <Statistic
                    title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Rating</span>}
                    value={4.9}
                    precision={1}
                    valueStyle={{ color: 'white', fontSize: '2rem' }}
                    prefix={<StarOutlined />}
                  />
                </Col>
              </Row>
            </div>
          </div>

          {/* Features Section */}
          <div style={{ padding: '80px 24px', background: 'white' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 60 }}>
                <Title level={2}>Why Choose Our Templates?</Title>
                <Text type="secondary" style={{ fontSize: 16 }}>
                  Professional quality, AI-powered recommendations, and seamless integration
                </Text>
              </div>
              
              <Row gutter={[32, 32]}>
                <Col xs={24} md={8}>
                  <Card 
                    style={{ 
                      textAlign: 'center', 
                      border: 'none',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                      borderRadius: 16
                    }}
                  >
                    <div style={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px'
                    }}>
                      <RocketOutlined style={{ color: 'white', fontSize: 24 }} />
                    </div>
                    <Title level={4}>AI-Powered Discovery</Title>
                    <Text type="secondary">
                      Our smart recommendation engine learns your preferences and suggests 
                      the perfect templates for your projects.
                    </Text>
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card 
                    style={{ 
                      textAlign: 'center', 
                      border: 'none',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                      borderRadius: 16
                    }}
                  >
                    <div style={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px'
                    }}>
                      <TrophyOutlined style={{ color: 'white', fontSize: 24 }} />
                    </div>
                    <Title level={4}>Premium Quality</Title>
                    <Text type="secondary">
                      Every template is carefully curated and reviewed to ensure 
                      professional quality and modern design standards.
                    </Text>
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card 
                    style={{ 
                      textAlign: 'center', 
                      border: 'none',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                      borderRadius: 16
                    }}
                  >
                    <div style={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #faad14 0%, #d48806 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px'
                    }}>
                      <CrownOutlined style={{ color: 'white', fontSize: 24 }} />
                    </div>
                    <Title level={4}>Pro Features</Title>
                    <Text type="secondary">
                      Access exclusive pro templates, bundle deals, and advanced 
                      customization options with your subscription.
                    </Text>
                  </Card>
                </Col>
              </Row>
            </div>
          </div>

          {/* Smart Recommendations Section */}
          {user && (
            <div style={{ padding: '60px 24px', background: '#fafafa' }}>
              <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                  <Title level={2}>Recommended for You</Title>
                  <Text type="secondary" style={{ fontSize: 16 }}>
                    Personalized template recommendations based on your preferences
                  </Text>
                </div>
                <SmartTemplateRecommendations 
                  embedded={true}
                  showSearch={false}
                  showFilters={false}
                  maxRecommendations={8}
                />
              </div>
            </div>
          )}

          {/* Template Collections Section */}
          <div style={{ padding: '60px 24px' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <Title level={2}>Featured Collections</Title>
                <Text type="secondary" style={{ fontSize: 16 }}>
                  Curated template collections for every need
                </Text>
              </div>
              <TemplateCollections 
                embedded={true}
                showSearch={false}
                showFilters={false}
                featuredOnly={true}
              />
            </div>
          </div>

          {/* CTA Section */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '80px 24px',
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
              <Title level={2} style={{ color: 'white', marginBottom: 16 }}>
                Ready to Get Started?
              </Title>
              <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.1rem', marginBottom: 32 }}>
                Join thousands of creators who have built amazing websites with our templates.
                Start your journey today with our free plan or unlock premium features.
              </Paragraph>
              
              <Space size={16}>
                <Button 
                  size="large"
                  style={{ 
                    background: 'rgba(255,255,255,0.2)',
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: 'white'
                  }}
                  onClick={() => window.location.href = user ? '/dashboard?tab=templates' : '/login'}
                >
                  Browse Templates
                </Button>
                <Button 
                  type="primary"
                  size="large"
                  style={{
                    background: 'white',
                    borderColor: 'white',
                    color: '#667eea'
                  }}
                  onClick={() => window.location.href = user ? '/dashboard' : '/login'}
                >
                  {user ? 'Go to Dashboard' : 'Sign Up Free'}
                </Button>
              </Space>
            </div>
          </div>
        </Content>

        <Footer style={{ 
          textAlign: 'center', 
          background: '#001529', 
          color: 'rgba(255,255,255,0.65)' 
        }}>
          <Text style={{ color: 'rgba(255,255,255,0.65)' }}>
            Template Marketplace ©2024 Created with ❤️ by Glowww
          </Text>
        </Footer>
      </Layout>
    </ConfigProvider>
  );
}