import React  from "react";
import { Button } from "antd";

export const Button = ({size, variant, color, children}) => {
  return (
    <Button size={size}  type={variant} style={{backgroundColor: color}}>
      {children}
    </Button>
  )
}