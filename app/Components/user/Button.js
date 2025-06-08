'use client'

import { Button as AntDButton, Radio, Form } from 'antd';
import React from 'react';
import { useNode } from '@craftjs/core';

export const Button = ({size, variant, color, children}) => {
  return (
    <AntDButton size={size} variant={variant} color={color}>
      {children}
    </AntDButton>
  )
}