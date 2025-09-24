import React, { useState } from 'react';
import TemplateModeration from '../../../Components/TemplateModeration';
import TemplateCollections from '../../../Components/TemplateCollections';
import TemplateAnalyticsDashboard from '../../../Components/TemplateAnalyticsDashboard';
import { Card, Tabs } from 'antd';
import {
  CheckCircleOutlined,
  AppstoreOutlined,
  BarChartOutlined
} from '@ant-design/icons';

const { TabPane } = Tabs;

const AdminTemplates = ({ selectedSubmenu, ownerData, owner }) => {
  const [activeTab, setActiveTab] = useState(selectedSubmenu || 'Moderation');

  // Get the appropriate content based on selected submenu
  const getTabKey = (submenu) => {
    switch(submenu) {
      case 'Moderation': return 'moderation';
      case 'Collections': return 'collections';
      case 'Analytics': return 'analytics';
      default: return 'moderation';
    }
  };

  return (
    <div className="space-y-6">
      <Tabs 
        activeKey={getTabKey(activeTab)}
        onChange={(key) => {
          const submenuMap = {
            'moderation': 'Moderation',
            'collections': 'Collections', 
            'analytics': 'Analytics'
          };
          setActiveTab(submenuMap[key]);
        }}
        size="large"
        className="template-admin-tabs"
      >
        <TabPane 
          tab={
            <span>
              <CheckCircleOutlined />
              Template Moderation
            </span>
          } 
          key="moderation"
        >
          <Card 
            className="shadow-lg bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
            style={{ borderRadius: 16 }}
            styles={{ body: { padding: 0 } }}
          >
            <TemplateModeration 
              adminMode={true}
              user={owner}
              userData={ownerData}
            />
          </Card>
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <AppstoreOutlined />
              Template Collections
            </span>
          } 
          key="collections"
        >
          <Card 
            className="shadow-lg bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
            style={{ borderRadius: 16 }}
            styles={{ body: { padding: 0 } }}
          >
            <TemplateCollections 
              adminMode={true}
              embedded={false}
              showFilters={true}
              showSearch={true}
            />
          </Card>
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <BarChartOutlined />
              Template Analytics
            </span>
          } 
          key="analytics"
        >
          <Card 
            className="shadow-lg bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
            style={{ borderRadius: 16 }}
            styles={{ body: { padding: 0 } }}
          >
            <TemplateAnalyticsDashboard />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default AdminTemplates;