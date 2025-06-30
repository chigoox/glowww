'use client'
import { useEffect, useState } from 'react';

import { Toolbox } from './Components/ToolBox';
import { Topbar } from './Components/TopBar';

import { Editor, Element, Frame, useEditor } from "@craftjs/core";
import { Box } from './Components/user/Box';
import { StyleMenu } from './Components/StyleMenu';
import { FlexBox } from './Components/user/FlexBox';
import { Text } from './Components/user/Text';
import { GridBox } from './Components/user/GridBox';
import { Image } from './Components/user/Image';
import { Button } from './Components/user/Button';
import { TextArea } from './Components/user/TextArea';
import { Link } from './Components/user/Link';
import { Paragraph } from './Components/user/Paragraph';
import { Video } from './Components/user/Video';
import {ShopFlexBox, ShopImage, ShopText} from './Components/user/Advanced/ShopFlexBox';
import { FormInput } from './Components/user/Input';
import EditorLayers from './Components/EditorLayers';
import { Form, FormInputDropArea } from './Components/user/Advanced/Form';

// Create a component that uses useEditor inside the Editor context
const EditorLayout = () => {
  const [openMenuNodeId, setOpenMenuNodeId] = useState(null);
  const [activeDrawer, setActiveDrawer] = useState(null);
  
  const { enabled } = useEditor((state) => ({
    enabled: state.options.enabled
  }));

useEffect(() => {
    // React 19 + Craft.js compatibility fixes
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    
    // Fix addEventListener for non-DOM objects
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        try {
            if (this && typeof originalAddEventListener === 'function') {
                return originalAddEventListener.call(this, type, listener, options);
            }
        } catch (error) {
            console.warn('addEventListener compatibility fix:', error);
        }
    };
    
    // Fix removeEventListener for non-DOM objects  
    EventTarget.prototype.removeEventListener = function(type, listener, options) {
        try {
            if (this && typeof originalRemoveEventListener === 'function') {
                return originalRemoveEventListener.call(this, type, listener, options);
            }
        } catch (error) {
            console.warn('removeEventListener compatibility fix:', error);
        }
    };
    
    // Fix getBoundingClientRect for non-DOM objects
    Element.prototype.getBoundingClientRect = function() {
        try {
            if (this && typeof originalGetBoundingClientRect === 'function') {
                return originalGetBoundingClientRect.call(this);
            }
            // Fallback for invalid elements
            return {
                top: 0, left: 0, bottom: 0, right: 0,
                width: 0, height: 0, x: 0, y: 0,
                toJSON: () => ({})
            };
        } catch (error) {
            console.warn('getBoundingClientRect compatibility fix:', error);
            return {
                top: 0, left: 0, bottom: 0, right: 0,
                width: 0, height: 0, x: 0, y: 0,
                toJSON: () => ({})
            };
        }
    };
    
    return () => {
        // Restore original methods on cleanup
        EventTarget.prototype.addEventListener = originalAddEventListener;
        EventTarget.prototype.removeEventListener = originalRemoveEventListener;
        Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    };
}, []);

  return (
    <div className="h-screen overflow-hidden bg-gray-50">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Topbar />
      </div>

      {/* Main Layout Container */}
      <div className="flex  h-screen pt-16">
        
        {/* Left Sidebar - Toolbox */}
        {enabled && (
          <div className={`${activeDrawer? 'w-64' : 'w-64'} bg-white border-r border-gray-200 shadow-sm flex-shrink-0`}>
            <div className="h-[60%] overflow-y-auto">
              <Toolbox 
                activeDrawer={activeDrawer}
                setActiveDrawer={setActiveDrawer}
                openMenuNodeId={openMenuNodeId}
                setOpenMenuNodeId={setOpenMenuNodeId}
              />
            </div>
            <div className='border-2 h-[30rem]'>
<EditorLayers />
            </div>
          </div>
        )}

        {/* Main Editor Area */}
        <div className="flex-1 flex ">
        {/* Canvas Area */}
          <div className="flex-1 p-4 overflow-auto bg-gray-100">
            <div className="w-full max-w-none">
              <Frame className="w-full min-h-[600px]">
                <Element 
                  is={Box} 
                  padding={20} 
                  background="#ffffff" 
                  canvas
                  className="min-h-[600px] w-full"
                  style={{ 
                    maxWidth: '100%',
                    overflow: 'hidden'
                  }}
                >
                  {/* Canvas content goes here */}
                </Element>
              </Frame>
            </div>
          </div>

          {/* Right Sidebar - Style Menu */}
          {enabled && (
            <div className="w-80 bg-white border-l border-gray-200 shadow-sm min-w-48 flex-shrink-0">
              <div className="h-full overflow-y-auto">
                <StyleMenu />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <Editor resolver={{
      Box, FlexBox, GridBox, Text, Image, Button, TextArea, Link, FormInputDropArea,
      Paragraph, Video, ShopFlexBox, ShopText, ShopImage, FormInput, Form
    }}> 
      <EditorLayout />
    </Editor>
  );
}