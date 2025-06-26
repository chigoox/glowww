'use client';

import { Element, useEditor } from "@craftjs/core";
import { Button as ButtonAD, Typography } from "antd";
import { useEffect, useRef } from "react";
import { Box } from "./user/Box";
import { FlexBox } from "./user/FlexBox";

import { 
  AppstoreOutlined, 
  BorderlessTableOutlined,
  FontColorsOutlined,
  PictureOutlined,
  MenuOutlined,
  TableOutlined,
  LayoutOutlined,
  BgColorsOutlined
} from "@ant-design/icons";

export const Toolbox = ({}) => {
  const { connectors } = useEditor();

  // Create refs for each button
  const boxRef = useRef(null);
  const flexBoxRef = useRef(null);
  const gridBoxRef = useRef(null);
  const textRef = useRef(null);
  const imageRef = useRef(null);
  const menuRef = useRef(null);
  const tableRef = useRef(null);



  useEffect(() => {
 
    if (boxRef.current) {
      connectors.create(boxRef.current, <Element is={Box} padding={20} canvas />);
    }

    // FlexBox component (with flex display)
    if (flexBoxRef.current) {
      connectors.create(flexBoxRef.current, 
        <Element is={FlexBox} padding={20} display="flex" flexDirection="row" canvas />
      );
    }
   
  }, [connectors ]);

  return (
    <div className="p-4">
      <div className="flex flex-col items-center space-y-2">
        <div className="pb-2">
          <Typography.Text>Drag to add</Typography.Text>
        </div>
        <div className="flex flex-col space-y-2 w-full items-center">
          {/* Regular Box */}
          <ButtonAD 
            ref={boxRef} 
            type="none" 
            className="w-20 h-16 flex  items-center justify-center text-xs"
            icon={<LayoutOutlined />}
          >
            <div className="mt-1">Box</div>
          </ButtonAD>
          
          {/* Flex Box */}
          <ButtonAD 
            ref={flexBoxRef} 
            type="none" 
            className="w-20 h-16 flex  items-center justify-center text-xs"
            icon={<AppstoreOutlined />}
          >
            <div className="mt-1">Flex</div>
          </ButtonAD>

          <ButtonAD 
            ref={gridBoxRef} 
            type="none" 
            className="w-20 h-16 flex  items-center justify-center text-xs"
            icon={<BorderlessTableOutlined />}
          >
            <div className="mt-1">Grid</div>
          </ButtonAD>
          
          <ButtonAD 
            ref={textRef} 
            type="primary" 
            className="w-20 h-16 flex  items-center justify-center text-xs"
            icon={<FontColorsOutlined />}
          >
            <div className="mt-1">Text</div>
          </ButtonAD>
          
          <ButtonAD 
            ref={imageRef} 
            type="primary" 
            className="w-20 h-16 flex items-center justify-center text-xs"
            icon={<PictureOutlined />}
          >
            <div className="mt-1">Image</div>
          </ButtonAD>
        </div>
      </div>
    </div>
  );
};