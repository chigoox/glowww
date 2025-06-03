// components/Toolbox.js
import React from "react";
import { Button, Card, Form, Grid, Slider } from "antd";


export const Toolbox = () => {
  return (
    <Card px={2} py={2}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card pb={2}>
          <p>Drag to add</p>
        </Card>
        <div>
          <Button variant="contained">Button</Button>
        </div>
        <div>
          <Button variant="contained">Text</Button>
        </div>
        <div>
          <Button variant="contained">Container</Button>
        </div>
        <div>
          <Button variant="contained">Card</Button>
        </div>
      </div>
    </Card>
  )
};