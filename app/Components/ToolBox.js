'use client';

import { Element, useEditor } from "@craftjs/core";
import { Button as ButtonAD, Typography } from "antd";
import { useEffect, useRef } from "react";
import { Box } from "./user/Box";
import { FlexBox } from "./user/FlexBox";
import { GridBox } from "./user/GridBox";
import { Image } from "./user/Image";

import { 
  AppstoreOutlined, 
  BorderlessTableOutlined,
  FontColorsOutlined,
  PictureOutlined,
  MenuOutlined,
  TableOutlined,
  LayoutOutlined,
  BgColorsOutlined,
  AlignCenterOutlined,
  LinkOutlined
} from "@ant-design/icons";
import { Text } from "./user/Text";
import { Button } from "./user/Button";
import { Link } from "./user/Link";
import { TextArea } from "./user/TextArea";

export const Toolbox = ({}) => {
  const { connectors } = useEditor();

  // Create refs for each button
  const boxRef = useRef(null);
  const flexBoxRef = useRef(null);
  const gridBoxRef = useRef(null);
  const textRef = useRef(null);
  const TextAreaRef = useRef(null);
  const imageRef = useRef(null);
  const buttonRef = useRef(null);
  const linkRef = useRef(null);

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

    if (gridBoxRef.current) {
      connectors.create(gridBoxRef.current, 
        <Element is={GridBox} padding={20} display="grid" gridTemplateColumns="repeat(3, 1fr)" canvas />
      );
    }

    if (textRef.current) {
      connectors.create(textRef.current, 
        <Element is={Text}  />
        
      );
    }

    if (TextAreaRef.current) {
      connectors.create(TextAreaRef.current, 
        <Element is={TextArea} placeholder="Type here..." />
      );
    }

    if (buttonRef.current) {
  connectors.create(buttonRef.current, 
    <Element is={Button} text="Click Me" canvas />
  );
}

    if (imageRef.current) {
      connectors.create(imageRef.current, 
        <Element is={Image} src="https://via.placeholder.com/300x200?text=Click+to+Upload+Image" />
      );
    }

    

    if (linkRef.current) {
      connectors.create(linkRef.current, 
        <Element is={Link} href="https://example.com" target="_blank">
          <span>Link</span>
        </Element>
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
            type="none" 
            className="w-20 h-16 flex  items-center justify-center text-xs"
            icon={<FontColorsOutlined />}
          >
            <div className="mt-1">Text</div>
          </ButtonAD>

          <ButtonAD 
            ref={TextAreaRef} 
            type="none"
            className="w-20 h-16 flex items-center justify-center text-xs"
            icon={<AlignCenterOutlined />}
          >
            <div className="mt-1">Text Area</div>
          </ButtonAD>
          
          <ButtonAD 
            ref={imageRef} 
            type="none" 
            className="w-20 h-16 flex items-center justify-center text-xs"
            icon={<PictureOutlined />}
          >
            <div className="mt-1">Image</div>
          </ButtonAD>

          <ButtonAD 
            ref={buttonRef} 
            type="none"
            className="w-20 h-16 flex items-center justify-center text-xs"
            icon={<MenuOutlined />}
          >
            <div className="mt-1">Button</div>
          </ButtonAD>

          <ButtonAD 
            ref={linkRef} 
            type="none"
            className="w-20 h-16 flex items-center justify-center text-xs"
            icon={<LinkOutlined />}
          >
            <div className="mt-1">Link</div>
          </ButtonAD>



          
          
        </div>
      </div>
    </div>
  );
};