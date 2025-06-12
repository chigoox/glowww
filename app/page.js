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

import {Editor, Frame, Element} from "@craftjs/core";

export default function App() {
  return (
    <div className="mx-auto w-[800px]">
      <Typography.Title level={5} className="text-center">
        A super simple page editor
      </Typography.Title>
      <Editor resolver={{Card, Button, Text, Container, CardTop, CardBottom}}> 
      <div className="pt-2 space-y-4">
        <Topbar />

        <div className="flex gap-4">
          {/* Main Content */}
         <div className=' border-amber-700 border-2'>
           <Frame className=''>
            <Element is={Container} padding={5} background="#eee" canvas>
              <Card />
              <Button size="small" variant="outlined">Click</Button>
              <Text size="small" text="Hi world!" />
              <Element is={Container} padding={6} background="red" canvas>
                <Text size="small" text="It's me again!" />
              </Element>
            </Element>
          </Frame>
         </div>

          {/* Sidebar */}
          <div className="w-[260px]">
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