'use client'
import React from 'react';
import { Typography } from 'antd';

import { Toolbox } from './Components/ToolBox';
import { SettingsPanel } from './Components/SettingsPanel';
import { Topbar } from './Components/TopBar';

import { Container } from './Components/user/Container';
import { Button } from './Components/user/Button';
import { Card } from './Components/user/userCard';
import { Text } from './Components/user/Text';

import {Editor, Frame, Element} from "@craftjs/core";

export default function App() {
  return (
    <div className="mx-auto w-[800px]">
      <Typography.Title level={5} className="text-center">
        A super simple page editor
      </Typography.Title>
      <Editor resolver={{Card, Button, Text, Container}}> 
      <div className="pt-2 space-y-4">
        <Topbar />

        <div className="flex gap-4">
          {/* Main Content */}
          <Frame>
          <div className="flex-1">
            <Container padding={5} background="#eee">
              <Card />
            </Container>
          </div>
          </Frame>

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