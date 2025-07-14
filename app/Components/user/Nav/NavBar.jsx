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
  FontSizeOutlined,
  SettingOutlined,
  LayoutOutlined,
  CrownOutlined,
  BgColorsOutlined,
  AppstoreOutlined,
  StarOutlined,
  UnorderedListOutlined,
  BorderOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  GlobalOutlined,
  CheckOutlined,
  DeleteOutlined,
  PlusOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ReloadOutlined,
  AimOutlined,
  FormatPainterOutlined,
  LinkOutlined,
  MinusOutlined,
  LockOutlined,
  UnlockOutlined,
  CompassOutlined,
  InteractionOutlined,
  ThunderboltOutlined,
  MobileOutlined
} from '@ant-design/icons';
import pako from 'pako';
import { 
  Modal, 
  Input, 
  Select, 
  Switch, 
  Button as AntButton,
  Button,
  Tabs,
  Slider,
  Radio,
  ColorPicker,
  Divider,
  message,
  Typography,
  Card,
  Space,
  Collapse,
  InputNumber,
  Upload,
  Image as AntImage,
  Tree,
  Checkbox,
  Tag,
  Tooltip,
  Menu,
  Dropdown,
  Layout,
  Row,
  Col,
  Avatar,
  Badge,
  Affix,
  Form,
  Drawer,
  Alert,
  Empty,
  Descriptions,
  Statistic,
  Segmented
} from 'antd';

// Destructure Typography and other nested components
const { Text, Title, Paragraph } = Typography;
const { Panel } = Collapse;
const { TreeNode } = Tree;
const { Header, Content, Sider } = Layout;

// Default logo object to prevent destructuring errors
const DEFAULT_LOGO = {
  type: "text",
  content: "Brand",
  fontFamily: "Arial, sans-serif",
  fontWeight: "700",
  color: "#333333",
  borderRadius: 0,
  backgroundColor: "transparent",
  padding: "8px",
  width: 40,
  height: 40
};

// Default layout settings with enhanced controls
const DEFAULT_LAYOUT = {
  padding: { top: 12, right: 24, bottom: 12, left: 24 },
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  gap: 16,
  containerPadding: 20,
  containerMaxWidth: 3000,
  centerContent: false,
  justifyContent: 'space-between',
  alignItems: 'center'
};

// Default navItemStyles to prevent destructuring errors
const DEFAULT_NAV_ITEM_STYLES = {
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
  textShadow: "",
  iconPosition: "before", // 'before' | 'after' | 'none'
  iconSize: 16,
  iconColor: "#333333"
};

// Default dropdownStyles to prevent destructuring errors
const DEFAULT_DROPDOWN_STYLES = {
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
};

// Default ctaButton to prevent destructuring errors
const DEFAULT_CTA_BUTTON = {
  show: false,
  text: "Get Started",
  action: "/signup"
};
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
    const activeProjectName = localStorage.getItem('glow_active_project') || 'my-project-' + Math.floor(Math.random() * 9000 + 1000);
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
      // Nested mode: Home standalone, children of Home become top-level with their own children as dropdowns
      const buildHierarchy = (parentKey) => {
        return pages
          .filter(page => page.parentKey === parentKey)
          .map(page => ({
            id: page.key || page.id,
            name: page.title,
            path: page.path || `/${page.key}`,
            children: buildHierarchy(page.key)
          }));
      };
      
      const result = [];
      
      // First, add home page as standalone (no children in dropdown)
      if (homePage) {
        result.push({
          id: homePage.key || homePage.id,
          name: homePage.title,
          path: homePage.path || `/${homePage.key}`,
          children: [] // Home has no dropdown children
        });
      }
      
      // Then promote all direct children of Home to top-level with their children as dropdowns
      const homeChildrenAsTopLevel = pages
        .filter(page => page.parentKey === homePage?.key) // Direct children of Home
        .map(page => ({
          id: page.key || page.id,
          name: page.title,
          path: page.path || `/${page.key}`,
          children: buildHierarchy(page.key) // Their children become dropdown items
        }));
      
      result.push(...homeChildrenAsTopLevel);
      
      // Finally, add any other true top-level pages (those with no parent and not home)
      const otherTopLevelPages = pages
        .filter(page => 
          !(page.isHome || page.key === 'home') && // Not the home page itself
          !page.parentKey // No parent = truly top level
        )
        .map(page => ({
          id: page.key || page.id,
          name: page.title,
          path: page.path || `/${page.key}`,
          children: buildHierarchy(page.key) // Their actual children as dropdowns
        }));
      
      result.push(...otherTopLevelPages);
      
      return result;
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

