'use client'
import React  from "react";
import { Button } from "./Button";
import { Container } from "./Container";
import { Text } from "./Text";
import { Element, Frame, useNode } from "@craftjs/core";



export const CardTop = ({children}) => {
  const { connectors: {connect} } = useNode();
  return (
    <div ref={connect} className="text-only">
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
    <div ref={connect}>
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
      <Element is={CardBottom} id="buttons-only" canvas>
        <Button size="small" text="Learn more" variant="contained" color="primary" />
      </Element>
    </Container>
  )
}