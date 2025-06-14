'use client'
import React  from "react";
import { Button } from "./Button";
import { Container } from "./Container";
import { Text } from "./Text";
import { Element, Frame, useNode } from "@craftjs/core";



export const CardTop = ({children}) => {
  const { connectors: {connect} } = useNode();
  return (
    <div ref={connect} className="text-only border border-dashed border-gray-300 p-4 rounded-lg">
      {children}
    </div>
  )
}

CardTop.craft = {
  rules: {
    // Only accept Text
    canMoveIn: (incomingNodes) => incomingNodes.every(incomingNode => incomingNode.data.type === Text)
  }
}

export const CardBottom = ({children}) => {
  const { connectors: {connect} } = useNode();
  return (
    <div className="border border-dashed border-gray-300 p-4 rounded-lg" ref={connect}>
      {children}
    </div>
  )
}

CardBottom.craft = {
  rules: {
    // Only accept Buttons
    canMoveIn : (incomingNodes) => incomingNodes.every(incomingNode => incomingNode.data.type === Button)
  }
}


export const Card = ({background, padding = 20}) => {
  return (
      <Container background={background} padding={padding}>
      <Element is={CardTop} id="text-only" canvas>
        <Text text="Title" fontSize={20} />
        <Text text="Subtitle" fontSize={15} />
      </Element>
      <div className={`h-10`}></div>
      <Element is={CardBottom} id="buttons-only" canvas>
        <Button size="small" variant="contained" color="primary">
          <Text>test</Text>
        </Button>
      </Element>
    </Container>
  )
}