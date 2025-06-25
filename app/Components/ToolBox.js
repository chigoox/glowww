'use client';

import { Element, useEditor } from "@craftjs/core";
import { Button as ButtonAD, Typography } from "antd";
import { useEffect, useRef } from "react";
import { Box } from "./user/Box";

export const Toolbox = ({}) => {
  const { connectors } = useEditor();

  // Create refs for each button
  const boxRef = useRef(null);


  useEffect(() => {
 
    if (boxRef.current) {
      connectors.create(boxRef.current, <Element is={Box} padding={20} canvas />);
    }
   
  }, [connectors ]);

  return (
    <div className="p-4">
      <div className="flex flex-col items-center space-y-2">
        <div className="pb-2">
          <Typography.Text>Drag to add</Typography.Text>
        </div>
        <div className="flex flex-col space-y-2 w-full items-center">
          <ButtonAD ref={boxRef} type="primary" className="w-12 h-12">Section</ButtonAD>
        </div>
      </div>
    </div>
  );
};