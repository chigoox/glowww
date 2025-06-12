'use client';

import { useNode } from "@craftjs/core";
import React, { useRef, useEffect } from "react";

export const Text = ({ text, fontSize }) => {
  const { connectors: { connect, drag } } = useNode();
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      connect(drag(ref.current));
    }
  }, [connect, drag]);

  return (
    <div ref={ref}>
      <p style={{ fontSize }}>{text}</p>
    </div>
  );
};

// Must be defined after the component declaration
Text.craft = {
  rules: {
    canDrag: (node) => node.data.props.text !== "Drag",
  }
};
