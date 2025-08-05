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
  Card,
  Alert
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
  AlignRightOutlined,
  ColumnWidthOutlined,
  AimOutlined
} from '@ant-design/icons';
import { snapGridSystem, GRID_PRESETS } from './SnapGridSystem';
import { useEditorSettings } from '../context/EditorSettingsContext';

const { Text } = Typography;

/**
 * SnapGridControls - Control panel for snap and grid system
 * Similar to Figma's grid and snap controls
 */
const SnapGridControls = ({ className = '' }) => {
  const [settings, setSettings] = useState(snapGridSystem.getSettings());
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const { settings: editorSettings, updateSetting: updateEditorSetting } = useEditorSettings();

  // Listen for settings updates from both SnapGrid and EditorSettings
  useEffect(() => {
    const handleSnapGridUpdate = (event) => {
      const { type } = event.detail;
      
      if (type.includes('settings') || type.includes('grid') || type.includes('snap')) {
        setSettings(snapGridSystem.getSettings());
      }
    };

    const handleEditorSettingsUpdate = () => {
      // Sync editor settings to snap grid when they change
      const currentSnapSettings = snapGridSystem.getSettings();
      
      // Only sync if there are actual differences to prevent infinite loops
      const needsSync = 
        currentSnapSettings.gridEnabled !== editorSettings.visual.showGrid ||
        currentSnapSettings.gridOpacity !== editorSettings.visual.gridOpacity ||
        currentSnapSettings.snapEnabled !== editorSettings.snap.enabled ||
        currentSnapSettings.snapThreshold !== editorSettings.snap.tolerance ||
        currentSnapSettings.gridSize !== editorSettings.grid.size ||
        currentSnapSettings.gridColor !== editorSettings.grid.color ||
        currentSnapSettings.guideColor !== editorSettings.visual.guideColor ||
        currentSnapSettings.distanceColor !== editorSettings.visual.distanceColor;
      
      if (needsSync) {
        snapGridSystem.updateSettings({
          gridEnabled: editorSettings.visual.showGrid,
          gridVisible: editorSettings.visual.showGrid,
          gridOpacity: editorSettings.visual.gridOpacity,
          snapEnabled: editorSettings.snap.enabled,
          snapThreshold: editorSettings.snap.tolerance,
          gridSize: editorSettings.grid.size,
          verticalGuidesEnabled: editorSettings.visual.showGuides,
          gridColor: editorSettings.grid.color,
          guideColor: editorSettings.visual.guideColor,
          distanceColor: editorSettings.visual.distanceColor,
          selectionColor: editorSettings.visual.selectionColor
        });
      }
    };

    window.addEventListener('snapGridUpdate', handleSnapGridUpdate);
    
    // Sync on mount and when editor settings change
    handleEditorSettingsUpdate();
    
    return () => window.removeEventListener('snapGridUpdate', handleSnapGridUpdate);
  }, [editorSettings]);

  // Update settings
  const updateSetting = (key, value) => {
    snapGridSystem.updateSettings({ [key]: value });
  };

  // Toggle functions
  const toggleGrid = (checked) => {
    snapGridSystem.setGridEnabled(checked);
  };

  const toggleGridVisibility = (e) => {
    e.stopPropagation(); // Prevent dropdown from opening
    snapGridSystem.toggleGridVisibility();
  };

  const toggleSnap = (checked) => {
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
    <div 
      className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200/50 p-4 min-w-[280px] max-w-[320px]" 
      style={{ 
        height: '30rem', 
        overflowY: 'scroll',
        zIndex: '99999999 !important',
        position: 'fixed'
      }}
    >
      {/* Drop Position Controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AimOutlined className="text-blue-500" />
            <Text strong className="text-sm">Drop Position</Text>
          </div>
        </div>

        <div className="bg-blue-50/50 rounded-lg p-3 space-y-3">
          {/* Position Mode Buttons */}
          <div>
            <Text className="text-xs text-gray-600 mb-2 block">Position Mode</Text>
            <div className="flex space-x-1">
              <Tooltip title="Center component at mouse cursor (Figma-style)">
                <Button
                  size="small"
                  type={editorSettings.dropPosition.mode === 'center' ? 'primary' : 'default'}
                  onClick={() => updateEditorSetting('dropPosition.mode', 'center')}
                  className="flex-1 text-xs"
                >
                  Center
                </Button>
              </Tooltip>
              <Tooltip title="Position top-left corner at mouse cursor">
                <Button
                  size="small"
                  type={editorSettings.dropPosition.mode === 'topLeft' ? 'primary' : 'default'}
                  onClick={() => updateEditorSetting('dropPosition.mode', 'topLeft')}
                  className="flex-1 text-xs"
                >
                  Top-Left
                </Button>
              </Tooltip>
            </div>
          </div>

          {/* Snap to Grid Toggle */}
          <div className="flex items-center justify-between">
            <Tooltip title="Snap dropped components to grid points">
              <Text className="text-xs text-gray-600">Snap to Grid</Text>
            </Tooltip>
            <Switch
              size="small"
              checked={editorSettings.dropPosition.snapToGrid}
              onChange={(checked) => updateEditorSetting('dropPosition.snapToGrid', checked)}
              disabled={!settings.snapEnabled}
            />
          </div>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        {/* Grid Controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BorderOutlined className="text-green-500" />
              <Text strong className="text-sm">Grid System</Text>
            </div>
            <div className="flex items-center space-x-1">
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
            </div>
          </div>

          {settings.gridEnabled && (
            <div className="bg-green-50/50 rounded-lg p-3 space-y-3">
              {/* Grid Size Buttons */}
              <div>
                <Text className="text-xs text-gray-600 mb-2 block">Grid Size</Text>
                <div className="grid grid-cols-4 gap-1">
                  {Object.values(GRID_PRESETS).map(preset => (
                    <Tooltip key={preset.size} title={preset.label}>
                      <Button
                        size="small"
                        type={settings.gridSize === preset.size ? 'primary' : 'default'}
                        onClick={() => updateSetting('gridSize', preset.size)}
                        className="text-xs"
                      >
                        {preset.size}
                      </Button>
                    </Tooltip>
                  ))}
                </div>
              </div>

              {/* Grid Opacity */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Text className="text-xs text-gray-600">Opacity</Text>
                  <Text className="text-xs text-gray-500">{Math.round(settings.gridOpacity * 100)}%</Text>
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
        </div>

        <Divider style={{ margin: '16px 0' }} />

        {/* Snap Controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CompressOutlined className="text-purple-500" />
              <Text strong className="text-sm">Smart Snapping</Text>
            </div>
            <Switch
              size="small"
              checked={settings.snapEnabled}
              onChange={toggleSnap}
            />
          </div>

          {settings.snapEnabled && (
            <div className="bg-purple-50/50 rounded-lg p-3 space-y-3">
              {/* Snap Options */}
              <div className="grid grid-cols-2 gap-2">
                <Tooltip title="Snap to other components">
                  <Button
                    size="small"
                    type={settings.elementSnappingEnabled ? 'primary' : 'default'}
                    onClick={() => updateSetting('elementSnappingEnabled', !settings.elementSnappingEnabled)}
                    className="text-xs"
                  >
                    Elements
                  </Button>
                </Tooltip>
                <Tooltip title="Snap to grid points">
                  <Button
                    size="small"
                    type={settings.gridSnapEnabled ? 'primary' : 'default'}
                    onClick={() => updateSetting('gridSnapEnabled', !settings.gridSnapEnabled)}
                    className="text-xs"
                  >
                    Grid
                  </Button>
                </Tooltip>
                <Tooltip title="Snap to vertical guides">
                  <Button
                    size="small"
                    type={settings.verticalGuidesEnabled ? 'primary' : 'default'}
                    onClick={() => updateSetting('verticalGuidesEnabled', !settings.verticalGuidesEnabled)}
                    className="text-xs"
                  >
                    Guides
                  </Button>
                </Tooltip>
                <Tooltip title="Safe area guides (960px)">
                  <Button
                    size="small"
                    type={settings.safeAreaEnabled ? 'primary' : 'default'}
                    onClick={() => updateSetting('safeAreaEnabled', !settings.safeAreaEnabled)}
                    className="text-xs"
                  >
                    Safe Area
                  </Button>
                </Tooltip>
              </div>

              {/* Snap Sensitivity */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Tooltip title="How close you need to get before snapping occurs">
                    <Text className="text-xs text-gray-600">Sensitivity</Text>
                  </Tooltip>
                  <Text className="text-xs text-gray-500">{settings.snapThreshold}px</Text>
                </div>
                <Slider
                  min={2}
                  max={20}
                  step={2}
                  value={settings.snapThreshold}
                  onChange={(value) => updateSetting('snapThreshold', value)}
                  size="small"
                  marks={{ 4: '', 8: '', 12: '', 16: '' }}
                />
              </div>

              {/* Element Snap Range */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Tooltip title="Detection range for snapping to other elements">
                    <Text className="text-xs text-gray-600">Element Range</Text>
                  </Tooltip>
                  <Text className="text-xs text-gray-500">{settings.elementSnapThreshold}px</Text>
                </div>
                <Slider
                  min={6}
                  max={100}
                  step={2}
                  value={settings.elementSnapThreshold}
                  onChange={(value) => updateSetting('elementSnapThreshold', value)}
                  size="small"
                />
              </div>
            </div>
          )}
        </div>

        <Divider style={{ margin: '16px 0' }} />

        {/* Keyboard Shortcuts */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <SettingOutlined className="text-gray-500 text-sm" />
            <Text strong className="text-sm">Shortcuts</Text>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">Toggle Grid</span>
              <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">G</kbd>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">Toggle Visibility</span>
              <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+'</kbd>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">Toggle Snap</span>
              <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+;</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`flex items-center space-x-2 ${className}`} style={{ zIndex: 99999999, position: 'relative' }}>
      {/* Grid Toggle Button */}
      <Tooltip title={`Grid ${settings.gridEnabled ? 'ON' : 'OFF'} (G)`}>
        <Button
          type="text"
          size="small"
          icon={<BorderOutlined />}
          onClick={toggleGrid}
          className={`relative transition-all duration-200 ${
            settings.gridEnabled 
              ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          } rounded-lg px-3`}
        >
          {settings.gridEnabled && settings.gridVisible && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
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
          className={`relative transition-all duration-200 ${
            settings.snapEnabled 
              ? 'text-green-600 bg-green-50 hover:bg-green-100 border border-green-200' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          } rounded-lg px-3`}
        >
          {settings.snapEnabled && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
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
        getPopupContainer={(triggerNode) => document.body}
        overlayStyle={{ zIndex: 99999999 }}
        destroyPopupOnHide={false}
        forceRender={true}
      >
        <Tooltip title="Grid & Snap Settings">
          <Button
            type="text"
            size="small"
            icon={<SettingOutlined />}
            className={`transition-all duration-200 ${
              dropdownVisible 
                ? 'text-purple-600 bg-purple-50 border border-purple-200' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            } rounded-lg px-3`}
          />
        </Tooltip>
      </Dropdown>

      {/* Current Grid Size Indicator */}
      {settings.gridEnabled && (
        <div className="text-xs text-gray-600 px-2 py-1 bg-gray-100 rounded-md border font-mono">
          {settings.gridSize}px
        </div>
      )}

      {/* Status Indicators */}
      {(settings.gridEnabled || settings.snapEnabled) && (
        <div className="flex items-center space-x-2 pl-2 border-l border-gray-200">
          {settings.gridEnabled && (
            <div className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
              Grid
            </div>
          )}
          {settings.snapEnabled && (
            <div className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-md border border-green-200">
              Snap
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SnapGridControls;
