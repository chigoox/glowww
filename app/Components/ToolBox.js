'use client';

import React from "react";
import { Button, Typography } from "antd";

export const Toolbox = () => {
  return (
    <div className="px-4 py-4">
      <div className="flex flex-col items-center space-y-2">
        <div className="pb-2">
          <Typography.Text>Drag to add</Typography.Text>
        </div>
        <div className="flex flex-col space-y-2 w-full items-center">
          <Button type="primary" className="w-32">Button</Button>
          <Button type="primary" className="w-32">Text</Button>
          <Button type="primary" className="w-32">Container</Button>
          <Button type="primary" className="w-32">Card</Button>
        </div>
      </div>
    </div>
  );
};