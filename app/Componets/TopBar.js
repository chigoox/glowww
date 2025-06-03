// components/Topbar.js
import React from "react";
import { Button, Card, Form, Grid, Slider } from "antd";
import FormItemLabel from "antd/es/form/FormItemLabel";
import FormItem from "antd/es/form/FormItem";


export const Topbar = () => {
  return (
    <Card px={1} py={1} mt={3} mb={1} bgcolor="#cbe8e7">
      <div className="grid">
        <div className="grid grid-cols-2 gap-4">
          <Form size="small" component="fieldset">
            <FormItemLabel label="Settings" />
            <FormItem name="setting1" label="Setting 1">
              <Slider initialValues={30} />
            </FormItem>
          </Form>
        </div>
        <div>
          <Button size="small" variant="outlined" color="secondary">Serialize JSON to console</Button>
        </div>
      </div>
    </Card>
  )
};