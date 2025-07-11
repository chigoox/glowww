'use client'

import React, { useRef, useEffect, useState, useMemo } from "react";
import { useNode, useEditor } from "@craftjs/core";
import { createPortal } from 'react-dom';
import ContextMenu from "../../support/ContextMenu";
import { useContextMenu } from "../../support/useContextMenu";
import useEditorDisplay from "../../support/useEditorDisplay";
import MediaLibrary from "../../support/MediaLibrary";
import useSaveOperations from "../../support/useSaveOperations";
import { 
  EditOutlined, 
  MenuOutlined,
  CloseOutlined,
  DownOutlined,
  SearchOutlined,
  UserOutlined,
  HomeOutlined,
  PictureOutlined,
  FontSizeOutlined
} from '@ant-design/icons';
import pako from 'pako';
import { 
  Modal, 
  Input, 
  Select, 
  Switch, 
  Button as AntButton, 
  Tabs,
  Slider,
  Radio,
  ColorPicker,
  Divider,
  message,
  Typography
} from 'antd';

const { TabPane } = Tabs;
const { Text } = Typography;

// Font family options for NavBar styling
const FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, sans-serif' },
  { label: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
  { label: 'Arial Black', value: 'Arial Black, sans-serif' },
  { label: 'Impact', value: 'Impact, sans-serif' },
  { label: 'Palatino', value: 'Palatino, serif' },
  { label: 'Garamond', value: 'Garamond, serif' },
  { label: 'Courier New', value: 'Courier New, monospace' },
  { label: 'Lucida Console', value: 'Lucida Console, monospace' },
  { label: 'Comic Sans MS', value: 'Comic Sans MS, cursive' },
  { label: 'Brush Script', value: 'Brush Script MT, cursive' }
];

// Helper function to get pages from project data and build navigation
const getPagesFromProject = (navMode = 'top-level') => {
  try {
    // Helper function to decompress data (same as in useSaveOperations)
    const decompressData = (compressedString) => {
      try {
        const binaryString = atob(compressedString);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const decompressed = pako.inflate(bytes, { to: 'string' });
        return decompressed;
      } catch (error) {
        console.error('NavBar: Decompression error:', error);
        throw new Error('Failed to decompress data - invalid format');
      }
    };

    // Try to get current project data
    const activeProjectName = localStorage.getItem('glow_active_project') || 'my-website';
    const projectDataKey = `glowproject_${activeProjectName}_autosave`;
    const projectDataString = localStorage.getItem(projectDataKey);
    
    if (!projectDataString) {
      console.warn('NavBar: No project data found, using fallback navigation');
      return [
        { id: 1, name: "Home", path: "/", children: [] }
      ];
    }
    
    // Try to decompress and parse the data
    let projectData;
    try {
      // First try to decompress (new format)
      const decompressed = decompressData(projectDataString);
      projectData = JSON.parse(decompressed);
    } catch (decompressError) {
      try {
        // Fallback: try to parse directly as JSON (old format)
        projectData = JSON.parse(projectDataString);
      } catch (jsonError) {
        console.error('NavBar: Failed to parse project data:', {
          decompressError: decompressError.message,
          jsonError: jsonError.message,
          dataPreview: projectDataString.substring(0, 50) + '...'
        });
        return [
          { id: 1, name: "Home", path: "/", children: [] }
        ];
      }
    }
    
    const pages = projectData.pages || [];
    
    // Find home page
    const homePage = pages.find(p => p.isHome || p.key === 'home') || pages[0];
    
    if (navMode === 'top-level') {
      // Only show pages that are direct children of home or top-level pages
      return pages
        .filter(page => !page.parentKey || page.parentKey === homePage?.key)
        .map(page => ({
          id: page.key || page.id,
          name: page.title,
          path: page.path || `/${page.key}`,
          children: []
        }));
    } else {
      // Nested mode: show full hierarchy
      const buildHierarchy = (parentKey = null) => {
        return pages
          .filter(page => page.parentKey === parentKey)
          .map(page => ({
            id: page.key || page.id,
            name: page.title,
            path: page.path || `/${page.key}`,
            children: buildHierarchy(page.key)
          }));
      };
      
      return buildHierarchy(homePage?.key);
    }
  } catch (error) {
    console.error('NavBar: Error loading pages from project:', error);
    return [
      { id: 1, name: "Home", path: "/", children: [] }
    ];
  }
};

