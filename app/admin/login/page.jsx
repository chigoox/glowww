'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Form, Input, Button, Alert, Space, Typography, Spin } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

export default function AdminLoginPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const [form] = Form.useForm();
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if user is already authenticated and is admin
  useEffect(() => {
    if (!loading && user) {
      const isAdmin = userData?.tier === 'admin' || 
                     user?.customClaims?.admin || 
                     user?.customClaims?.platformAdmin ||
                     // Development fallback - allow any user in development
                     process.env.NODE_ENV === 'development';
      
      if (isAdmin) {
        router.push('/admin');
      }
    }
  }, [user, userData, loading, router]);

  const handleLogin = async (values) => {
    try {
      setLoginLoading(true);
      setError('');
      
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const token = await userCredential.user.getIdToken();
      
      // Get fresh token claims
      const tokenResult = await userCredential.user.getIdTokenResult(true);
      
      // Check if user has admin privileges
      const isAdmin = tokenResult.claims.admin || 
                     tokenResult.claims.platformAdmin || 
                     tokenResult.claims.tier === 'admin' ||
                     // Development fallback
                     process.env.NODE_ENV === 'development';
      
      if (isAdmin) {
        router.push('/admin');
      } else {
        setError('Access denied. Admin privileges required.');
        await auth.signOut();
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (error.code === 'auth/user-disabled') {
        setError('This account has been disabled.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

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
        <Text>Checking authentication...</Text>
      </div>
    );
  }

  // Show admin login form
  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card 
        style={{ 
          width: '100%', 
          maxWidth: '400px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <LockOutlined style={{ fontSize: '48px', color: '#1677ff', marginBottom: '16px' }} />
          <Title level={2} style={{ margin: 0 }}>Platform Admin</Title>
          <Text type="secondary">Sign in to access admin dashboard</Text>
        </div>

        {error && (
          <Alert 
            type="error" 
            message={error} 
            style={{ marginBottom: '16px' }} 
            closable
            onClose={() => setError('')}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleLogin}
          autoComplete="off"
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="admin@example.com"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Please enter your password' },
              { min: 6, message: 'Password must be at least 6 characters' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter your password"
              size="large"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loginLoading}
              size="large"
              style={{ width: '100%' }}
            >
              {loginLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Secure admin access • Platform administration
          </Text>
        </div>
      </Card>
    </div>
  );
}
