'use client'
         
import React, { useRef, useEffect, useState, useMemo } from "react";
import { useNode, useEditor } from "@craftjs/core";
import { createPortal } from 'react-dom';
import ContextMenu from "../../utils/context/ContextMenu";
import { useContextMenu } from "../../utils/hooks/useContextMenu";
import useEditorDisplay from "../../utils/context/useEditorDisplay";
import MediaLibrary from "../../editor/MediaLibrary";
import useSaveOperations from "../../utils/export/useSaveOperations";
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
  MobileOutlined,
  ShoppingCartOutlined
} from '@ant-design/icons';
// Use shared Figma-style DragInput for all numeric adjustments
import { DragInput } from '../../editor/FigmaStyleMenu';
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
import dynamic from 'next/dynamic';
const NavCartButton = dynamic(() => import('../Cart/NavCartButton'), { ssr: false });
const CartDrawer = dynamic(() => import('../Cart/CartDrawer'), { ssr: false });
const CartStickyBar = dynamic(() => import('../Cart/CartStickyBar'), { ssr: false });
import { useCart } from '@/contexts/CartContext';

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
  containerMaxWidth: 900,
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

// Default cart configuration (mirrors CraftJS default props) so component logic always has a shape
const DEFAULT_CART = {
  enabled: true,
  trigger: { placement: 'navbar', icon: 'shopping-cart', showBadge: true, badgeMode: 'count', iconSize: 20 },
  drawer: { side: 'right', widthDesktop: 420, openOnAdd: true },
  content: { title: 'Your cart', emptyTitle: 'Your cart is empty', emptySubtitle: 'Keep exploring to find something you love.', showPromo: true, showNotes: false, crossSell: true },
  style: { bg: '#ffffff', text: '#222', border: '#f0f0f0', radius: '16px', thumbShape: 'rounded', shadow: 'lg' },
  behavior: { mobileSticky: true }
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
    // SSR guard: during server render, skip accessing window/localStorage
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return [ { id: 1, name: 'Home', path: '/', children: [] } ];
    }
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

// Removed local DragInput/FigmaSlider in favor of shared DragInput import

