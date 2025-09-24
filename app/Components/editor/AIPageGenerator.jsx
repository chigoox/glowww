/**
 * AI Page Generator - Real-Time Streaming Version
 * Shows live page generation with real-time component building
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal, Form, Input, Select, Button, Card, Typography, 
  Space, Alert, Spin, Row, Col, Progress, Steps, Collapse, message, Tag, Timeline
} from 'antd';
import {
  RobotOutlined, CheckCircleOutlined, LoadingOutlined, 
  BulbOutlined, StarOutlined, CodeOutlined, CopyOutlined, EyeOutlined,
  ThunderboltOutlined, BuildOutlined, StopOutlined
} from '@ant-design/icons';
import { useAuth } from '../../../contexts/AuthContext';
import { auth } from '@/lib/firebase';

const { TextArea } = Input;
const { Text, Title, Paragraph } = Typography;
const { Option } = Select;
const { Step } = Steps;
const { Panel } = Collapse;

const AIPageGenerator = ({ visible, onCancel, onGenerate }) => {
  const [form] = Form.useForm();
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [generatedJSON, setGeneratedJSON] = useState(null);
  const [showJSON, setShowJSON] = useState(false);
  
  // Real-time generation state
  const [liveComponents, setLiveComponents] = useState({});
  const [buildingTimeline, setBuildingTimeline] = useState([]);
  const [currentSection, setCurrentSection] = useState('');
  const [componentCount, setComponentCount] = useState(0);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const eventSourceRef = useRef(null);
  const abortControllerRef = useRef(null);
  const readerRef = useRef(null);
  
  // Refs for auto-scrolling
  const textAreaRef = useRef(null);
  const jsonViewRef = useRef(null);
  const modalBodyRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  
  const { user } = useAuth();

  // Debug logging
  useEffect(() => {
    if (visible) {
      console.log('🔍 AI Generator Debug:', {
        'user?.subscriptionTier': user?.subscriptionTier,
        'user?.isAdmin': user?.isAdmin,
        'hasAIAccess calculation': user?.subscriptionTier && user.subscriptionTier.toLowerCase() !== 'free',
        'full user object': user
      });
    }
  }, [visible, user]);

  // Check if user has AI access (all users except free tier)
  const hasAIAccess = user?.subscriptionTier && user.subscriptionTier.toLowerCase() !== 'free';

  /**
   * Auto-scroll helper functions
   */
  const scrollToElement = (elementRef, behavior = 'smooth') => {
    try {
      if (elementRef.current) {
        // For Ant Design TextArea, try multiple paths to get the actual textarea element
        let element = elementRef.current.resizableTextArea?.textArea || 
                     elementRef.current.input || 
                     elementRef.current;
        
        if (element && typeof element.scrollIntoView === 'function') {
          element.scrollIntoView({ 
            behavior, 
            block: 'start',
            inline: 'nearest'
          });
        } else {
          // Alternative approach: use window.scrollTo with element position
          if (element && element.getBoundingClientRect) {
            const rect = element.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const elementTop = rect.top + scrollTop - 100; // 100px offset from top
            
            window.scrollTo({
              top: elementTop,
              behavior: behavior
            });
          }
        }
      }
    } catch (error) {
      console.warn('Error in scrollToElement:', error);
    }
  };

  const scrollToBottom = (elementRef, behavior = 'smooth') => {
    try {
      if (elementRef.current) {
        // Multiple attempts to find the scrollable textarea element
        let element = null;
        
        // Try different paths for Ant Design TextArea
        if (elementRef.current.resizableTextArea?.textArea) {
          element = elementRef.current.resizableTextArea.textArea;
        } else if (elementRef.current.input) {
          element = elementRef.current.input;
        } else if (elementRef.current.textArea) {
          element = elementRef.current.textArea;
        } else {
          // Query for textarea within the component
          element = elementRef.current.querySelector('textarea');
        }
        
        if (!element) {
          return;
        }
        
        // Scroll to bottom immediately without animation for better performance
        element.scrollTop = element.scrollHeight;
        
        // Also ensure the element is visible in viewport
        if (element.getBoundingClientRect) {
          const rect = element.getBoundingClientRect();
          const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
          if (!isVisible) {
            element.scrollIntoView({ behavior: 'auto', block: 'nearest' });
          }
        }
      }
    } catch (error) {
      console.warn('Error in scrollToBottom:', error);
    }
  };

  // Debounced scroll function for rapid updates
  const debouncedScrollToBottom = (elementRef) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      scrollToBottom(elementRef);
    }, 10); // Very short debounce for responsiveness
  };

  const jumpToGenerationView = () => {
    try {
      // Show the JSON panel first if not already visible
      if (!showJSON) {
        setShowJSON(true);
      }
      
      // Wait for the panel to render, then try to scroll to the text area
      setTimeout(() => {
        scrollToElement(textAreaRef, 'smooth');
      }, 300); // Increased delay to ensure modal and panel are fully rendered
    } catch (error) {
      console.warn('Error in jumpToGenerationView:', error);
      // Fallback: just show the JSON panel without scrolling
      setShowJSON(true);
    }
  };

  /**
   * Copy generated JSON to clipboard with user feedback
   */
  const handleCopyJSON = async () => {
    if (!generatedJSON) {
      message.warning('No JSON content to copy');
      return;
    }

    try {
      const jsonContent = typeof generatedJSON === 'string' 
        ? generatedJSON 
        : JSON.stringify(generatedJSON, null, 2);
      
      await navigator.clipboard.writeText(jsonContent);
      message.success('JSON copied to clipboard!');
      
      // Add to timeline for user feedback
      setBuildingTimeline(prev => [...prev, {
        key: `copy-${Date.now()}`,
        color: 'cyan',
        dot: <CopyOutlined />,
        children: (
          <div>
            <Text strong style={{ color: '#13c2c2' }}>
              JSON copied to clipboard
            </Text>
            <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
              {jsonContent.length} characters copied • {new Date().toLocaleTimeString()}
            </div>
          </div>
        )
      }]);
      
    } catch (error) {
      console.error('Failed to copy JSON:', error);
      message.error('Failed to copy JSON to clipboard');
    }
  };

  /**
   * Load generated JSON into the editor with validation and error handling
   */
  const handleLoadGenerated = () => {
    console.log('handleLoadGenerated called, generatedJSON:', generatedJSON);
    
    if (!generatedJSON) {
      message.warning('No generated content to load');
      return;
    }

    try {
      let parsedJSON;
      
      // Parse JSON if it's a string
      if (typeof generatedJSON === 'string') {
        try {
          parsedJSON = JSON.parse(generatedJSON);
          console.log('Parsed JSON from string:', parsedJSON);
        } catch (parseError) {
          console.error('JSON parsing error:', parseError);
          message.error('Invalid JSON format. Please check the generated content.');
          return;
        }
      } else {
        parsedJSON = generatedJSON;
        console.log('Using JSON object directly:', parsedJSON);
      }

      // Validate that we have a proper Craft.js structure
      if (!parsedJSON || typeof parsedJSON !== 'object') {
        message.error('Invalid page structure. Please generate a new page.');
        return;
      }

      // Check for ROOT node (required by Craft.js)
      if (!parsedJSON.ROOT) {
        message.error('Invalid page structure: missing ROOT node. Please generate a new page.');
        return;
      }

      console.log('About to call onGenerate with parsedJSON:', parsedJSON);
      
      // Call the parent callback to load the page
      if (onGenerate && typeof onGenerate === 'function') {
        // Convert the parsed JSON back to a string for the callback
        const jsonString = JSON.stringify(parsedJSON, null, 2);
        console.log('Calling onGenerate with JSON string length:', jsonString.length);
        
        onGenerate(jsonString);  // Pass as string, not object
        
        // Add success to timeline
        setBuildingTimeline(prev => [...prev, {
          key: `load-${Date.now()}`,
          color: 'green',
          dot: <CheckCircleOutlined />,
          children: (
            <div>
              <Text strong style={{ color: '#52c41a' }}>
                Page loaded into editor successfully!
              </Text>
              <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                Components: {Object.keys(parsedJSON).length} • {new Date().toLocaleTimeString()}
              </div>
            </div>
          )
        }]);
        
        message.success('Page loaded into editor successfully!');
        
        // Don't call handleClose here - let the parent handle modal closure
        // The parent PageLoadModal will call onCancel() after processing the data
        
      } else {
        console.warn('onGenerate callback not provided or is not a function:', onGenerate);
        message.error('Unable to load page: no callback provided');
      }
      
    } catch (error) {
      console.error('Error loading generated page:', error);
      message.error('Failed to load page into editor');
      
      // Add error to timeline
      setBuildingTimeline(prev => [...prev, {
        key: `load-error-${Date.now()}`,
        color: 'red',
        children: (
          <div>
            <Text strong style={{ color: '#ff4d4f' }}>
              Failed to load page: {error.message}
            </Text>
            <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        )
      }]);
    }
  };

  /**
   * Cancel ongoing generation
   */
  const handleCancelGeneration = () => {
    console.log('🛑 Canceling generation...');
    
    // Abort the fetch request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Close the reader
    if (readerRef.current) {
      try {
        readerRef.current.cancel();
      } catch (error) {
        console.warn('Error canceling reader:', error);
      }
      readerRef.current = null;
    }
    
    // Update UI state
    setGenerating(false);
    setGenerationProgress(0);
    setStatusMessage('Generation canceled by user');
    
    // Add cancellation to timeline
    setBuildingTimeline(prev => [...prev, {
      key: `canceled-${Date.now()}`,
      color: 'orange',
      children: (
        <div>
          <Text strong style={{ color: '#fa8c16' }}>
            Generation canceled by user
          </Text>
          <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
            {new Date().toLocaleTimeString()}
          </div>
        </div>
      )
    }]);
    
    message.info('Generation canceled');
  };

  const handleGenerate = async (values) => {
    setGenerating(true);
    setGenerationProgress(0);
    setStatusMessage('Preparing AI generation...');
    setLiveComponents({});
    setBuildingTimeline([]);
    setComponentCount(0);
    setCurrentSection('');
    setShowLivePreview(true);
    setGeneratedJSON(''); // Reset JSON text area

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    // Jump to generation view immediately after starting
    jumpToGenerationView();

    try {
      // Get Firebase ID token for authentication
      const currentUser = auth.currentUser;
      if (!currentUser || !user) {
        throw new Error('Please log in to use AI generation');
      }

      let token;
      try {
        token = await currentUser.getIdToken();
      } catch (tokenError) {
        console.error('Failed to get Firebase token:', tokenError);
        throw new Error('Authentication failed. Please try logging in again.');
      }

      // Start streaming generation with abort signal
      const response = await fetch('/api/ai/generate-content-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: values.prompt,
          businessType: values.businessType,
          tone: values.tone
        }),
        signal: abortControllerRef.current?.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 403 && errorData.code === 'UPGRADE_REQUIRED') {
          throw new Error('AI generation requires an upgrade from Free tier. Please upgrade to Pro, Business, or Admin.');
        }
        
        throw new Error(errorData.error || 'Failed to start AI generation');
      }

      // Handle Server-Sent Events for streaming JSON text
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Streaming not supported');
      }

      // Store reader reference for cancellation
      readerRef.current = reader;

      const decoder = new TextDecoder();
      let buffer = '';
      let streamingJsonText = '';

      setShowJSON(true); // Show JSON area immediately

      while (true) {
        // Check if generation was cancelled
        if (abortControllerRef.current?.signal.aborted) {
          console.log('Generation cancelled by user');
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete events
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));
              
              if (eventData.type === 'status') {
                setStatusMessage(eventData.message);
                setGenerationProgress(10);
              } else if (eventData.type === 'chunk') {
                // Update the streaming text in real-time
                streamingJsonText = eventData.fullContent;
                setGeneratedJSON(streamingJsonText);
                
                // Auto-scroll to bottom of textarea (debounced for performance)
                debouncedScrollToBottom(textAreaRef);
                
                // Update progress based on content length
                const estimatedProgress = Math.min(20 + (streamingJsonText.length / 4000) * 70, 90);
                setGenerationProgress(estimatedProgress);
                setStatusMessage('Generating page structure...');
                
                // Add to timeline
                setBuildingTimeline(prev => {
                  const newTimeline = [...prev];
                  if (newTimeline.length === 0 || newTimeline[newTimeline.length - 1].key !== 'streaming') {
                    newTimeline.push({
                      key: 'streaming',
                      color: 'blue',
                      dot: <LoadingOutlined />,
                      children: (
                        <div>
                          <Text strong style={{ color: '#1890ff' }}>
                            Streaming JSON content... ({streamingJsonText.length} characters)
                          </Text>
                          <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                            Real-time generation • Chunk #{eventData.chunkNumber}
                          </div>
                        </div>
                      )
                    });
                  } else {
                    // Update existing streaming entry
                    newTimeline[newTimeline.length - 1] = {
                      ...newTimeline[newTimeline.length - 1],
                      children: (
                        <div>
                          <Text strong style={{ color: '#1890ff' }}>
                            Streaming JSON content... ({streamingJsonText.length} characters)
                          </Text>
                          <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                            Real-time generation • Chunk #{eventData.chunkNumber}
                          </div>
                        </div>
                      )
                    };
                  }
                  return newTimeline;
                });
                
              } else if (eventData.type === 'complete') {
                // Final JSON received
                setGeneratedJSON(eventData.content);
                setGenerationProgress(100);
                setStatusMessage('Generation complete!');
                
                // Final auto-scroll to show completed content
                setTimeout(() => {
                  scrollToBottom(textAreaRef, 'smooth');
                }, 100);
                
                // Update timeline with completion
                setBuildingTimeline(prev => [...prev, {
                  key: `complete-${Date.now()}`,
                  color: 'green',
                  dot: <CheckCircleOutlined />,
                  children: (
                    <div>
                      <Text strong style={{ color: '#52c41a' }}>
                        Generation completed successfully!
                      </Text>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                        Total chunks: {eventData.totalChunks} • Final size: {eventData.content?.length || 0} characters
                      </div>
                    </div>
                  )
                }]);
                
              } else if (eventData.type === 'error') {
                throw new Error(eventData.error);
              }
              
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', parseError);
            }
          }
        }
      }

    } catch (error) {
      console.error('AI Generation Error:', error);
      
      // Handle abort errors differently
      if (error.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
        console.log('Generation was aborted by user');
        // Don't show error for user-initiated cancellation
        return;
      }
      
      setStatusMessage('');
      setGenerationProgress(0);
      setShowLivePreview(false);
      
      setBuildingTimeline(prev => [...prev, {
        key: `error-${Date.now()}`,
        color: 'red',
        children: (
          <div>
            <Text strong style={{ color: '#ff4d4f' }}>Error: {error.message}</Text>
            <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        )
      }]);
      
      form.setFields([
        {
          name: 'prompt',
          errors: [error.message]
        }
      ]);
    } finally {
      setGenerating(false);
      // Clean up references
      abortControllerRef.current = null;
      readerRef.current = null;
    }
  };

  const handleClose = () => {
    // Close any active event source
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    // Cancel ongoing generation
    if (generating) {
      handleCancelGeneration();
    }
    
    // Clean up references
    abortControllerRef.current = null;
    readerRef.current = null;
    
    // Clean up scroll timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    setGenerating(false);
    setGenerationProgress(0);
    setStatusMessage('');
    setGeneratedJSON(null);
    setShowJSON(false);
    setLiveComponents({});
    setBuildingTimeline([]);
    setComponentCount(0);
    setCurrentSection('');
    setShowLivePreview(false);
    form.resetFields();
    onCancel();
  };

  // If user doesn't have access, show upgrade message
  if (!hasAIAccess) {
    return (
      <Modal
        title="AI Page Generator"
        open={visible}
        onCancel={handleClose}
        footer={null}
        width={600}
        centered
      >
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <RobotOutlined style={{ fontSize: 64, color: '#ccc', marginBottom: 24 }} />
          <Title level={3}>AI Page Generation</Title>
          <Paragraph style={{ fontSize: 16, color: '#666' }}>
            Generate complete, professional websites using AI technology.
          </Paragraph>
          
          <Alert
            message="Upgrade Required"
            description={
              <div>
                <p>AI page generation is available for:</p>
                <ul style={{ textAlign: 'left', marginTop: 12 }}>
                  <li><strong>Pro Plan:</strong> 50 AI generations per month</li>
                  <li><strong>Business Plan:</strong> 200 AI generations per month</li>
                  <li><strong>Admin:</strong> Unlimited AI generations</li>
                </ul>
                <p style={{ marginTop: 12 }}>
                  Current tier: <strong>{user?.subscriptionTier || 'Free'}</strong>
                </p>
              </div>
            }
            type="info"
            showIcon
            style={{ marginTop: 24, textAlign: 'left' }}
          />

          <div style={{ marginTop: 32 }}>
            <Button 
              type="primary" 
              size="large"
              onClick={() => window.open('/dashboard/billing', '_blank')}
            >
              Upgrade Now
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined />
          <span>AI Page Generator</span>
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={showJSON ? 900 : 700}
      centered
      maskClosable={!generating}
      closable={!generating}
    >
      <div style={{ padding: '20px 0' }}>
        {/* Header Info */}
        <Alert
          message="Streamlined AI Generation"
          description="Describe your business and desired website. Our AI will automatically create a complete, professional page structure using the best templates and examples as references."
          type="info"
          showIcon
          icon={<BulbOutlined />}
          style={{ marginBottom: 24 }}
        />

        {generating && (
          <Card style={{ marginBottom: 24, textAlign: 'center' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Spin 
                indicator={<LoadingOutlined style={{ fontSize: 32 }} />} 
                spinning={true}
              />
              <div>
                <Progress 
                  percent={generationProgress} 
                  status="active"
                  strokeColor="#1890ff"
                />
                <Text style={{ fontSize: 16, marginTop: 8, display: 'block' }}>
                  {statusMessage}
                </Text>
              </div>
              <Button 
                onClick={handleCancelGeneration}
                danger
                type="text"
                icon={<StopOutlined />}
                style={{ marginTop: 16 }}
              >
                Cancel Generation
              </Button>
            </Space>
          </Card>
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleGenerate}
          disabled={generating}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Describe Your Website"
                name="prompt"
                rules={[
                  { required: true, message: 'Please describe what kind of website you need' },
                  { min: 10, message: 'Please provide at least 10 characters' }
                ]}
              >
                <TextArea
                  rows={4}
                  placeholder="Example: I need a website for my dental practice. It should have information about our services, team bios, appointment booking, and contact details."
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Business Type"
                name="businessType"
                rules={[{ required: true, message: 'Please select your business type' }]}
              >
                <Select placeholder="Select business type">
                  <Option value="technology">Technology</Option>
                  <Option value="healthcare">Healthcare</Option>
                  <Option value="finance">Finance</Option>
                  <Option value="education">Education</Option>
                  <Option value="ecommerce">E-commerce</Option>
                  <Option value="consulting">Consulting</Option>
                  <Option value="creative">Creative/Portfolio</Option>
                  <Option value="nonprofit">Non-profit</Option>
                  <Option value="personal">Personal/Blog</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Tone & Style"
                name="tone"
                rules={[{ required: true, message: 'Please select a tone' }]}
              >
                <Select placeholder="Select tone">
                  <Option value="professional">Professional</Option>
                  <Option value="friendly">Friendly</Option>
                  <Option value="modern">Modern</Option>
                  <Option value="luxury">Luxury</Option>
                  <Option value="playful">Playful</Option>
                  <Option value="authoritative">Authoritative</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Generation Features */}
          <Card size="small" style={{ marginTop: 16, marginBottom: 24 }}>
            <Title level={5} style={{ marginBottom: 16 }}>
              <StarOutlined /> What You'll Get:
            </Title>
            <Row gutter={16}>
              <Col span={12}>
                <ul style={{ marginLeft: 16, color: '#666' }}>
                  <li>Complete page structure</li>
                  <li>Professional content</li>
                  <li>Modern, responsive design</li>
                  <li>Industry-specific elements</li>
                </ul>
              </Col>
              <Col span={12}>
                <ul style={{ marginLeft: 16, color: '#666' }}>
                  <li>Optimized layout</li>
                  <li>Call-to-action buttons</li>
                  <li>Contact information</li>
                  <li>Ready-to-customize sections</li>
                </ul>
              </Col>
            </Row>
          </Card>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              {generating ? (
                <Button 
                  onClick={handleCancelGeneration} 
                  danger
                  icon={<StopOutlined />}
                >
                  Cancel Generation
                </Button>
              ) : (
                <Button onClick={handleClose}>
                  Cancel
                </Button>
              )}
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={generating}
                size="large"
                disabled={showJSON || generating}
              >
                {generating ? 'Generating...' : 'Generate Page with AI'}
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {/* JSON Inspector Section with Streaming Text */}
        {showJSON && (
          <div style={{ marginTop: 24, borderTop: '1px solid #f0f0f0', paddingTop: 24 }}>
            <Collapse
              defaultActiveKey={['1']}
              style={{ marginBottom: 16 }}
            >
              <Panel
                header={
                  <Space>
                    <CodeOutlined />
                    <Text strong>Generated JSON Structure (Real-time Streaming)</Text>
                    {generating && (
                      <Tag color="blue" icon={<LoadingOutlined />}>
                        Streaming...
                      </Tag>
                    )}
                  </Space>
                }
                key="1"
              >
                <div style={{ position: 'relative' }}>
                  <Button
                    icon={<CopyOutlined />}
                    size="small"
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      zIndex: 1
                    }}
                    onClick={handleCopyJSON}
                    disabled={!generatedJSON}
                  >
                    Copy JSON
                  </Button>
                  
                  {/* Streaming indicator */}
                  {generating && (
                    <div style={{ 
                      marginBottom: 8, 
                      padding: '4px 8px', 
                      backgroundColor: '#e6f7ff', 
                      border: '1px solid #91d5ff', 
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      color: '#1890ff'
                    }}>
                      <LoadingOutlined />
                      <span>AI is generating content... Auto-scrolling to show progress</span>
                    </div>
                  )}
                  
                  <TextArea
                    ref={textAreaRef}
                    value={typeof generatedJSON === 'string' ? generatedJSON : JSON.stringify(generatedJSON, null, 2)}
                    placeholder={generating ? "JSON content will appear here as AI generates it..." : "Generated JSON will appear here"}
                    rows={20}
                    readOnly
                    style={{
                      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                      fontSize: '12px',
                      lineHeight: '1.4',
                      backgroundColor: generating ? '#f6f8fa' : '#f0f2f5',
                      border: generating ? '2px solid #1890ff' : '1px solid #d9d9d9',
                      borderRadius: '6px',
                      padding: '12px',
                      resize: 'vertical',
                      transition: 'all 0.3s ease',
                      boxShadow: generating ? '0 0 10px rgba(24, 144, 255, 0.2)' : 'none'
                    }}
                  />
                </div>
                
                <div style={{ marginTop: 16, padding: '12px', background: '#f0f9ff', borderRadius: '6px', border: '1px solid #b3d8ff' }}>
                  <Text style={{ fontSize: '13px', color: '#0066cc' }}>
                    💡 <strong>Real-time Generation:</strong> Watch as the AI generates your page structure chunk by chunk! 
                    The JSON text appears in real-time as OpenAI creates each component, section, and styling rule.
                  </Text>
                </div>
                
                {/* Generation Timeline */}
                {buildingTimeline.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <Title level={5}>Generation Timeline</Title>
                    <Timeline
                      mode="left"
                      items={buildingTimeline}
                      style={{ 
                        maxHeight: '200px', 
                        overflowY: 'auto',
                        backgroundColor: '#fafafa',
                        padding: '12px',
                        borderRadius: '6px'
                      }}
                    />
                  </div>
                )}
              </Panel>
            </Collapse>

            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              {generating ? (
                <Button 
                  onClick={handleCancelGeneration} 
                  danger
                  icon={<StopOutlined />}
                >
                  Cancel Generation
                </Button>
              ) : (
                <Button onClick={() => setShowJSON(false)}>
                  Generate Another
                </Button>
              )}
              <Button 
                type="primary" 
                size="large"
                onClick={handleLoadGenerated}
                disabled={generating || !generatedJSON}
              >
                Load This Page into Editor
              </Button>
            </Space>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AIPageGenerator;