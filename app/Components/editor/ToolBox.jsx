'use client';

import { Element, useEditor } from "@craftjs/core";
import { Button as ButtonAD, Typography, Drawer, Space, Tooltip } from "antd";
import { useEffect, useRef, useState } from "react";
import { ThemedContainer } from "../theme/ThemedContainer";
import { Box } from "../user/Box";
import { FlexBox } from "../user/FlexBox";
import { GridBox } from "../user/GridBox";
import { Image } from "../user/Image";
import { useDropPositionCorrection } from '../utils/drag-drop/useDropPositionCorrection';

import { 
  AppstoreOutlined, 
  BorderlessTableOutlined,
  FontColorsOutlined,
  PictureOutlined,
  MenuOutlined,
  LayoutOutlined,
  EditOutlined,
  AlignCenterOutlined,
  LinkOutlined,
  VideoCameraAddOutlined,
  ShoppingTwoTone,
  FormOutlined,
  BuildOutlined,
  FileTextOutlined,
  CameraOutlined,
  InteractionOutlined,
  ShopOutlined,
  RightOutlined,
  CloseOutlined,
  BgColorsOutlined,
  BlockOutlined,
  TableOutlined,
  DragOutlined,
  SelectOutlined,
  ToolOutlined
} from "@ant-design/icons";
import { Text } from "../user/Text";
import { Button } from "../user/Button";
import { Link } from "../user/Link";
import { Paragraph } from "../user/Paragraph";
import { Video } from "../user/Video";
import { ShopFlexBox } from "../user/Advanced/ShopFlexBox";
import { FormInput } from "../user/Input";
import { Form } from "../user/Advanced/Form";
import {Carousel} from "../user/Carousel";
import { NavBar } from "../user/Nav/NavBar";

