'use client';

import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Tabs, 
  Card, 
  Switch, 
  Slider, 
  Select, 
  Radio, 
  ColorPicker, 
  InputNumber,
  Space,
  Typography,
  Divider,
  Button,
  Row,
  Col,
  Alert,
  Form,
  Spin
} from 'antd';
import {
  SettingOutlined,
  AimOutlined,
  EyeOutlined,
  BgColorsOutlined,
  ThunderboltOutlined,
  BorderOutlined,
  HistoryOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  BulbOutlined,
  FormatPainterOutlined
} from '@ant-design/icons';
import { useEditorSettings } from '../utils/context/EditorSettingsContext';
import { snapGridSystem } from '../utils/grid/SnapGridSystem';

const { Text, Title } = Typography;
const { TabPane } = Tabs;

/**
 * EditorSettingsModal - Photoshop-style settings/preferences modal
 * Centralized configuration for all editor behavior and appearance
 * Now with live integration to SnapGridSystem
 */
const EditorSettingsModal = ({ visible, onClose }) => {
  const { settings, updateSetting, resetSettings, loading, isAuthenticated } = useEditorSettings();
  const [activeTab, setActiveTab] = useState('positioning');

  // Sync settings with SnapGridSystem - bidirectional sync
  useEffect(() => {
    if (visible) {
      // Get current snap grid settings to ensure we're in sync
      const currentSnapSettings = snapGridSystem.getSettings();
      
      // Update editor settings to match current snap grid state (prevent override)
      const syncedSettings = {
        'visual.showGrid': currentSnapSettings.gridEnabled,
        'visual.gridOpacity': currentSnapSettings.gridOpacity,
        'snap.enabled': currentSnapSettings.snapEnabled,
        'snap.tolerance': currentSnapSettings.snapThreshold,
        'grid.size': currentSnapSettings.gridSize,
        'visual.showGuides': currentSnapSettings.verticalGuidesEnabled
      };
      
      // Apply synced settings to editor context
      Object.entries(syncedSettings).forEach(([path, value]) => {
        if (settings[path.split('.')[0]]?.[path.split('.')[1]] !== value) {
          updateSetting(path, value);
        }
      });
    }
  }, [visible]);

  // Listen for SnapGrid changes and sync back to editor settings
  useEffect(() => {
    const handleSnapGridUpdate = (event) => {
      const { type } = event.detail;
      
      if (visible && (type.includes('settings') || type.includes('grid') || type.includes('snap'))) {
        const currentSnapSettings = snapGridSystem.getSettings();
        
        // Update editor settings to match snap grid changes
        updateSetting('visual.showGrid', currentSnapSettings.gridEnabled);
        updateSetting('visual.gridOpacity', currentSnapSettings.gridOpacity);
        updateSetting('snap.enabled', currentSnapSettings.snapEnabled);
        updateSetting('snap.tolerance', currentSnapSettings.snapThreshold);
        updateSetting('grid.size', currentSnapSettings.gridSize);
        updateSetting('visual.showGuides', currentSnapSettings.verticalGuidesEnabled);
      }
    };

    if (visible) {
      window.addEventListener('snapGridUpdate', handleSnapGridUpdate);
      return () => window.removeEventListener('snapGridUpdate', handleSnapGridUpdate);
    }
  }, [visible, updateSetting]);

  // Apply selection color to CSS variables when modal opens
  useEffect(() => {
    if (visible && settings.visual.selectionColor) {
      document.documentElement.style.setProperty('--selection-color', settings.visual.selectionColor);
    }
  }, [visible, settings.visual.selectionColor]);

  const handleReset = () => {
    Modal.confirm({
      title: 'Reset All Settings',
      icon: <ExclamationCircleOutlined />,
      content: 'Are you sure you want to reset all editor settings to their default values? This action cannot be undone.',
      okText: 'Reset',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        resetSettings();
      }
    });
  };

  // Positioning Settings Tab
  const PositioningTab = () => (
    <div style={{ padding: '16px 0' }}>
      <Card 
        title={
          <Space>
            <AimOutlined style={{ color: '#1890ff' }} />
            <span>Drop Position Behavior</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item label="Component Position on Drop">
              <Radio.Group
                value={settings.dropPosition.mode}
                onChange={(e) => updateSetting('dropPosition.mode', e.target.value)}
                style={{ width: '100%' }}
              >
                <Space>
                  <Radio 
                    value="center" 
                    title="Components are centered at your mouse cursor position (Figma-style)"
                  >
                    Center on Mouse
                  </Radio>
                  <Radio 
                    value="topLeft"
                    title="Component's top-left corner is positioned at your mouse cursor"
                  >
                    Top-Left at Mouse
                  </Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
          </Col>
          
          <Col span={24}>
            <Divider style={{ margin: '12px 0' }} />
            <Form.Item>
              <Space>
                <Switch
                  checked={settings.dropPosition.snapToGrid}
                  onChange={(checked) => updateSetting('dropPosition.snapToGrid', checked)}
                />
                <span>Snap dropped components to grid</span>
              </Space>
            </Form.Item>
          </Col>
        </Row>
      </Card>
    </div>
  );

  // Visual Settings Tab
  const VisualTab = () => (
    <div style={{ padding: '16px 0' }}>
      <Card 
        title={
          <Space>
            <EyeOutlined style={{ color: '#52c41a' }} />
            <span>Visual Guides & Feedback</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Form.Item label="Show Guides">
              <Switch
                checked={settings.visual.showGuides}
                onChange={(checked) => {
                  updateSetting('visual.showGuides', checked);
                  // Apply to grid system
                  snapGridSystem.updateSettings({ verticalGuidesEnabled: checked });
                }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Show Grid">
              <Switch
                checked={settings.visual.showGrid}
                onChange={(checked) => {
                  updateSetting('visual.showGrid', checked);
                  // Apply to grid system - both enable and visibility
                  snapGridSystem.setGridEnabled(checked);
                  snapGridSystem.setGridVisible(checked);
                }}
              />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item label="Grid Opacity">
              <Slider
                min={0}
                max={1}
                step={0.1}
                value={settings.visual.gridOpacity}
                onChange={(value) => {
                  updateSetting('visual.gridOpacity', value);
                  // Apply to grid system
                  snapGridSystem.updateSettings({ gridOpacity: value });
                }}
                tooltip={{ formatter: (value) => `${Math.round(value * 100)}%` }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Grid Size">
              <Slider
                min={8}
                max={32}
                step={8}
                value={settings.grid.size}
                onChange={(value) => {
                  updateSetting('grid.size', value);
                  // Apply to grid system
                  snapGridSystem.updateSettings({ gridSize: value });
                }}
                marks={{
                  8: '8px',
                  16: '16px',
                  24: '24px',
                  32: '32px'
                }}
                tooltip={{ formatter: (value) => `${value}px` }}
              />
            </Form.Item>
          </Col>
          
          <Col span={8}>
            <Form.Item label="Grid Color">
              <ColorPicker
                value={settings.grid.color}
                onChange={(color) => {
                  const colorString = color.toHexString();
                  updateSetting('grid.color', colorString);
                  // Apply to grid system
                  snapGridSystem.updateSettings({ gridColor: colorString });
                }}
                showText
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Guide Color">
              <ColorPicker
                value={settings.visual.guideColor}
                onChange={(color) => {
                  const colorString = color.toHexString();
                  updateSetting('visual.guideColor', colorString);
                  // Apply to grid system
                  snapGridSystem.updateSettings({ guideColor: colorString });
                }}
                showText
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Distance Color">
              <ColorPicker
                value={settings.visual.distanceColor || '#ff6600'}
                onChange={(color) => {
                  const colorString = color.toHexString();
                  updateSetting('visual.distanceColor', colorString);
                  // Apply to grid system
                  snapGridSystem.updateSettings({ distanceColor: colorString });
                }}
                showText
                size="small"
              />
            </Form.Item>
          </Col>
          
          <Col span={24}>
            <Form.Item label="Selection Color">
              <ColorPicker
                value={settings.visual.selectionColor}
                onChange={(color) => {
                  const colorString = color.toHexString();
                  updateSetting('visual.selectionColor', colorString);
                  // Apply selection color to document root for CSS variables
                  document.documentElement.style.setProperty('--selection-color', colorString);
                }}
                showText
                style={{ width: '50%' }}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>
    </div>
  );

  // Snap Settings Tab
  const SnapTab = () => (
    <div style={{ padding: '16px 0' }}>
      <Card 
        title={
          <Space>
            <BorderOutlined style={{ color: '#722ed1' }} />
            <span>Snap & Alignment</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Form.Item label="Enable Snapping">
              <Switch
                checked={settings.snap.enabled}
                onChange={(checked) => {
                  updateSetting('snap.enabled', checked);
                  // Apply to grid system
                  snapGridSystem.setSnapEnabled(checked);
                }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Snap Tolerance">
              <InputNumber
                min={1}
                max={20}
                value={settings.snap.tolerance}
                onChange={(value) => {
                  updateSetting('snap.tolerance', value);
                  // Apply to grid system
                  snapGridSystem.updateSettings({ snapThreshold: value });
                }}
                addonAfter="px"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          
          <Col span={8}>
            <Form.Item label="Snap to Components">
              <Switch
                checked={settings.snap.snapToComponents}
                onChange={(checked) => {
                  updateSetting('snap.snapToComponents', checked);
                  // Apply to grid system
                  snapGridSystem.updateSettings({ elementSnappingEnabled: checked });
                }}
                disabled={!settings.snap.enabled}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Snap to Grid">
              <Switch
                checked={settings.snap.snapToGrid}
                onChange={(checked) => {
                  updateSetting('snap.snapToGrid', checked);
                  // Apply to grid system if grid is also enabled
                  if (settings.visual.showGrid) {
                    snapGridSystem.updateSettings({ gridSnapEnabled: checked });
                  }
                }}
                disabled={!settings.snap.enabled}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Snap to Guides">
              <Switch
                checked={settings.snap.snapToGuides}
                onChange={(checked) => {
                  updateSetting('snap.snapToGuides', checked);
                  // Apply to grid system
                  snapGridSystem.updateSettings({ verticalGuidesEnabled: checked });
                }}
                disabled={!settings.snap.enabled}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>
    </div>
  );

  // Animation Settings Tab
  const AnimationTab = () => (
    <div style={{ padding: '16px 0' }}>
      <Card 
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#faad14' }} />
            <span>Animations & Transitions</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item label="Enable Animations">
              <Switch
                checked={settings.animation.enabled}
                onChange={(checked) => updateSetting('animation.enabled', checked)}
              />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item label="Animation Duration">
              <Slider
                min={100}
                max={1000}
                step={50}
                value={settings.animation.duration}
                onChange={(value) => updateSetting('animation.duration', value)}
                tooltip={{ formatter: (value) => `${value}ms` }}
                disabled={!settings.animation.enabled}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Easing Function">
              <Select
                value={settings.animation.easing}
                onChange={(value) => updateSetting('animation.easing', value)}
                disabled={!settings.animation.enabled}
                style={{ width: '100%' }}
                options={[
                  { value: 'ease', label: 'Ease' },
                  { value: 'ease-in', label: 'Ease In' },
                  { value: 'ease-out', label: 'Ease Out' },
                  { value: 'ease-in-out', label: 'Ease In Out' },
                  { value: 'linear', label: 'Linear' }
                ]}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>
    </div>
  );

  // Theme Settings Tab
  const ThemeTab = () => (
    <div style={{ padding: '16px 0' }}>
      <Card 
        title={
          <Space>
            <BulbOutlined style={{ color: '#faad14' }} />
            <span>Theme & Appearance</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Form.Item label="Theme Mode">
              <Radio.Group
                value={settings.theme.mode}
                onChange={(e) => {
                  const mode = e.target.value;
                  updateSetting('theme.mode', mode);
                  // Apply theme immediately
                  applyTheme(mode);
                }}
                style={{ width: '100%' }}
              >
                <Space direction="vertical">
                  <Radio value="light">
                    <Space>
                      <span>☀️ Light Mode</span>
                      <span style={{ color: '#666', fontSize: '12px' }}>Default bright theme</span>
                    </Space>
                  </Radio>
                  <Radio value="dark">
                    <Space>
                      <span>🌙 Dark Mode</span>
                      <span style={{ color: '#666', fontSize: '12px' }}>Easy on the eyes</span>
                    </Space>
                  </Radio>
                  <Radio value="auto">
                    <Space>
                      <span>🔄 Auto</span>
                      <span style={{ color: '#666', fontSize: '12px' }}>Follow system preference</span>
                    </Space>
                  </Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
          </Col>
          
          <Col span={24}>
            <Divider style={{ margin: '12px 0' }} />
            <Alert
              message="Theme Preview"
              description="Theme changes apply immediately. Dark mode affects the entire editor interface including panels, toolbars, and canvas."
              type="info"
              showIcon
            />
          </Col>
        </Row>
      </Card>
    </div>
  );

  // Apply theme function
  const applyTheme = (mode) => {
    const root = document.documentElement;
    const body = document.body;
    
    if (mode === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      mode = prefersDark ? 'dark' : 'light';
    }
    
    if (mode === 'dark') {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
      body.classList.add('dark-theme');
      body.classList.remove('light-theme');
      
      // Apply dark mode CSS variables - only for editor elements
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#1f1f1f');
      root.style.setProperty('--bg-tertiary', '#262626');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#bfbfbf');
      root.style.setProperty('--text-disabled', '#595959');
      root.style.setProperty('--border-color', '#2a2a2a');
      root.style.setProperty('--panel-bg', '#1f1f1f');
      root.style.setProperty('--panel-background', '#1f1f1f');
      root.style.setProperty('--canvas-bg', '#0f0f0f');
      root.style.setProperty('--canvas-background', '#0f0f0f');
      
      // Apply dark presets to color settings (only if colors haven't been manually set)
      const darkPresets = {
        canvas: {
          background: '#0f0f0f',
          gridLines: '#2a2a2a',
          rulers: '#262626'
        },
        panels: {
          background: '#1f1f1f',
          border: '#2a2a2a',
          text: '#ffffff',
          accent: '#1890ff'
        },
        components: {
          selection: '#40a9ff',
          hover: '#69c0ff',
          guides: '#1890ff',
          distance: '#ff7a45'
        },
        interface: {
          primary: '#ffffff',
          secondary: '#bfbfbf',
          disabled: '#595959',
          success: '#73d13d',
          warning: '#ffc53d',
          error: '#ff7875'
        }
      };
      
      // Apply dark presets to settings
      Object.entries(darkPresets).forEach(([category, colors]) => {
        Object.entries(colors).forEach(([colorKey, colorValue]) => {
          updateSetting(`colors.${category}.${colorKey}`, colorValue);
          // Also apply to CSS variables immediately
          root.style.setProperty(`--${category.replace('s', '')}-${colorKey.replace(/([A-Z])/g, '-$1').toLowerCase()}`, colorValue);
        });
      });
      
    } else {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
      body.classList.add('light-theme');
      body.classList.remove('dark-theme');
      
      // Apply light mode CSS variables
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#fafafa');
      root.style.setProperty('--bg-tertiary', '#f5f5f5');
      root.style.setProperty('--text-primary', '#000000');
      root.style.setProperty('--text-secondary', '#666666');
      root.style.setProperty('--text-disabled', '#bfbfbf');
      root.style.setProperty('--border-color', '#d9d9d9');
      root.style.setProperty('--panel-bg', '#fafafa');
      root.style.setProperty('--panel-background', '#fafafa');
      root.style.setProperty('--canvas-bg', '#ffffff');
      root.style.setProperty('--canvas-background', '#ffffff');
      
      // Apply light presets to color settings
      const lightPresets = {
        canvas: {
          background: '#ffffff',
          gridLines: '#e0e0e0',
          rulers: '#f5f5f5'
        },
        panels: {
          background: '#fafafa',
          border: '#d9d9d9',
          text: '#000000',
          accent: '#1890ff'
        },
        components: {
          selection: '#0088ff',
          hover: '#40a9ff',
          guides: '#0066ff',
          distance: '#ff6600'
        },
        interface: {
          primary: '#000000',
          secondary: '#666666',
          disabled: '#bfbfbf',
          success: '#52c41a',
          warning: '#faad14',
          error: '#ff4d4f'
        }
      };
      
      // Apply light presets to settings
      Object.entries(lightPresets).forEach(([category, colors]) => {
        Object.entries(colors).forEach(([colorKey, colorValue]) => {
          updateSetting(`colors.${category}.${colorKey}`, colorValue);
          // Also apply to CSS variables immediately
          root.style.setProperty(`--${category.replace('s', '')}-${colorKey.replace(/([A-Z])/g, '-$1').toLowerCase()}`, colorValue);
        });
      });
    }
    
    // Force re-render of Ant Design components
    setTimeout(() => {
      const event = new Event('themechange');
      window.dispatchEvent(event);
    }, 100);
  };

  // Colors Tab
  const ColorsTab = () => (
    <div style={{ padding: '16px 0' }}>
      <Card 
        title={
          <Space>
            <FormatPainterOutlined style={{ color: '#722ed1' }} />
            <span>Canvas & Background</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Form.Item label="Canvas Background">
              <ColorPicker
                value={settings.colors?.canvas?.background || '#ffffff'}
                onChange={(color) => {
                  const colorString = color.toHexString();
                  updateSetting('colors.canvas.background', colorString);
                  // Apply immediately to CSS variables
                  document.documentElement.style.setProperty('--canvas-background', colorString);
                  document.documentElement.style.setProperty('--canvas-bg', colorString);
                }}
                showText
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Grid Lines">
              <ColorPicker
                value={settings.colors?.canvas?.gridLines || '#e0e0e0'}
                onChange={(color) => {
                  const colorString = color.toHexString();
                  updateSetting('colors.canvas.gridLines', colorString);
                  // Apply immediately to CSS variables
                  document.documentElement.style.setProperty('--grid-lines', colorString);
                }}
                showText
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Rulers">
              <ColorPicker
                value={settings.colors?.canvas?.rulers || '#f5f5f5'}
                onChange={(color) => {
                  const colorString = color.toHexString();
                  updateSetting('colors.canvas.rulers', colorString);
                  // Apply immediately to CSS variables
                  document.documentElement.style.setProperty('--rulers-bg', colorString);
                }}
                showText
                size="small"
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card 
        title={
          <Space>
            <BgColorsOutlined style={{ color: '#1890ff' }} />
            <span>UI Panels</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Form.Item label="Panel Background">
              <ColorPicker
                value={settings.colors?.panels?.background || '#fafafa'}
                onChange={(color) => {
                  const colorString = color.toHexString();
                  updateSetting('colors.panels.background', colorString);
                  // Apply immediately to CSS variables
                  document.documentElement.style.setProperty('--panel-background', colorString);
                  document.documentElement.style.setProperty('--panel-bg', colorString);
                  document.documentElement.style.setProperty('--bg-secondary', colorString);
                }}
                showText
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Panel Border">
              <ColorPicker
                value={settings.colors?.panels?.border || '#d9d9d9'}
                onChange={(color) => {
                  const colorString = color.toHexString();
                  updateSetting('colors.panels.border', colorString);
                  // Apply immediately to CSS variables
                  document.documentElement.style.setProperty('--panel-border', colorString);
                  document.documentElement.style.setProperty('--border-color', colorString);
                }}
                showText
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Panel Text">
              <ColorPicker
                value={settings.colors?.panels?.text || '#000000'}
                onChange={(color) => {
                  const colorString = color.toHexString();
                  updateSetting('colors.panels.text', colorString);
                  // Apply immediately to CSS variables
                  document.documentElement.style.setProperty('--panel-text', colorString);
                  document.documentElement.style.setProperty('--text-primary', colorString);
                }}
                showText
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Accent Color">
              <ColorPicker
                value={settings.colors?.panels?.accent || '#1890ff'}
                onChange={(color) => {
                  const colorString = color.toHexString();
                  updateSetting('colors.panels.accent', colorString);
                  // Apply immediately to CSS variables
                  document.documentElement.style.setProperty('--panel-accent', colorString);
                }}
                showText
                size="small"
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card 
        title={
          <Space>
            <BorderOutlined style={{ color: '#52c41a' }} />
            <span>Components</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Form.Item label="Selection">
              <ColorPicker
                value={settings.colors?.components?.selection || '#0088ff'}
                onChange={(color) => updateSetting('colors.components.selection', color.toHexString())}
                showText
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Hover">
              <ColorPicker
                value={settings.colors?.components?.hover || '#40a9ff'}
                onChange={(color) => updateSetting('colors.components.hover', color.toHexString())}
                showText
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Guides">
              <ColorPicker
                value={settings.colors?.components?.guides || '#0066ff'}
                onChange={(color) => updateSetting('colors.components.guides', color.toHexString())}
                showText
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Distance">
              <ColorPicker
                value={settings.colors?.components?.distance || '#ff6600'}
                onChange={(color) => updateSetting('colors.components.distance', color.toHexString())}
                showText
                size="small"
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card 
        title={
          <Space>
            <EyeOutlined style={{ color: '#faad14' }} />
            <span>Text & Interface</span>
          </Space>
        }
        size="small"
      >
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Form.Item label="Primary Text">
              <ColorPicker
                value={settings.colors?.interface?.primary || '#000000'}
                onChange={(color) => {
                  const colorString = color.toHexString();
                  updateSetting('colors.interface.primary', colorString);
                  // Apply immediately to CSS variables
                  document.documentElement.style.setProperty('--text-primary', colorString);
                }}
                showText
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Secondary Text">
              <ColorPicker
                value={settings.colors?.interface?.secondary || '#666666'}
                onChange={(color) => {
                  const colorString = color.toHexString();
                  updateSetting('colors.interface.secondary', colorString);
                  // Apply immediately to CSS variables
                  document.documentElement.style.setProperty('--text-secondary', colorString);
                }}
                showText
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Disabled Text">
              <ColorPicker
                value={settings.colors?.interface?.disabled || '#bfbfbf'}
                onChange={(color) => {
                  const colorString = color.toHexString();
                  updateSetting('colors.interface.disabled', colorString);
                  // Apply immediately to CSS variables
                  document.documentElement.style.setProperty('--text-disabled', colorString);
                }}
                showText
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Success">
              <ColorPicker
                value={settings.colors?.interface?.success || '#52c41a'}
                onChange={(color) => {
                  const colorString = color.toHexString();
                  updateSetting('colors.interface.success', colorString);
                  // Apply immediately to CSS variables
                  document.documentElement.style.setProperty('--success-color', colorString);
                }}
                showText
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Warning">
              <ColorPicker
                value={settings.colors?.interface?.warning || '#faad14'}
                onChange={(color) => {
                  const colorString = color.toHexString();
                  updateSetting('colors.interface.warning', colorString);
                  // Apply immediately to CSS variables
                  document.documentElement.style.setProperty('--warning-color', colorString);
                }}
                showText
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Error">
              <ColorPicker
                value={settings.colors?.interface?.error || '#ff4d4f'}
                onChange={(color) => {
                  const colorString = color.toHexString();
                  updateSetting('colors.interface.error', colorString);
                  // Apply immediately to CSS variables
                  document.documentElement.style.setProperty('--error-color', colorString);
                }}
                showText
                size="small"
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>
      
      <Alert
        message="Color Presets"
        description="Colors automatically update when switching between light and dark themes. You can still customize individual colors after theme changes."
        type="info"
        showIcon
        style={{ marginTop: 16 }}
      />
    </div>
  );

  // Apply initial theme on mount and when modal becomes visible
  useEffect(() => {
    if (!loading && visible && settings.theme) {
      applyTheme(settings.theme.mode);
    }
  }, [loading, visible, settings.theme?.mode]);

  // Apply theme on settings change
  useEffect(() => {
    if (!loading) {
      applyTheme(settings.theme?.mode || 'light');
    }
  }, [settings.theme?.mode, loading]);

  // Listen for system theme changes
  useEffect(() => {
    if (settings.theme.mode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('auto');
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings.theme.mode]);

  // Apply color customizations to CSS variables
  useEffect(() => {
    if (!loading && settings.colors) {
      const root = document.documentElement;
      
      // Apply canvas colors
      if (settings.colors.canvas) {
        root.style.setProperty('--canvas-background', settings.colors.canvas.background);
        root.style.setProperty('--grid-lines', settings.colors.canvas.gridLines);
        root.style.setProperty('--rulers-bg', settings.colors.canvas.rulers);
        root.style.setProperty('--canvas-bg', settings.colors.canvas.background);
      }
      
      // Apply panel colors
      if (settings.colors.panels) {
        root.style.setProperty('--panel-background', settings.colors.panels.background);
        root.style.setProperty('--panel-border', settings.colors.panels.border);
        root.style.setProperty('--panel-text', settings.colors.panels.text);
        root.style.setProperty('--panel-accent', settings.colors.panels.accent);
        root.style.setProperty('--panel-bg', settings.colors.panels.background);
        root.style.setProperty('--border-color', settings.colors.panels.border);
        root.style.setProperty('--text-primary', settings.colors.panels.text);
      }
      
      // Apply component colors
      if (settings.colors.components) {
        root.style.setProperty('--selection-color', settings.colors.components.selection);
        root.style.setProperty('--hover-color', settings.colors.components.hover);
        root.style.setProperty('--guides-color', settings.colors.components.guides);
        root.style.setProperty('--distance-color', settings.colors.components.distance);
      }
      
      // Apply interface colors
      if (settings.colors.interface) {
        root.style.setProperty('--text-primary', settings.colors.interface.primary);
        root.style.setProperty('--text-secondary', settings.colors.interface.secondary);
        root.style.setProperty('--text-disabled', settings.colors.interface.disabled);
        root.style.setProperty('--success-color', settings.colors.interface.success);
        root.style.setProperty('--warning-color', settings.colors.interface.warning);
        root.style.setProperty('--error-color', settings.colors.interface.error);
      }
      
      // Force repaint of components
      setTimeout(() => {
        const event = new Event('colorchange');
        window.dispatchEvent(event);
      }, 50);
    }
  }, [settings.colors, loading]);

  // Performance Settings Tab
  const PerformanceTab = () => (
    <div style={{ padding: '16px 0' }}>
      <Card 
        title={
          <Space>
            <HistoryOutlined style={{ color: '#f5222d' }} />
            <span>Performance & History</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Form.Item label="Real-time Updates">
              <Switch
                checked={settings.performance.realTimeUpdates}
                onChange={(checked) => updateSetting('performance.realTimeUpdates', checked)}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Throttle Delay">
              <InputNumber
                min={16}
                max={100}
                value={settings.performance.throttleDelay}
                onChange={(value) => updateSetting('performance.throttleDelay', value)}
                addonAfter="ms"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          
          <Col span={24}>
            <Form.Item label="Maximum History Steps">
              <Slider
                min={10}
                max={100}
                value={settings.performance.maxHistorySteps}
                onChange={(value) => updateSetting('performance.maxHistorySteps', value)}
                tooltip={{ formatter: (value) => `${value} steps` }}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Alert
        message="Performance Tips"
        description="Reducing real-time updates and history steps can improve performance on slower devices."
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />
    </div>
  );

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SettingOutlined style={{ color: '#1890ff' }} />
          <span>Editor Settings</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={800}
      zIndex={99999999}
      getContainer={false}
      mask={true}
      styles={{
        body: {
          height: '30rem',
          overflowY: 'scroll',
          padding: 0
        },
        mask: {
          zIndex: 99999998
        },
        wrapper: {
          zIndex: 99999999
        }
      }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Button 
              icon={<ReloadOutlined />}
              onClick={handleReset}
              danger
            >
              Reset to Defaults
            </Button>
            <span style={{ marginLeft: 16, fontSize: '12px', color: '#666' }}>
              {isAuthenticated ? 
                '✅ Settings saved to cloud' : 
                '💾 Settings saved locally'
              }
            </span>
          </div>
          <Button type="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      {loading ? (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '30rem' 
        }}>
          <Spin size="large" tip="Loading settings..." />
        </div>
      ) : (
        <>
          {!isAuthenticated && (
            <Alert
              message="Guest Mode"
              description="Settings are saved locally. Sign in to sync across devices."
              type="info"
              showIcon
              style={{ margin: 16, marginBottom: 0 }}
            />
          )}
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            type="card"
            size="small"
            style={{ padding: '16px' }}
          >
            <TabPane 
              tab={
                <Space>
                  <AimOutlined />
                  <span>Positioning</span>
                </Space>
              } 
              key="positioning"
            >
              <PositioningTab />
            </TabPane>
            
            <TabPane 
              tab={
                <Space>
                  <EyeOutlined />
                  <span>Visual</span>
                </Space>
              } 
              key="visual"
            >
              <VisualTab />
            </TabPane>
            
            <TabPane 
              tab={
                <Space>
                  <BorderOutlined />
                  <span>Snap</span>
                </Space>
              } 
              key="snap"
            >
              <SnapTab />
            </TabPane>
            
            <TabPane 
              tab={
                <Space>
                  <ThunderboltOutlined />
                  <span>Animation</span>
                </Space>
              } 
              key="animation"
            >
              <AnimationTab />
            </TabPane>
            
            <TabPane 
              tab={
                <Space>
                  <HistoryOutlined />
                  <span>Performance</span>
                </Space>
              } 
              key="performance"
            >
              <PerformanceTab />
            </TabPane>

            <TabPane 
              tab={
                <Space>
                  <BulbOutlined />
                  <span>Theme</span>
                </Space>
              } 
              key="theme"
            >
              <ThemeTab />
            </TabPane>

            <TabPane 
              tab={
                <Space>
                  <FormatPainterOutlined />
                  <span>Colors</span>
                </Space>
              } 
              key="colors"
            >
              <ColorsTab />
            </TabPane>
          </Tabs>
        </>
      )}
    </Modal>
  );
};

export default EditorSettingsModal;
