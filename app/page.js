'use client'
import React from 'react';
import { Typography } from 'antd';

import { Toolbox } from './Components/ToolBox';
import { SettingsPanel } from './Components/SettingsPanel';
import { Topbar } from './Components/TopBar';

import { Container } from './Components/user/Container';
import { Button } from './Components/user/Button';
import { Card, CardBottom, CardTop } from './Components/user/UserCard';
import { Text } from './Components/user/Text';
import { Image } from './Components/user/Image';
import {Editor, Frame, Element} from "@craftjs/core";

export default function App() {
  return (
    <div className="mx-auto  p-4">
      <Editor resolver={{Card, Button, Text, Container, CardTop, CardBottom, Image}}> 
      <div className="pt-2 space-y-2">
        <Topbar />

        <div className="flex-row-reverse flex gap-4">
          {/* Main Content */}
         <div className=' border-amber-700 border-2 w-full h-full'>
           <Frame className='w-96'>
            <Element is={Container} padding={5} background="#eee" canvas>
             
             
            </Element>
          </Frame>
         </div>

          {/* Sidebar */}
          <div className="w-32">
            <div className="bg-white rounded shadow p-2 space-y-4">
              <Toolbox />
              <SettingsPanel />
            </div>
          </div>
        </div>
      </div>
       </Editor>
    </div>
  );
}