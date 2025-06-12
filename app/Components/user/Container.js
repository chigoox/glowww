'use client'

import React, { useRef, useEffect } from "react";
import Card from "antd/es/card/Card";
import { useNode } from "@craftjs/core";




export const Container = ({ background, padding = 0, children }) => {
  const { connectors: { connect, drag } } = useNode();
  const cardRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) {
      connect(drag(cardRef.current));
    }
  }, [connect, drag]);

  return (
    <Card
      ref={cardRef}
      style={{ margin: "5px 0", background, padding: `${padding}px` }}
    >
      {children}
    </Card>
  );
};

