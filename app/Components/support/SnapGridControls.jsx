'use client';

import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Dropdown, 
  Switch, 
  Slider, 
  Space, 
  Typography, 
  Divider,
  Radio,
  Tooltip,
  Card
} from 'antd';
import {
  BorderOutlined,
  BgColorsOutlined,
  SettingOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CompressOutlined,
  ExpandOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined
} from '@ant-design/icons';
import { snapGridSystem, GRID_PRESETS } from './SnapGridSystem';

const { Text } = Typography;

/**
 * SnapGridControls - Control panel for snap and grid system
 * Similar to Figma's grid and snap controls
 */
const SnapGridControls = ({ className = '' }) => {
  const [settings, setSettings] = useState(snapGridSystem.getSettings());
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // Listen for settings updates
  useEffect(() => {
    const handleSnapGridUpdate = (event) => {
      const { type } = event.detail;
      
      if (type.includes('settings') || type.includes('grid') || type.includes('snap')) {
        setSettings(snapGridSystem.getSettings());
      }
    };

    window.addEventListener('snapGridUpdate', handleSnapGridUpdate);
    return () => window.removeEventListener('snapGridUpdate', handleSnapGridUpdate);
  }, []);

  // Update settings
  const updateSetting = (key, value) => {
    snapGridSystem.updateSettings({ [key]: value });
  };

  // Toggle functions
  const toggleGrid = (checked) => {
    console.log('Toggle grid called with:', checked);
    snapGridSystem.setGridEnabled(checked);
  };

  const toggleGridVisibility = (e) => {
    e.stopPropagation(); // Prevent dropdown from opening
    console.log('Toggle grid visibility called');
    snapGridSystem.toggleGridVisibility();
  };

  const toggleSnap = (checked) => {
    console.log('Toggle snap called with:', checked);
    snapGridSystem.setSnapEnabled(checked);
  };

  // Grid size presets
  const gridSizeOptions = Object.entries(GRID_PRESETS).map(([key, preset]) => ({
    key,
    label: (
      <div className="flex items-center justify-between min-w-[120px]">
        <span>{preset.label}</span>
        <span className="text-gray-400 text-xs">{preset.size}px</span>
      </div>
    ),
    onClick: () => updateSetting('gridSize', preset.size)
  }));

  // Snap threshold presets
  const snapThresholdOptions = [
    { value: 4, label: '4px (Precise)' },
    { value: 8, label: '8px (Default)' },
    { value: 12, label: '12px (Relaxed)' },
    { value: 16, label: '16px (Loose)' }
  ];

  const controlsDropdown = (
    <div className="bg-white rounded-lg shadow-lg border p-4 min-w-[280px] max-w-[320px]">
      {/* Grid Controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Text strong>Grid System</Text>
          <Space>
            <Tooltip title={settings.gridVisible ? "Hide grid" : "Show grid"}>
              <Button
                type="text"
                size="small"
                icon={settings.gridVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                onClick={toggleGridVisibility}
                className={settings.gridVisible ? 'text-blue-500' : 'text-gray-400'}
              />
            </Tooltip>
            <Switch
              size="small"
              checked={settings.gridEnabled}
              onChange={toggleGrid}
            />
          </Space>
        </div>

        {settings.gridEnabled && (
          <div className="space-y-3 pl-2 border-l-2 border-gray-100">
            {/* Grid Size */}
            <div>
              <Text className="text-sm text-gray-600">Grid Size</Text>
              <div className="mt-1">
                <Radio.Group
                  size="small"
                  value={settings.gridSize}
                  onChange={(e) => updateSetting('gridSize', e.target.value)}
                >
                  {Object.values(GRID_PRESETS).map(preset => (
                    <Radio.Button key={preset.size} value={preset.size}>
                      {preset.size}px
                    </Radio.Button>
                  ))}
                </Radio.Group>
              </div>
            </div>

            {/* Grid Opacity */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Text className="text-sm text-gray-600">Grid Opacity</Text>
                <Text className="text-xs text-gray-400">
                  {Math.round(settings.gridOpacity * 100)}%
                </Text>
              </div>
              <Slider
                min={0.1}
                max={1}
                step={0.1}
                value={settings.gridOpacity}
                onChange={(value) => updateSetting('gridOpacity', value)}
                size="small"
              />
            </div>
          </div>
        )}

        <Divider style={{ margin: '12px 0' }} />

        {/* Snap Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Text strong>Smart Snapping</Text>
            <Switch
              size="small"
              checked={settings.snapEnabled}
              onChange={toggleSnap}
            />
          </div>

          {settings.snapEnabled && (
            <div className="space-y-3 pl-2 border-l-2 border-gray-100">
              {/* Snap Threshold */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Text className="text-sm text-gray-600">Snap Sensitivity</Text>
                  <Text className="text-xs text-gray-400">
                    {settings.snapThreshold}px
                  </Text>
                </div>
                <Slider
                  min={2}
                  max={20}
                  step={2}
                  value={settings.snapThreshold}
                  onChange={(value) => updateSetting('snapThreshold', value)}
                  size="small"
                  marks={{
                    4: '4px',
                    8: '8px',
                    12: '12px',
                    16: '16px'
                  }}
                />
              </div>

              {/* Element Snap Threshold */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Text className="text-sm text-gray-600">Element Snap Range</Text>
                  <Text className="text-xs text-gray-400">
                    {settings.elementSnapThreshold}px
                  </Text>
                </div>
                <Slider
                  min={6}
                  max={24}
                  step={2}
                  value={settings.elementSnapThreshold}
                  onChange={(value) => updateSetting('elementSnapThreshold', value)}
                  size="small"
                />
              </div>
            </div>
          )}
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* Keyboard Shortcuts */}
        <div>
          <Text strong className="text-sm">Keyboard Shortcuts</Text>
          <div className="mt-2 space-y-1 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Toggle Grid</span>
              <kbd className="px-1 py-0.5 bg-gray-100 rounded">G</kbd>
            </div>
            <div className="flex justify-between">
              <span>Toggle Grid Visibility</span>
              <kbd className="px-1 py-0.5 bg-gray-100 rounded">Ctrl + '</kbd>
            </div>
            <div className="flex justify-between">
              <span>Toggle Snap</span>
              <kbd className="px-1 py-0.5 bg-gray-100 rounded">Ctrl + ;</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {/* Grid Toggle Button */}
      <Tooltip title={`Grid ${settings.gridEnabled ? 'ON' : 'OFF'} (G)`}>
        <Button
          type="text"
          size="small"
          icon={<BorderOutlined />}
          onClick={toggleGrid}
          className={`relative ${settings.gridEnabled ? 'text-blue-500 bg-blue-50' : 'text-gray-600'}`}
        >
          {settings.gridEnabled && settings.gridVisible && (
            <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full transform translate-x-1 -translate-y-1" />
          )}
        </Button>
      </Tooltip>

      {/* Snap Toggle Button */}
      <Tooltip title={`Snap ${settings.snapEnabled ? 'ON' : 'OFF'} (Ctrl+;)`}>
        <Button
          type="text"
          size="small"
          icon={<CompressOutlined />}
          onClick={toggleSnap}
          className={`relative ${settings.snapEnabled ? 'text-green-500 bg-green-50' : 'text-gray-600'}`}
        >
          {settings.snapEnabled && (
            <div className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full transform translate-x-1 -translate-y-1" />
          )}
        </Button>
      </Tooltip>

      {/* Settings Button with Dropdown */}
      <Dropdown
        popupRender={() => controlsDropdown}
        trigger={['click']}
        placement="bottomRight"
        open={dropdownVisible}
        onOpenChange={setDropdownVisible}
      >
        <Tooltip title="Grid & Snap Settings">
          <Button
            type="text"
            size="small"
            icon={<SettingOutlined />}
            className={dropdownVisible ? 'text-blue-500 bg-blue-50' : 'text-gray-600'}
          />
        </Tooltip>
      </Dropdown>

      {/* Current Grid Size Indicator */}
      {settings.gridEnabled && (
        <div className="text-xs text-gray-500 px-1 py-0.5 bg-gray-100 rounded">
          {settings.gridSize}px
        </div>
      )}

      {/* Status Indicators */}
      {(settings.gridEnabled || settings.snapEnabled) && (
        <div className="flex items-center space-x-1">
          {settings.gridEnabled && (
            <div className="text-xs text-blue-600 font-medium">Grid</div>
          )}
          {settings.snapEnabled && (
            <div className="text-xs text-green-600 font-medium">Snap</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SnapGridControls;
