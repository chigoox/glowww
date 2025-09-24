/**
 * AI Page Generation System
 * Generates pages using high-quality templates as base structures
 * Restricted to Pro users and above only
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal, Form, Input, Select, Button, message, Alert, Typography, 
  Space, Card, Spin, Progress, Divider, Badge, Tooltip, Steps
} from 'antd';
import {
  RobotOutlined, WandOutlined, CrownOutlined, StarOutlined,
  LightningChargeFilled, BulbOutlined, SettingOutlined
} from '@ant-design/icons';
import { useAuth } from '../../../contexts/AuthContext';
import { useEditor } from '@craftjs/core';

const { TextArea } = Input;
const { Text, Title, Paragraph } = Typography;
const { Option } = Select;
const { Step } = Steps;

const AIPageGeneratorModal = ({ visible, onCancel, onPageGenerated }) => {
  const [form] = Form.useForm();
  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [qualityTemplates, setQualityTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState('');
  
  const { user } = useAuth();
  const { query } = useEditor();

  // Check user subscription level
  const isProUser = () => {
    // This would check the user's subscription from your user data
    // For now, we'll simulate this check
    return user?.subscription?.level === 'pro' || 
           user?.subscription?.level === 'premium' || 
           user?.subscription?.level === 'enterprise';
  };

  useEffect(() => {
    if (visible && user && isProUser()) {
      loadQualityTemplates();
    }
  }, [visible, user]);

  const loadQualityTemplates = async () => {
    try {
      const response = await fetch('/api/templates?action=quality');
      const data = await response.json();
      
      if (data.success) {
        setQualityTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error loading quality templates:', error);
    }
  };

  const handleGenerate = async (values) => {
    if (!isProUser()) {
      message.error('AI Page Generation is available for Pro users only');
      return;
    }

    setGenerating(true);
    setCurrentStep(0);
    setGenerationProgress(0);

    try {
      // Step 1: Analyze prompt and select template
      setGenerationStage('Analyzing your requirements...');
      setCurrentStep(1);
      setGenerationProgress(20);
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Find best matching template
      setGenerationStage('Finding the perfect template...');
      setCurrentStep(2);
      setGenerationProgress(40);
      
      const bestTemplate = await findBestTemplate(values);
      setSelectedTemplate(bestTemplate);
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Generate AI content
      setGenerationStage('Generating AI content...');
      setCurrentStep(3);
      setGenerationProgress(70);
      
      const aiContent = await generateAIContent(values, bestTemplate);
      
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 4: Apply content to template
      setGenerationStage('Finalizing your page...');
      setCurrentStep(4);
      setGenerationProgress(90);
      
      const finalPage = await applyContentToTemplate(bestTemplate, aiContent);
      
      await new Promise(resolve => setTimeout(resolve, 500));

      setGenerationProgress(100);
      setGenerationStage('Complete!');

      // Return generated page
      if (onPageGenerated) {
        onPageGenerated(finalPage);
      }

      message.success('AI page generated successfully!');
      onCancel();
      
    } catch (error) {
      console.error('AI generation error:', error);
      message.error('Failed to generate page: ' + error.message);
    } finally {
      setGenerating(false);
      setCurrentStep(0);
      setGenerationProgress(0);
    }
  };

  const findBestTemplate = async (prompt) => {
    // Simulate AI template selection based on prompt
    const { businessType, pageType, style } = prompt;
    
    // Filter templates by category
    let candidates = qualityTemplates;
    
    if (pageType) {
      candidates = candidates.filter(t => t.category === pageType);
    }
    
    // If no specific matches, get general high-quality templates
    if (candidates.length === 0) {
      candidates = qualityTemplates.slice(0, 5);
    }
    
    // Return highest rated template
    return candidates.sort((a, b) => b.averageRating - a.averageRating)[0];
  };

  const generateAIContent = async (prompt, template) => {
    // Simulate OpenAI content generation
    const { businessName, businessType, description, targetAudience, tone } = prompt;
    
    // This would be replaced with actual OpenAI API call
    const mockContent = {
      headlines: [
        `${businessName} - ${businessType} Excellence`,
        `Welcome to ${businessName}`,
        `Professional ${businessType} Solutions`
      ],
      descriptions: [
        description || `Leading ${businessType} company providing exceptional services to ${targetAudience}.`,
        `Experience the difference with ${businessName}'s professional approach.`,
        `Trusted by customers for quality ${businessType} services.`
      ],
      callToActions: [
        'Get Started Today',
        'Learn More',
        'Contact Us',
        'Schedule Consultation'
      ],
      features: [
        `Expert ${businessType} Services`,
        'Customer-Focused Approach', 
        'Proven Track Record',
        'Professional Team'
      ]
    };
    
    return mockContent;
  };

  const applyContentToTemplate = async (template, content) => {
    // Parse template JSON and replace placeholder content with AI-generated content
    const templateData = typeof template.jsonData === 'string' 
      ? JSON.parse(template.jsonData) 
      : template.jsonData;
    
    // This would involve sophisticated content replacement logic
    // For now, we'll return the template with some modifications
    const modifiedTemplate = { ...templateData };
    
    // Replace text content in template (simplified)
    const replaceTextContent = (node) => {
      if (node.props?.text) {
        // Replace with AI content based on context
        if (node.props.text.includes('Welcome') || node.props.text.includes('Hero')) {
          node.props.text = content.headlines[0];
        } else if (node.props.text.includes('description')) {
          node.props.text = content.descriptions[0];
        }
      }
      
      if (node.nodes) {
        node.nodes.forEach(nodeId => {
          if (modifiedTemplate[nodeId]) {
            replaceTextContent(modifiedTemplate[nodeId]);
          }
        });
      }
    };
    
    if (modifiedTemplate.ROOT) {
      replaceTextContent(modifiedTemplate.ROOT);
    }
    
    return modifiedTemplate;
  };

  const businessTypes = [
    'Restaurant', 'Retail', 'Technology', 'Healthcare', 'Education',
    'Real Estate', 'Finance', 'Consulting', 'Creative Agency', 'E-commerce',
    'Fitness', 'Travel', 'Legal', 'Manufacturing', 'Other'
  ];

  const pageTypes = [
    { value: 'landing', label: 'Landing Page' },
    { value: 'business', label: 'Business Website' },
    { value: 'portfolio', label: 'Portfolio' },
    { value: 'ecommerce', label: 'E-commerce' },
    { value: 'blog', label: 'Blog' },
    { value: 'personal', label: 'Personal Website' }
  ];

  const toneOptions = [
    'Professional', 'Friendly', 'Bold', 'Elegant', 'Modern', 
    'Creative', 'Trustworthy', 'Energetic', 'Sophisticated'
  ];

  if (!user) {
    return (
      <Modal
        title="AI Page Generator"
        open={visible}
        onCancel={onCancel}
        footer={null}
        centered
      >
        <Alert
          message="Sign In Required"
          description="Please sign in to access the AI Page Generator."
          type="warning"
          showIcon
        />
      </Modal>
    );
  }

  if (!isProUser()) {
    return (
      <Modal
        title="AI Page Generator"
        open={visible}
        onCancel={onCancel}
        footer={null}
        centered
        width={600}
      >
        <Card>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CrownOutlined style={{ fontSize: 48, color: '#faad14', marginBottom: 16 }} />
            <Title level={3}>Upgrade to Pro</Title>
            <Paragraph>
              AI Page Generation is an exclusive feature for Pro subscribers and above.
              Upgrade your account to access AI-powered page creation using our highest-rated templates.
            </Paragraph>
            
            <Alert
              message="Pro Features Include:"
              description={
                <ul style={{ textAlign: 'left', marginTop: 8 }}>
                  <li>🤖 AI-powered page generation</li>
                  <li>⭐ Access to premium templates (4+ stars)</li>
                  <li>🎨 Smart content generation</li>
                  <li>🚀 Priority support</li>
                  <li>📈 Advanced analytics</li>
                </ul>
              }
              type="info"
              style={{ marginBottom: 16, textAlign: 'left' }}
            />
            
            <Space>
              <Button type="primary" size="large" icon={<CrownOutlined />}>
                Upgrade to Pro
              </Button>
              <Button onClick={onCancel}>
                Maybe Later
              </Button>
            </Space>
          </div>
        </Card>
      </Modal>
    );
  }

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined />
          AI Page Generator
          <Badge count="PRO" style={{ backgroundColor: '#faad14' }} />
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      centered
    >
      {generating ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Steps current={currentStep} size="small" style={{ marginBottom: 24 }}>
            <Step title="Analyze" icon={<BulbOutlined />} />
            <Step title="Select Template" icon={<StarOutlined />} />
            <Step title="Generate Content" icon={<WandOutlined />} />
            <Step title="Finalize" icon={<SettingOutlined />} />
          </Steps>
          
          <Spin size="large" style={{ marginBottom: 16 }} />
          <div>
            <Progress 
              percent={generationProgress} 
              strokeColor="#1890ff"
              style={{ marginBottom: 16 }}
            />
            <Text type="secondary">{generationStage}</Text>
          </div>
          
          {selectedTemplate && (
            <Card size="small" style={{ marginTop: 16, maxWidth: 300, margin: '16px auto 0' }}>
              <Text strong>Using Template:</Text> {selectedTemplate.name}
              <br />
              <Space>
                <StarOutlined />
                <Text>{selectedTemplate.averageRating?.toFixed(1)}</Text>
                <Text type="secondary">({selectedTemplate.totalRatings} reviews)</Text>
              </Space>
            </Card>
          )}
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleGenerate}
        >
          <Alert
            message={
              <Space>
                <LightningChargeFilled style={{ color: '#faad14' }} />
                AI-Powered Page Generation
              </Space>
            }
            description="Our AI will analyze your requirements and create a custom page using our highest-rated community templates as a foundation."
            type="info"
            style={{ marginBottom: 24 }}
          />

          <Form.Item
            name="businessName"
            label="Business/Project Name"
            rules={[{ required: true, message: 'Please enter your business name' }]}
          >
            <Input placeholder="e.g., Acme Consulting" />
          </Form.Item>

          <Form.Item
            name="businessType"
            label="Business Type"
            rules={[{ required: true, message: 'Please select your business type' }]}
          >
            <Select placeholder="Select your business type">
              {businessTypes.map(type => (
                <Option key={type} value={type}>{type}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="pageType"
            label="Page Type"
            rules={[{ required: true, message: 'Please select the type of page you want' }]}
          >
            <Select placeholder="What type of page do you need?">
              {pageTypes.map(type => (
                <Option key={type.value} value={type.value}>{type.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Business Description"
            rules={[{ required: true, message: 'Please describe your business' }]}
          >
            <TextArea
              rows={3}
              placeholder="Describe what your business does, key services, and unique value proposition..."
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="targetAudience"
            label="Target Audience"
          >
            <Input placeholder="e.g., Small businesses, Young professionals, Families" />
          </Form.Item>

          <Form.Item
            name="tone"
            label="Tone & Style"
          >
            <Select placeholder="Choose the tone for your content">
              {toneOptions.map(tone => (
                <Option key={tone} value={tone}>{tone}</Option>
              ))}
            </Select>
          </Form.Item>

          <Divider />

          <Alert
            message="AI Quality Guarantee"
            description={`Using ${qualityTemplates.length} premium templates with 4+ star ratings from our community.`}
            type="success"
            style={{ marginBottom: 16 }}
          />

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit"
              size="large"
              icon={<RobotOutlined />}
              style={{ width: '100%' }}
            >
              Generate My Page with AI
            </Button>
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};

export default AIPageGeneratorModal;