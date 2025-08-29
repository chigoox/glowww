'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Alert, Spin } from 'antd';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminAuthWrapper({ children }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect non-admin users after loading completes
    if (!loading && (!userData?.tier === 'admin' && !user?.customClaims?.admin)) {
      router.push('/dashboard');
    }
  }, [user, userData, loading, router]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <Spin size="large" />
        <div>Verifying admin access...</div>
      </div>
    );
  }

  // Show access denied if not admin
  if (!userData?.tier === 'admin' && !user?.customClaims?.admin) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <Alert
          type="error"
          message="Access Denied"
          description="You need admin privileges to access this page."
          showIcon
        />
      </div>
    );
  }

  // Render children if user is admin
  return children;
}
