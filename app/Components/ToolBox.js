'use client';

import React, { useRef, useEffect } from "react";
import { Button as ButtonAD, Typography } from "antd";
import { Button } from "./user/Button";
import { Text } from "./user/Text";
import { Card } from "./user/UserCard";
import { Container } from "./user/Container";
import {Image} from "./user/Image";
import { Element, useEditor } from "@craftjs/core";

export const Toolbox = () => {
  const { connectors } = useEditor();

  // Create refs for each button
  const buttonRef = useRef(null);
  const textRef = useRef(null);
  const containerRef = useRef(null);
  const cardRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    if (buttonRef.current) {
      connectors.create(buttonRef.current, <Button text="Click me" size="small">Click me</Button>);
    }
    if (textRef.current) {
      connectors.create(textRef.current, <Text text="Hi world" />);
    }
    if (containerRef.current) {
      connectors.create(containerRef.current, <Element is={Container} padding={20} canvas />);
    }
    if (cardRef.current) {
      connectors.create(cardRef.current, <Card />);
    }
    if (imageRef.current) {
      connectors.create(imageRef.current, <Image />);
    }
  }, [connectors]);

  return (
    <div className="p-4">
      <div className="flex flex-col items-center space-y-2">
        <div className="pb-2">
          <Typography.Text>Drag to add</Typography.Text>
        </div>
        <div className="flex flex-col space-y-2 w-full items-center">
          <ButtonAD ref={buttonRef} type="primary" className="w-12 h-12">Button</ButtonAD>
          <ButtonAD ref={textRef} type="primary" className="w-12 h-12">Text</ButtonAD>
          <ButtonAD ref={containerRef} type="primary" className="w-12 h-12">Section</ButtonAD>
          <ButtonAD ref={cardRef} type="primary" className="w-12 h-12">Card</ButtonAD>
          <ButtonAD ref={imageRef} type="primary" className="w-12 h-12">Image</ButtonAD>

        </div>
      </div>
    </div>
  );
};