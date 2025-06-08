'use client';

import React from "react";
import { Switch, Button } from "antd";

export const Topbar = () => {
  return (
    <div className="bg-[#cbe8e7] mt-6 mb-2 px-2 py-2 rounded">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch defaultChecked />
          <span className="text-sm">Enable</span>
        </div>
        <Button size="small" type="default" danger>
          Serialize JSON to console
        </Button>
      </div>
    </div>
  );
};