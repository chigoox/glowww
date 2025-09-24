'use client';

import React from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Card, Typography, Space, Tag, Alert } from 'antd';

const { Text, Title } = Typography;

const UserDebugInfo = () => {
  const { user, userData } = useAuth();

  if (!user) return null;

  const hasAIAccess = user?.subscriptionTier && user.subscriptionTier.toLowerCase() !== 'free';

  return (
    <Card title="User Debug Info" style={{ margin: 16, maxWidth: 600 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Text strong>User Email: </Text>
          <Text code>{user.email}</Text>
        </div>
        
        <div>
          <Text strong>User UID: </Text>
          <Text code>{user.uid}</Text>
        </div>
        
        <div>
          <Text strong>user.subscriptionTier: </Text>
          <Tag color={user.subscriptionTier === 'admin' ? 'red' : 'blue'}>
            {user.subscriptionTier || 'undefined'}
          </Tag>
        </div>
        
        <div>
          <Text strong>user.isAdmin: </Text>
          <Tag color={user.isAdmin ? 'green' : 'default'}>
            {user.isAdmin ? 'true' : 'false'}
          </Tag>
        </div>
        
        <div>
          <Text strong>userData.tier: </Text>
          <Tag>{userData?.tier || 'undefined'}</Tag>
        </div>
        
        <div>
          <Text strong>userData.subscriptionTier: </Text>
          <Tag>{userData?.subscriptionTier || 'undefined'}</Tag>
        </div>
        
        <div>
          <Text strong>Has AI Access (calculated): </Text>
          <Tag color={hasAIAccess ? 'green' : 'red'}>
            {hasAIAccess ? 'YES' : 'NO'}
          </Tag>
        </div>
        
        <Alert 
          type={hasAIAccess ? 'success' : 'error'}
          message={
            hasAIAccess 
              ? 'User should have access to AI features' 
              : 'User should NOT have access to AI features'
          }
          description={
            hasAIAccess 
              ? 'AI generation button should be enabled'
              : 'AI generation should show upgrade prompt'
          }
        />
        
        <div>
          <Text strong>Full user object:</Text>
          <pre style={{ 
            background: '#f6f6f6', 
            padding: 8, 
            borderRadius: 4, 
            fontSize: '10px',
            overflow: 'auto'
          }}>
            {JSON.stringify({
              subscriptionTier: user.subscriptionTier,
              isAdmin: user.isAdmin,
              subscription: user.subscription
            }, null, 2)}
          </pre>
        </div>
      </Space>
    </Card>
  );
};

export default UserDebugInfo;