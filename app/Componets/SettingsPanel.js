// components/SettingsPanel.js
import React from 'react';
import { Button, Card, Form, Grid, Slider } from "antd";
import FormItemLabel from 'antd/es/form/FormItemLabel';
import FormItem from 'antd/es/form/FormItem';
export const SettingsPanel = () => {  
  return  (    
    <Card bgcolor="rgba(0, 0, 0, 0.06)" mt={2} px={2} py={2}>
      <div spacing={0}>
        <div>
          <Card pb={2}>
            <div>
              <div><p>Selected</p></div>
              <div><div size="small" color="primary" label="Selected"></div></div>
            </div>
          </Card>
        </div>
        <Form size="small" component="fieldset">
          <FormItemLabel label="Settings" />
          <FormItem name="setting1" label="Setting 1">
            <Slider defaultValue={30} />
          </FormItem>
          <FormItem name="setting2" label="Setting 2">
            <Slider defaultValue={50} />
          </FormItem>
        </Form>
        <Button
          variant="contained"
          color="default"
        >
          Delete
        </Button>
      </div>
    </Card>
  ) 
}