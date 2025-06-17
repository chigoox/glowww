'use client';
import React from 'react';
import { Typography, Slider, Button, Tag } from 'antd';

export const SettingsPanel = () => {
  return (
    <div className="bg-black/5 mt-4 px-4 py-4 rounded">
      <div className="flex flex-col space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Typography.Text strong>Selected</Typography.Text>
            <Tag color="blue">Selected</Tag>
          </div>
        </div>

        <div>
          <Typography.Text className="block mb-1">Prop</Typography.Text>
        
        </div>

        <Button danger>Delete</Button>
      </div>
    </div>
  );
};