// Helper function to format page names
const formatPageName = (pageName) => {
  return pageName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// NavItem Component (Non-CraftJS element to avoid serialization issues)
export const NavItem = ({ item, isActive, navItemStyles, dropdownStyles, onNavigate, hideEditorUI }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = (e) => {
    e.preventDefault();
    if (hasChildren) {
      setShowDropdown(!showDropdown);
    } else {
      onNavigate(item.path);
    }
  };

  const handleChildClick = (childPath) => {
    setShowDropdown(false);
    onNavigate(childPath);
  };

  return (
    <div 
      style={{ position: 'relative' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setTimeout(() => setShowDropdown(false), 150);
      }}
    >
      {/* Use regular anchor tag instead of CraftJS Element to avoid serialization issues */}
      <a
        href={item.path}
        style={{
          color: isActive ? navItemStyles.activeColor : navItemStyles.color,
          backgroundColor: isActive ? navItemStyles.activeBgColor : (isHovered ? navItemStyles.hoverBgColor : 'transparent'),
          padding: navItemStyles.padding,
          margin: navItemStyles.margin,
          borderRadius: typeof navItemStyles.borderRadius === 'number' ? `${navItemStyles.borderRadius}px` : navItemStyles.borderRadius,
          fontSize: typeof navItemStyles.fontSize === 'number' ? `${navItemStyles.fontSize}px` : navItemStyles.fontSize,
          fontWeight: isActive ? navItemStyles.activeFontWeight : navItemStyles.fontWeight,
          fontFamily: navItemStyles.fontFamily,
          textShadow: navItemStyles.textShadow,
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          border: 'none',
          outline: 'none'
        }}
        onClick={handleClick}
      >
        {item.name}
        {hasChildren && (
          <DownOutlined 
            style={{ 
              fontSize: '12px', 
              transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }} 
          />
        )}
      </a>

      {/* Dropdown Menu */}
      {hasChildren && (showDropdown || isHovered) && !hideEditorUI && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            backgroundColor: dropdownStyles.backgroundColor,
            border: dropdownStyles.border,
            borderRadius: dropdownStyles.borderRadius,
            boxShadow: dropdownStyles.boxShadow,
            minWidth: dropdownStyles.minWidth,
            zIndex: 1000,
            padding: dropdownStyles.padding,
            marginTop: '4px'
          }}
          onMouseEnter={() => setShowDropdown(true)}
          onMouseLeave={() => setShowDropdown(false)}
        >
          {item.children.map((child) => (
            <a
              key={child.id}
              href={child.path}
              style={{
                color: dropdownStyles.itemColor,
                backgroundColor: 'transparent',
                padding: dropdownStyles.itemPadding,
                margin: '0',
                borderRadius: typeof dropdownStyles.itemBorderRadius === 'number' ? `${dropdownStyles.itemBorderRadius}px` : dropdownStyles.itemBorderRadius,
                fontSize: typeof dropdownStyles.itemFontSize === 'number' ? `${dropdownStyles.itemFontSize}px` : dropdownStyles.itemFontSize,
                fontWeight: dropdownStyles.itemFontWeight,
                textDecoration: 'none',
                display: 'block',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={(e) => {
                e.preventDefault();
                handleChildClick(child.path);
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = dropdownStyles.itemHoverBgColor;
                e.target.style.color = dropdownStyles.itemHoverColor;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = dropdownStyles.itemColor;
              }}
            >
              {child.name}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

// CraftJS configuration for NavItem
NavItem.craft = {
  displayName: "NavItem",
  props: {},
  rules: {
    canDrag: () => false,
    canDrop: () => false,
    canMoveIn: () => false,
    canMoveOut: () => false,
  },
  related: {
    // Prevent serialization issues by not allowing this as a draggable component
    toolbar: () => null
  }
};

// Mobile Menu Component (Non-CraftJS elements to avoid serialization issues)
const MobileMenu = ({ isOpen, navigation, navItemStyles, onNavigate, onClose }) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 10000,
        display: 'flex',
        justifyContent: 'flex-end'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '280px',
          height: '100%',
          backgroundColor: 'white',
          boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
          padding: '20px',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>Menu</span>
          <CloseOutlined onClick={onClose} style={{ cursor: 'pointer', fontSize: '18px' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {navigation.map((item) => (
            <div key={item.id}>
              <a
                href={item.path}
                style={{
                  color: navItemStyles.color,
                  backgroundColor: 'transparent',
                  padding: '12px 0',
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: typeof navItemStyles.fontSize === 'number' ? `${navItemStyles.fontSize}px` : navItemStyles.fontSize,
                  fontWeight: navItemStyles.fontWeight,
                  fontFamily: navItemStyles.fontFamily,
                  textDecoration: 'none',
                  display: 'block',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.path);
                  onClose();
                }}
              >
                {item.name}
              </a>
              
              {item.children && item.children.length > 0 && (
                <div style={{ paddingLeft: '16px', borderLeft: '2px solid #f0f0f0' }}>
                  {item.children.map((child) => (
                    <a
                      key={child.id}
                      href={child.path}
                      style={{
                        color: navItemStyles.color,
                        backgroundColor: 'transparent',
                        padding: '8px 0',
                        fontSize: '14px',
                        fontWeight: 'normal',
                        textDecoration: 'none',
                        display: 'block',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate(child.path);
                        onClose();
                      }}
                    >
                      {child.name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};

// NavBar Settings Modal
const NavBarSettingsModal = ({ visible, onClose, navBar, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('layout');
  const [mediaLibraryVisible, setMediaLibraryVisible] = useState(false);

  const updateNavBarSetting = (key, value) => {
    onUpdate({ ...navBar, [key]: value });
  };

  const updateStyleObject = (styleKey, property, value) => {
    onUpdate({
      ...navBar,
      [styleKey]: {
        ...navBar[styleKey],
        [property]: value
      }
    });
  };

  const handleMediaSelect = (media) => {
    updateStyleObject('logo', 'content', media.url);
    setMediaLibraryVisible(false);
  };

  return (
    <Modal
      title="NavBar Settings"
      open={visible}
      onCancel={onClose}
      footer={[
        <AntButton key="close" onClick={onClose}>Close</AntButton>
      ]}
      width={800}
      style={{ top: 20 }}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* Layout Settings */}
        <TabPane tab="Layout" key="layout">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <h4>Navigation Mode</h4>
              <Radio.Group
                value={navBar.navMode}
                onChange={(e) => updateNavBarSetting('navMode', e.target.value)}
                style={{ marginBottom: 16 }}
              >
                <Radio value="top-level">Top Level Only</Radio>
                <Radio value="nested">Nested with Dropdowns</Radio>
              </Radio.Group>

              <h4>Orientation</h4>
              <Radio.Group
                value={navBar.orientation}
                onChange={(e) => updateNavBarSetting('orientation', e.target.value)}
                style={{ marginBottom: 16 }}
              >
                <Radio value="horizontal">Horizontal</Radio>
                <Radio value="vertical">Vertical</Radio>
              </Radio.Group>

              <h4>Alignment</h4>
              <Select
                value={navBar.alignment}
                onChange={(value) => updateNavBarSetting('alignment', value)}
                style={{ width: '100%', marginBottom: 16 }}
                options={[
                  { value: 'flex-start', label: 'Left' },
                  { value: 'center', label: 'Center' },
                  { value: 'flex-end', label: 'Right' },
                  { value: 'space-between', label: 'Space Between' },
                  { value: 'space-around', label: 'Space Around' }
                ]}
              />
            </div>

            <div>
              <h4>Position</h4>
              <Select
                value={navBar.position}
                onChange={(value) => updateNavBarSetting('position', value)}
                style={{ width: '100%', marginBottom: 16 }}
                options={[
                  { value: 'static', label: 'Static' },
                  { value: 'sticky', label: 'Sticky' },
                  { value: 'fixed', label: 'Fixed' }
                ]}
              />

              <h4>Mobile Settings</h4>
              <div style={{ marginBottom: 16 }}>
                <label>Mobile Breakpoint (px)</label>
                <Slider
                  min={320}
                  max={1200}
                  step={10}
                  value={navBar.mobileBreakpoint}
                  onChange={(value) => updateNavBarSetting('mobileBreakpoint', value)}
                  tooltip={{ formatter: (val) => `${val}px` }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <Switch
                  checked={navBar.showMobileMenu}
                  onChange={(checked) => updateNavBarSetting('showMobileMenu', checked)}
                />
                <span style={{ marginLeft: 8 }}>Show Mobile Hamburger Menu</span>
              </div>
            </div>
          </div>
        </TabPane>

        {/* Logo Settings */}
        <TabPane tab="Logo" key="logo">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <h4>Logo Type</h4>
              <Radio.Group
                value={navBar.logo.type}
                onChange={(e) => updateStyleObject('logo', 'type', e.target.value)}
                style={{ marginBottom: 16 }}
              >
                <Radio value="text">Text</Radio>
                <Radio value="image">Image</Radio>
                <Radio value="none">None</Radio>
              </Radio.Group>

              {navBar.logo.type === 'text' && (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label>Logo Text</label>
                    <Input
                      value={navBar.logo.content}
                      onChange={(e) => updateStyleObject('logo', 'content', e.target.value)}
                      placeholder="Your Brand Name"
                    />
                  </div>
                  
                  <div style={{ marginBottom: 16 }}>
                    <label>Logo Font Family</label>
                    <Select
                      value={navBar.logo.fontFamily}
                      onChange={(value) => updateStyleObject('logo', 'fontFamily', value)}
                      style={{ width: '100%' }}
                      options={FONT_FAMILIES}
                      placeholder="Select font family"
                    />
                  </div>
                  
                  <div style={{ marginBottom: 16 }}>
                    <label>Logo Text Color</label>
                    <ColorPicker
                      value={navBar.logo.color}
                      onChange={(color) => updateStyleObject('logo', 'color', color.toHexString())}
                      showText
                    />
                  </div>
                </>
              )}

              {navBar.logo.type === 'image' && (
                <div style={{ marginBottom: 16 }}>
                  <label>Logo Image</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                    <Input
                      value={navBar.logo.content}
                      onChange={(e) => updateStyleObject('logo', 'content', e.target.value)}
                      placeholder="https://example.com/logo.png"
                    />
                    <AntButton 
                      icon={<PictureOutlined />}
                      onClick={() => setMediaLibraryVisible(true)}
                      type="primary"
                    >
                      Browse
                    </AntButton>
                  </div>
                  {navBar.logo.content && (
                    <div style={{ marginTop: '12px', textAlign: 'center' }}>
                      <img 
                        src={navBar.logo.content} 
                        alt="Logo Preview" 
                        style={{ 
                          maxWidth: '150px', 
                          maxHeight: '60px', 
                          objectFit: 'contain',
                          border: '1px solid #e0e0e0',
                          borderRadius: '4px',
                          padding: '8px'
                        }} 
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <h4>Logo Position</h4>
              <Select
                value={navBar.logoPosition}
                onChange={(value) => updateNavBarSetting('logoPosition', value)}
                style={{ width: '100%', marginBottom: 16 }}
                options={[
                  { value: 'left', label: 'Left' },
                  { value: 'center', label: 'Center (Logo Top, Menu Below)' },
                  { value: 'right', label: 'Right' }
                ]}
              />

              <div style={{ marginBottom: 16 }}>
                <label>Logo Size</label>
                <Slider
                  min={16}
                  max={72}
                  value={navBar.logo.size}
                  onChange={(value) => updateStyleObject('logo', 'size', value)}
                  tooltip={{ formatter: (val) => `${val}px` }}
                />
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <label>Logo Weight (Text Only)</label>
                <Select
                  value={navBar.logo.fontWeight}
                  onChange={(value) => updateStyleObject('logo', 'fontWeight', value)}
                  style={{ width: '100%' }}
                  options={[
                    { value: '300', label: 'Light' },
                    { value: '400', label: 'Normal' },
                    { value: '500', label: 'Medium' },
                    { value: '600', label: 'Semi Bold' },
                    { value: '700', label: 'Bold' },
                    { value: '800', label: 'Extra Bold' },
                    { value: '900', label: 'Black' }
                  ]}
                  placeholder="Select font weight"
                />
              </div>
            </div>
          </div>
        </TabPane>

        {/* Navigation Styles */}
        <TabPane tab="Nav Styles" key="navStyles">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <h4>Navigation Items</h4>
              <div style={{ marginBottom: 16 }}>
                <label>Font Family</label>
                <Select
                  value={navBar.navItemStyles.fontFamily}
                  onChange={(value) => updateStyleObject('navItemStyles', 'fontFamily', value)}
                  style={{ width: '100%' }}
                  options={FONT_FAMILIES}
                  placeholder="Select font family"
                />
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <label>Font Size</label>
                <Slider
                  min={12}
                  max={28}
                  value={navBar.navItemStyles.fontSize}
                  onChange={(value) => updateStyleObject('navItemStyles', 'fontSize', value)}
                  tooltip={{ formatter: (val) => `${val}px` }}
                />
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <label>Font Weight</label>
                <Select
                  value={navBar.navItemStyles.fontWeight}
                  onChange={(value) => updateStyleObject('navItemStyles', 'fontWeight', value)}
                  style={{ width: '100%' }}
                  options={[
                    { value: '300', label: 'Light' },
                    { value: '400', label: 'Normal' },
                    { value: '500', label: 'Medium' },
                    { value: '600', label: 'Semi Bold' },
                    { value: '700', label: 'Bold' }
                  ]}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label>Text Color</label>
                <ColorPicker
                  value={navBar.navItemStyles.color}
                  onChange={(color) => updateStyleObject('navItemStyles', 'color', color.toHexString())}
                  showText
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label>Active Color</label>
                <ColorPicker
                  value={navBar.navItemStyles.activeColor}
                  onChange={(color) => updateStyleObject('navItemStyles', 'activeColor', color.toHexString())}
                  showText
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label>Hover Background</label>
                <ColorPicker
                  value={navBar.navItemStyles.hoverBgColor}
                  onChange={(color) => updateStyleObject('navItemStyles', 'hoverBgColor', color.toRgbString())}
                  showText
                />
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <label>Text Shadow</label>
                <Input
                  value={navBar.navItemStyles.textShadow}
                  onChange={(e) => updateStyleObject('navItemStyles', 'textShadow', e.target.value)}
                  placeholder="1px 1px 2px rgba(0,0,0,0.3)"
                />
              </div>
            </div>

            <div>
              <h4>NavBar Background & Layout</h4>
              <div style={{ marginBottom: 16 }}>
                <label>NavBar Background Color</label>
                <ColorPicker
                  value={navBar.backgroundColor}
                  onChange={(color) => updateNavBarSetting('backgroundColor', color.toRgbString())}
                  showText
                />
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <label>NavBar Border</label>
                <Input
                  value={navBar.border}
                  onChange={(e) => updateNavBarSetting('border', e.target.value)}
                  placeholder="1px solid #e0e0e0"
                />
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <label>NavBar Border Radius</label>
                <Slider
                  min={0}
                  max={20}
                  value={navBar.borderRadius}
                  onChange={(value) => updateNavBarSetting('borderRadius', value)}
                  tooltip={{ formatter: (val) => `${val}px` }}
                />
              </div>

              <h4>Spacing & Layout</h4>
              <div style={{ marginBottom: 16 }}>
                <label>Item Padding</label>
                <Input
                  value={navBar.navItemStyles.padding}
                  onChange={(e) => updateStyleObject('navItemStyles', 'padding', e.target.value)}
                  placeholder="8px 16px"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label>Item Margin</label>
                <Input
                  value={navBar.navItemStyles.margin}
                  onChange={(e) => updateStyleObject('navItemStyles', 'margin', e.target.value)}
                  placeholder="0 8px"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label>Item Border Radius</label>
                <Slider
                  min={0}
                  max={20}
                  value={navBar.navItemStyles.borderRadius}
                  onChange={(value) => updateStyleObject('navItemStyles', 'borderRadius', value)}
                  tooltip={{ formatter: (val) => `${val}px` }}
                />
              </div>
            </div>
          </div>
        </TabPane>

        {/* Dropdown Styles */}
        <TabPane tab="Dropdown" key="dropdown">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <h4>Dropdown Container</h4>
              <div style={{ marginBottom: 16 }}>
                <label>Background Color</label>
                <ColorPicker
                  value={navBar.dropdownStyles.backgroundColor}
                  onChange={(color) => updateStyleObject('dropdownStyles', 'backgroundColor', color.toRgbString())}
                  showText
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label>Border</label>
                <Input
                  value={navBar.dropdownStyles.border}
                  onChange={(e) => updateStyleObject('dropdownStyles', 'border', e.target.value)}
                  placeholder="1px solid #e0e0e0"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label>Box Shadow</label>
                <Input
                  value={navBar.dropdownStyles.boxShadow}
                  onChange={(e) => updateStyleObject('dropdownStyles', 'boxShadow', e.target.value)}
                  placeholder="0 4px 12px rgba(0,0,0,0.1)"
                />
              </div>
            </div>

            <div>
              <h4>Dropdown Items</h4>
              <div style={{ marginBottom: 16 }}>
                <label>Item Color</label>
                <ColorPicker
                  value={navBar.dropdownStyles.itemColor}
                  onChange={(color) => updateStyleObject('dropdownStyles', 'itemColor', color.toHexString())}
                  showText
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label>Item Hover Color</label>
                <ColorPicker
                  value={navBar.dropdownStyles.itemHoverColor}
                  onChange={(color) => updateStyleObject('dropdownStyles', 'itemHoverColor', color.toHexString())}
                  showText
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label>Item Hover Background</label>
                <ColorPicker
                  value={navBar.dropdownStyles.itemHoverBgColor}
                  onChange={(color) => updateStyleObject('dropdownStyles', 'itemHoverBgColor', color.toRgbString())}
                  showText
                />
              </div>
            </div>
          </div>
        </TabPane>

        {/* Additional Features */}
        <TabPane tab="Features" key="features">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <h4>Search Bar</h4>
              <div style={{ marginBottom: 16 }}>
                <Switch
                  checked={navBar.showSearch}
                  onChange={(checked) => updateNavBarSetting('showSearch', checked)}
                />
                <span style={{ marginLeft: 8 }}>Show Search Bar</span>
              </div>

              <h4>User Menu</h4>
              <div style={{ marginBottom: 16 }}>
                <Switch
                  checked={navBar.showUserMenu}
                  onChange={(checked) => updateNavBarSetting('showUserMenu', checked)}
                />
                <span style={{ marginLeft: 8 }}>Show User Menu</span>
              </div>
            </div>

            <div>
              <h4>Call-to-Action Button</h4>
              <div style={{ marginBottom: 16 }}>
                <Switch
                  checked={navBar.ctaButton.show}
                  onChange={(checked) => updateStyleObject('ctaButton', 'show', checked)}
                />
                <span style={{ marginLeft: 8 }}>Show CTA Button</span>
              </div>

              {navBar.ctaButton.show && (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label>Button Text</label>
                    <Input
                      value={navBar.ctaButton.text}
                      onChange={(e) => updateStyleObject('ctaButton', 'text', e.target.value)}
                      placeholder="Get Started"
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label>Button Action (URL)</label>
                    <Input
                      value={navBar.ctaButton.action}
                      onChange={(e) => updateStyleObject('ctaButton', 'action', e.target.value)}
                      placeholder="/signup"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </TabPane>

        {/* Navigation Items */}
        <TabPane tab="Navigation Items" key="navigation">
          <div>
            <h4>Navigation Structure</h4>
            <div style={{ 
              background: '#f8f9fa', 
              padding: '16px', 
              borderRadius: '8px', 
              marginBottom: '16px',
              border: '1px solid #e9ecef'
            }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>
                📋 <strong>Auto-Generated from PageManager</strong>
              </Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Navigation items are automatically pulled from your project's pages. 
                Use the PageManager to add, edit, or organize pages, and they'll appear here automatically.
              </Text>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <h4>Navigation Mode</h4>
              <Radio.Group
                value={navBar.navMode}
                onChange={(e) => updateNavBarSetting('navMode', e.target.value)}
                style={{ marginBottom: 16 }}
              >
                <Radio value="top-level">
                  <div>
                    <div><strong>Top Level Only</strong></div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Shows only pages directly under Home
                    </Text>
                  </div>
                </Radio>
                <Radio value="nested">
                  <div>
                    <div><strong>Nested with Dropdowns</strong></div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Shows full hierarchy with dropdown menus
                    </Text>
                  </div>
                </Radio>
              </Radio.Group>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4>Current Navigation Preview</h4>
              <div style={{ 
                background: '#ffffff', 
                border: '1px solid #e0e0e0', 
                borderRadius: '8px', 
                padding: '16px',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {getPagesFromProject(navBar.navMode).map((item, index) => (
                  <div key={item.id} style={{ 
                    padding: '8px 12px',
                    borderRadius: '6px',
                    marginBottom: '4px',
                    backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'transparent',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text strong>{item.name}</Text>
                        <Text type="secondary" style={{ marginLeft: '8px', fontSize: '12px' }}>
                          {item.path}
                        </Text>
                      </div>
                      {item.children && item.children.length > 0 && (
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {item.children.length} children
                        </Text>
                      )}
                    </div>
                    
                    {item.children && item.children.length > 0 && (
                      <div style={{ marginLeft: '16px', marginTop: '8px' }}>
                        {item.children.map((child) => (
                          <div key={child.id} style={{ 
                            padding: '4px 8px',
                            backgroundColor: '#f1f3f4',
                            borderRadius: '4px',
                            marginBottom: '2px',
                            fontSize: '12px'
                          }}>
                            <Text>{child.name}</Text>
                            <Text type="secondary" style={{ marginLeft: '8px' }}>
                              {child.path}
                            </Text>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                
                {getPagesFromProject(navBar.navMode).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '32px', color: '#999' }}>
                    <HomeOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
                    <div>No pages found</div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Create pages in PageManager to see them here
                    </Text>
                  </div>
                )}
              </div>
            </div>

            <div style={{ 
              background: '#fff7e6', 
              border: '1px solid #ffd591',
              borderRadius: '8px', 
              padding: '12px',
              marginTop: '16px'
            }}>
              <Text style={{ fontSize: '13px', color: '#ad6800' }}>
                💡 <strong>Tip:</strong> To modify navigation items, use the PageManager component in the top toolbar. 
                Changes to pages will automatically reflect in your navigation menu.
              </Text>
            </div>
          </div>
        </TabPane>
      </Tabs>
      
      {/* MediaLibrary Modal */}
      <MediaLibrary
        visible={mediaLibraryVisible}
        onClose={() => setMediaLibraryVisible(false)}
        onSelect={handleMediaSelect}
        mediaType="images"
      />
    </Modal>
  );
};

// Main NavBar Component
export const NavBar = ({
  // Layout & Position
  width = "100%",
  height = "auto",
  minHeight = 60,
  position = "sticky",
  top = 0,
  zIndex = 1000,
  
  // Spacing
  padding = "0 20px",
  margin = 0,
  
  // Background & Border
  backgroundColor = "#ffffff",
  borderBottom = "1px solid #e0e0e0",
  border = "",
  borderRadius = 0,
  boxShadow = "0 2px 8px rgba(0,0,0,0.06)",
  
  // Navigation Settings
  navMode = "top-level", // 'top-level' | 'nested'
  orientation = "horizontal", // 'horizontal' | 'vertical'
  alignment = "space-between", // flex alignment
  logoPosition = "left", // 'left' | 'center' | 'right'
  
  // Logo Settings
  logo = {
    type: "text", // 'text' | 'image' | 'none'
    content: "Brand",
    size: 24,
    fontFamily: "Arial, sans-serif",
    fontWeight: "700",
    color: "#333333"
  },
  
  // Mobile Settings
  mobileBreakpoint = 768,
  showMobileMenu = true,
  
  // Feature Toggles
  showSearch = false,
  showUserMenu = false,
  
  // CTA Button
  ctaButton = {
    show: false,
    text: "Get Started",
    action: "/signup"
  },
  
  // Style Objects
  navItemStyles = {
    fontFamily: "Arial, sans-serif",
    fontSize: 16,
    fontWeight: "500",
    color: "#333333",
    activeColor: "#1890ff",
    activeBgColor: "rgba(24, 144, 255, 0.1)",
    hoverBgColor: "rgba(0,0,0,0.05)",
    activeFontWeight: "600",
    padding: "8px 16px",
    margin: "0 4px",
    borderRadius: 6,
    textShadow: ""
  },
  
  dropdownStyles = {
    backgroundColor: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    padding: "8px",
    minWidth: "200px",
    itemColor: "#333333",
    itemHoverColor: "#1890ff",
    itemHoverBgColor: "rgba(24, 144, 255, 0.1)",
    itemPadding: "8px 12px",
    itemBorderRadius: 4,
    itemFontSize: 14,
    itemFontWeight: "normal"
  },
  
  // HTML Attributes
  className = "",
  id = "",
  
  children
}) => {
  const { 
    id: nodeId, 
    connectors: { connect, drag }, 
    actions: { setProp }, 
    selected 
  } = useNode((node) => ({
    id: node.id,
    selected: node.events.selected,
  }));

  const navBarRef = useRef(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [boxPosition, setBoxPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');

  // Context menu functionality
  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();
  const { hideEditorUI } = useEditorDisplay();

  // Get navigation items from PageManager instead of props
  const navigation = useMemo(() => {
    const pages = getPagesFromProject(navMode);
    console.log('NavBar: Generated navigation from PageManager:', pages);
    return pages;
  }, [navMode]);
  
  // Detect if we're in preview mode
  const isPreviewMode = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname.startsWith('/Preview');
    }
    return false;
  }, []);

  // Function to update box position for portal positioning
  const updateBoxPosition = () => {
    if (navBarRef.current) {
      const rect = navBarRef.current.getBoundingClientRect();
      setBoxPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      });
    }
  };

  useEffect(() => {
    setIsClient(true);
    
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= mobileBreakpoint);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [mobileBreakpoint]);

  useEffect(() => {
    const connectElements = () => {
      if (navBarRef.current) {
        connect(drag(navBarRef.current));
      }
    };
    
    if (isClient) {
      connectElements();
      const timer = setTimeout(connectElements, 50);
      return () => clearTimeout(timer);
    }
  }, [connect, drag, selected, isClient]);

  // Update box position when selected or hovered changes
  useEffect(() => {
    if (selected || isHovered) {
      updateBoxPosition();
      
      const handleScroll = () => updateBoxPosition();
      const handleResize = () => updateBoxPosition();
      
      window.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [selected, isHovered]);

  // Handle navigation with proper routing support
  const handleNavigate = (path) => {
    setCurrentPath(path);
    setMobileMenuOpen(false);
    
    if (isPreviewMode) {
      // In preview mode, navigate within preview
      const previewPath = path === '/' ? '/Preview' : `/Preview${path}`;
      window.location.href = previewPath;
    } else if (hideEditorUI) {
      // In production mode, navigate to actual routes
      window.location.href = path;
    } else {
      // In editor mode, potentially switch pages in PageManager
      // This could be enhanced to integrate with PageManager page switching
      console.log('Editor mode navigation to:', path);
      
      // Try to find and switch to the page in PageManager if available
      if (window.pageManagerSwitch) {
        try {
          // Helper function to decompress data (same as above)
          const decompressData = (compressedString) => {
            try {
              const binaryString = atob(compressedString);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const decompressed = pako.inflate(bytes, { to: 'string' });
              return decompressed;
            } catch (error) {
              throw new Error('Failed to decompress data - invalid format');
            }
          };

          // Look for a page with matching path
          const projectName = localStorage.getItem('glow_active_project') || 'my-website';
          const projectDataKey = `glowproject_${projectName}_autosave`;
          const projectDataString = localStorage.getItem(projectDataKey);
          
          if (projectDataString) {
            let projectData;
            try {
              // First try to decompress (new format)
              const decompressed = decompressData(projectDataString);
              projectData = JSON.parse(decompressed);
            } catch (decompressError) {
              try {
                // Fallback: try to parse directly as JSON (old format)
                projectData = JSON.parse(projectDataString);
              } catch (jsonError) {
                console.warn('Failed to parse project data for page switching:', jsonError);
                return;
              }
            }
            
            const targetPage = projectData.pages?.find(p => p.path === path);
            
            if (targetPage) {
              window.pageManagerSwitch(targetPage.key);
              return;
            }
          }
        } catch (error) {
          console.warn('Failed to switch page in editor:', error);
        }
      }
    }
  };

  // Helper function to process values
  const processValue = (value, property) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value === 'number' && !['opacity', 'zIndex'].includes(property)) {
      return `${value}px`;
    }
    return value;
  };

  // Build computed styles
  const computedStyles = {
    width: processValue(width, 'width'),
    height: processValue(height, 'height'),
    minHeight: processValue(minHeight, 'minHeight'),
    position,
    top: processValue(top, 'top'),
    zIndex,
    padding: processValue(padding, 'padding'),
    margin: processValue(margin, 'margin'),
    backgroundColor,
    borderBottom,
    border,
    borderRadius: processValue(borderRadius, 'borderRadius'),
    boxShadow,
  };

  const getCurrentNavBarData = () => ({
    navMode,
    orientation,
    alignment,
    logoPosition,
    logo,
    mobileBreakpoint,
    showMobileMenu,
    showSearch,
    showUserMenu,
    ctaButton,
    navItemStyles,
    dropdownStyles,
    backgroundColor,
    border,
    borderRadius
  });

  const updateNavBar = (updates) => {
    setProp(props => {
      Object.assign(props, updates);
    });
  };

  // Don't render until client-side
  if (!isClient) {
    return (
      <div style={{ ...computedStyles, display: 'flex', alignItems: 'center' }}>
        <div>Loading navigation...</div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`${selected && !hideEditorUI ? 'ring-2 ring-blue-500' : ''} ${isHovered && !hideEditorUI ? 'ring-1 ring-gray-300' : ''} ${className}`}
        ref={navBarRef}
        style={{
          ...computedStyles,
          display: 'flex',
          flexDirection: logoPosition === 'center' ? 'column' : (orientation === 'vertical' ? 'column' : 'row'),
          justifyContent: logoPosition === 'center' ? 'center' : alignment,
          alignItems: 'center',
          gap: logoPosition === 'center' ? '16px' : (orientation === 'vertical' ? '16px' : '24px')
        }}
        onMouseEnter={hideEditorUI ? undefined : () => {
          setIsHovered(true);
          updateBoxPosition();
        }}
        onMouseLeave={hideEditorUI ? undefined : () => setIsHovered(false)}
        onContextMenu={hideEditorUI ? undefined : handleContextMenu}
      >
        {/* Center Logo Layout */}
        {logoPosition === 'center' ? (
          <>
            {/* Logo at top center */}
            {logo.type !== 'none' && (
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {logo.type === 'text' ? (
                  <span
                    style={{
                      fontSize: `${logo.size}px`,
                      fontWeight: logo.fontWeight || 'bold',
                      fontFamily: logo.fontFamily || 'Arial, sans-serif',
                      color: logo.color || '#333',
                      textDecoration: 'none'
                    }}
                  >
                    {logo.content}
                  </span>
                ) : (
                  <img
                    src={logo.content}
                    alt="Logo"
                    style={{
                      width: `${logo.size * 1.5}px`,
                      height: `${logo.size}px`,
                      objectFit: 'contain'
                    }}
                  />
                )}
              </div>
            )}

            {/* Navigation below logo, centered */}
            <div style={{ 
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              width: '100%'
            }}>
              {/* Desktop Navigation */}
              {!isMobile && (
                <div style={{ 
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: '16px'
                }}>
                  {navigation.map((item) => (
                    <NavItem
                      key={item.id}
                      item={item}
                      isActive={currentPath === item.path}
                      navItemStyles={navItemStyles}
                      dropdownStyles={dropdownStyles}
                      onNavigate={handleNavigate}
                      hideEditorUI={hideEditorUI}
                    />
                  ))}
                </div>
              )}

              {/* Right Side Features for center layout */}
              {(showSearch || ctaButton.show || showUserMenu || (isMobile && showMobileMenu)) && (
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  {/* Search Bar */}
                  {showSearch && !isMobile && (
                    <input
                      type="text"
                      placeholder="Search..."
                      style={{
                        width: '200px',
                        borderRadius: '20px',
                        padding: '6px 12px',
                        border: '1px solid #d9d9d9',
                        outline: 'none'
                      }}
                    />
                  )}

                  {/* CTA Button */}
                  {ctaButton.show && !isMobile && (
                    <button
                      style={{
                        backgroundColor: '#1890ff',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontWeight: '500',
                        border: 'none',
                        cursor: 'pointer',
                        textDecoration: 'none'
                      }}
                      onClick={() => handleNavigate(ctaButton.action)}
                    >
                      {ctaButton.text}
                    </button>
                  )}

                  {/* User Menu */}
                  {showUserMenu && !isMobile && (
                    <button
                      style={{
                        backgroundColor: 'transparent',
                        color: '#666',
                        padding: '8px',
                        borderRadius: '50%',
                        border: '1px solid #d9d9d9',
                        cursor: 'pointer',
                        fontSize: '16px'
                      }}
                    >
                      👤
                    </button>
                  )}

                  {/* Mobile Menu Toggle */}
                  {isMobile && showMobileMenu && (
                    <MenuOutlined
                      style={{ fontSize: '20px', cursor: 'pointer' }}
                      onClick={() => setMobileMenuOpen(true)}
                    />
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Standard Left/Right Layout */
          <>
            {/* Logo Section */}
            {logo.type !== 'none' && (
              <div style={{ 
                order: logoPosition === 'left' ? 1 : logoPosition === 'right' ? 3 : 2,
                display: 'flex',
                alignItems: 'center'
              }}>
                {logo.type === 'text' ? (
                  <span
                    style={{
                      fontSize: `${logo.size}px`,
                      fontWeight: logo.fontWeight || 'bold',
                      fontFamily: logo.fontFamily || 'Arial, sans-serif',
                      color: logo.color || '#333',
                      textDecoration: 'none'
                    }}
                  >
                    {logo.content}
                  </span>
                ) : (
                  <img
                    src={logo.content}
                    alt="Logo"
                    style={{
                      width: `${logo.size * 1.5}px`,
                      height: `${logo.size}px`,
                      objectFit: 'contain'
                    }}
                  />
                )}
              </div>
            )}

            {/* Desktop Navigation */}
            {!isMobile && (
              <div style={{ 
                order: 2,
                display: 'flex',
                flexDirection: orientation === 'vertical' ? 'column' : 'row',
                alignItems: 'center',
                gap: orientation === 'vertical' ? '8px' : '16px',
                flex: logoPosition === 'center' ? 'none' : 1
              }}>
                {navigation.map((item) => (
                  <NavItem
                    key={item.id}
                    item={item}
                    isActive={currentPath === item.path}
                    navItemStyles={navItemStyles}
                    dropdownStyles={dropdownStyles}
                    onNavigate={handleNavigate}
                    hideEditorUI={hideEditorUI}
                  />
                ))}
              </div>
            )}

            {/* Right Side Features */}
            <div style={{ 
              order: logoPosition === 'right' ? 1 : 3,
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              {/* Search Bar */}
              {showSearch && !isMobile && (
                <input
                  type="text"
                  placeholder="Search..."
                  style={{
                    width: '200px',
                    borderRadius: '20px',
                    padding: '6px 12px',
                    border: '1px solid #d9d9d9',
                    outline: 'none'
                  }}
                />
              )}

              {/* CTA Button */}
              {ctaButton.show && !isMobile && (
                <button
                  style={{
                    backgroundColor: '#1890ff',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'none'
                  }}
                  onClick={() => handleNavigate(ctaButton.action)}
                >
                  {ctaButton.text}
                </button>
              )}

              {/* User Menu */}
              {showUserMenu && !isMobile && (
                <button
                  style={{
                    backgroundColor: 'transparent',
                    color: '#666',
                    padding: '8px',
                    borderRadius: '50%',
                    border: '1px solid #d9d9d9',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  👤
                </button>
              )}

              {/* Mobile Menu Toggle */}
              {isMobile && showMobileMenu && (
                <MenuOutlined
                  style={{ fontSize: '20px', cursor: 'pointer' }}
                  onClick={() => setMobileMenuOpen(true)}
                />
              )}
            </div>
          </>
        )}

        {children}
      </div>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        navigation={navigation}
        navItemStyles={navItemStyles}
        onNavigate={handleNavigate}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Settings Modal */}
      <NavBarSettingsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        navBar={getCurrentNavBarData()}
        onUpdate={updateNavBar}
      />

      {/* Portal controls rendered outside this container to avoid overflow clipping */}
      {isClient && selected && !hideEditorUI && (
        <PortalControls
          boxPosition={boxPosition}
          handleEditClick={() => setModalVisible(true)}
        />
      )}
      
      {/* Context Menu */}
      {!hideEditorUI && (
        <ContextMenu
          visible={contextMenu.visible}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={closeContextMenu}
          targetNodeId={nodeId}
        />
      )}
    </>
  );
};

// Portal Controls Component
const PortalControls = ({ boxPosition, handleEditClick }) => {
  if (typeof window === 'undefined') return null;

  return createPortal(
    <div style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 9999 }}>
      <div style={{
        position: 'absolute',
        top: boxPosition.top - 35,
        left: boxPosition.left + boxPosition.width / 2,
        transform: 'translateX(-50%)',
        display: 'flex',
        pointerEvents: 'auto'
      }}>
        <div
          style={{
            background: '#1890ff',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 'bold',
            transition: 'background 0.2s ease'
          }}
          onClick={handleEditClick}
          title="Edit navigation settings"
        >
          🧭 EDIT NAV
        </div>
      </div>
    </div>,
    document.body
  );
};

// CraftJS configuration
NavBar.craft = {
  displayName: "NavBar",
  props: {
    width: "100%",
    height: "auto",
    minHeight: 60,
    position: "sticky",
    top: 0,
    zIndex: 1000,
    padding: "0 20px",
    margin: 0,
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e0e0e0",
    border: "",
    borderRadius: 0,
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    navMode: "top-level",
    orientation: "horizontal",
    alignment: "space-between",
    logoPosition: "left",
    logo: {
      type: "text",
      content: "Brand",
      size: 24,
      fontFamily: "Arial, sans-serif",
      fontWeight: "700",
      color: "#333333"
    },
    mobileBreakpoint: 768,
    showMobileMenu: true,
    showSearch: false,
    showUserMenu: false,
    ctaButton: {
      show: false,
      text: "Get Started",
      action: "/signup"
    },
    navItemStyles: {
      fontFamily: "Arial, sans-serif",
      fontSize: 16,
      fontWeight: "500",
      color: "#333333",
      activeColor: "#1890ff",
      activeBgColor: "rgba(24, 144, 255, 0.1)",
      hoverBgColor: "rgba(0,0,0,0.05)",
      activeFontWeight: "600",
      padding: "8px 16px",
      margin: "0 4px",
      borderRadius: 6,
      textShadow: ""
    },
    dropdownStyles: {
      backgroundColor: "#ffffff",
      border: "1px solid #e0e0e0",
      borderRadius: 8,
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      padding: "8px",
      minWidth: "200px",
      itemColor: "#333333",
      itemHoverColor: "#1890ff",
      itemHoverBgColor: "rgba(24, 144, 255, 0.1)",
      itemPadding: "8px 12px",
      itemBorderRadius: 4,
      itemFontSize: 14,
      itemFontWeight: "normal"
    },
    className: "",
    id: ""
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => false, // Don't allow moving components into NavBar  
    canMoveOut: () => true,
  },
  custom: {
    styleMenu: {
      supportedProps: [
        // Layout & Position
        "width", "height", "minHeight", "position", "top", "zIndex",
        
        // Spacing
        "padding", "margin",
        
        // Background & Border
        "backgroundColor", "borderBottom", "border", "borderRadius", "boxShadow",
        
        // Navigation Settings
        "navMode", "orientation", "alignment", "logoPosition",
        
        // Mobile
        "mobileBreakpoint", "showMobileMenu",
        
        // Features
        "showSearch", "showUserMenu",
        
        // HTML Attributes
        "className", "id"
      ]
    }
  }
};





