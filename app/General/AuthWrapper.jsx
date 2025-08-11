'use client'
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Spin, Alert } from 'antd';

export default function AuthWrapper({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ maxWidth: 520, margin: '64px auto' }}>
        <Alert
          message="Sign in required"
          description="Please sign in to access the admin dashboard."
          type="warning"
          showIcon
        />
      </div>
    );
  }

  return <>{children}</>;
}
