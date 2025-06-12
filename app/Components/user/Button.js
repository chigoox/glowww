'use client';

import React, { useRef, useEffect } from 'react';
import { Button as AntDButton, Radio, Form } from 'antd';
import { useNode } from '@craftjs/core';

export const Button = ({ size, variant, color, children }) => {
  const { connectors: { connect, drag } } = useNode();
  const buttonRef = useRef(null);

  useEffect(() => {
    if (buttonRef.current) {
      connect(drag(buttonRef.current));
    }
  }, [connect, drag]);

  return (
    <AntDButton
      ref={buttonRef}
      size={size}
      className='h-24 w-64'
      style={{ backgroundColor: color }}
    >
      {children}
    </AntDButton>
  );
};