/**
 * Template Preview Component
 * Shows live preview of template before saving
 */

import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Card, 
  Button, 
  Space, 
  Typography, 
  Divider, 
  Tag, 
  Tabs,
  Row,
  Col,
  Tooltip,
  Badge,
  Select
} from 'antd';
import { 
  EyeOutlined, 
  MobileOutlined, 
  TabletOutlined, 
  DesktopOutlined,
  InfoCircleOutlined,
  HistoryOutlined,
  SwapOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useEditor } from '@craftjs/core';
import { getTemplateVersions, compareTemplateVersions, VERSION_TYPES } from '../../lib/templateVersioning';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const TemplatePreview = ({ 
  visible, 
  onClose, 
  templateData, 
  isExistingTemplate = false,
  templateId = null,
  onSave,
  onUpdate 
}) => {
  const { query } = useEditor();
  const [activeTab, setActiveTab] = useState('preview');
  const [viewportSize, setViewportSize] = useState('desktop');
  const [versions, setVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState([]);
  const [comparison, setComparison] = useState(null);

  useEffect(() => {
    if (visible && isExistingTemplate && templateId) {
      loadVersionHistory();
    }
  }, [visible, isExistingTemplate, templateId]);

  const loadVersionHistory = async () => {
    setLoadingVersions(true);
    try {
      const result = await getTemplateVersions(templateId);
      if (result.success) {
        setVersions(result.versions);
      }
    } catch (error) {
      console.error('Error loading versions:', error);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleCompareVersions = async () => {
    if (selectedVersions.length !== 2) return;
    
    try {
      const result = await compareTemplateVersions(
        templateId, 
        selectedVersions[0], 
        selectedVersions[1]
      );
      
      if (result.success) {
        setComparison(result.comparison);
        setActiveTab('comparison');
      }
    } catch (error) {
      console.error('Error comparing versions:', error);
    }
  };

  const getViewportStyles = () => {
    const baseStyles = {
      border: '1px solid #d9d9d9',
      borderRadius: '6px',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    };

    switch (viewportSize) {
      case 'mobile':
        return { ...baseStyles, width: '375px', height: '600px' };
      case 'tablet':
        return { ...baseStyles, width: '768px', height: '500px' };
      case 'desktop':
      default:
        return { ...baseStyles, width: '100%', height: '500px' };
    }
  };

  const renderPreviewFrame = () => {
    const frameStyles = getViewportStyles();
    
    return (
      <div className="template-preview-container" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        padding: '20px',
        background: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <div style={frameStyles}>
          <iframe
            srcDoc={generatePreviewHTML()}
            style={{
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            title="Template Preview"
          />
        </div>
      </div>
    );
  };

  const generatePreviewHTML = () => {
    if (!templateData) return '<div>No template data</div>';
    
    try {
      // Generate HTML from template data
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Template Preview</title>
          <style>
            body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .preview-container { background: white; min-height: calc(100vh - 40px); }
            .component-placeholder { 
              padding: 10px; 
              margin: 5px 0; 
              border: 1px dashed #ccc; 
              border-radius: 4px;
              background: #fafafa;
            }
          </style>
        </head>
        <body>
          <div class="preview-container">
            ${generateComponentHTML(templateData)}
          </div>
        </body>
        </html>
      `;
      
      return htmlContent;
    } catch (error) {
      console.error('Error generating preview HTML:', error);
      return '<div style="padding: 20px; color: red;">Error generating preview</div>';
    }
  };

  const generateComponentHTML = (data) => {
    if (!data || typeof data !== 'object') return '';
    
    try {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Simple component rendering for preview
      let html = '<div style="padding: 20px;">';
      
      Object.entries(parsedData).forEach(([nodeId, node]) => {
        if (node.type?.resolvedName) {
          html += `<div class="component-placeholder">
            <strong>${node.type.resolvedName}</strong>
            ${node.props?.text ? `<p>${node.props.text}</p>` : ''}
          </div>`;
        }
      });
      
      html += '</div>';
      return html;
      
    } catch (error) {
      return '<div>Error rendering components</div>';
    }
  };

  const renderTemplateInfo = () => {
    const componentCount = getComponentCount(templateData);
    const complexity = getComplexityLevel(componentCount);
    
    return (
      <Card title="Template Information" className="mb-4">
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <div>
              <Text strong>Components: </Text>
              <Badge count={componentCount} style={{ backgroundColor: '#52c41a' }} />
            </div>
          </Col>
          <Col span={12}>
            <div>
              <Text strong>Complexity: </Text>
              <Tag color={getComplexityColor(complexity)}>{complexity}</Tag>
            </div>
          </Col>
          <Col span={12}>
            <div>
              <Text strong>Size: </Text>
              <Text>{formatFileSize(JSON.stringify(templateData).length)}</Text>
            </div>
          </Col>
          <Col span={12}>
            <div>
              <Text strong>Responsive: </Text>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
            </div>
          </Col>
        </Row>
        
        <Divider />
        
        <Title level={5}>Component Breakdown</Title>
        <div className="component-tags">
          {getComponentTypes(templateData).map(type => (
            <Tag key={type} color="blue">{type}</Tag>
          ))}
        </div>
      </Card>
    );
  };

  const renderVersionHistory = () => {
    if (!isExistingTemplate) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Text type="secondary">This is a new template - no version history available</Text>
        </div>
      );
    }

    return (
      <div>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4}>Version History</Title>
          <Space>
            <Select
              mode="multiple"
              placeholder="Select 2 versions to compare"
              value={selectedVersions}
              onChange={setSelectedVersions}
              style={{ width: 300 }}
              maxTagCount={2}
            >
              {versions.map(version => (
                <Select.Option key={version.id} value={version.id}>
                  v{version.version} - {version.createdAt?.toLocaleDateString()}
                </Select.Option>
              ))}
            </Select>
            <Button
              icon={<SwapOutlined />}
              onClick={handleCompareVersions}
              disabled={selectedVersions.length !== 2}
            >
              Compare
            </Button>
          </Space>
        </div>

        <div className="version-list">
          {versions.map((version, index) => (
            <Card key={version.id} size="small" className="mb-2">
              <Row justify="space-between" align="middle">
                <Col>
                  <Space>
                    <Tag color={getVersionTypeColor(version.versionType)}>
                      v{version.version}
                    </Tag>
                    <Text strong>{version.versionType}</Text>
                    <Text type="secondary">
                      {version.createdAt?.toLocaleDateString()}
                    </Text>
                  </Space>
                </Col>
                <Col>
                  <Text type="secondary">
                    {version.downloadCount || 0} downloads
                  </Text>
                </Col>
              </Row>
              {version.changelog && (
                <Paragraph className="mt-2" type="secondary">
                  {version.changelog}
                </Paragraph>
              )}
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderVersionComparison = () => {
    if (!comparison) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Text type="secondary">Select two versions to compare</Text>
        </div>
      );
    }

    return (
      <div>
        <Title level={4}>
          Comparing v{comparison.version1} with v{comparison.version2}
        </Title>
        
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title="Changes Summary" size="small">
              {comparison.changes.length > 0 ? (
                <ul>
                  {comparison.changes.map((change, index) => (
                    <li key={index}>{change}</li>
                  ))}
                </ul>
              ) : (
                <Text type="secondary">No significant changes detected</Text>
              )}
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Size Difference" size="small">
              <div>
                <Text>Size change: </Text>
                <Tag color={comparison.sizeDiff.difference > 0 ? 'red' : 'green'}>
                  {comparison.sizeDiff.difference > 0 ? '+' : ''}
                  {formatFileSize(Math.abs(comparison.sizeDiff.difference))}
                </Tag>
              </div>
            </Card>
          </Col>
        </Row>

        <Card title="Component Changes" className="mt-4">
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Title level={5} style={{ color: '#52c41a' }}>Added</Title>
              {comparison.componentsDiff.added.map(component => (
                <Tag key={component} color="green">{component}</Tag>
              ))}
            </Col>
            <Col span={8}>
              <Title level={5} style={{ color: '#f5222d' }}>Removed</Title>
              {comparison.componentsDiff.removed.map(component => (
                <Tag key={component} color="red">{component}</Tag>
              ))}
            </Col>
            <Col span={8}>
              <Title level={5}>Unchanged</Title>
              {comparison.componentsDiff.unchanged.map(component => (
                <Tag key={component} color="default">{component}</Tag>
              ))}
            </Col>
          </Row>
        </Card>
      </div>
    );
  };

  // Helper functions
  const getComponentCount = (data) => {
    if (!data) return 0;
    try {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      return Object.keys(parsedData).length;
    } catch {
      return 0;
    }
  };

  const getComplexityLevel = (componentCount) => {
    if (componentCount > 15) return 'High';
    if (componentCount > 8) return 'Medium';
    return 'Low';
  };

  const getComplexityColor = (complexity) => {
    switch (complexity) {
      case 'High': return 'red';
      case 'Medium': return 'orange';
      case 'Low': return 'green';
      default: return 'default';
    }
  };

  const getVersionTypeColor = (type) => {
    switch (type) {
      case VERSION_TYPES.MAJOR: return 'red';
      case VERSION_TYPES.MINOR: return 'blue';
      case VERSION_TYPES.PATCH: return 'green';
      default: return 'default';
    }
  };

  const getComponentTypes = (data) => {
    if (!data) return [];
    try {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      const types = new Set();
      
      Object.values(parsedData).forEach(node => {
        if (node.type?.resolvedName) {
          types.add(node.type.resolvedName);
        }
      });
      
      return Array.from(types);
    } catch {
      return [];
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Modal
      title="Template Preview"
      visible={visible}
      onCancel={onClose}
      width={1200}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button 
          key="save" 
          type="primary" 
          onClick={isExistingTemplate ? onUpdate : onSave}
        >
          {isExistingTemplate ? 'Update Template' : 'Save Template'}
        </Button>
      ]}
      className="template-preview-modal"
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane 
          tab={
            <span>
              <EyeOutlined />
              Preview
            </span>
          } 
          key="preview"
        >
          <div>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <Space>
                <Text strong>Viewport: </Text>
                <Button.Group>
                  <Tooltip title="Mobile">
                    <Button
                      icon={<MobileOutlined />}
                      type={viewportSize === 'mobile' ? 'primary' : 'default'}
                      onClick={() => setViewportSize('mobile')}
                    />
                  </Tooltip>
                  <Tooltip title="Tablet">
                    <Button
                      icon={<TabletOutlined />}
                      type={viewportSize === 'tablet' ? 'primary' : 'default'}
                      onClick={() => setViewportSize('tablet')}
                    />
                  </Tooltip>
                  <Tooltip title="Desktop">
                    <Button
                      icon={<DesktopOutlined />}
                      type={viewportSize === 'desktop' ? 'primary' : 'default'}
                      onClick={() => setViewportSize('desktop')}
                    />
                  </Tooltip>
                </Button.Group>
              </Space>
            </div>
            
            {renderPreviewFrame()}
          </div>
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <InfoCircleOutlined />
              Information
            </span>
          } 
          key="info"
        >
          {renderTemplateInfo()}
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <HistoryOutlined />
              Version History
            </span>
          } 
          key="versions"
        >
          {renderVersionHistory()}
        </TabPane>
        
        {comparison && (
          <TabPane 
            tab={
              <span>
                <SwapOutlined />
                Comparison
              </span>
            } 
            key="comparison"
          >
            {renderVersionComparison()}
          </TabPane>
        )}
      </Tabs>
    </Modal>
  );
};

export default TemplatePreview;