// Safe hook wrapper: allows NavBar to render even if provider missing (logs warning)
let useCartSafe = () => {
  try { return useCart(); } catch { console.warn('NavBar: CartProvider not found in tree'); return null; }
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
          <h1 className="text-sm" style={{ margin: 0, color: '#262626' }}>
            NavBar Configuration
          </h1>
        </Space>
  }
  open={visible}
  onClose={onClose}
  width={400}
      placement="right"
      destroyOnClose={true}
      styles={{
        header: {
          borderBottom: '1px solid #eef0f2',
          paddingBottom: '12px',
          background: '#fff'
        },
        body: {
          padding: 4,
          background: '#f7f8fa'
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
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* Inline style override for a more Figma-like aesthetic */}
        <style>{`
          .modern-nav-settings .ant-tabs-left > .ant-tabs-nav {min-width:110px;background:#fff;border-right:1px solid #eef0f2;padding:4px 0;}
            .modern-nav-settings .ant-tabs-left > .ant-tabs-nav .ant-tabs-tab {margin:0;padding:5px 10px;border-radius:0;font-weight:500;color:#5f6368;font-size:12px;}
            .modern-nav-settings .ant-tabs-left > .ant-tabs-nav .ant-tabs-tab + .ant-tabs-tab {margin-top:2px;}
          .modern-nav-settings .ant-tabs-left > .ant-tabs-nav .ant-tabs-tab-active {background:#eef6ff;color:#1677ff;font-weight:600;}
          .modern-nav-settings .ant-tabs-ink-bar {display:none;}
          .modern-nav-settings .ant-tabs-content-holder {overflow:hidden;}
          .modern-nav-settings .ant-card {border:1px solid #eceef1;border-radius:8px;background:#ffffff;} 
          .modern-nav-settings .ant-card-head {border-bottom:1px solid #f2f4f6;min-height:30px;padding:0 6px;} 
          .modern-nav-settings .ant-card-head-title {padding:6px 0;font-size:11px;font-weight:600;letter-spacing:.3px;text-transform:uppercase;color:#6b7075;} 
          .modern-nav-settings .ant-collapse {background:transparent;} 
          .modern-nav-settings .ant-collapse-item {border:1px solid #e6e9ec !important;border-radius:6px;margin-bottom:8px;overflow:hidden;background:#ffffff;} 
          .modern-nav-settings .ant-collapse-content {border-top:1px solid #f0f2f5;} 
          .modern-nav-settings .section-scroll {height:calc(100vh - 140px);overflow-y:auto;padding:8px 10px 14px;background:linear-gradient(180deg,#fafbfc,#f7f8fa);} 
          .modern-nav-settings .prop-grid-label {font-size:10px;font-weight:600;letter-spacing:.4px;color:#7a7f85;text-transform:uppercase;margin-bottom:3px;display:block;} 
          .modern-nav-settings .group-label {font-size:9px;font-weight:600;letter-spacing:.6px;color:#9aa0a6;text-transform:uppercase;margin:4px 0 6px;display:block;} 
          /* Compact form spacing */
          .modern-nav-settings .ant-form-item {margin-bottom:8px;}
          .modern-nav-settings .ant-form-item-label > label {font-size:11px;}
          /* Make rows wrap for narrow width */
          .modern-nav-settings .ant-row {flex-wrap:wrap; row-gap:8px;}
          .modern-nav-settings .ant-row .ant-col {padding-inline:4px;}
          /* Ensure selects & inputs fill width */
          .modern-nav-settings .ant-select, .modern-nav-settings .ant-input, .modern-nav-settings .ant-input-number, .modern-nav-settings .ant-segmented,
          .modern-nav-settings .ant-tree, .modern-nav-settings .ant-radio-group {width:100%;}
          .modern-nav-settings .ant-input-group {width:100%;}
          .modern-nav-settings .ant-space-compact-block {display:flex;flex-wrap:wrap;}
          /* DragInput adjustments */
          .modern-nav-settings .ant-input-number {padding:0 4px;}
          /* Prevent horizontal scroll */
          .modern-nav-settings {overflow:hidden;}
          /* Grid-like two column areas become responsive */
          .modern-nav-settings .responsive-pair {display:flex;flex-wrap:wrap;gap:6px;}
          .modern-nav-settings .responsive-pair > * {flex:1 1 130px;}
          @media (max-width: 360px){
            .modern-nav-settings .ant-tabs-left > .ant-tabs-nav {min-width:95px;}
            .modern-nav-settings .ant-card-head-title {font-size:10px;}
          }
        `}</style>
        <Tabs 
          className="modern-nav-settings"
          tabPosition="left"
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
                <div style={{ padding: '10px 12px 14px', height: 'calc(100vh - 190px)', overflowY: 'auto' }}>
                  <Collapse 
                    defaultActiveKey={['positioning', 'spacing']}
                    ghost
                    expandIconPosition="end"
                    items={[
                      {
                        key: 'global-navbar',
                        label: (
                          <Space>
                            <GlobalOutlined />
                            <span style={{ fontWeight: 500 }}>Global Navbar</span>
                          </Space>
                        ),
                        children: (
                          <Card size="small" style={{ marginBottom: 16 }}>
                            <Form layout="vertical" size="small">
                              <Form.Item label="Use this NavBar globally">
                                <Switch
                                  checked={navBar.isGlobalNavbar === true}
                                  onChange={(val) => {
                                    updateNavBarSetting('isGlobalNavbar', val);
                                    try {
                                      // Store hint in localStorage for PageManager / project settings to pick up
                                      const activeProjectName = localStorage.getItem('glow_active_project');
                                      if (activeProjectName) {
                                        const key = `glow_global_navbar_flag_${activeProjectName}`;
                                        if (val) {
                                          localStorage.setItem(key, 'true');
                                        } else {
                                          localStorage.removeItem(key);
                                        }
                                      }
                                    } catch (e) {
                                      console.warn('Global navbar flag storage failed', e);
                                    }
                                  }}
                                />
                              </Form.Item>
                              <Alert
                                type={navBar.isGlobalNavbar ? 'success' : 'info'}
                                showIcon
                                message={navBar.isGlobalNavbar ? 'This NavBar is marked for global use.' : 'Toggle to mark this NavBar design for global use via project settings.'}
                                description="Project Settings will inject a global navbar when enabled. Marking this helps identify which design to sync."
                              />
                            </Form>
                          </Card>
                        )
                      },
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
                                      { value: 'relative', label: 'Relative' },
                                      { value: 'sticky', label: 'Sticky' },
                                      { value: 'fixed', label: 'Fixed' }
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
                              <Col span={12}>
                                <Form.Item label="Safe Area Sides">
                                  <Switch
                                    checked={navBar.isSafeArea === true}
                                    onChange={(val) => updateNavBarSetting('isSafeArea', val)}
                                  />
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item label="Nav Items Position">
                                  <Select
                                    value={navBar.navItemsPosition || 'left'}
                                    onChange={(value) => updateNavBarSetting('navItemsPosition', value)}
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
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
                              {['top','right','bottom','left'].map(dir => (
                                <div key={dir} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                    <span style={{ fontSize:11, fontWeight:600, letterSpacing:'.5px', textTransform:'uppercase', color:'#5f6368' }}>{dir}</span>
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={paddingLocks[dir] ? <LockOutlined /> : <UnlockOutlined />}
                                      onClick={() => togglePaddingLock(dir)}
                                      style={{ padding:0, width:22, height:22, color: paddingLocks[dir] ? '#1890ff' : '#bfbfbf' }}
                                      title={paddingLocks[dir] ? 'Unlock' : 'Lock linked'}
                                    />
                                  </div>
                                  <DragInput
                                    icon={dir.charAt(0).toUpperCase()}
                                    value={navBar.layout?.padding?.[dir] || (dir==='left'||dir==='right'?24:12)}
                                    min={0}
                                    max={100}
                                    onChange={(v)=>handlePaddingUpdate(dir, v)}
                                  />
                                </div>
                              ))}
                            </div>
                            <Divider />
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
                              {['top','right','bottom','left'].map(dir => (
                                <div key={dir} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                    <span style={{ fontSize:11, fontWeight:600, letterSpacing:'.5px', textTransform:'uppercase', color:'#5f6368' }}>{dir} M</span>
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={marginLocks[dir] ? <LockOutlined /> : <UnlockOutlined />}
                                      onClick={() => toggleMarginLock(dir)}
                                      style={{ padding:0, width:22, height:22, color: marginLocks[dir] ? '#1890ff' : '#bfbfbf' }}
                                      title={marginLocks[dir] ? 'Unlock' : 'Lock linked'}
                                    />
                                  </div>
                                  <DragInput
                                    icon={dir.charAt(0).toUpperCase()}
                                    value={navBar.layout?.margin?.[dir] || 0}
                                    min={0}
                                    max={100}
                                    onChange={(v)=>handleMarginUpdate(dir, v)}
                                  />
                                </div>
                              ))}
                            </div>
                            <Divider />
                            <Row gutter={[12, 12]}>
                              <Col span={12}>
                                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                                  <span style={{ fontSize:11, fontWeight:600, letterSpacing:'.5px', color:'#5f6368' }}>Items Gap</span>
                                  <DragInput icon="↔" value={navBar.layout?.gap || 16} min={0} max={80} onChange={(value) => updateStyleObject('layout', 'gap', value)} />
                                </div>
                              </Col>
                              <Col span={12}>
                                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                                  <span style={{ fontSize:11, fontWeight:600, letterSpacing:'.5px', color:'#5f6368' }}>Container Width</span>
                                  <DragInput icon="⬌" value={navBar.layout?.containerMaxWidth || 900} min={480} max={2400} step={40} onChange={(value) => updateStyleObject('layout', 'containerMaxWidth', value)} />
                                </div>
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
                                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                                  <span style={{ fontSize:11, fontWeight:600, letterSpacing:'.5px', color:'#5f6368' }}>Z-Index</span>
                                  <DragInput icon="#" value={navBar.zIndex || 1000} min={1} max={5000} step={1} onChange={(value) => updateNavBarSetting('zIndex', value)} />
                                </div>
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
                <div style={{ padding: '12px 14px', height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
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
                              <Row gutter={[12, 12]}>
                                <Col span={12}>
                                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                      <span style={{ fontSize:11, fontWeight:600, letterSpacing:'.5px', color:'#5f6368' }}>Logo Width</span>
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={logoSizeLock ? <LockOutlined /> : <UnlockOutlined />}
                                        onClick={toggleLogoSizeLock}
                                        style={{ padding:0, width:24, height:24, color:logoSizeLock?'#1890ff':'#bfbfbf' }}
                                        title={logoSizeLock ? 'Unlock to resize independently' : 'Lock to resize together'}
                                      />
                                    </div>
                                    <DragInput icon="W" value={navBar.logo?.width || 40} min={20} max={300} onChange={(value) => handleLogoSizeUpdate('width', value)} />
                                  </div>
                                </Col>
                                <Col span={12}>
                                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                                    <span style={{ fontSize:11, fontWeight:600, letterSpacing:'.5px', color:'#5f6368' }}>Logo Height</span>
                                    <DragInput icon="H" value={navBar.logo?.height || 40} min={20} max={300} onChange={(value) => handleLogoSizeUpdate('height', value)} />
                                  </div>
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
                                    <DragInput
                                      value={navBar.logo?.padding || 0}
                                      min={0}
                                      max={40}
                                      step={1}
                                      onChange={(v)=>updateStyleObject('logo','padding',v)}
                                      suffix="px"
                                      tooltip="Logo padding"
                                      style={{ width:'100%' }}
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
                                    <DragInput
                                      value={navBar.logo?.borderRadius || 0}
                                      min={0}
                                      max={200}
                                      step={1}
                                      onChange={(v)=>updateStyleObject('logo','borderRadius',v)}
                                      suffix="px"
                                      tooltip="Logo border radius"
                                      style={{ width:'100%' }}
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
                                    <DragInput
                                      value={navBar.logo?.borderWidth || 0}
                                      min={0}
                                      max={10}
                                      step={1}
                                      onChange={(v)=>updateStyleObject('logo','borderWidth',v)}
                                      suffix="px"
                                      tooltip="Border width"
                                      style={{ width:'100%' }}
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
                <div style={{ padding: '12px 14px', height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
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
                                        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                                          <span style={{ fontSize:11, fontWeight:600, letterSpacing:'.5px', color:'#5f6368' }}>Font Size</span>
                                          <DragInput icon={<FontSizeOutlined style={{ fontSize:10 }} />} value={navBar.navItemStyles?.fontSize || 16} min={10} max={72} onChange={(v)=>updateStyleObject('navItemStyles','fontSize',v)} />
                                        </div>
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
                                            <DragInput
                                              value={navBar.navItemStyles?.iconSize || 16}
                                              min={8}
                                              max={64}
                                              step={1}
                                              onChange={(v)=>updateStyleObject('navItemStyles','iconSize',v)}
                                              suffix="px"
                                              tooltip="Icon size"
                                              style={{ width:'100%' }}
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
                <div style={{ padding: '12px 14px', height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
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
                                  <DragInput
                                    value={navBar.transitionDuration || 300}
                                    min={50}
                                    max={2000}
                                    step={10}
                                    onChange={(v)=>updateNavBarSetting('transitionDuration',v)}
                                    suffix="ms"
                                    tooltip="Transition duration"
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
                                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                                  <span style={{ fontSize:11, fontWeight:600, letterSpacing:'.5px', color:'#5f6368' }}>Mobile Logo Size %</span>
                                  <DragInput icon="%" value={navBar.mobileLogoScale || 100} min={25} max={200} onChange={(v)=>updateNavBarSetting('mobileLogoScale', v)} />
                                </div>
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
            ,{
              key: 'cart',
              label: (<Space size="small"><ShoppingCartOutlined />Cart</Space>),
              children: (
                <div style={{ padding: '12px 14px', height: 'calc(100vh - 200px)', overflowY:'auto' }}>
                  <Collapse ghost defaultActiveKey={['cart-enable','cart-trigger','cart-drawer','cart-content','cart-style','cart-behavior']} items={[
                    { key:'cart-enable', label:<Space><CheckOutlined /> Enable</Space>, children:(<Card size="small"><Form layout="vertical" size="small"><Form.Item label="Enable Cart"><Switch checked={navBar.cart?.enabled!==false} onChange={(v)=>onUpdate({...navBar,cart:{...(navBar.cart||{}),enabled:v}})} /></Form.Item></Form></Card>) },
                    { key:'cart-trigger', label:<Space><AimOutlined /> Trigger</Space>, children:(<Card size="small"><Row gutter={12}><Col span={12}><Form.Item label="Badge Mode"><Select value={navBar.cart?.trigger?.badgeMode||'count'} onChange={(val)=>onUpdate({...navBar,cart:{...navBar.cart,trigger:{...navBar.cart.trigger,badgeMode:val}}})} options={[{value:'count',label:'Count'},{value:'dot',label:'Dot'},{value:'hidden',label:'Hidden'}]} /></Form.Item></Col><Col span={12}><Form.Item label="Icon Size" style={{ display:'flex', flexDirection:'column' }}><DragInput icon={<FontSizeOutlined style={{ fontSize:10 }} />} value={navBar.cart?.trigger?.iconSize||20} min={14} max={48} onChange={(val)=>onUpdate({...navBar,cart:{...navBar.cart,trigger:{...navBar.cart.trigger,iconSize:val}}})} /></Form.Item></Col><Col span={12}><Form.Item label="Show Badge"><Switch checked={navBar.cart?.trigger?.showBadge!==false} onChange={(v)=>onUpdate({...navBar,cart:{...navBar.cart,trigger:{...navBar.cart.trigger,showBadge:v}}})} /></Form.Item></Col></Row></Card>) },
                    { key:'cart-drawer', label:<Space><LayoutOutlined /> Drawer</Space>, children:(<Card size="small"><Row gutter={12}><Col span={12}><Form.Item label="Side"><Select value={navBar.cart?.drawer?.side||'right'} onChange={(val)=>onUpdate({...navBar,cart:{...navBar.cart,drawer:{...navBar.cart.drawer,side:val}}})} options={[{value:'right',label:'Right'},{value:'left',label:'Left'}]} /></Form.Item></Col><Col span={12}><Form.Item label="Width (px)"><DragInput icon="W" value={navBar.cart?.drawer?.widthDesktop||420} min={280} max={640} onChange={(val)=>onUpdate({...navBar,cart:{...navBar.cart,drawer:{...navBar.cart.drawer,widthDesktop:val}}})} /></Form.Item></Col><Col span={12}><Form.Item label="Open On Add"><Switch checked={navBar.cart?.drawer?.openOnAdd!==false} onChange={(v)=>onUpdate({...navBar,cart:{...navBar.cart,drawer:{...navBar.cart.drawer,openOnAdd:v}}})} /></Form.Item></Col></Row></Card>) },
                    { key:'cart-content', label:<Space><FontSizeOutlined /> Content</Space>, children:(<Card size="small"><Form layout="vertical" size="small"><Form.Item label="Title"><Input value={navBar.cart?.content?.title||''} onChange={(e)=>onUpdate({...navBar,cart:{...navBar.cart,content:{...navBar.cart.content,title:e.target.value}}})} /></Form.Item><Form.Item label="Empty Title"><Input value={navBar.cart?.content?.emptyTitle||''} onChange={(e)=>onUpdate({...navBar,cart:{...navBar.cart,content:{...navBar.cart.content,emptyTitle:e.target.value}}})} /></Form.Item><Form.Item label="Empty Subtitle"><Input.TextArea rows={2} value={navBar.cart?.content?.emptySubtitle||''} onChange={(e)=>onUpdate({...navBar,cart:{...navBar.cart,content:{...navBar.cart.content,emptySubtitle:e.target.value}}})} /></Form.Item><Row gutter={12}><Col span={8}><Form.Item label="Promo"><Switch checked={navBar.cart?.content?.showPromo!==false} onChange={(v)=>onUpdate({...navBar,cart:{...navBar.cart,content:{...navBar.cart.content,showPromo:v}}})} /></Form.Item></Col><Col span={8}><Form.Item label="Notes"><Switch checked={navBar.cart?.content?.showNotes===true} onChange={(v)=>onUpdate({...navBar,cart:{...navBar.cart,content:{...navBar.cart.content,showNotes:v}}})} /></Form.Item></Col><Col span={8}><Form.Item label="Cross Sell"><Switch checked={navBar.cart?.content?.crossSell!==false} onChange={(v)=>onUpdate({...navBar,cart:{...navBar.cart,content:{...navBar.cart.content,crossSell:v}}})} /></Form.Item></Col></Row></Form></Card>) },
                    { key:'cart-style', label:<Space><FormatPainterOutlined /> Style</Space>, children:(<Card size="small"><Row gutter={12}><Col span={12}><Form.Item label="BG"><Input type="color" value={navBar.cart?.style?.bg||'#ffffff'} onChange={(e)=>onUpdate({...navBar,cart:{...navBar.cart,style:{...navBar.cart.style,bg:e.target.value}}})} /></Form.Item></Col><Col span={12}><Form.Item label="Text"><Input type="color" value={navBar.cart?.style?.text||'#222222'} onChange={(e)=>onUpdate({...navBar,cart:{...navBar.cart,style:{...navBar.cart.style,text:e.target.value}}})} /></Form.Item></Col><Col span={12}><Form.Item label="Border"><Input type="color" value={navBar.cart?.style?.border||'#f0f0f0'} onChange={(e)=>onUpdate({...navBar,cart:{...navBar.cart,style:{...navBar.cart.style,border:e.target.value}}})} /></Form.Item></Col><Col span={12}><Form.Item label="Radius"><DragInput icon={<BorderOutlined style={{ fontSize:10 }} />} value={parseInt(navBar.cart?.style?.radius)||16} min={0} max={48} onChange={(val)=>onUpdate({...navBar,cart:{...navBar.cart,style:{...navBar.cart.style,radius: typeof val==='number'? `${val}px`:val}}})} /></Form.Item></Col><Col span={12}><Form.Item label="Thumb Shape"><Select value={navBar.cart?.style?.thumbShape||'rounded'} onChange={(v)=>onUpdate({...navBar,cart:{...navBar.cart,style:{...navBar.cart.style,thumbShape:v}}})} options={[{value:'rounded',label:'Rounded'},{value:'square',label:'Square'},{value:'circle',label:'Circle'}]} /></Form.Item></Col><Col span={12}><Form.Item label="Shadow"><Select value={navBar.cart?.style?.shadow||'lg'} onChange={(v)=>onUpdate({...navBar,cart:{...navBar.cart,style:{...navBar.cart.style,shadow:v}}})} options={[{value:'none',label:'None'},{value:'sm',label:'Small'},{value:'md',label:'Medium'},{value:'lg',label:'Large'}]} /></Form.Item></Col></Row></Card>) },
                    { key:'cart-behavior', label:<Space><MobileOutlined /> Behavior</Space>, children:(<Card size="small"><Form layout="vertical" size="small"><Form.Item label="Mobile Sticky Summary Bar"><Switch checked={navBar.cart?.behavior?.mobileSticky!==false} onChange={(v)=>onUpdate({...navBar,cart:{...navBar.cart,behavior:{...navBar.cart.behavior,mobileSticky:v}}})} /></Form.Item></Form></Card>) }
                  ]} />
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
  navItemsPosition = "left", // 'left' | 'center' | 'right' (controls menu items grouping)
  
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
  isSafeArea = false,
  // Global flag
  isGlobalNavbar = false,
  // Cart configuration (optional override)
  cart = DEFAULT_CART,
  
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

  // Aggregate minimal navBar object expected by legacy code sections (currently only cart)
  const navBar = useMemo(() => ({ cart: cart || DEFAULT_CART }), [cart]);

  const navBarRef = useRef(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [boxPosition, setBoxPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [navigationVersion, setNavigationVersion] = useState(0); // Force navigation refresh
  // Cart state from provider
  const cartState = useCart?.();
  const [cartOpen, setCartOpen] = useState(false);
  // Scroll behavior states
  const [isScrolled, setIsScrolled] = useState(false);
  const [isScrollHidden, setIsScrollHidden] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  useEffect(()=>{ if(!cartState) return; const fn=()=>{ if(navBar.cart?.drawer?.openOnAdd!==false) setCartOpen(true); }; window.addEventListener('glow_cart_item_added',fn); return()=>window.removeEventListener('glow_cart_item_added',fn); },[cartState, navBar.cart?.drawer?.openOnAdd]);

  // Persist cart config overrides locally so global pages can hydrate before Craft loads
  useEffect(()=>{
    try {
      const cfg = navBar.cart; if(!cfg) return; localStorage.setItem('glow_cart_config_v1', JSON.stringify(cfg));
    } catch {}
  }, [navBar.cart]);

  const mergedCartConfig = useMemo(()=>{
    let stored = null; try { stored = JSON.parse(localStorage.getItem('glow_cart_config_v1')||'null'); } catch {}
    return { ...(stored||{}), ...(navBar.cart||{}) };
  }, [navBar.cart]);

  // --- Cart Config: Enhanced Project-Level Persistence & Migration ---
  useEffect(()=>{
    if (typeof window === 'undefined') return;
    try {
      const activeProject = localStorage.getItem('glow_active_project') || 'default';
      const legacyKey = 'glow_cart_config_v1';
      const projectKey = `glow_cart_config_proj_${activeProject}`;

      // Migrate legacy key to project-scoped key if needed
      const legacyVal = localStorage.getItem(legacyKey);
      const projectVal = localStorage.getItem(projectKey);
      if (legacyVal && !projectVal) {
        localStorage.setItem(projectKey, legacyVal);
      }

      // If props.cart still default-ish but we have a stored project config, hydrate Craft props
      if (!projectVal && !legacyVal) return; // nothing stored
      let storedCfg = null;
      try { storedCfg = JSON.parse(projectVal || legacyVal || 'null'); } catch {}
      if (!storedCfg || typeof storedCfg !== 'object') return;

      // Basic heuristic: if current cart prop differs from stored (excluding runtime changes), update craft props once
      setProp(props => {
        if (!props.cart || JSON.stringify(props.cart) === JSON.stringify(DEFAULT_CART)) {
          props.cart = { ...DEFAULT_CART, ...storedCfg };
        }
      });
    } catch (e) {
      console.warn('Cart config project-level hydration failed', e);
    }
  }, []); // run once on mount

  // Persist project-scoped cart config whenever cart prop changes
  useEffect(()=>{
    if (typeof window === 'undefined') return;
    try {
      const activeProject = localStorage.getItem('glow_active_project') || 'default';
      const projectKey = `glow_cart_config_proj_${activeProject}`;
      // Always write merged (prop has precedence over defaults)
      const toStore = JSON.stringify({ ...DEFAULT_CART, ...(cart||{}) });
      localStorage.setItem(projectKey, toStore);
      // Maintain legacy key for backward compatibility (can remove later)
      localStorage.setItem('glow_cart_config_v1', toStore);
    } catch (e) {
      console.warn('Cart config persistence failed', e);
    }
  }, [cart]);

  // Context menu functionality
  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();
  const { hideEditorUI } = useEditorDisplay();

  // Ensure proper defaults for object props to prevent destructuring errors (memoized)
  const safeNavItemStyles = useMemo(() => ({ ...DEFAULT_NAV_ITEM_STYLES, ...navItemStyles }), [navItemStyles]);
  const safeDropdownStyles = useMemo(() => ({ ...DEFAULT_DROPDOWN_STYLES, ...dropdownStyles }), [dropdownStyles]);
  const safeLogo = useMemo(() => ({ ...DEFAULT_LOGO, ...logo }), [logo]);
  const safeCtaButton = useMemo(() => ({ ...DEFAULT_CTA_BUTTON, ...ctaButton }), [ctaButton]);
  const safeLayout = useMemo(() => ({ ...DEFAULT_LAYOUT, ...layout }), [layout]);
  // Merge cart prop with defaults so settings modal and runtime always see full shape
  const safeCart = useMemo(() => ({ ...DEFAULT_CART, ...(cart || {}) }), [cart]);

  // Listen for page changes to refresh navigation
  useEffect(() => {
    const handlePageChange = () => {
      setNavigationVersion(prev => prev + 1);
    };

    // Listen for custom events from PageManager
    window.addEventListener('pageManagerUpdate', handlePageChange);
    
    // Also listen for localStorage changes (in case pages are updated)
    const handleStorageChange = (e) => {
      if (e.key && e.key.includes('glowproject_') && e.key.includes('_autosave')) {
        setNavigationVersion(prev => prev + 1);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also refresh when window gets focus (when user comes back to tab)
    const handleFocus = () => {
      setNavigationVersion(prev => prev + 1);
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('pageManagerUpdate', handlePageChange);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Get navigation items from PageManager instead of props
  const navigation = useMemo(() => {
    const pages = getPagesFromProject(navMode);
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
    navItemsPosition,
    logo: safeLogo,
  // Cart (added so settings modal has reactive cart state)
  cart: safeCart,
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
  borderRadius,
  isGlobalNavbar,
  isSafeArea
  }), [
    navMode,
    orientation,
    alignment,
    logoPosition,
    navItemsPosition,
    safeLogo,
  safeCart,
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
  safeLayout,
  isGlobalNavbar,
  isSafeArea
  ]);

  const updateNavBar = (updates) => {
    setProp(props => {
      Object.assign(props, updates);
    });
  };

  // (Legacy side padding safe area effect removed; now using inner wrapper.)

  // Scroll behavior effect
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!scrollBehavior || scrollBehavior === 'normal') return;
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setIsScrolled(y > 10);
      if (scrollBehavior === 'hide-on-scroll') {
        if (y > lastY && y > 120) {
          setIsScrollHidden(true);
        } else if (y < lastY - 4) {
          setIsScrollHidden(false);
        }
      } else if (scrollBehavior === 'compact-on-scroll') {
        setIsCompact(y > 80);
      }
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [scrollBehavior]);

  if (!isClient) {
    return (
      <div style={{ ...computedStyles, display: 'flex', alignItems: 'center' }}>
        <div>Loading navigation...</div>
      </div>
    );
  }

  // Helper: determine justification for nav items when not center-logo layout
  const navItemsJustify = navItemsPosition === 'center' ? 'center' : navItemsPosition === 'right' ? 'flex-end' : 'flex-start';

  // Optional safe area wrapper styles
  // (Replaced inner wrapper approach with side padding on outer container)

  // Build main content with optional inner safe area wrapper
  return (
    <>
      <div
        className={`${selected && !hideEditorUI ? 'ring-2 ring-blue-500' : ''} ${isHovered && !hideEditorUI ? 'ring-1 ring-gray-300' : ''} ${className}`}
        ref={navBarRef}
        style={{
          ...computedStyles,
          ...(scrollBehavior === 'transparent-on-top' && !isScrolled ? { backgroundColor: 'transparent', boxShadow: 'none', borderBottom: 'none' } : {}),
          ...(scrollBehavior === 'hide-on-scroll' ? { transition: 'transform 0.4s ease', transform: isScrollHidden ? 'translateY(-120%)' : 'translateY(0)' } : {}),
          ...(scrollBehavior === 'compact-on-scroll' && isCompact ? { paddingTop: '4px', paddingBottom: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } : {}),
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'stretch',
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
          position: position || 'sticky',
          ...(position === 'sticky' && { top: 0 }),
          ...(position === 'fixed' && { top: 0, left: 0, right: 0, zIndex: 1000 }),
          transition: 'outline 0.2s ease, box-shadow 0.2s ease'
        }}
        onMouseEnter={hideEditorUI ? undefined : () => { setIsHovered(true); updateBoxPosition(); }}
        onMouseLeave={hideEditorUI ? undefined : () => setIsHovered(false)}
        onContextMenu={hideEditorUI ? undefined : handleContextMenu}
      >
        <div style={{ width: '100%', maxWidth: isSafeArea ? `${safeLayout?.containerMaxWidth || 1200}px` : '100%', margin: '0 auto', display: 'flex', flexDirection: logoPosition === 'center' ? 'column' : (orientation === 'vertical' ? 'column' : 'row'), justifyContent: logoPosition === 'center' ? 'center' : alignment, alignItems: 'center', gap: safeLayout?.gap ? `${safeLayout.gap}px` : (logoPosition === 'center' ? '16px' : (orientation === 'vertical' ? '16px' : '24px')), width: '100%' }}>
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
                  {cartState && navBar.cart?.enabled!==false && <NavCartButton onClick={()=>setCartOpen(true)} config={mergedCartConfig} />}
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
                flex: logoPosition === 'center' ? 'none' : 1,
                justifyContent: navItemsJustify
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
              {cartState && navBar.cart?.enabled!==false && <NavCartButton onClick={()=>setCartOpen(true)} config={mergedCartConfig} />}
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
  </div>

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
    {cartState && (
        <>
          {navBar.cart?.enabled!==false && (<CartDrawer open={cartOpen} onClose={()=>setCartOpen(false)} config={mergedCartConfig} />)}
      {isMobile && cartState.items?.length>0 && <CartStickyBar onOpen={()=>setCartOpen(true)} />}
        </>
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
    cart: {
      enabled: true,
      trigger: { placement: 'navbar', icon: 'shopping-cart', showBadge: true, badgeMode: 'count', iconSize: 20 },
      drawer: { side: 'right', widthDesktop: 420, openOnAdd: true },
      content: { title: 'Your cart', emptyTitle: 'Your cart is empty', emptySubtitle: 'Keep exploring to find something you love.', showPromo: true, showNotes: false, crossSell: true },
      style: { bg: '#ffffff', text: '#222', border: '#f0f0f0', radius: '16px', thumbShape: 'rounded', shadow: 'lg' },
      behavior: { mobileSticky: true }
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
  // Flag to indicate this component should never be part of a multi-selection group
  noMultiSelect: true,
    styleMenu: {
      supportedProps: [
        // Layout & Position
        "width", "height", "minHeight", "position", "top", "zIndex",
        
        // Spacing
        "padding", "margin", "layout",
        
        // Background & Border
        "backgroundColor", "borderBottom", "border", "borderRadius", "boxShadow",
        
  // Navigation Settings
  "navMode", "orientation", "alignment", "logoPosition", "navItemsPosition", "maxMenuDepth", "showHomePage", "isSafeArea", "isGlobalNavbar",
        
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





