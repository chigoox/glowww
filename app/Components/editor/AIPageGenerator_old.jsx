/**
 * AI Page Generator - Pro Users Only
 * Uses high-quality community templates as base structures for AI-generated pages
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal, Form, Input, Select, Button, Steps, Card, Typography, 
  Space, Alert, Spin, Badge, Tag, Tooltip, Row, Col, Rate
} from 'antd';
import {
  RobotOutlined, StarOutlined, CrownOutlined, LockOutlined,
  CheckCircleOutlined, LoadingOutlined, BulbOutlined
} from '@ant-design/icons';
import { useAuth } from '../../../contexts/AuthContext';
import { applyAIContentToTemplate } from '../../../lib/aiContentApplicator';

const { TextArea } = Input;
const { Text, Title, Paragraph } = Typography;
const { Option } = Select;
const { Step } = Steps;

const AIPageGenerator = ({ visible, onCancel, onGenerate }) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [qualityTemplates, setQualityTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  
  const { user } = useAuth();

  // Debug logging
  useEffect(() => {
    if (visible) {
      console.log('🔍 AIPageGenerator Debug:', {
        'user?.subscriptionTier': user?.subscriptionTier,
        'user?.isAdmin': user?.isAdmin,
        'hasAIAccess calculation': user?.subscriptionTier && user.subscriptionTier.toLowerCase() !== 'free',
        'full user object': user
      });
    }
  }, [visible, user]);

  // Check if user has AI access (all users except free tier)
  const hasAIAccess = user?.subscriptionTier && user.subscriptionTier.toLowerCase() !== 'free';

  useEffect(() => {
    if (visible && hasAIAccess) {
      loadQualityTemplates();
    }
  }, [visible, hasAIAccess]);

  const loadQualityTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const response = await fetch('/api/templates?action=quality');
      const data = await response.json();
      
      if (data.success) {
        setQualityTemplates(data.templates);
      } else {
        console.error('Failed to load quality templates:', data.error);
      }
    } catch (error) {
      console.error('Error loading quality templates:', error);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setCurrentStep(1);
  };

  const handleAIGenerate = async (values) => {
    if (!selectedTemplate) return;

    setGenerating(true);
    setCurrentStep(2);
    
    try {
      setGenerationProgress('Analyzing template structure...');
      
      // Step 1: Analyze template
      const templateAnalysis = await analyzeTemplate(selectedTemplate);
      
      setGenerationProgress('Generating AI content...');
      
      // Step 2: Generate content with OpenAI
      const aiContent = await generateAIContent({
        prompt: values.prompt,
        businessType: values.businessType,
        tone: values.tone,
        templateAnalysis,
        template: selectedTemplate
      });
      
      setGenerationProgress('Applying content to template...');
      
      // Step 3: Apply AI content to template
      const generatedPage = await applyContentToTemplate(selectedTemplate.jsonData, aiContent);
      
      setGenerationProgress('Finalizing page...');
      
      // Step 4: Track usage and return result
      await trackTemplateUsage(selectedTemplate.id, 'ai_generation');
      
      setCurrentStep(3);
      
      // Pass generated page to parent
      setTimeout(() => {
        onGenerate(generatedPage);
        handleClose();
      }, 1000);
      
    } catch (error) {
      console.error('AI Generation Error:', error);
      setGenerationProgress('Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const analyzeTemplate = async (template) => {
    // Analyze template structure for AI processing
    const analysis = {
      componentCount: template.aiMetadata?.componentTypes?.length || 0,
      layoutStyle: template.aiMetadata?.layoutStyle || 'basic',
      hasHero: template.aiMetadata?.componentTypes?.includes('Text') || false,
      hasImages: template.aiMetadata?.componentTypes?.includes('Image') || false,
      hasButtons: template.aiMetadata?.componentTypes?.includes('CraftButton') || false,
      hasGrid: template.aiMetadata?.layoutStyle === 'grid',
      complexity: template.aiMetadata?.componentTypes?.length > 5 ? 'high' : 'medium'
    };
    
    return analysis;
  };

  const generateAIContent = async ({ prompt, businessType, tone, templateAnalysis, template }) => {
    const response = await fetch('/api/ai/generate-content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        businessType,
        tone,
        templateAnalysis,
        templateName: template.name,
        templateCategory: template.category
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle subscription-related errors
      if (response.status === 403 && errorData.code === 'UPGRADE_REQUIRED') {
        throw new Error('AI generation requires an upgrade from Free tier. Please upgrade to Pro, Business, or Admin.');
      }
      
      throw new Error(errorData.error || 'Failed to generate AI content');
    }

    const data = await response.json();
    return data.content || data;
  };

  const applyContentToTemplate = async (templateData, aiContent) => {
    try {
      return applyAIContentToTemplate(templateData, aiContent);
    } catch (error) {
      console.error('Error applying content to template:', error);
      // Return original template if application fails
      return typeof templateData === 'string' ? templateData : JSON.stringify(templateData);
    }
  };

  const trackTemplateUsage = async (templateId, actionType) => {
    try {
      await fetch('/api/templates?action=track-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, actionType })
      });
    } catch (error) {
      console.error('Error tracking usage:', error);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    setSelectedTemplate(null);
    setGenerating(false);
    setGenerationProgress('');
    form.resetFields();
    onCancel();
  };

  // Template Selection Card
  const TemplateCard = ({ template, onSelect }) => (
    <Card
      hoverable
      onClick={() => onSelect(template)}
      cover={
        template.thumbnail ? (
          <div style={{ height: 120, overflow: 'hidden' }}>
            <img
              alt={template.name}
              src={template.thumbnail}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        ) : (
          <div style={{
            height: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f5f5f5'
          }}>
            <RobotOutlined style={{ fontSize: 32, color: '#999' }} />
          </div>
        )
      }
      actions={[
        <Tooltip key="rating" title="Community Rating">
          <Space>
            <Rate disabled allowHalf value={template.averageRating} style={{ fontSize: 12 }} />
            <Text type="secondary">({template.totalRatings})</Text>
          </Space>
        </Tooltip>,
        <Badge key="quality" count="AI Ready" style={{ backgroundColor: '#52c41a' }} />
      ]}
    >
      <Card.Meta
        title={<Text strong ellipsis>{template.name}</Text>}
        description={
          <div>
            <Text ellipsis style={{ display: 'block', marginBottom: 4 }}>
              {template.description}
            </Text>
            <Tag color="blue" size="small">{template.category}</Tag>
          </div>
        }
      />
    </Card>
  );

  if (!hasAIAccess) {
    return (
      <Modal
        title={
          <Space>
            <LockOutlined />
            AI Page Generation - Premium Feature
          </Space>
        }
        open={visible}
        onCancel={onCancel}
        footer={null}
        centered
        width={500}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <CrownOutlined style={{ fontSize: 64, color: '#faad14', marginBottom: 16 }} />
          <Title level={3}>Upgrade Required</Title>
          <Paragraph>
            AI Page Generation is available for Pro, Business, and Admin users. 
            Upgrade from the Free tier to unlock this powerful feature and create professional pages instantly.
          </Paragraph>
          
          <Space direction="vertical" size="large" style={{ width: '100%', marginTop: 24 }}>
            <Alert
              message="Premium Features Include:"
              description={
                <ul style={{ textAlign: 'left', paddingLeft: 20 }}>
                  <li>AI-powered page generation</li>
                  <li>Access to premium templates</li>
                  <li>Advanced customization options</li>
                  <li>Priority support</li>
                </ul>
              }
              type="info"
              showIcon
            />
            
            <Button type="primary" size="large" style={{ width: '100%' }}>
              Upgrade Now
            </Button>
          </Space>
        </div>
      </Modal>
    );
  }

  const steps = [
    {
      title: 'Choose Template',
      description: 'Select a high-quality template',
    },
    {
      title: 'Describe Your Page',
      description: 'Tell us what you want to create',
    },
    {
      title: 'AI Generation',
      description: 'AI creates your page',
    },
    {
      title: 'Complete',
      description: 'Your page is ready',
    }
  ];

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined />
          AI Page Generation
          <Badge count="Premium" style={{ backgroundColor: '#faad14' }} />
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={900}
      centered
    >
      <Steps current={currentStep} items={steps} style={{ marginBottom: 24 }} />

      {/* Step 0: Template Selection */}
      {currentStep === 0 && (
        <div>
          <Alert
            message="AI-Ready Templates"
            description="These templates have been rated highly by our community (4+ stars, 10+ ratings) and are perfect for AI generation."
            type="info"
            style={{ marginBottom: 16 }}
          />
          
          {templatesLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>Loading quality templates...</div>
            </div>
          ) : (
            <Row gutter={[16, 16]}>
              {qualityTemplates.map((template) => (
                <Col key={template.id} xs={24} sm={12} md={8}>
                  <TemplateCard template={template} onSelect={handleTemplateSelect} />
                </Col>
              ))}
            </Row>
          )}
        </div>
      )}

      {/* Step 1: AI Prompt Form */}
      {currentStep === 1 && selectedTemplate && (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <Text strong>Selected Template: </Text>
            <Tag color="blue">{selectedTemplate.name}</Tag>
            <Rate disabled allowHalf value={selectedTemplate.averageRating} style={{ marginLeft: 8 }} />
          </Card>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleAIGenerate}
          >
            <Form.Item
              name="prompt"
              label="Describe Your Page"
              rules={[{ required: true, message: 'Please describe what you want to create' }]}
            >
              <TextArea
                rows={4}
                placeholder="e.g., Create a modern landing page for a tech startup that offers AI-powered analytics. Include sections for features, pricing, and testimonials. Use a professional tone with blue and white colors."
              />
            </Form.Item>

            <Form.Item
              name="businessType"
              label="Business Type"
              rules={[{ required: true, message: 'Please select your business type' }]}
            >
              <Select placeholder="What type of business/project is this for?">
                <Option value="technology">Technology/Software</Option>
                <Option value="healthcare">Healthcare</Option>
                <Option value="finance">Finance</Option>
                <Option value="education">Education</Option>
                <Option value="ecommerce">E-commerce/Retail</Option>
                <Option value="consulting">Consulting</Option>
                <Option value="creative">Creative/Design</Option>
                <Option value="nonprofit">Non-profit</Option>
                <Option value="personal">Personal/Portfolio</Option>
                <Option value="other">Other</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="tone"
              label="Tone & Style"
              rules={[{ required: true, message: 'Please select a tone' }]}
            >
              <Select placeholder="What tone should the content have?">
                <Option value="professional">Professional</Option>
                <Option value="friendly">Friendly & Approachable</Option>
                <Option value="modern">Modern & Trendy</Option>
                <Option value="luxury">Luxury & Premium</Option>
                <Option value="playful">Playful & Fun</Option>
                <Option value="authoritative">Authoritative & Expert</Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Space>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  icon={<BulbOutlined />}
                  size="large"
                >
                  Generate with AI
                </Button>
                <Button onClick={() => setCurrentStep(0)}>
                  Back to Templates
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
      )}

      {/* Step 2: Generation Progress */}
      {currentStep === 2 && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin 
            size="large" 
            indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
          />
          <Title level={4} style={{ marginTop: 24 }}>
            AI is Creating Your Page...
          </Title>
          <Text type="secondary">{generationProgress}</Text>
          
          <Alert
            message="This may take 30-60 seconds"
            description="Our AI is analyzing your template and generating personalized content."
            type="info"
            style={{ marginTop: 24 }}
          />
        </div>
      )}

      {/* Step 3: Success */}
      {currentStep === 3 && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <CheckCircleOutlined 
            style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }} 
          />
          <Title level={3}>Page Generated Successfully!</Title>
          <Paragraph>
            Your AI-generated page is being loaded into the editor. 
            You can now customize it further to match your exact needs.
          </Paragraph>
        </div>
      )}
    </Modal>
  );
};

export default AIPageGenerator;