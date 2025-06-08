'use client'
import React  from "react";
import { Button } from "./Button";
import { Container } from "./Container";
import { Text } from "./Text";
import { Frame, useNode } from "@craftjs/core";

export const Card = ({background, padding = 20}) => {
  return (
    <Frame>
      <Container background={background} padding={padding}>
      <div className="text-only">
        <Text text="Title" fontSize={20} />
        <Text text="Subtitle" fontSize={15} />
      </div>
      <div className="buttons-only">
        <Button size="small" text="Learn more" variant="contained" color="primary" />
      </div>
    </Container>
    </Frame>
  )
}