'use client';

import { Element, useEditor } from "@craftjs/core";
import { Button as ButtonAD, Typography, Drawer, Space } from "antd";
import { useEffect, useRef, useState } from "react";
import { Box } from "./user/Box";
import { FlexBox } from "./user/FlexBox";
import { GridBox } from "./user/GridBox";
import { Image } from "./user/Image";

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
  CloseOutlined
} from "@ant-design/icons";
import { Text } from "./user/Text";
import { Button } from "./user/Button";
import { Link } from "./user/Link";
import { Paragraph } from "./user/Paragraph";
import { Video } from "./user/Video";
import { ShopFlexBox } from "./user/Advanced/ShopFlexBox";
import { FormInput } from "./user/Input";
import { Form } from "./user/Advanced/Form";
import {Carousel} from "./user/Carousel";
import { NavBar } from "./user/Nav/NavBar";

export const Toolbox = ({activeDrawer, setActiveDrawer}) => {
  const { connectors } = useEditor();
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

  // Component categories
  const sections = [
    {
      id: 'layout',
      title: 'Layout',
      icon: <BuildOutlined />,
      description: 'Structure components',
      components: [
        {
          ref: boxRef,
          name: 'Box',
          icon: <LayoutOutlined />,
          description: 'Basic container',
          element: <Element is={Box} padding={10} canvas />
        },
        {
          ref: flexBoxRef,
          name: 'Flex Box',
          icon: <AppstoreOutlined />,
          description: 'Flexible layout',
          element: <Element is={FlexBox} padding={10} display="flex" flexDirection="row" canvas />
        },
        {
          ref: gridBoxRef,
          name: 'Grid Box',
          icon: <BorderlessTableOutlined />,
          description: 'Grid layout',
          element: <Element is={GridBox} padding={10} display="grid" gridTemplateColumns="repeat(3, 1fr)" canvas />
        }
      ]
    },
    {
      id: 'content',
      title: 'Content',
      icon: <FileTextOutlined />,
      description: 'Text and content',
      components: [
        {
          ref: textRef,
          name: 'Text',
          icon: <FontColorsOutlined />,
          description: 'Simple text',
          element: <Element is={Text} />
        },
        {
          ref: paragraphRef,
          name: 'Paragraph',
          icon: <EditOutlined />,
          description: 'Rich text paragraph',
          element: <Element is={Paragraph} />
        },
       
      ]
    },
    {
      id: 'media',
      title: 'Media',
      icon: <CameraOutlined />,
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
          icon: <PictureOutlined />,
          description: 'Image carousel',
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
          name: 'Nav Bar',
          icon: <MenuOutlined />,
          description: 'Navigation bar with pages',
          element: <Element is={NavBar} canvas />
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
          icon: <MenuOutlined />,
          description: 'Clickable button',
          element: <Element is={Button} text="Click Me" canvas />
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
          name: 'Form Input',
          icon: <FormOutlined />,
          description: 'Input field',
          element: <Element is={FormInput} />
        },
        {
          ref: formRef,
          name: 'Form',
          icon: <FormOutlined />,
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
          name: 'Shop Display',
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
              console.log(`Creating connector for ${component.name}`);
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
      <div className="h-full  flex flex-col">
        {/* Compact Header */}
        <div className="border-b pb-2 mb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <div className="text-lg text-gray-600">
              {section.icon}
            </div>
            <ButtonAD
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={closeDrawer}
              className="text-gray-400 hover:text-gray-600 !p-1 !min-w-0 !w-6 !h-6"
            />
          </div>
          <Typography.Text className="text-xs font-medium block truncate">
            {section.title}
          </Typography.Text>
        </div>
        
        {/* Components - Single Column */}
        <div className="flex-1  overflow-y-auto">
          <div className="space-y-2">
            {section.components.map((component, index) => (
              <div
                key={`${section.id}-${index}`}
                ref={component.ref}
                className="p-2 border border-gray-200 rounded hover:border-blue-400 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing group"
                style={{ userSelect: 'none' }}
                title={component.description}
              >
                <div className="flex flex-col items-center text-center space-y-1">
                  <div className="text-lg text-gray-600 group-hover:text-blue-500 transition-colors">
                    {component.icon}
                  </div>
                  <div className="text-xs text-gray-800 font-medium truncate w-full">
                    {component.name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col relative" ref={toolboxRef}>
      {!activeDrawer && (<div  className="p-4 relative border ">
        <div className="flex flex-col gap-12">
          
          
          <div className="space-y-2 flex   flex-col gap-4 ">
            {sections.map((section) => (
              <ButtonAD
                key={section.id}
                type={activeDrawer === section.id ? "primary" : "text"}
                className={`w-full block  p-3  text-left transition-all rounded-lg  ${
                  activeDrawer === section.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`} 
                onClick={() => activeDrawer === section.id ? closeDrawer() : openDrawer(section.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-lg text-gray-600">
                      {section.icon}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-800">
                        {section.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {section.components.length} component{section.components.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <RightOutlined 
                    className={`text-xs text-gray-400 transition-transform ${
                      activeDrawer === section.id ? 'rotate-90' : ''
                    }`} 
                  />
                </div>
              </ButtonAD>
            ))}
          </div>
        </div>

       
      </div>)}

       {/* Quick Section Switcher (when drawer is open) */}
        {activeDrawer && (
          <div 
            className="absolute top-0 left-0 ml-2 bg-white border border-gray-200 rounded-lg shadow-lg p-1 "
            style={{ width: '50px' }}
          >
            <div className="flex flex-col space-y-1">
              {sections.map((section) => (
                <ButtonAD
                  key={section.id}
                  type={activeDrawer === section.id ? "primary" : "text"}
                  size="small"
                  className="w-full h-8 p-1 flex items-center justify-center !min-w-0"
                  onClick={() => switchDrawer(section.id)}
                  title={section.title}
                >
                  <div className="text-sm">
                    {section.icon}
                  </div>
                </ButtonAD>
              ))}
            </div>
          </div>
        )}

      {/* Compact 100px Drawer */}
      <Drawer
        title={false}
        placement="left"
        open={!!activeDrawer}
        onClose={closeDrawer}
        className="component-drawer"
        
        mask={false}
        maskClosable={true}
        
        style={{
          position: 'fixed',
          top: '',
          left: '',
          height: '50vh',
          width: '100px',
          transform: 'none',
          zIndex: 9,
        }}
        styles={{
          header: { display: 'none' },
          bodyStyle:{ 
          padding: '12px',
          height: '100%',
        },
          wrapper: {
            position: 'fixed',
            left: '50px',
            top: '130px',
            height: 'calc(50vh)',
            width: '100px', // Fixed to 100px
            transform: 'none',
            zIndex: 9,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          },
          body: {
            height: '100%',
            padding: '12px', // Reduced padding
            zIndex: 9
          },
          content: {
            zIndex: 9
          }
        }}
        getContainer={false}
        destroyOnHidden={false}
        zIndex={9}
      >
        {activeDrawer && renderDrawerContent(sections.find(s => s.id === activeDrawer))}
      </Drawer>
    </div>
  );
};