export const Toolbox = ({activeDrawer, setActiveDrawer}) => {
  const { connectors } = useEditor();
  const { correctPosition } = useDropPositionCorrection();
  const toolboxRef = useRef(null);

  // Create refs for each component
  const boxRef = useRef(null);
  const flexBoxRef = useRef(null);
  const gridBoxRef = useRef(null);
  const textRef = useRef(null);
  const paragraphRef = useRef(null);
  const imageRef = useRef(null);
  const videoRef = useRef(null);
  const buttonRef = useRef(null);
  const linkRef = useRef(null);
  const shopFlexBoxRef = useRef(null);
  const formInputRef = useRef(null);
  const formRef = useRef(null);
  const carouselRef = useRef(null);
  const navBarRef = useRef(null);

  // Component categories organized like Figma
  const sections = [
    {
      id: 'layout',
      title: 'Frames & Layout',
      icon: <BlockOutlined />,
      description: 'Structure components',
      components: [
        {
          ref: boxRef,
          name: 'Frame',
          icon: <BlockOutlined />,
          description: 'Basic container frame',
          element: <Element is={Box} canvas />
        },
        {
          ref: flexBoxRef,
          name: 'Flex',
          icon: <AppstoreOutlined />,
          description: 'Flexible layout container',
          element: <Element is={FlexBox} display="flex" flexDirection="row" canvas />
        },
        {
          ref: gridBoxRef,
          name: 'Grid',
          icon: <TableOutlined />,
          description: 'Grid layout container',
          element: <Element is={GridBox} display="grid" gridTemplateColumns="repeat(3, 1fr)" canvas />
        }
      ]
    },
    {
      id: 'content',
      title: 'Text',
      icon: <FontColorsOutlined />,
      description: 'Text components',
      components: [
        {
          ref: textRef,
          name: 'Text',
          icon: <FontColorsOutlined />,
          description: 'Single line text',
          element: <Element is={Text} />
        },
        {
          ref: paragraphRef,
          name: 'Paragraph',
          icon: <EditOutlined />,
          description: 'Multi-line text block',
          element: <Element is={Paragraph} />
        },
       
      ]
    },
    {
      id: 'media',
      title: 'Media',
      icon: <PictureOutlined />,
      description: 'Images and videos',
      components: [
        {
          ref: imageRef,
          name: 'Image',
          icon: <PictureOutlined />,
          description: 'Image component',
          element: <Element is={Image} src="https://via.placeholder.com/300x200?text=Click+to+Upload+Image" />
        },
        {
          ref: videoRef,
          name: 'Video',
          icon: <VideoCameraAddOutlined />,
          description: 'Video player',
          element: <Element is={Video} />
        },
        {
          ref: carouselRef,
          name: 'Carousel',
          icon: <BgColorsOutlined />,
          description: 'Image carousel slider',
          element: <Element is={Carousel} />
        },
      ]
    },
    {
      id: 'navigation',
      title: 'Navigation',
      icon: <MenuOutlined />,
      description: 'Navigation components',
      components: [
        {
          ref: navBarRef,
          name: 'Navbar',
          icon: <MenuOutlined />,
          description: 'Navigation bar with pages',
          element: <Element is={NavBar} />
        }
      ]
    },
    {
      id: 'interactive',
      title: 'Interactive',
      icon: <InteractionOutlined />,
      description: 'Buttons and links',
      components: [
        {
          ref: buttonRef,
          name: 'Button',
          icon: <InteractionOutlined />,
          description: 'Clickable button',
          element: <Element is={Button} text="Button" />
        },
        {
          ref: linkRef,
          name: 'Link',
          icon: <LinkOutlined />,
          description: 'Navigation link',
          element: <Element is={Link} href="https://example.com" target="_blank"><span>Link</span></Element>
        }
      ]
    },
    {
      id: 'forms',
      title: 'Forms',
      icon: <FormOutlined />,
      description: 'Form elements',
      components: [
        {
          ref: formInputRef,
          name: 'Input',
          icon: <FormOutlined />,
          description: 'Input field',
          element: <Element is={FormInput} />
        },
        {
          ref: formRef,
          name: 'Form',
          icon: <FileTextOutlined />,
          description: 'Form container',
          element: <Element is={Form} />
        }
      ]
    },
    {
      id: 'ecommerce',
      title: 'E-commerce',
      icon: <ShopOutlined />,
      description: 'Shop components',
      components: [
        {
          ref: shopFlexBoxRef,
          name: 'Product',
          icon: <ShoppingTwoTone />,
          description: 'Product showcase',
          element: <Element is={ShopFlexBox} />
        }
      ]
    }
  ];

  // Initialize connectors when drawer content is rendered
  useEffect(() => {
    if (activeDrawer) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const activeSection = sections.find(s => s.id === activeDrawer);
        if (activeSection) {
          activeSection.components.forEach(component => {
            if (component.ref.current) {
              console.log(`Setting up drag connector for ${component.name}`);
              // Use regular Craft.js drag connector
              connectors.create(component.ref.current, component.element);
            }
          });
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [activeDrawer, connectors]);

  const openDrawer = (sectionId) => {
    setActiveDrawer(sectionId);
  };

  const closeDrawer = () => {
    setActiveDrawer(null);
  };

  const switchDrawer = (sectionId) => {
    setActiveDrawer(sectionId);
  };

  const renderDrawerContent = (section) => {
    return (
      <div className="flex items-center gap-2">
        {/* Components in horizontal layout like toolbar */}
        {section.components.map((component, index) => (
          <Tooltip 
            key={`${section.id}-${index}`}
            title={component.description}
            placement="top"
            mouseEnterDelay={0.5}
          >
            <div
              ref={component.ref}
              className="w-12 h-12 p-0 rounded-xl transition-all cursor-grab active:cursor-grabbing group flex items-center justify-center toolbox-component"
              style={{ 
                userSelect: 'none',
                background: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'var(--bg-secondary)';
                e.target.style.borderColor = 'var(--accent-color)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'var(--panel-bg)';
                e.target.style.borderColor = 'var(--border-color)';
              }}
              data-component={component.name}
            >
              <div 
                className="text-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                {component.icon}
              </div>
            </div>
          </Tooltip>
        ))}
        
        {/* Close button */}
        <div 
          className="ml-2 pl-2"
          style={{ borderLeft: '1px solid var(--border-color)' }}
        >
          <ButtonAD
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={closeDrawer}
            className="!p-0 !min-w-0 !w-8 !h-8 flex items-center justify-center rounded-lg"
            style={{ 
              fontSize: '12px',
              color: 'var(--text-muted)',
              background: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.target.style.color = 'var(--text-primary)';
              e.target.style.background = 'var(--bg-secondary)';
            }}
            onMouseLeave={(e) => {
              e.target.style.color = 'var(--text-muted)';
              e.target.style.background = 'transparent';
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="relative" ref={toolboxRef}>
      {/* Figma-style bottom center toolbar */}
      {!activeDrawer && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <ThemedContainer variant="panel" className="rounded-2xl shadow-lg p-2">
            <div className="flex items-center gap-1">
              {sections.map((section) => (
                <Tooltip
                  key={section.id}
                  title={section.title}
                  placement="top"
                  mouseEnterDelay={0.5}
                >
                  <ButtonAD
                    type={activeDrawer === section.id ? "primary" : "text"}
                    className="w-12 h-12 p-0 flex items-center justify-center transition-all rounded-xl border"
                    style={{
                      borderColor: activeDrawer === section.id ? 'var(--accent-color)' : 'transparent',
                      background: activeDrawer === section.id ? 'var(--accent-color)' : 'transparent',
                      color: activeDrawer === section.id ? '#ffffff' : 'var(--text-secondary)'
                    }}
                    onMouseEnter={(e) => {
                      if (activeDrawer !== section.id) {
                        e.target.style.borderColor = 'var(--border-color)';
                        e.target.style.background = 'var(--bg-secondary)';
                        e.target.style.color = 'var(--text-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeDrawer !== section.id) {
                        e.target.style.borderColor = 'transparent';
                        e.target.style.background = 'transparent';
                        e.target.style.color = 'var(--text-secondary)';
                      }
                    }}
                    onClick={() => activeDrawer === section.id ? closeDrawer() : openDrawer(section.id)}
                  >
                    <div className="text-lg">
                      {section.icon}
                    </div>
                  </ButtonAD>
                </Tooltip>
              ))}
            </div>
          </ThemedContainer>
        </div>
      )}

       {/* Quick Section Switcher (when drawer is open) */}
        {activeDrawer && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
            <ThemedContainer variant="panel" className="rounded-2xl shadow-lg p-2">
              <div className="flex items-center gap-1">
                {sections.map((section) => (
                  <Tooltip
                    key={section.id}
                    title={section.title}
                    placement="top"
                    mouseEnterDelay={0.3}
                  >
                    <ButtonAD
                      type={activeDrawer === section.id ? "primary" : "text"}
                      size="small"
                      className="w-10 h-10 p-0 flex items-center justify-center !min-w-0 rounded-xl transition-all"
                      style={{
                        background: activeDrawer === section.id ? 'var(--accent-color)' : 'transparent',
                        borderColor: activeDrawer === section.id ? 'var(--accent-color)' : 'transparent',
                        color: activeDrawer === section.id ? '#ffffff' : 'var(--text-secondary)'
                      }}
                      onMouseEnter={(e) => {
                        if (activeDrawer !== section.id) {
                          e.target.style.background = 'var(--bg-secondary)';
                          e.target.style.color = 'var(--text-primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (activeDrawer !== section.id) {
                          e.target.style.background = 'transparent';
                          e.target.style.color = 'var(--text-secondary)';
                        }
                      }}
                      onClick={() => switchDrawer(section.id)}
                    >
                      <div className="text-sm">
                        {section.icon}
                      </div>
                    </ButtonAD>
                  </Tooltip>
                ))}
              </div>
            </ThemedContainer>
          </div>
        )}

      {/* Enhanced Drawer - Same height as toolbar, width to fit content */}
      <Drawer
        title={false}
        placement="bottom"
        open={!!activeDrawer}
        onClose={closeDrawer}
        className="figma-component-drawer"
        mask={false}
        maskClosable={true}
        style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          height: 'auto',
          width: 'auto',
          zIndex: 40,
        }}
        styles={{
          header: { display: 'none' },
          body: {
            height: '64px',
            padding: '8px 16px',
            backgroundColor: 'var(--panel-bg)',
            borderRadius: '32px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center'
          },
          wrapper: {
            position: 'fixed',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            height: 'auto',
            width: 'auto',
            zIndex: 40,
            boxShadow: 'var(--shadow)'
          },
          content: {
            zIndex: 40,
            borderRadius: '32px',
            border: 'none',
            backgroundColor: 'transparent'
          }
        }}
        getContainer={false}
        destroyOnHidden={false}
        zIndex={40}
      >
        {activeDrawer && renderDrawerContent(sections.find(s => s.id === activeDrawer))}
      </Drawer>
    </div>
  );
};