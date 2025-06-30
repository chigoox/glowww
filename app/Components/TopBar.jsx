'use client';

import React from "react";
import { Switch, Button } from "antd";
import { useEditor } from "@craftjs/core";

export const Topbar = () => {
  const { actions, query, enabled } = useEditor((state) => ({
    enabled: state.options.enabled
  }));

  return (
    <div className="bg-[#cbe8e7]  mb-2 px-2 py-2 rounded">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch 
            checked={enabled} 
            onChange={(value) => {
              console.log('Toggling enabled state to:', value);
              actions.setOptions(options => {
                options.enabled = value;
              });
            }} 
          />
          <span className="text-sm">Enable</span>
        </div>
        <Button 
          onClick={() => {
            try {
              const serialized = query.serialize();
              console.log('Serialized JSON:', serialized);
            } catch (error) {
              console.error('Error serializing:', error);
            }
          }}
          size="small" 
          type="default" 
          danger
        >
          Serialize JSON to console
        </Button>
      </div>
    </div>
  );
};