// NavItem Component using AntD
export const NavItem = ({ 
  item, 
  isActive, 
  navItemStyles, 
  dropdownStyles, 
  onNavigate, 
  hideEditorUI, 
  isPreviewMode = false 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = (e) => {
    e.preventDefault();
    if (!hasChildren) {
      onNavigate(item.path);
    }
  };

  const handleMenuClick = ({ key }) => {
    const childItem = item.children?.find(child => child.id.toString() === key);
    if (childItem) {
      onNavigate(childItem.path);
    }
  };

  // Render icon if specified
  const renderIcon = (position) => {
    if (navItemStyles.iconPosition !== position || !item.icon) return null;
    
    // For now, using a simple icon mapping - can be expanded
    const iconMap = {
      'home': <HomeOutlined />,
      'user': <UserOutlined />,
      'setting': <SettingOutlined />,
      'global': <GlobalOutlined />,
      'star': <StarOutlined />,
      'app': <AppstoreOutlined />
    };
    
    const IconComponent = iconMap[item.icon] || <AppstoreOutlined />;
    
    return React.cloneElement(IconComponent, {
      style: {
        fontSize: `${navItemStyles.iconSize}px`,
        color: isActive ? navItemStyles.activeColor : navItemStyles.iconColor
      }
    });
  };

  if (hasChildren) {
    // Dropdown menu for items with children
    const dropdownMenu = (
      <Menu
        onClick={handleMenuClick}
        style={{
          backgroundColor: dropdownStyles.backgroundColor,
          border: dropdownStyles.border,
          borderRadius: `${dropdownStyles.borderRadius}px`,
          boxShadow: dropdownStyles.boxShadow,
          minWidth: dropdownStyles.minWidth,
          padding: dropdownStyles.padding
        }}
      >
        {item.children.map((child) => (
          <Menu.Item 
            key={child.id}
            style={{
              color: dropdownStyles.itemColor,
              padding: dropdownStyles.itemPadding,
              borderRadius: `${dropdownStyles.itemBorderRadius}px`,
              fontSize: `${dropdownStyles.itemFontSize}px`,
              fontWeight: dropdownStyles.itemFontWeight,
              margin: '2px 0'
            }}
          >
            <Space>
              {child.icon && renderIcon('before')}
              {child.name}
              {child.icon && renderIcon('after')}
            </Space>
          </Menu.Item>
        ))}
      </Menu>
    );

    return (
      <Dropdown
        overlay={dropdownMenu}
        trigger={['hover', 'click']}
        placement="bottomLeft"
        disabled={hideEditorUI && !isPreviewMode}
      >
        <AntButton
          type="text"
          style={{
            color: isActive ? navItemStyles.activeColor : navItemStyles.color,
            backgroundColor: isActive ? navItemStyles.activeBgColor : 'transparent',
            padding: navItemStyles.padding,
            margin: navItemStyles.margin,
            borderRadius: `${navItemStyles.borderRadius}px`,
            fontSize: `${navItemStyles.fontSize}px`,
            fontWeight: isActive ? navItemStyles.activeFontWeight : navItemStyles.fontWeight,
            fontFamily: navItemStyles.fontFamily,
            textShadow: navItemStyles.textShadow,
            border: 'none',
            height: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Space>
            {renderIcon('before')}
            {item.name}
            {renderIcon('after')}
            <DownOutlined style={{ fontSize: '10px' }} />
          </Space>
        </AntButton>
      </Dropdown>
    );
  }

  // Regular menu item without dropdown
  return (
    <AntButton
      type="text"
      href={item.path}
      onClick={handleClick}
      style={{
        color: isActive ? navItemStyles.activeColor : navItemStyles.color,
        backgroundColor: isActive ? navItemStyles.activeBgColor : (isHovered ? navItemStyles.hoverBgColor : 'transparent'),
        padding: navItemStyles.padding,
        margin: navItemStyles.margin,
        borderRadius: `${navItemStyles.borderRadius}px`,
        fontSize: `${navItemStyles.fontSize}px`,
        fontWeight: isActive ? navItemStyles.activeFontWeight : navItemStyles.fontWeight,
        fontFamily: navItemStyles.fontFamily,
        textShadow: navItemStyles.textShadow,
        border: 'none',
        height: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Space>
        {renderIcon('before')}
        {item.name}
        {renderIcon('after')}
      </Space>
    </AntButton>
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
  const [availablePages, setAvailablePages] = useState([]);
  const [selectedPages, setSelectedPages] = useState(navBar.customSelectedPages || []);
  const [showHomePage, setShowHomePage] = useState(navBar.showHomePage !== false);
  
  // Lock states for padding and margin
  const [paddingLocks, setPaddingLocks] = useState({
    top: false,
    right: false,
    bottom: false,
    left: false
  });
  const [marginLocks, setMarginLocks] = useState({
    top: false,
    right: false,
    bottom: false,
    left: false
  });
  
  // Lock state for logo dimensions
  const [logoSizeLock, setLogoSizeLock] = useState(false);

  // Load available pages when modal opens
  useEffect(() => {
    if (visible) {
      const pages = getPagesFromProject('nested');
      setAvailablePages(pages);
      setSelectedPages(navBar.customSelectedPages || []);
      setShowHomePage(navBar.showHomePage !== false);
    }
  }, [visible, navBar.customSelectedPages, navBar.showHomePage]);

  // Helper function to handle linked padding updates
  const handlePaddingUpdate = (direction, value) => {
    const currentLayout = navBar.layout || {};
    const currentPadding = currentLayout.padding || {};
    const updates = { [`${direction}`]: value };
    
    // Check for linked updates based on lock states
    Object.keys(paddingLocks).forEach(lockDirection => {
      if (paddingLocks[lockDirection] && lockDirection !== direction) {
        updates[lockDirection] = value;
      }
    });
    
    updateStyleObject('layout', 'padding', {...currentPadding, ...updates});
  };

  // Helper function to handle linked margin updates
  const handleMarginUpdate = (direction, value) => {
    const currentLayout = navBar.layout || {};
    const currentMargin = currentLayout.margin || {};
    const updates = { [`${direction}`]: value };
    
    // Check for linked updates based on lock states
    Object.keys(marginLocks).forEach(lockDirection => {
      if (marginLocks[lockDirection] && lockDirection !== direction) {
        updates[lockDirection] = value;
      }
    });
    
    updateStyleObject('layout', 'margin', {...currentMargin, ...updates});
  };

  // Toggle lock states
  const togglePaddingLock = (direction) => {
    setPaddingLocks(prev => ({
      ...prev,
      [direction]: !prev[direction]
    }));
  };

  const toggleMarginLock = (direction) => {
    setMarginLocks(prev => ({
      ...prev,
      [direction]: !prev[direction]
    }));
  };

  // Toggle logo size lock
  const toggleLogoSizeLock = () => {
    setLogoSizeLock(prev => !prev);
  };

  // Helper function to handle linked logo size updates
  const handleLogoSizeUpdate = (property, value) => {
    if (logoSizeLock) {
      // Update both width and height to the same value
      const updatedNavBar = {
        ...navBar,
        logo: {
          ...navBar.logo,
          width: value,
          height: value
        }
      };
      onUpdate(updatedNavBar);
    } else {
      // Update only the specific property
      updateStyleObject('logo', property, value);
    }
  };

  const updateNavBarSetting = (key, value) => {
    onUpdate({ ...navBar, [key]: value });
  };

  const updateStyleObject = (styleKey, property, value) => {
    const updatedNavBar = {
      ...navBar,
      [styleKey]: {
        ...navBar[styleKey],
        [property]: value
      }
    };
    onUpdate(updatedNavBar);
  };

  const handleMediaSelect = (media) => {
    updateStyleObject('logo', 'content', media.url);
    setMediaLibraryVisible(false);
  };

  return (
    <Drawer
      title={
        <Space>
          <SettingOutlined style={{ color: '#1890ff' }} />
          <Typography.Title level={4} style={{ margin: 0, color: '#262626' }}>
            NavBar Configuration
          </Typography.Title>
        </Space>
      }
      open={visible}
      onClose={onClose}
      width={680}
      placement="right"
      destroyOnClose={true}
      styles={{
        header: {
          borderBottom: '1px solid #f0f0f0',
          paddingBottom: '16px'
        },
        body: {
          padding: 0
        }
      }}
      extra={
        <Space>
          <AntButton 
            type="text" 
            icon={<ReloadOutlined />} 
            onClick={() => window.location.reload()}
            title="Reset to defaults"
          />
          <AntButton 
            type="primary" 
            onClick={onClose}
            icon={<CheckOutlined />}
          >
            Apply Changes
          </AntButton>
        </Space>
      }
    >
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          type="card"
          size="small"
          style={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column'
          }}
          tabBarStyle={{
            margin: 0,
            padding: '0 24px',
            borderBottom: '1px solid #f0f0f0',
            backgroundColor: '#fafafa'
          }}
          items={[
            {
              key: 'layout',
              label: (
                <Space size="small">
                  <LayoutOutlined />
                  Layout
                </Space>
              ),
              children: (
                <div style={{ padding: '24px', height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                  <Collapse 
                    defaultActiveKey={['positioning', 'spacing']}
                    ghost
                    expandIconPosition="end"
                    items={[
                      {
                        key: 'positioning',
                        label: (
                          <Space>
                            <AimOutlined />
                            <span style={{ fontWeight: 500 }}>Position & Alignment</span>
                          </Space>
                        ),
                        children: (
                          <Card size="small" style={{ marginBottom: 16 }}>
                            <Row gutter={[16, 16]}>
                              <Col span={12}>
                                <Form.Item label="Position">
                                  <Select
                                    value={navBar.position || 'sticky'}
                                    onChange={(value) => updateNavBarSetting('position', value)}
                                    options={[
                                      { value: 'static', label: 'Static' },
                                      { value: 'sticky', label: 'Sticky' }
                                    ]}
                                  />
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item label="Logo Position">
                                  <Select
                                    value={navBar.logoPosition}
                                    onChange={(value) => updateNavBarSetting('logoPosition', value)}
                                    options={[
                                      { value: 'left', label: 'Left' },
                                      { value: 'center', label: 'Center' },
                                      { value: 'right', label: 'Right' }
                                    ]}
                                  />
                                </Form.Item>
                              </Col>
                            </Row>
                          </Card>
                        )
                      },
                      {
                        key: 'navigation',
                        label: (
                          <Space>
                            <CompassOutlined />
                            <span style={{ fontWeight: 500 }}>Navigation Settings</span>
                          </Space>
                        ),
                        children: (
                          <Card size="small" style={{ marginBottom: 16 }}>
                            <Row gutter={[16, 16]}>
                              <Col span={24}>
                                <Form.Item label="Navigation Mode">
                                  <Select
                                    value={navBar.navMode || 'top-level'}
                                    onChange={(value) => updateNavBarSetting('navMode', value)}
                                    options={[
                                      { value: 'top-level', label: 'Top Level Pages Only' },
                                      { value: 'all-pages', label: 'All Pages (Hierarchical)' },
                                      { value: 'custom', label: 'Custom Selection' }
                                    ]}
                                  />
                                </Form.Item>
                              </Col>
                              
                              <Col span={12}>
                                <Form.Item>
                                  <Checkbox
                                    checked={showHomePage}
                                    onChange={(e) => {
                                      setShowHomePage(e.target.checked);
                                      updateNavBarSetting('showHomePage', e.target.checked);
                                    }}
                                  >
                                    Show Home Page
                                  </Checkbox>
                                </Form.Item>
                              </Col>
                              
                              <Col span={12}>
                                <Form.Item label="Maximum Menu Depth">
                                  <Select
                                    value={navBar.maxMenuDepth || 2}
                                    onChange={(value) => updateNavBarSetting('maxMenuDepth', value)}
                                    options={[
                                      { value: 1, label: '1 Level' },
                                      { value: 2, label: '2 Levels' },
                                      { value: 3, label: '3 Levels' }
                                    ]}
                                  />
                                </Form.Item>
                              </Col>

                              {navBar.navMode === 'custom' && (
                                <Col span={24}>
                                  <Form.Item label="Select Pages to Display">
                                    <Select
                                      mode="multiple"
                                      value={selectedPages}
                                      onChange={(values) => {
                                        setSelectedPages(values);
                                        updateNavBarSetting('customSelectedPages', values);
                                      }}
                                      placeholder="Choose pages to show in navigation"
                                      style={{ width: '100%' }}
                                      options={availablePages.map(page => ({
                                        label: page.name,
                                        value: page.id
                                      }))}
                                    />
                                  </Form.Item>
                                </Col>
                              )}
                            </Row>
                          </Card>
                        )
                      },
                      {
                        key: 'spacing',
                        label: (
                          <Space>
                            <BorderOutlined />
                            <span style={{ fontWeight: 500 }}>Spacing & Dimensions</span>
                          </Space>
                        ),
                        children: (
                          <Card size="small" style={{ marginBottom: 16 }}>
                            <Descriptions
                              title="Padding Controls"
                              size="small"
                              column={2}
                              bordered
                              items={[
                                {
                                  key: 'top',
                                  label: 'Top',
                                  children: (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <InputNumber
                                        min={0}
                                        max={100}
                                        value={navBar.layout?.padding?.top || 12}
                                        onChange={(value) => handlePaddingUpdate('top', value)}
                                        size="small"
                                        addonAfter="px"
                                        style={{ width: '100%' }}
                                      />
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={paddingLocks.top ? <LockOutlined /> : <UnlockOutlined />}
                                        onClick={() => togglePaddingLock('top')}
                                        style={{ 
                                          padding: '0 4px',
                                          minWidth: 'auto',
                                          height: '24px',
                                          color: paddingLocks.top ? '#1890ff' : '#d9d9d9'
                                        }}
                                      />
                                    </div>
                                  )
                                },
                                {
                                  key: 'right',
                                  label: 'Right',
                                  children: (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <InputNumber
                                        min={0}
                                        max={100}
                                        value={navBar.layout?.padding?.right || 24}
                                        onChange={(value) => handlePaddingUpdate('right', value)}
                                        size="small"
                                        addonAfter="px"
                                        style={{ width: '100%' }}
                                      />
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={paddingLocks.right ? <LockOutlined /> : <UnlockOutlined />}
                                        onClick={() => togglePaddingLock('right')}
                                        style={{ 
                                          padding: '0 4px',
                                          minWidth: 'auto',
                                          height: '24px',
                                          color: paddingLocks.right ? '#1890ff' : '#d9d9d9'
                                        }}
                                      />
                                    </div>
                                  )
                                },
                                {
                                  key: 'bottom',
                                  label: 'Bottom',
                                  children: (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <InputNumber
                                        min={0}
                                        max={100}
                                        value={navBar.layout?.padding?.bottom || 12}
                                        onChange={(value) => handlePaddingUpdate('bottom', value)}
                                        size="small"
                                        addonAfter="px"
                                        style={{ width: '100%' }}
                                      />
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={paddingLocks.bottom ? <LockOutlined /> : <UnlockOutlined />}
                                        onClick={() => togglePaddingLock('bottom')}
                                        style={{ 
                                          padding: '0 4px',
                                          minWidth: 'auto',
                                          height: '24px',
                                          color: paddingLocks.bottom ? '#1890ff' : '#d9d9d9'
                                        }}
                                      />
                                    </div>
                                  )
                                },
                                {
                                  key: 'left',
                                  label: 'Left',
                                  children: (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <InputNumber
                                        min={0}
                                        max={100}
                                        value={navBar.layout?.padding?.left || 24}
                                        onChange={(value) => handlePaddingUpdate('left', value)}
                                        size="small"
                                        addonAfter="px"
                                        style={{ width: '100%' }}
                                      />
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={paddingLocks.left ? <LockOutlined /> : <UnlockOutlined />}
                                        onClick={() => togglePaddingLock('left')}
                                        style={{ 
                                          padding: '0 4px',
                                          minWidth: 'auto',
                                          height: '24px',
                                          color: paddingLocks.left ? '#1890ff' : '#d9d9d9'
                                        }}
                                      />
                                    </div>
                                  )
                                }
                              ]}
                            />
                            <Divider />
                            <Descriptions
                              title="Margin Controls"
                              size="small"
                              column={2}
                              bordered
                              items={[
                                {
                                  key: 'top',
                                  label: 'Top',
                                  children: (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <InputNumber
                                        min={0}
                                        max={100}
                                        value={navBar.layout?.margin?.top || 0}
                                        onChange={(value) => handleMarginUpdate('top', value)}
                                        size="small"
                                        addonAfter="px"
                                        style={{ width: '100%' }}
                                      />
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={marginLocks.top ? <LockOutlined /> : <UnlockOutlined />}
                                        onClick={() => toggleMarginLock('top')}
                                        style={{ 
                                          padding: '0 4px',
                                          minWidth: 'auto',
                                          height: '24px',
                                          color: marginLocks.top ? '#1890ff' : '#d9d9d9'
                                        }}
                                      />
                                    </div>
                                  )
                                },
                                {
                                  key: 'right',
                                  label: 'Right',
                                  children: (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <InputNumber
                                        min={0}
                                        max={100}
                                        value={navBar.layout?.margin?.right || 0}
                                        onChange={(value) => handleMarginUpdate('right', value)}
                                        size="small"
                                        addonAfter="px"
                                        style={{ width: '100%' }}
                                      />
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={marginLocks.right ? <LockOutlined /> : <UnlockOutlined />}
                                        onClick={() => toggleMarginLock('right')}
                                        style={{ 
                                          padding: '0 4px',
                                          minWidth: 'auto',
                                          height: '24px',
                                          color: marginLocks.right ? '#1890ff' : '#d9d9d9'
                                        }}
                                      />
                                    </div>
                                  )
                                },
                                {
                                  key: 'bottom',
                                  label: 'Bottom',
                                  children: (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <InputNumber
                                        min={0}
                                        max={100}
                                        value={navBar.layout?.margin?.bottom || 0}
                                        onChange={(value) => handleMarginUpdate('bottom', value)}
                                        size="small"
                                        addonAfter="px"
                                        style={{ width: '100%' }}
                                      />
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={marginLocks.bottom ? <LockOutlined /> : <UnlockOutlined />}
                                        onClick={() => toggleMarginLock('bottom')}
                                        style={{ 
                                          padding: '0 4px',
                                          minWidth: 'auto',
                                          height: '24px',
                                          color: marginLocks.bottom ? '#1890ff' : '#d9d9d9'
                                        }}
                                      />
                                    </div>
                                  )
                                },
                                {
                                  key: 'left',
                                  label: 'Left',
                                  children: (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <InputNumber
                                        min={0}
                                        max={100}
                                        value={navBar.layout?.margin?.left || 0}
                                        onChange={(value) => handleMarginUpdate('left', value)}
                                        size="small"
                                        addonAfter="px"
                                        style={{ width: '100%' }}
                                      />
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={marginLocks.left ? <LockOutlined /> : <UnlockOutlined />}
                                        onClick={() => toggleMarginLock('left')}
                                        style={{ 
                                          padding: '0 4px',
                                          minWidth: 'auto',
                                          height: '24px',
                                          color: marginLocks.left ? '#1890ff' : '#d9d9d9'
                                        }}
                                      />
                                    </div>
                                  )
                                }
                              ]}
                            />
                            <Divider />
                            <Row gutter={[16, 16]}>
                              <Col span={12}>
                                <Statistic
                                  title="Items Gap"
                                  value={navBar.layout?.gap || 16}
                                  suffix="px"
                                  valueStyle={{ fontSize: '16px' }}
                                />
                                <Slider
                                  min={0}
                                  max={50}
                                  value={navBar.layout?.gap || 16}
                                  onChange={(value) => updateStyleObject('layout', 'gap', value)}
                                  tooltip={{ formatter: (val) => `${val}px` }}
                                />
                              </Col>
                              <Col span={12}>
                                <Statistic
                                  title="Container Max Width"
                                  value={navBar.layout?.containerMaxWidth || 3000}
                                  suffix="px"
                                  valueStyle={{ fontSize: '16px' }}
                                />
                                <Slider
                                  min={600}
                                  max={9000}
                                  step={50}
                                  value={navBar.layout?.containerMaxWidth || 3000}
                                  onChange={(value) => updateStyleObject('layout', 'containerMaxWidth', value)}
                                  tooltip={{ formatter: (val) => `${val}px` }}
                                />
                              </Col>
                            </Row>
                            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                              <Col span={12}>
                                <Space direction="vertical" style={{ width: '100%' }}>
                                  <Text strong>Center Content</Text>
                                  <Switch
                                    checked={navBar.layout?.centerContent || false}
                                    onChange={(checked) => updateStyleObject('layout', 'centerContent', checked)}
                                    checkedChildren="Centered"
                                    unCheckedChildren="Full Width"
                                  />
                                </Space>
                              </Col>
                              <Col span={12}>
                                <Space direction="vertical" style={{ width: '100%' }}>
                                  <Text strong>Z-Index</Text>
                                  <InputNumber
                                    min={1}
                                    max={9999}
                                    value={navBar.zIndex || 1000}
                                    onChange={(value) => updateNavBarSetting('zIndex', value)}
                                    style={{ width: '100%' }}
                                  />
                                </Space>
                              </Col>
                            </Row>
                          </Card>
                        )
                      }
                    ]}
                  />
                </div>
              )
            },
            {
              key: 'branding',
              label: (
                <Space size="small">
                  <CrownOutlined />
                  Branding
                </Space>
              ),
              children: (
                <div style={{ padding: '24px', height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                  <Collapse 
                    defaultActiveKey={['logo-settings', 'logo-styling']}
                    ghost
                    expandIconPosition="end"
                    items={[
                      {
                        key: 'logo-settings',
                        label: (
                          <Space>
                            <PictureOutlined />
                            <span style={{ fontWeight: 500 }}>Logo Configuration</span>
                          </Space>
                        ),
                        children: (
                          <Card size="small" style={{ marginBottom: 16 }}>
                            <Row gutter={[16, 16]}>
                              <Col span={24}>
                                <Form.Item label="Logo Type">
                                  <Segmented
                                    value={navBar.logo?.type || 'text'}
                                    onChange={(value) => updateStyleObject('logo', 'type', value)}
                                    options={[
                                      { label: 'Text', value: 'text', icon: <EditOutlined /> },
                                      { label: 'Image', value: 'image', icon: <PictureOutlined /> },
                                      { label: 'None', value: 'none', icon: <EyeInvisibleOutlined /> }
                                    ]}
                                  />
                                </Form.Item>
                              </Col>
                              
                              {navBar.logo?.type === 'text' && (
                                <>
                                  <Col span={12}>
                                    <Form.Item label="Logo Text">
                                      <Input
                                        value={navBar.logo?.content || ''}
                                        onChange={(e) => updateStyleObject('logo', 'content', e.target.value)}
                                        placeholder="Your Brand Name"
                                        prefix={<EditOutlined />}
                                        size="large"
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col span={12}>
                                    <Form.Item label="Font Family">
                                      <Select
                                        value={navBar.logo?.fontFamily || 'Arial, sans-serif'}
                                        onChange={(value) => updateStyleObject('logo', 'fontFamily', value)}
                                        options={FONT_FAMILIES}
                                        showSearch
                                        placeholder="Select font"
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col span={12}>
                                    <Form.Item label="Text Color">
                                      <ColorPicker
                                        value={navBar.logo?.color || '#000000'}
                                        onChange={(color) => updateStyleObject('logo', 'color', color.toHexString())}
                                        showText
                                        size="large"
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col span={12}>
                                    <Form.Item label="Font Weight">
                                      <Select
                                        value={navBar.logo?.fontWeight || '700'}
                                        onChange={(value) => updateStyleObject('logo', 'fontWeight', value)}
                                        options={[
                                          { value: '300', label: 'Light' },
                                          { value: '400', label: 'Normal' },
                                          { value: '500', label: 'Medium' },
                                          { value: '600', label: 'Semi Bold' },
                                          { value: '700', label: 'Bold' },
                                          { value: '800', label: 'Extra Bold' },
                                          { value: '900', label: 'Black' }
                                        ]}
                                      />
                                    </Form.Item>
                                  </Col>
                                </>
                              )}

                              {navBar.logo?.type === 'image' && (
                                <>
                                  <Col span={24}>
                                    <Form.Item label="Logo Image">
                                      <Input.Group compact>
                                        <Input
                                          style={{ width: 'calc(100% - 120px)' }}
                                          value={navBar.logo?.content || ''}
                                          onChange={(e) => updateStyleObject('logo', 'content', e.target.value)}
                                          placeholder="https://example.com/logo.png"
                                          prefix={<LinkOutlined />}
                                        />
                                        <AntButton 
                                          icon={<PictureOutlined />}
                                          onClick={() => setMediaLibraryVisible(true)}
                                          type="primary"
                                          style={{ width: '120px' }}
                                        >
                                          Browse
                                        </AntButton>
                                      </Input.Group>
                                    </Form.Item>
                                  </Col>
                                  
                                  {navBar.logo?.content && (
                                    <Col span={24}>
                                      <Card size="small" title="Logo Preview" style={{ textAlign: 'center' }}>
                                        <img 
                                          src={navBar.logo.content} 
                                          alt="Logo Preview" 
                                          style={{ 
                                            width: `${navBar.logo?.width || 40}px`,
                                            height: `${navBar.logo?.height || 40}px`,
                                            objectFit: 'cover',
                                            borderRadius: `${navBar.logo?.borderRadius || 0}px`,
                                            backgroundColor: navBar.logo?.backgroundColor || 'transparent'
                                          }} 
                                        />
                                      </Card>
                                    </Col>
                                  )}
                                </>
                              )}
                            </Row>
                          </Card>
                        )
                      },
                      {
                        key: 'logo-styling',
                        label: (
                          <Space>
                            <FormatPainterOutlined />
                            <span style={{ fontWeight: 500 }}>Logo Styling</span>
                          </Space>
                        ),
                        children: (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Dimensions Section */}
                            <Card 
                              size="small" 
                              title={<Text strong style={{ color: '#1890ff' }}>Dimensions</Text>}
                              style={{ borderColor: '#e6f7ff' }}
                            >
                              <Row gutter={[16, 16]}>
                                <Col span={12}>
                                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                    <Text strong style={{ fontSize: '12px', color: '#666' }}>Width</Text>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <InputNumber
                                        min={20}
                                        max={200}
                                        step={5}
                                        value={navBar.logo?.width || 40}
                                        onChange={(value) => handleLogoSizeUpdate('width', value)}
                                        addonAfter="px"
                                        style={{ width: '100%' }}
                                        placeholder="Width"
                                      />
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={logoSizeLock ? <LockOutlined /> : <UnlockOutlined />}
                                        onClick={toggleLogoSizeLock}
                                        style={{ 
                                          padding: '0 4px',
                                          minWidth: 'auto',
                                          height: '32px',
                                          color: logoSizeLock ? '#1890ff' : '#d9d9d9'
                                        }}
                                        title={logoSizeLock ? "Unlock to resize independently" : "Lock to resize together"}
                                      />
                                    </div>
                                  </Space>
                                </Col>
                                <Col span={12}>
                                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                    <Text strong style={{ fontSize: '12px', color: '#666' }}>Height</Text>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <InputNumber
                                        min={20}
                                        max={200}
                                        step={5}
                                        value={navBar.logo?.height || 40}
                                        onChange={(value) => handleLogoSizeUpdate('height', value)}
                                        addonAfter="px"
                                        style={{ width: '100%' }}
                                        placeholder="Height"
                                      />
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={logoSizeLock ? <LockOutlined /> : <UnlockOutlined />}
                                        onClick={toggleLogoSizeLock}
                                        style={{ 
                                          padding: '0 4px',
                                          minWidth: 'auto',
                                          height: '32px',
                                          color: logoSizeLock ? '#1890ff' : '#d9d9d9'
                                        }}
                                        title={logoSizeLock ? "Unlock to resize independently" : "Lock to resize together"}
                                      />
                                    </div>
                                  </Space>
                                </Col>
                                <Col span={24}>
                                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                    <Text strong style={{ fontSize: '12px', color: '#666' }}>Quick Presets</Text>
                                    <Space.Compact block>
                                      <AntButton 
                                        type={navBar.logo?.width === 40 && navBar.logo?.height === 40 ? 'primary' : 'default'}
                                        size="small"
                                        onClick={() => {
                                          if (logoSizeLock) {
                                            const updatedNavBar = {
                                              ...navBar,
                                              logo: { ...navBar.logo, width: 40, height: 40 }
                                            };
                                            onUpdate(updatedNavBar);
                                          } else {
                                            updateStyleObject('logo', 'width', 40);
                                            updateStyleObject('logo', 'height', 40);
                                          }
                                        }}
                                      >
                                        Small (40px)
                                      </AntButton>
                                      <AntButton 
                                        type={navBar.logo?.width === 80 && navBar.logo?.height === 80 ? 'primary' : 'default'}
                                        size="small"
                                        onClick={() => {
                                          if (logoSizeLock) {
                                            const updatedNavBar = {
                                              ...navBar,
                                              logo: { ...navBar.logo, width: 80, height: 80 }
                                            };
                                            onUpdate(updatedNavBar);
                                          } else {
                                            updateStyleObject('logo', 'width', 80);
                                            updateStyleObject('logo', 'height', 80);
                                          }
                                        }}
                                      >
                                        Medium (80px)
                                      </AntButton>
                                      <AntButton 
                                        type={navBar.logo?.width === 120 && navBar.logo?.height === 120 ? 'primary' : 'default'}
                                        size="small"
                                        onClick={() => {
                                          if (logoSizeLock) {
                                            const updatedNavBar = {
                                              ...navBar,
                                              logo: { ...navBar.logo, width: 120, height: 120 }
                                            };
                                            onUpdate(updatedNavBar);
                                          } else {
                                            updateStyleObject('logo', 'width', 120);
                                            updateStyleObject('logo', 'height', 120);
                                          }
                                        }}
                                      >
                                        Large (120px)
                                      </AntButton>
                                    </Space.Compact>
                                  </Space>
                                </Col>
                              </Row>
                            </Card>

                            {/* Spacing Section */}
                            <Card 
                              size="small" 
                              title={<Text strong style={{ color: '#52c41a' }}>Spacing</Text>}
                              style={{ borderColor: '#f6ffed' }}
                            >
                              <Row gutter={[16, 16]}>
                                <Col span={24}>
                                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Text strong style={{ fontSize: '12px', color: '#666' }}>Padding</Text>
                                      <Badge 
                                        count={`${navBar.logo?.padding || 0}px`}
                                        style={{ backgroundColor: '#52c41a' }}
                                      />
                                    </div>
                                    <Slider
                                      min={0}
                                      max={20}
                                      step={1}
                                      value={navBar.logo?.padding || 0}
                                      onChange={(value) => updateStyleObject('logo', 'padding', value)}
                                      tooltip={{ 
                                        formatter: (val) => `${val}px`,
                                        placement: 'top'
                                      }}
                                      trackStyle={{ backgroundColor: '#52c41a' }}
                                      handleStyle={{ borderColor: '#52c41a' }}
                                      marks={{
                                        0: { label: '0', style: { fontSize: '10px' } },
                                        10: { label: '10', style: { fontSize: '10px' } },
                                        20: { label: '20', style: { fontSize: '10px' } }
                                      }}
                                    />
                                  </Space>
                                </Col>
                                <Col span={24}>
                                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Text strong style={{ fontSize: '12px', color: '#666' }}>Border Radius</Text>
                                      <Badge 
                                        count={`${navBar.logo?.borderRadius || 0}px`}
                                        style={{ backgroundColor: '#52c41a' }}
                                      />
                                    </div>
                                    <Slider
                                      min={0}
                                      max={100}
                                      step={1}
                                      value={navBar.logo?.borderRadius || 0}
                                      onChange={(value) => updateStyleObject('logo', 'borderRadius', value)}
                                      tooltip={{ 
                                        formatter: (val) => val === 100 ? 'Circular' : `${val}px`,
                                        placement: 'top'
                                      }}
                                      trackStyle={{ backgroundColor: '#52c41a' }}
                                      handleStyle={{ borderColor: '#52c41a' }}
                                      marks={{
                                        0: { label: '0', style: { fontSize: '10px' } },
                                        25: { label: '25', style: { fontSize: '10px' } },
                                        50: { label: '50', style: { fontSize: '10px' } },
                                        100: { label: '●', style: { fontSize: '14px' } }
                                      }}
                                    />
                                  </Space>
                                </Col>
                              </Row>
                            </Card>

                            {/* Appearance Section */}
                            <Card 
                              size="small" 
                              title={<Text strong style={{ color: '#722ed1' }}>Appearance</Text>}
                              style={{ borderColor: '#f9f0ff' }}
                            >
                              <Row gutter={[16, 16]}>
                                <Col span={24}>
                                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                    <Text strong style={{ fontSize: '12px', color: '#666' }}>Background Color</Text>
                                    <ColorPicker
                                      value={navBar.logo?.backgroundColor || 'transparent'}
                                      onChange={(color) => updateStyleObject('logo', 'backgroundColor', color.toRgbString())}
                                      showText
                                      size="large"
                                      style={{ width: '100%' }}
                                      presets={[
                                        {
                                          label: 'Recommended',
                                          colors: [
                                            'transparent',
                                            '#ffffff',
                                            '#f5f5f5',
                                            '#1890ff',
                                            '#52c41a',
                                            '#faad14',
                                            '#f5222d',
                                            '#722ed1',
                                            '#13c2c2',
                                            '#fa541c'
                                          ]
                                        }
                                      ]}
                                    />
                                  </Space>
                                </Col>
                                <Col span={12}>
                                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Text strong style={{ fontSize: '12px', color: '#666' }}>Border Width</Text>
                                      <Badge 
                                        count={`${navBar.logo?.borderWidth || 0}px`}
                                        style={{ backgroundColor: '#722ed1' }}
                                      />
                                    </div>
                                    <Slider
                                      min={0}
                                      max={10}
                                      step={1}
                                      value={navBar.logo?.borderWidth || 0}
                                      onChange={(value) => updateStyleObject('logo', 'borderWidth', value)}
                                      trackStyle={{ backgroundColor: '#722ed1' }}
                                      handleStyle={{ borderColor: '#722ed1' }}
                                      marks={{
                                        0: '0',
                                        5: '5',
                                        10: '10'
                                      }}
                                      tooltip={{
                                        formatter: (value) => `${value}px`
                                      }}
                                    />
                                  </Space>
                                </Col>
                                <Col span={12}>
                                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                    <Text strong style={{ fontSize: '12px', color: '#666' }}>Border Color</Text>
                                    <ColorPicker
                                      value={navBar.logo?.borderColor || '#000000'}
                                      onChange={(color) => updateStyleObject('logo', 'borderColor', color.toHexString())}
                                      showText
                                      size="large"
                                      style={{ width: '100%' }}
                                      presets={[
                                        {
                                          label: 'Common Colors',
                                          colors: [
                                            '#000000',
                                            '#ffffff',
                                            '#d9d9d9',
                                            '#1890ff',
                                            '#52c41a',
                                            '#faad14',
                                            '#f5222d',
                                            '#722ed1'
                                          ]
                                        }
                                      ]}
                                    />
                                  </Space>
                                </Col>
                              </Row>
                            </Card>
                          </div>
                        )
                      }
                    ]}
                  />
                </div>
              )
            },
            {
              key: 'navigation',
              label: (
                <Space size="small">
                  <MenuOutlined />
                  Navigation
                </Space>
              ),
              children: (
                <div style={{ padding: '24px', height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                  <Collapse 
                    defaultActiveKey={['nav-structure', 'nav-styling']}
                    ghost
                    expandIconPosition="end"
                    items={[
                      {
                        key: 'nav-structure',
                        label: (
                          <Space>
                            <AppstoreOutlined />
                            <span style={{ fontWeight: 500 }}>Navigation Structure</span>
                          </Space>
                        ),
                        children: (
                          <Card size="small" style={{ marginBottom: 16 }}>
                            <Alert
                              message="Auto-Generated from PageManager"
                              description="Navigation items are automatically pulled from your project's pages. Use the controls below to customize display."
                              type="info"
                              showIcon
                              style={{ marginBottom: 16 }}
                            />
                            
                            <Form.Item label="Navigation Mode">
                              <Radio.Group
                                value={navBar.navMode || 'top-level'}
                                onChange={(e) => updateNavBarSetting('navMode', e.target.value)}
                                optionType="button"
                                buttonStyle="solid"
                              >
                                <Radio value="top-level">Top Level Only</Radio>
                                <Radio value="nested">Nested with Dropdowns</Radio>
                                <Radio value="custom">Custom Selection</Radio>
                              </Radio.Group>
                            </Form.Item>

                            {navBar.navMode === 'custom' && (
                              <Card size="small" title="Select Pages" style={{ marginTop: 16 }}>
                                <Space style={{ marginBottom: 12 }}>
                                  <AntButton 
                                    size="small" 
                                    icon={<CheckOutlined />}
                                    onClick={() => {
                                      const allPages = availablePages.map(page => page.id);
                                      setSelectedPages(allPages);
                                      updateNavBarSetting('customSelectedPages', allPages);
                                    }}
                                  >
                                    Select All
                                  </AntButton>
                                  <AntButton 
                                    size="small" 
                                    icon={<MinusOutlined />}
                                    onClick={() => {
                                      setSelectedPages([]);
                                      updateNavBarSetting('customSelectedPages', []);
                                    }}
                                  >
                                    Clear All
                                  </AntButton>
                                </Space>
                                
                                {availablePages.length > 0 ? (
                                  <Tree
                                    checkable
                                    checkedKeys={selectedPages}
                                    onCheck={(checkedKeys) => {
                                      setSelectedPages(checkedKeys);
                                      updateNavBarSetting('customSelectedPages', checkedKeys);
                                    }}
                                    treeData={availablePages.map(page => ({
                                      title: (
                                        <Space>
                                          <span>{page.name}</span>
                                          <Text type="secondary" style={{ fontSize: '12px' }}>
                                            {page.path}
                                          </Text>
                                        </Space>
                                      ),
                                      key: page.id,
                                      children: page.children?.map(child => ({
                                        title: (
                                          <Space>
                                            <span>{child.name}</span>
                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                              {child.path}
                                            </Text>
                                          </Space>
                                        ),
                                        key: child.id
                                      }))
                                    }))}
                                  />
                                ) : (
                                  <Empty description="No pages available" />
                                )}
                              </Card>
                            )}
                          </Card>
                        )
                      },
                      {
                        key: 'nav-styling',
                        label: (
                          <Space>
                            <BgColorsOutlined />
                            <span style={{ fontWeight: 500 }}>Navigation Styling</span>
                          </Space>
                        ),
                        children: (
                          <Card size="small" style={{ marginBottom: 16 }}>
                            <Tabs
                              size="small"
                              items={[
                                {
                                  key: 'typography',
                                  label: 'Typography',
                                  children: (
                                    <Row gutter={[16, 16]}>
                                      <Col span={12}>
                                        <Form.Item label="Font Family">
                                          <Select
                                            value={navBar.navItemStyles?.fontFamily || 'Arial, sans-serif'}
                                            onChange={(value) => updateStyleObject('navItemStyles', 'fontFamily', value)}
                                            options={FONT_FAMILIES}
                                            showSearch
                                          />
                                        </Form.Item>
                                      </Col>
                                      <Col span={12}>
                                        <Form.Item label="Font Weight">
                                          <Select
                                            value={navBar.navItemStyles?.fontWeight || '500'}
                                            onChange={(value) => updateStyleObject('navItemStyles', 'fontWeight', value)}
                                            options={[
                                              { value: '300', label: 'Light' },
                                              { value: '400', label: 'Normal' },
                                              { value: '500', label: 'Medium' },
                                              { value: '600', label: 'Semi Bold' },
                                              { value: '700', label: 'Bold' }
                                            ]}
                                          />
                                        </Form.Item>
                                      </Col>
                                      <Col span={12}>
                                        <Statistic
                                          title="Font Size"
                                          value={navBar.navItemStyles?.fontSize || 16}
                                          suffix="px"
                                          valueStyle={{ fontSize: '16px' }}
                                        />
                                        <Slider
                                          min={12}
                                          max={28}
                                          value={navBar.navItemStyles?.fontSize || 16}
                                          onChange={(value) => updateStyleObject('navItemStyles', 'fontSize', value)}
                                          tooltip={{ formatter: (val) => `${val}px` }}
                                        />
                                      </Col>
                                      <Col span={12}>
                                        <Form.Item label="Text Shadow">
                                          <Input
                                            value={navBar.navItemStyles?.textShadow || ''}
                                            onChange={(e) => updateStyleObject('navItemStyles', 'textShadow', e.target.value)}
                                            placeholder="1px 1px 2px rgba(0,0,0,0.3)"
                                          />
                                        </Form.Item>
                                      </Col>
                                    </Row>
                                  )
                                },
                                {
                                  key: 'colors',
                                  label: 'Colors',
                                  children: (
                                    <Row gutter={[16, 16]}>
                                      <Col span={12}>
                                        <Form.Item label="Text Color">
                                          <ColorPicker
                                            value={navBar.navItemStyles?.color || '#333333'}
                                            onChange={(color) => updateStyleObject('navItemStyles', 'color', color.toHexString())}
                                            showText
                                          />
                                        </Form.Item>
                                      </Col>
                                      <Col span={12}>
                                        <Form.Item label="Active Color">
                                          <ColorPicker
                                            value={navBar.navItemStyles?.activeColor || '#1890ff'}
                                            onChange={(color) => updateStyleObject('navItemStyles', 'activeColor', color.toHexString())}
                                            showText
                                          />
                                        </Form.Item>
                                      </Col>
                                      <Col span={12}>
                                        <Form.Item label="Hover Background">
                                          <ColorPicker
                                            value={navBar.navItemStyles?.hoverBgColor || 'rgba(0,0,0,0.05)'}
                                            onChange={(color) => updateStyleObject('navItemStyles', 'hoverBgColor', color.toRgbString())}
                                            showText
                                          />
                                        </Form.Item>
                                      </Col>
                                      <Col span={12}>
                                        <Form.Item label="Active Background">
                                          <ColorPicker
                                            value={navBar.navItemStyles?.activeBgColor || 'rgba(24, 144, 255, 0.1)'}
                                            onChange={(color) => updateStyleObject('navItemStyles', 'activeBgColor', color.toRgbString())}
                                            showText
                                          />
                                        </Form.Item>
                                      </Col>
                                    </Row>
                                  )
                                },
                                {
                                  key: 'icons',
                                  label: 'Icons',
                                  children: (
                                    <Row gutter={[16, 16]}>
                                      <Col span={24}>
                                        <Form.Item label="Icon Position">
                                          <Segmented
                                            value={navBar.navItemStyles?.iconPosition || 'before'}
                                            onChange={(value) => updateStyleObject('navItemStyles', 'iconPosition', value)}
                                            options={[
                                              { label: 'None', value: 'none' },
                                              { label: 'Before Text', value: 'before' },
                                              { label: 'After Text', value: 'after' }
                                            ]}
                                          />
                                        </Form.Item>
                                      </Col>
                                      {navBar.navItemStyles?.iconPosition !== 'none' && (
                                        <>
                                          <Col span={12}>
                                            <Statistic
                                              title="Icon Size"
                                              value={navBar.navItemStyles?.iconSize || 16}
                                              suffix="px"
                                              valueStyle={{ fontSize: '16px' }}
                                            />
                                            <Slider
                                              min={12}
                                              max={32}
                                              value={navBar.navItemStyles?.iconSize || 16}
                                              onChange={(value) => updateStyleObject('navItemStyles', 'iconSize', value)}
                                              tooltip={{ formatter: (val) => `${val}px` }}
                                            />
                                          </Col>
                                          <Col span={12}>
                                            <Form.Item label="Icon Color">
                                              <ColorPicker
                                                value={navBar.navItemStyles?.iconColor || '#333333'}
                                                onChange={(color) => updateStyleObject('navItemStyles', 'iconColor', color.toHexString())}
                                                showText
                                              />
                                            </Form.Item>
                                          </Col>
                                          <Col span={24}>
                                            <Card size="small" title="Available Icons">
                                              <Row gutter={[8, 8]}>
                                                {[
                                                  { key: 'home', icon: <HomeOutlined />, label: 'home' },
                                                  { key: 'user', icon: <UserOutlined />, label: 'user' },
                                                  { key: 'setting', icon: <SettingOutlined />, label: 'setting' },
                                                  { key: 'global', icon: <GlobalOutlined />, label: 'global' },
                                                  { key: 'star', icon: <StarOutlined />, label: 'star' },
                                                  { key: 'app', icon: <AppstoreOutlined />, label: 'app' }
                                                ].map(({ key, icon, label }) => (
                                                  <Col span={4} key={key}>
                                                    <div style={{ 
                                                      textAlign: 'center',
                                                      padding: '8px',
                                                      borderRadius: '4px',
                                                      backgroundColor: '#fafafa',
                                                      border: '1px solid #e0e0e0'
                                                    }}>
                                                      {React.cloneElement(icon, { 
                                                        style: { 
                                                          fontSize: `${navBar.navItemStyles?.iconSize || 16}px`,
                                                          color: navBar.navItemStyles?.iconColor || '#333333'
                                                        }
                                                      })}
                                                      <div style={{ fontSize: '10px', marginTop: '4px' }}>{label}</div>
                                                    </div>
                                                  </Col>
                                                ))}
                                              </Row>
                                            </Card>
                                          </Col>
                                        </>
                                      )}
                                    </Row>
                                  )
                                }
                              ]}
                            />
                          </Card>
                        )
                      }
                    ]}
                  />
                </div>
              )
            },
            {
              key: 'features',
              label: (
                <Space size="small">
                  <AppstoreOutlined />
                  Features
                </Space>
              ),
              children: (
                <div style={{ padding: '24px', height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                  <Collapse 
                    defaultActiveKey={['interactive', 'mobile']}
                    ghost
                    expandIconPosition="end"
                    items={[
                      {
                        key: 'interactive',
                        label: (
                          <Space>
                            <InteractionOutlined />
                            <span style={{ fontWeight: 500 }}>Interactive Features</span>
                          </Space>
                        ),
                        children: (
                          <Card size="small" style={{ marginBottom: 16 }}>
                            <Row gutter={[16, 16]}>
                              {/* Search Feature */}
                              <Col span={24}>
                                <Divider orientation="left" plain>
                                  <Space>
                                    <SearchOutlined />
                                    Search
                                  </Space>
                                </Divider>
                              </Col>
                              <Col span={12}>
                                <Form.Item>
                                  <Checkbox
                                    checked={navBar.showSearch || false}
                                    onChange={(e) => updateNavBarSetting('showSearch', e.target.checked)}
                                  >
                                    Enable Search
                                  </Checkbox>
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item label="Search Placeholder">
                                  <Input
                                    value={navBar.searchPlaceholder || 'Search...'}
                                    onChange={(e) => updateNavBarSetting('searchPlaceholder', e.target.value)}
                                    disabled={!navBar.showSearch}
                                  />
                                </Form.Item>
                              </Col>

                              {/* User Menu Feature */}
                              <Col span={24}>
                                <Divider orientation="left" plain>
                                  <Space>
                                    <UserOutlined />
                                    User Menu
                                  </Space>
                                </Divider>
                              </Col>
                              <Col span={12}>
                                <Form.Item>
                                  <Checkbox
                                    checked={navBar.showUserMenu || false}
                                    onChange={(e) => updateNavBarSetting('showUserMenu', e.target.checked)}
                                  >
                                    Enable User Menu
                                  </Checkbox>
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item label="User Menu Type">
                                  <Select
                                    value={navBar.userMenuType || 'dropdown'}
                                    onChange={(value) => updateNavBarSetting('userMenuType', value)}
                                    disabled={!navBar.showUserMenu}
                                    options={[
                                      { value: 'dropdown', label: 'Dropdown Menu' },
                                      { value: 'avatar', label: 'Avatar Only' },
                                      { value: 'button', label: 'Login Button' }
                                    ]}
                                  />
                                </Form.Item>
                              </Col>

                              {/* CTA Button Feature */}
                              <Col span={24}>
                                <Divider orientation="left" plain>
                                  <Space>
                                    <ThunderboltOutlined />
                                    Call-to-Action Button
                                  </Space>
                                </Divider>
                              </Col>
                              <Col span={12}>
                                <Form.Item>
                                  <Checkbox
                                    checked={navBar.ctaButton?.show || false}
                                    onChange={(e) => updateStyleObject('ctaButton', 'show', e.target.checked)}
                                  >
                                    Show CTA Button
                                  </Checkbox>
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item label="Button Text">
                                  <Input
                                    value={navBar.ctaButton?.text || 'Get Started'}
                                    onChange={(e) => updateStyleObject('ctaButton', 'text', e.target.value)}
                                    disabled={!navBar.ctaButton?.show}
                                  />
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item label="Button Action">
                                  <Input
                                    value={navBar.ctaButton?.action || '/signup'}
                                    onChange={(e) => updateStyleObject('ctaButton', 'action', e.target.value)}
                                    disabled={!navBar.ctaButton?.show}
                                    placeholder="/signup or https://example.com"
                                  />
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item label="Button Style">
                                  <Select
                                    value={navBar.ctaButton?.style || 'primary'}
                                    onChange={(value) => updateStyleObject('ctaButton', 'style', value)}
                                    disabled={!navBar.ctaButton?.show}
                                    options={[
                                      { value: 'primary', label: 'Primary' },
                                      { value: 'default', label: 'Default' },
                                      { value: 'dashed', label: 'Dashed' },
                                      { value: 'link', label: 'Link' },
                                      { value: 'text', label: 'Text' }
                                    ]}
                                  />
                                </Form.Item>
                              </Col>

                              {/* Animation & Effects */}
                              <Col span={24}>
                                <Divider orientation="left" plain>
                                  <Space>
                                    <BgColorsOutlined />
                                    Effects & Animation
                                  </Space>
                                </Divider>
                              </Col>
                              <Col span={12}>
                                <Form.Item>
                                  <Checkbox
                                    checked={navBar.enableAnimations !== false}
                                    onChange={(e) => updateNavBarSetting('enableAnimations', e.target.checked)}
                                  >
                                    Enable Animations
                                  </Checkbox>
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item>
                                  <Checkbox
                                    checked={navBar.enableHoverEffects !== false}
                                    onChange={(e) => updateNavBarSetting('enableHoverEffects', e.target.checked)}
                                  >
                                    Enable Hover Effects
                                  </Checkbox>
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item label="Scroll Behavior">
                                  <Select
                                    value={navBar.scrollBehavior || 'normal'}
                                    onChange={(value) => updateNavBarSetting('scrollBehavior', value)}
                                    options={[
                                      { value: 'normal', label: 'Normal' },
                                      { value: 'hide-on-scroll', label: 'Hide on Scroll Down' },
                                      { value: 'transparent-on-top', label: 'Transparent at Top' },
                                      { value: 'compact-on-scroll', label: 'Compact on Scroll' }
                                    ]}
                                  />
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item label="Transition Duration">
                                  <Slider
                                    min={100}
                                    max={1000}
                                    step={50}
                                    value={navBar.transitionDuration || 300}
                                    onChange={(value) => updateNavBarSetting('transitionDuration', value)}
                                    tooltip={{ formatter: (val) => `${val}ms` }}
                                  />
                                </Form.Item>
                              </Col>
                            </Row>
                          </Card>
                        )
                      },
                      {
                        key: 'mobile',
                        label: (
                          <Space>
                            <MobileOutlined />
                            <span style={{ fontWeight: 500 }}>Mobile & Responsive</span>
                          </Space>
                        ),
                        children: (
                          <Card size="small" style={{ marginBottom: 16 }}>
                            <Row gutter={[16, 16]}>
                              <Col span={12}>
                                <Form.Item>
                                  <Checkbox
                                    checked={navBar.showMobileMenu !== false}
                                    onChange={(e) => updateNavBarSetting('showMobileMenu', e.target.checked)}
                                  >
                                    Enable Mobile Menu
                                  </Checkbox>
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item label="Mobile Breakpoint">
                                  <InputNumber
                                    value={navBar.mobileBreakpoint || 768}
                                    onChange={(value) => updateNavBarSetting('mobileBreakpoint', value)}
                                    min={320}
                                    max={1200}
                                    step={1}
                                    suffix="px"
                                    style={{ width: '100%' }}
                                  />
                                </Form.Item>
                              </Col>
                              
                              <Col span={12}>
                                <Form.Item label="Mobile Menu Position">
                                  <Select
                                    value={navBar.mobileMenuPosition || 'right'}
                                    onChange={(value) => updateNavBarSetting('mobileMenuPosition', value)}
                                    disabled={!navBar.showMobileMenu}
                                    options={[
                                      { value: 'left', label: 'Left Side' },
                                      { value: 'right', label: 'Right Side' },
                                      { value: 'top', label: 'Top Dropdown' },
                                      { value: 'bottom', label: 'Bottom Drawer' }
                                    ]}
                                  />
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item label="Mobile Menu Style">
                                  <Select
                                    value={navBar.mobileMenuStyle || 'drawer'}
                                    onChange={(value) => updateNavBarSetting('mobileMenuStyle', value)}
                                    disabled={!navBar.showMobileMenu}
                                    options={[
                                      { value: 'drawer', label: 'Slide Drawer' },
                                      { value: 'modal', label: 'Modal Overlay' },
                                      { value: 'dropdown', label: 'Dropdown Menu' },
                                      { value: 'fullscreen', label: 'Fullscreen Overlay' }
                                    ]}
                                  />
                                </Form.Item>
                              </Col>

                              <Col span={24}>
                                <Divider orientation="left" plain>Responsive Behavior</Divider>
                              </Col>
                              
                              <Col span={12}>
                                <Form.Item>
                                  <Checkbox
                                    checked={navBar.hideLogoOnMobile || false}
                                    onChange={(e) => updateNavBarSetting('hideLogoOnMobile', e.target.checked)}
                                  >
                                    Hide Logo on Mobile
                                  </Checkbox>
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item>
                                  <Checkbox
                                    checked={navBar.hideSearchOnMobile !== false}
                                    onChange={(e) => updateNavBarSetting('hideSearchOnMobile', e.target.checked)}
                                  >
                                    Hide Search on Mobile
                                  </Checkbox>
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item>
                                  <Checkbox
                                    checked={navBar.hideCtaOnMobile || false}
                                    onChange={(e) => updateNavBarSetting('hideCtaOnMobile', e.target.checked)}
                                  >
                                    Hide CTA on Mobile
                                  </Checkbox>
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item label="Mobile Logo Size">
                                  <Slider
                                    min={50}
                                    max={150}
                                    value={navBar.mobileLogoScale || 100}
                                    onChange={(value) => updateNavBarSetting('mobileLogoScale', value)}
                                    tooltip={{ formatter: (val) => `${val}%` }}
                                  />
                                </Form.Item>
                              </Col>

                              <Col span={24}>
                                <Divider orientation="left" plain>Touch & Gesture Settings</Divider>
                              </Col>
                              
                              <Col span={12}>
                                <Form.Item>
                                  <Checkbox
                                    checked={navBar.enableSwipeGestures !== false}
                                    onChange={(e) => updateNavBarSetting('enableSwipeGestures', e.target.checked)}
                                  >
                                    Enable Swipe Gestures
                                  </Checkbox>
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item>
                                  <Checkbox
                                    checked={navBar.enablePullToRefresh || false}
                                    onChange={(e) => updateNavBarSetting('enablePullToRefresh', e.target.checked)}
                                  >
                                    Enable Pull to Refresh
                                  </Checkbox>
                                </Form.Item>
                              </Col>
                            </Row>
                          </Card>
                        )
                      }
                    ]}
                  />
                </div>
              )
            }

          ]}
        />
      </div>
      
      {/* MediaLibrary Modal */}
      <MediaLibrary
        visible={mediaLibraryVisible}
        onClose={() => setMediaLibraryVisible(false)}
        onSelect={handleMediaSelect}
        mediaType="images"
      />
    </Drawer>
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
  logo = DEFAULT_LOGO,
  
  // Mobile Settings
  mobileBreakpoint = 768,
  showMobileMenu = true,
  mobileMenuPosition = "right",
  mobileMenuStyle = "drawer",
  hideLogoOnMobile = false,
  hideSearchOnMobile = true,
  hideCtaOnMobile = false,
  mobileLogoScale = 100,
  enableSwipeGestures = true,
  enablePullToRefresh = false,
  
  // Animation & Effects
  enableAnimations = true,
  enableHoverEffects = true,
  scrollBehavior = "normal",
  transitionDuration = 300,
  
  // Navigation specific settings
  maxMenuDepth = 2,
  showHomePage = true,
  
  // Feature Toggles
  showSearch = false,
  searchPlaceholder = "Search...",
  showUserMenu = false,
  userMenuType = "dropdown",
  
  // CTA Button
  ctaButton = DEFAULT_CTA_BUTTON,
  
  // Style Objects
  navItemStyles = DEFAULT_NAV_ITEM_STYLES,
  
  dropdownStyles = DEFAULT_DROPDOWN_STYLES,
  
  // Layout object for spacing and dimensions
  layout = DEFAULT_LAYOUT,
  
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
  const [navigationVersion, setNavigationVersion] = useState(0); // Force navigation refresh

  // Context menu functionality
  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();
  const { hideEditorUI } = useEditorDisplay();

  // Ensure proper defaults for object props to prevent destructuring errors (memoized)
  const safeNavItemStyles = useMemo(() => ({ ...DEFAULT_NAV_ITEM_STYLES, ...navItemStyles }), [navItemStyles]);
  const safeDropdownStyles = useMemo(() => ({ ...DEFAULT_DROPDOWN_STYLES, ...dropdownStyles }), [dropdownStyles]);
  const safeLogo = useMemo(() => ({ ...DEFAULT_LOGO, ...logo }), [logo]);
  const safeCtaButton = useMemo(() => ({ ...DEFAULT_CTA_BUTTON, ...ctaButton }), [ctaButton]);
  const safeLayout = useMemo(() => ({ ...DEFAULT_LAYOUT, ...layout }), [layout]);

  // Listen for page changes to refresh navigation
  useEffect(() => {
    const handlePageChange = () => {
      console.log('NavBar: Page change detected, refreshing navigation...');
      setNavigationVersion(prev => prev + 1);
    };

    // Listen for custom events from PageManager
    window.addEventListener('pageManagerUpdate', handlePageChange);
    
    // Also listen for localStorage changes (in case pages are updated)
    const handleStorageChange = (e) => {
      if (e.key && e.key.includes('glowproject_') && e.key.includes('_autosave')) {
        console.log('NavBar: LocalStorage change detected, refreshing navigation...');
        setNavigationVersion(prev => prev + 1);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Add very fast interval-based check as backup (check every 300ms for instant updates)
    const intervalCheck = setInterval(() => {
      // Force a refresh by incrementing version - this ensures navigation updates quickly
      setNavigationVersion(prev => prev + 1);
    }, 300);
    
    // Also refresh when window gets focus (when user comes back to tab)
    const handleFocus = () => {
      console.log('NavBar: Window focus detected, refreshing navigation...');
      setNavigationVersion(prev => prev + 1);
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('pageManagerUpdate', handlePageChange);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalCheck);
    };
  }, []);

  // Get navigation items from PageManager instead of props
  const navigation = useMemo(() => {
    const pages = getPagesFromProject(navMode);
    console.log('NavBar: Generated navigation from PageManager:', pages);
    return pages;
  }, [navMode, isClient, navigationVersion]); // Add navigationVersion dependency
  
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
          const projectName = localStorage.getItem('glow_active_project') || 'my-project-' + Math.floor(Math.random() * 9000 + 1000);
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
    // Use layout.padding if available, otherwise fall back to padding prop
    padding: safeLayout?.padding ? 
      `${safeLayout.padding.top || 12}px ${safeLayout.padding.right || 24}px ${safeLayout.padding.bottom || 12}px ${safeLayout.padding.left || 24}px` : 
      processValue(padding, 'padding'),
    // Use layout.margin if available, otherwise fall back to margin prop
    marginTop: safeLayout?.margin ? 
      `${safeLayout.margin.top || 0}px` : 
      (typeof margin === 'string' ? (margin.split(' ')[0] || '0px') : processValue(margin, 'margin')),
    marginRight: safeLayout?.margin ? 
      `${safeLayout.margin.right || 0}px` : 
      (typeof margin === 'string' ? (margin.split(' ')[1] || margin.split(' ')[0] || '0px') : processValue(margin, 'margin')),
    marginBottom: safeLayout?.margin ? 
      `${safeLayout.margin.bottom || 0}px` : 
      (typeof margin === 'string' ? (margin.split(' ')[2] || margin.split(' ')[0] || '0px') : processValue(margin, 'margin')),
    marginLeft: safeLayout?.margin ? 
      `${safeLayout.margin.left || 0}px` : 
      (typeof margin === 'string' ? (margin.split(' ')[3] || margin.split(' ')[1] || margin.split(' ')[0] || '0px') : processValue(margin, 'margin')),
    backgroundColor,
    borderBottom,
    border,
    borderRadius: processValue(borderRadius, 'borderRadius'),
    boxShadow,
  };

  // Memoize navbar data to prevent infinite re-renders
  const currentNavBarData = useMemo(() => ({
    navMode,
    orientation,
    alignment,
    logoPosition,
    logo: safeLogo,
    // Navigation settings
    maxMenuDepth,
    showHomePage,
    // Mobile settings
    mobileBreakpoint,
    showMobileMenu,
    mobileMenuPosition,
    mobileMenuStyle,
    hideLogoOnMobile,
    hideSearchOnMobile,
    hideCtaOnMobile,
    mobileLogoScale,
    enableSwipeGestures,
    enablePullToRefresh,
    // Feature toggles
    showSearch,
    searchPlaceholder,
    showUserMenu,
    userMenuType,
    // Animation & effects
    enableAnimations,
    enableHoverEffects,
    scrollBehavior,
    transitionDuration,
    // Objects
    ctaButton: safeCtaButton,
    navItemStyles: safeNavItemStyles,
    dropdownStyles: safeDropdownStyles,
    layout: safeLayout,
    // Styling
    backgroundColor,
    border,
    borderRadius
  }), [
    navMode,
    orientation,
    alignment,
    logoPosition,
    safeLogo,
    maxMenuDepth,
    showHomePage,
    mobileBreakpoint,
    showMobileMenu,
    mobileMenuPosition,
    mobileMenuStyle,
    hideLogoOnMobile,
    hideSearchOnMobile,
    hideCtaOnMobile,
    mobileLogoScale,
    enableSwipeGestures,
    enablePullToRefresh,
    showSearch,
    searchPlaceholder,
    showUserMenu,
    userMenuType,
    enableAnimations,
    enableHoverEffects,
    scrollBehavior,
    transitionDuration,
    safeCtaButton,
    safeNavItemStyles,
    safeDropdownStyles,
    backgroundColor,
    border,
    borderRadius,
    safeLayout
  ]);

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
          gap: safeLayout?.gap ? `${safeLayout.gap}px` : (logoPosition === 'center' ? '16px' : (orientation === 'vertical' ? '16px' : '24px')),
          maxWidth: safeLayout?.containerMaxWidth ? `${safeLayout.containerMaxWidth}px` : 'none',
          // Visual feedback for selection and hover
          ...(selected && !hideEditorUI && {
            outline: '2px solid #3b82f6',
            outlineOffset: '2px',
            boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.1)'
          }),
          ...(isHovered && !selected && !hideEditorUI && {
            outline: '1px solid #d1d5db',
            outlineOffset: '1px',
            boxShadow: '0 0 0 2px rgba(209, 213, 219, 0.1)'
          }),
          // Override margin when centerContent is enabled
          ...(safeLayout?.centerContent && {
            marginLeft: 'auto',
            marginRight: 'auto'
          }),
          position: 'relative',
          transition: 'outline 0.2s ease, box-shadow 0.2s ease'
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
            {safeLogo.type !== 'none' && (              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {safeLogo.type === 'text' ? (
                  <span
                    style={{
                      fontSize: `${safeLogo.width || safeLogo.height || safeLogo.size || 40}px`,
                      fontWeight: safeLogo.fontWeight || 'bold',
                      fontFamily: safeLogo.fontFamily || 'Arial, sans-serif',
                      color: safeLogo.color || '#333',
                      backgroundColor: safeLogo.backgroundColor || 'transparent',
                      padding: `${safeLogo.padding || 0}px`,
                      borderRadius: `${safeLogo.borderRadius || 0}px`,
                      border: safeLogo.borderWidth ? `${safeLogo.borderWidth}px solid ${safeLogo.borderColor || '#000'}` : 'none',
                      textDecoration: 'none',
                      display: 'inline-block'
                    }}
                  >
                    {safeLogo.content}
                  </span>
                ) : (
                  <img
                    src={safeLogo.content}
                    alt="Logo"
                    style={{
                      width: `${safeLogo.width || safeLogo.size || 40}px`,
                      height: `${safeLogo.height || safeLogo.size || 40}px`,
                      objectFit: 'cover',
                      borderRadius: `${safeLogo.borderRadius || 0}px`,
                      border: safeLogo.borderWidth ? `${safeLogo.borderWidth}px solid ${safeLogo.borderColor || '#000'}` : 'none',
                      backgroundColor: safeLogo.backgroundColor || 'transparent',
                      padding: `${safeLogo.padding || 0}px`,
                      display: 'block'
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
              gap: safeLayout?.gap ? `${safeLayout.gap}px` : '16px',
              width: '100%'
            }}>
              {/* Desktop Navigation */}
              {!isMobile && (
                <div style={{ 
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: safeLayout?.gap ? `${safeLayout.gap}px` : '16px'
                }}>
                  {navigation.map((item) => (
                    <NavItem
                      key={item.id}
                      item={item}
                      isActive={currentPath === item.path}
                      navItemStyles={safeNavItemStyles}
                      dropdownStyles={safeDropdownStyles}
                      onNavigate={handleNavigate}
                      hideEditorUI={hideEditorUI}
                      isPreviewMode={isPreviewMode}
                    />
                  ))}
                </div>
              )}

              {/* Right Side Features for center layout */}
              {(showSearch || safeCtaButton.show || showUserMenu || (isMobile && showMobileMenu)) && (
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  {/* Search Bar */}
                  {showSearch && !isMobile && (
                    <Input.Search
                      placeholder={searchPlaceholder}
                      allowClear
                      size="middle"
                      prefix={<SearchOutlined />}
                      style={{ 
                        width: '200px',
                        borderRadius: '20px'
                      }}
                      onSearch={(value) => console.log('Search:', value)}
                    />
                  )}

                  {/* CTA Button */}
                  {safeCtaButton.show && !isMobile && (
                    <AntButton
                      type="primary"
                      size="middle"
                      style={{
                        borderRadius: '6px',
                        fontWeight: '500'
                      }}
                      onClick={() => handleNavigate(safeCtaButton.action)}
                    >
                      {safeCtaButton.text}
                    </AntButton>
                  )}

                  {/* User Menu */}
                  {showUserMenu && !isMobile && (
                    <>
                      {userMenuType === 'dropdown' && (
                        <Dropdown
                          menu={{
                            items: [
                              { key: 'profile', icon: <UserOutlined />, label: 'Profile' },
                              { key: 'settings', icon: <SettingOutlined />, label: 'Settings' },
                              { type: 'divider' },
                              { key: 'logout', icon: <DeleteOutlined />, label: 'Logout' }
                            ],
                            onClick: (e) => console.log('User menu clicked:', e.key)
                          }}
                          trigger={['click']}
                          placement="bottomRight"
                        >
                          <Avatar 
                            size="default"
                            icon={<UserOutlined />}
                            style={{ 
                              cursor: 'pointer',
                              backgroundColor: '#f5f5f5',
                              color: '#666'
                            }}
                          />
                        </Dropdown>
                      )}
                      {userMenuType === 'avatar' && (
                        <Avatar 
                          size="default"
                          icon={<UserOutlined />}
                          style={{ 
                            cursor: 'pointer',
                            backgroundColor: '#f5f5f5',
                            color: '#666'
                          }}
                          onClick={() => console.log('Avatar clicked')}
                        />
                      )}
                      {userMenuType === 'button' && (
                        <AntButton 
                          type="primary"
                          icon={<UserOutlined />}
                          onClick={() => console.log('Login button clicked')}
                        >
                          Login
                        </AntButton>
                      )}
                    </>
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
            {safeLogo.type !== 'none' && (
              <div style={{ 
                order: logoPosition === 'left' ? 1 : logoPosition === 'right' ? 3 : 2,
                display: 'flex',
                alignItems: 'center'
              }}>
                {safeLogo.type === 'text' ? (
                  <span
                    style={{
                      fontSize: `${safeLogo.width || safeLogo.height || safeLogo.size || 40}px`,
                      fontWeight: safeLogo.fontWeight || 'bold',
                      fontFamily: safeLogo.fontFamily || 'Arial, sans-serif',
                      color: safeLogo.color || '#333',
                      backgroundColor: safeLogo.backgroundColor || 'transparent',
                      padding: `${safeLogo.padding || 0}px`,
                      borderRadius: `${safeLogo.borderRadius || 0}px`,
                      border: safeLogo.borderWidth ? `${safeLogo.borderWidth}px solid ${safeLogo.borderColor || '#000'}` : 'none',
                      textDecoration: 'none',
                      display: 'inline-block'
                    }}
                  >
                    {safeLogo.content}
                  </span>
                ) : (
                  <img
                    src={safeLogo.content}
                    alt="Logo"
                    style={{
                      width: `${safeLogo.width || safeLogo.size || 40}px`,
                      height: `${safeLogo.height || safeLogo.size || 40}px`,
                      objectFit: 'cover',
                      borderRadius: `${safeLogo.borderRadius || 0}px`,
                      border: safeLogo.borderWidth ? `${safeLogo.borderWidth}px solid ${safeLogo.borderColor || '#000'}` : 'none',
                      backgroundColor: safeLogo.backgroundColor || 'transparent',
                      padding: `${safeLogo.padding || 0}px`,
                      display: 'block'
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
                {navigation.map((item) => (                <NavItem
                  key={item.id}
                  item={item}
                  isActive={currentPath === item.path}
                  navItemStyles={safeNavItemStyles}
                  dropdownStyles={safeDropdownStyles}
                  onNavigate={handleNavigate}
                  hideEditorUI={hideEditorUI}
                  isPreviewMode={isPreviewMode}
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
                <Input.Search
                  placeholder={searchPlaceholder}
                  allowClear
                  size="middle"
                  prefix={<SearchOutlined />}
                  style={{ 
                    width: '200px',
                    borderRadius: '20px'
                  }}
                  onSearch={(value) => console.log('Search:', value)}
                />
              )}

              {/* CTA Button */}
              {safeCtaButton.show && !isMobile && (
                <AntButton
                  type="primary"
                  size="middle"
                  style={{
                    borderRadius: '6px',
                    fontWeight: '500'
                  }}
                  onClick={() => handleNavigate(safeCtaButton.action)}
                >
                  {safeCtaButton.text}
                </AntButton>
              )}

              {/* User Menu */}
              {showUserMenu && !isMobile && (
                <>
                  {userMenuType === 'dropdown' && (
                    <Dropdown
                      menu={{
                        items: [
                          { key: 'profile', icon: <UserOutlined />, label: 'Profile' },
                          { key: 'settings', icon: <SettingOutlined />, label: 'Settings' },
                          { type: 'divider' },
                          { key: 'logout', icon: <DeleteOutlined />, label: 'Logout' }
                        ],
                        onClick: (e) => console.log('User menu clicked:', e.key)
                      }}
                      trigger={['click']}
                      placement="bottomRight"
                    >
                      <Avatar 
                        size="default"
                        icon={<UserOutlined />}
                        style={{ 
                          cursor: 'pointer',
                          backgroundColor: '#f5f5f5',
                          color: '#666'
                        }}
                      />
                    </Dropdown>
                  )}
                  {userMenuType === 'avatar' && (
                    <Avatar 
                      size="default"
                      icon={<UserOutlined />}
                      style={{ 
                        cursor: 'pointer',
                        backgroundColor: '#f5f5f5',
                        color: '#666'
                      }}
                      onClick={() => console.log('Avatar clicked')}
                    />
                  )}
                  {userMenuType === 'button' && (
                    <AntButton 
                      type="primary"
                      icon={<UserOutlined />}
                      onClick={() => console.log('Login button clicked')}
                    >
                      Login
                    </AntButton>
                  )}
                </>
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
        navItemStyles={safeNavItemStyles}
        onNavigate={handleNavigate}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Settings Modal */}
      <NavBarSettingsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        navBar={currentNavBarData}
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
    // Navigation settings
    maxMenuDepth: 2,
    showHomePage: true,
    logo: {
      type: "text",
      content: "Brand",
      size: 24,
      fontFamily: "Arial, sans-serif",
      fontWeight: "700",
      color: "#333333",
      borderRadius: 0
    },
    // Mobile settings
    mobileBreakpoint: 768,
    showMobileMenu: true,
    mobileMenuPosition: "right",
    mobileMenuStyle: "drawer",
    hideLogoOnMobile: false,
    hideSearchOnMobile: true,
    hideCtaOnMobile: false,
    mobileLogoScale: 100,
    enableSwipeGestures: true,
    enablePullToRefresh: false,
    // Feature toggles
    showSearch: false,
    searchPlaceholder: "Search...",
    showUserMenu: false,
    userMenuType: "dropdown",
    // Animation & effects
    enableAnimations: true,
    enableHoverEffects: true,
    scrollBehavior: "normal",
    transitionDuration: 300,
    ctaButton: {
      show: false,
      text: "Get Started",
      action: "/signup",
      style: "primary"
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
    layout: DEFAULT_LAYOUT,
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
        "padding", "margin", "layout",
        
        // Background & Border
        "backgroundColor", "borderBottom", "border", "borderRadius", "boxShadow",
        
        // Navigation Settings
        "navMode", "orientation", "alignment", "logoPosition", "maxMenuDepth", "showHomePage",
        
        // Mobile
        "mobileBreakpoint", "showMobileMenu", "mobileMenuPosition", "mobileMenuStyle", 
        "hideLogoOnMobile", "hideSearchOnMobile", "hideCtaOnMobile", "mobileLogoScale",
        "enableSwipeGestures", "enablePullToRefresh",
        
        // Features
        "showSearch", "searchPlaceholder", "showUserMenu", "userMenuType",
        
        // Animation & Effects
        "enableAnimations", "enableHoverEffects", "scrollBehavior", "transitionDuration",
        
        // HTML Attributes
        "className", "id"
      ]
    }
  }
};





