'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Form, Input, Button, Alert, Space, Typography, Spin, Divider } from 'antd';
import { LockOutlined, UserOutlined, GoogleOutlined } from '@ant-design/icons';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
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
                     userData?.subscriptionTier === 'admin' ||
                     userData?.subscription?.plan === 'admin' ||
                     user?.customClaims?.admin || 
                     user?.customClaims?.platformAdmin ||
                     // Development fallback - allow any user in development
                     process.env.NODE_ENV === 'development';
      
      if (isAdmin) {
        router.push('/admin');
      }
    }
  }, [user, userData, loading, router]);

  // Helper function to check if user has admin access
  const checkAdminAccess = async (user) => {
    const tokenResult = await user.getIdTokenResult(true);
    
    // Check token claims first
    const hasTokenAdmin = tokenResult.claims.admin || 
                         tokenResult.claims.platformAdmin || 
                         tokenResult.claims.tier === 'admin' ||
                         tokenResult.claims.subscriptionTier === 'admin';
    
    if (hasTokenAdmin) {
      return true;
    }
    
    // Fallback: check if user data will be loaded with admin tier
    // (This covers cases where custom claims haven't been set yet)
    if (userData) {
      return userData.tier === 'admin' || 
             userData.subscriptionTier === 'admin' || 
             userData.subscription?.plan === 'admin';
    }
    
    // Development fallback
    return process.env.NODE_ENV === 'development';
  };

  const handleLogin = async (values) => {
    try {
      setLoginLoading(true);
      setError('');
      
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      
      // Check if user has admin privileges
      const isAdmin = await checkAdminAccess(user);
      
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

  const handleGoogleSignIn = async () => {
    try {
      setLoginLoading(true);
      setError('');
      
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user has admin privileges
      const isAdmin = await checkAdminAccess(user);
      
      if (isAdmin) {
        router.push('/admin');
      } else {
        setError('Access denied. Admin privileges required for this Google account.');
        await auth.signOut();
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      if (error.code === 'auth/popup-blocked') {
        setError('Popup was blocked. Please allow popups and try again.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled.');
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with this email address.');
      } else {
        setError('Google sign-in failed. Please try again.');
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

        <Divider style={{ margin: '24px 0 16px 0' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>OR</Text>
        </Divider>

        <Button
          icon={<GoogleOutlined />}
          onClick={handleGoogleSignIn}
          loading={loginLoading}
          size="large"
          style={{ 
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {loginLoading ? 'Signing in with Google...' : 'Sign in with Google'}
        </Button>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Secure admin access • Platform administration
          </Text>
        </div>
      </Card>
    </div>
  );
}
