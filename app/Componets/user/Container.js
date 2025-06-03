import React from "react";
import Card from "antd/es/card/Card";

export const Container = ({background, padding = 0, children}) => {
  return (
    <Card style={{margin: "5px 0", background, padding: `${padding}px`}}>
      {children}
    </Card>
  )
}