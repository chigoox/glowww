'use client'

import React, { useRef, useEffect, useState } from "react";
import { useNode, useEditor } from "@craftjs/core";
import { createPortal } from 'react-dom';
import ContextMenu from "../../support/ContextMenu";
import { useContextMenu } from "../../support/useContextMenu";
import useEditorDisplay from "../../support/useEditorDisplay";
import { 
  EditOutlined, 
  MenuOutlined,
  CloseOutlined,
  DownOutlined,
  SearchOutlined,
  UserOutlined,
  HomeOutlined
} from '@ant-design/icons';
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
  message
} from 'antd';

const { TabPane } = Tabs;

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
                <div style={{ marginBottom: 16 }}>
                  <label>Logo Text</label>
                  <Input
                    value={navBar.logo.content}
                    onChange={(e) => updateStyleObject('logo', 'content', e.target.value)}
                    placeholder="Your Brand Name"
                  />
                </div>
              )}

              {navBar.logo.type === 'image' && (
                <div style={{ marginBottom: 16 }}>
                  <label>Logo Image URL</label>
                  <Input
                    value={navBar.logo.content}
                    onChange={(e) => updateStyleObject('logo', 'content', e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
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
                  { value: 'center', label: 'Center' },
                  { value: 'right', label: 'Right' }
                ]}
              />

              <div style={{ marginBottom: 16 }}>
                <label>Logo Size</label>
                <Slider
                  min={16}
                  max={48}
                  value={navBar.logo.size}
                  onChange={(value) => updateStyleObject('logo', 'size', value)}
                  tooltip={{ formatter: (val) => `${val}px` }}
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
                <label>Font Size</label>
                <Slider
                  min={12}
                  max={24}
                  value={navBar.navItemStyles.fontSize}
                  onChange={(value) => updateStyleObject('navItemStyles', 'fontSize', value)}
                  tooltip={{ formatter: (val) => `${val}px` }}
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
            </div>

            <div>
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
                <label>Border Radius</label>
                <Slider
                  min={0}
                  max={12}
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
            <p style={{ marginBottom: 16, color: '#666' }}>
              Manage your navigation menu items. Add, edit, or remove navigation links and organize them with dropdown menus.
            </p>
            
            <div style={{ marginBottom: 16 }}>
              <AntButton 
                type="primary" 
                onClick={() => {
                  const newItem = {
                    id: Date.now(),
                    name: "New Item",
                    path: "/new-page",
                    children: []
                  };
                  const updatedItems = [...(navBar.navigationItems || []), newItem];
                  updateNavBarSetting('navigationItems', updatedItems);
                }}
              >
                Add Navigation Item
              </AntButton>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {(navBar.navigationItems || []).map((item, index) => (
                <div key={item.id} style={{ 
                  border: '1px solid #e0e0e0', 
                  borderRadius: '6px', 
                  padding: '12px', 
                  marginBottom: '12px',
                  backgroundColor: '#fafafa'
                }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                    <Input
                      value={item.name}
                      onChange={(e) => {
                        const updatedItems = [...navBar.navigationItems];
                        updatedItems[index] = { ...item, name: e.target.value };
                        updateNavBarSetting('navigationItems', updatedItems);
                      }}
                      placeholder="Menu Item Name"
                      style={{ flex: 1 }}
                    />
                    <Input
                      value={item.path}
                      onChange={(e) => {
                        const updatedItems = [...navBar.navigationItems];
                        updatedItems[index] = { ...item, path: e.target.value };
                        updateNavBarSetting('navigationItems', updatedItems);
                      }}
                      placeholder="/path"
                      style={{ flex: 1 }}
                    />
                    <AntButton 
                      danger 
                      size="small"
                      onClick={() => {
                        const updatedItems = navBar.navigationItems.filter((_, i) => i !== index);
                        updateNavBarSetting('navigationItems', updatedItems);
                      }}
                    >
                      Remove
                    </AntButton>
                  </div>

                  {/* Child Items */}
                  {item.children && item.children.length > 0 && (
                    <div style={{ marginLeft: '16px', marginTop: '8px' }}>
                      <h5>Dropdown Items:</h5>
                      {item.children.map((child, childIndex) => (
                        <div key={child.id} style={{ 
                          display: 'flex', 
                          gap: '8px', 
                          alignItems: 'center', 
                          marginBottom: '4px',
                          padding: '4px',
                          backgroundColor: '#fff',
                          borderRadius: '4px'
                        }}>
                          <Input
                            value={child.name}
                            onChange={(e) => {
                              const updatedItems = [...navBar.navigationItems];
                              updatedItems[index].children[childIndex] = { ...child, name: e.target.value };
                              updateNavBarSetting('navigationItems', updatedItems);
                            }}
                            placeholder="Child Item Name"
                            size="small"
                            style={{ flex: 1 }}
                          />
                          <Input
                            value={child.path}
                            onChange={(e) => {
                              const updatedItems = [...navBar.navigationItems];
                              updatedItems[index].children[childIndex] = { ...child, path: e.target.value };
                              updateNavBarSetting('navigationItems', updatedItems);
                            }}
                            placeholder="/child-path"
                            size="small"
                            style={{ flex: 1 }}
                          />
                          <AntButton 
                            danger 
                            size="small"
                            onClick={() => {
                              const updatedItems = [...navBar.navigationItems];
                              updatedItems[index].children = updatedItems[index].children.filter((_, i) => i !== childIndex);
                              updateNavBarSetting('navigationItems', updatedItems);
                            }}
                          >
                            ×
                          </AntButton>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: '8px' }}>
                    <AntButton 
                      size="small"
                      onClick={() => {
                        const newChild = {
                          id: Date.now(),
                          name: "New Dropdown Item",
                          path: "/new-child"
                        };
                        const updatedItems = [...navBar.navigationItems];
                        if (!updatedItems[index].children) {
                          updatedItems[index].children = [];
                        }
                        updatedItems[index].children.push(newChild);
                        updateNavBarSetting('navigationItems', updatedItems);
                      }}
                    >
                      Add Dropdown Item
                    </AntButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

// Main NavBar Component
export const NavBar = ({
  // Navigation Data - managed through settings instead of PagesContext
  navigationItems = [
    { id: 1, name: "Home", path: "/", children: [] },
    { id: 2, name: "About", path: "/about", children: [] },
    { id: 3, name: "Services", path: "/services", children: [
      { id: 4, name: "Web Design", path: "/services/web-design" },
      { id: 5, name: "SEO", path: "/services/seo" }
    ]},
    { id: 6, name: "Contact", path: "/contact", children: [] }
  ],
  
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
    size: 24
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
    fontSize: 16,
    fontWeight: "500",
    color: "#333333",
    activeColor: "#1890ff",
    activeBgColor: "rgba(24, 144, 255, 0.1)",
    hoverBgColor: "rgba(0,0,0,0.05)",
    activeFontWeight: "600",
    padding: "8px 16px",
    margin: "0 4px",
    borderRadius: 6
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
  
  // Page filtering
  excludePages = [], // Pages to exclude from navigation
  
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

  // Use navigationItems prop instead of PagesContext
  const navigation = navigationItems;

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

  // Handle navigation
  const handleNavigate = (path) => {
    setCurrentPath(path);
    setMobileMenuOpen(false);
    // Note: If you need page navigation, you can add router logic here
    console.log('Navigating to:', path);
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
    excludePages
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
          flexDirection: orientation === 'vertical' ? 'column' : 'row',
          justifyContent: alignment,
          alignItems: 'center',
          gap: orientation === 'vertical' ? '16px' : '24px'
        }}
        onMouseEnter={hideEditorUI ? undefined : () => {
          setIsHovered(true);
          updateBoxPosition();
        }}
        onMouseLeave={hideEditorUI ? undefined : () => setIsHovered(false)}
        onContextMenu={hideEditorUI ? undefined : handleContextMenu}
      >
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
                  fontWeight: 'bold',
                  color: '#333',
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
    // Navigation Data - managed through settings instead of PagesContext
    navigationItems: [
      { id: 1, name: "Home", path: "/", children: [] },
      { id: 2, name: "About", path: "/about", children: [] },
      { id: 3, name: "Services", path: "/services", children: [
        { id: 4, name: "Web Design", path: "/services/web-design" },
        { id: 5, name: "SEO", path: "/services/seo" }
      ]},
      { id: 6, name: "Contact", path: "/contact", children: [] }
    ],
    
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
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    navMode: "top-level",
    orientation: "horizontal",
    alignment: "space-between",
    logoPosition: "left",
    logo: {
      type: "text",
      content: "Brand",
      size: 24
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
      fontSize: 16,
      fontWeight: "500",
      color: "#333333",
      activeColor: "#1890ff",
      activeBgColor: "rgba(24, 144, 255, 0.1)",
      hoverBgColor: "rgba(0,0,0,0.05)",
      activeFontWeight: "600",
      padding: "8px 16px",
      margin: "0 4px",
      borderRadius: 6
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
    excludePages: [],
    className: "",
    id: ""
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true, // Don't allow dropping into NavBar - prevent serialization issues
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
        
        // Background
        "backgroundColor", "borderBottom", "boxShadow",
        
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





using the shop box remake the navbar,
i like the customization that the current implmentation has

but expand on it, like in logo use the media libary for selecting image logo, and position center isnt working it should put the logo in the middle top and the menu items below it centered

add more styling option in nav styles like font
background color, etc make it more robost,

drop down and Features are fine i love it

nav items should be used to select which pages appear on the nav bar because nav items should be pulled from the pages manager pages and match up with the pages so if i have top level it will onnly show pages under home, and if nested then show the children of the pages under home

clicking on the items should navigate you to the correct route weather in preview or production

before you start explain to me what youre supposed to do