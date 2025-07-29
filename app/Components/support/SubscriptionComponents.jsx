import React from 'react';
import { Card, Progress, Button, Badge, Tooltip, Space, Typography } from 'antd';
import { 
  CrownOutlined, 
  CloudOutlined, 
  PictureOutlined, 
  VideoCameraOutlined,
  GlobalOutlined,
  ArrowUpOutlined
} from '@ant-design/icons';
import { 
  SUBSCRIPTION_TIERS, 
  getUsagePercentage, 
  formatStorageSize,
  getUpgradeBenefits 
} from '../../../lib/subscriptions';

const { Text, Title } = Typography;

/**
 * Subscription Tier Badge Component
 */
export const SubscriptionBadge = ({ tier, size = 'default' }) => {
  const isPro = tier === SUBSCRIPTION_TIERS.PRO;
  
  return (
    <Badge 
      count={
        <div style={{
          background: isPro ? 'linear-gradient(45deg, #ffd700, #ffed4a)' : '#fa8c16',
          color: isPro ? '#000' : '#fff',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: size === 'small' ? '10px' : '12px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          border: isPro ? '1px solid #ffd700' : 'none',
          boxShadow: isPro ? '0 2px 8px rgba(255, 215, 0, 0.3)' : 'none'
        }}>
          {isPro ? <CrownOutlined /> : null}
          {isPro ? 'PRO' : 'FREE'}
        </div>
      }
      offset={[0, 0]}
    />
  );
};

/**
 * Usage Progress Component
 */
export const UsageProgress = ({ 
  label, 
  used, 
  limit, 
  icon, 
  color = '#1890ff',
  showUpgrade = false,
  onUpgrade 
}) => {
  const percentage = getUsagePercentage(used, limit);
  const isUnlimited = limit === -1;
  const isNearLimit = percentage > 80;
  
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 8 
      }}>
        <Space>
          {icon}
          <Text strong>{label}</Text>
        </Space>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text type={isNearLimit && !isUnlimited ? 'warning' : 'secondary'}>
            {isUnlimited ? 'Unlimited' : `${used}/${limit}`}
          </Text>
          {showUpgrade && !isUnlimited && (
            <Button 
              type="link" 
              size="small" 
              icon={<ArrowUpOutlined />}
              onClick={onUpgrade}
              style={{ padding: '0 4px' }}
            >
              Upgrade
            </Button>
          )}
        </div>
      </div>
      
      {!isUnlimited && (
        <Progress 
          percent={percentage}
          strokeColor={
            isNearLimit 
              ? { '0%': '#ff4d4f', '100%': '#ff7875' }
              : color
          }
          status={isNearLimit ? 'exception' : 'normal'}
          size="small"
        />
      )}
    </div>
  );
};

/**
 * Storage Usage Card Component
 */
export const StorageUsageCard = ({ 
  subscription, 
  onUpgrade,
  style = {} 
}) => {
  const { tier, usage, limits } = subscription;
  const isPro = tier === SUBSCRIPTION_TIERS.PRO;
  
  return (
    <Card 
      title={
        <Space>
          <Text>Storage Usage</Text>
          <SubscriptionBadge tier={tier} />
        </Space>
      }
      style={style}
      size="small"
    >
      <UsageProgress
        label="Storage"
        used={formatStorageSize(usage.storageUsed)}
        limit={formatStorageSize(limits.maxStorage)}
        icon={<CloudOutlined style={{ color: '#52c41a' }} />}
        color="#52c41a"
        showUpgrade={!isPro}
        onUpgrade={onUpgrade}
      />
      
      <UsageProgress
        label="Images"
        used={usage.imageCount}
        limit={limits.maxImages}
        icon={<PictureOutlined style={{ color: '#1890ff' }} />}
        color="#1890ff"
        showUpgrade={!isPro}
        onUpgrade={onUpgrade}
      />
      
      <UsageProgress
        label="Videos"
        used={usage.videoCount}
        limit={limits.maxVideos}
        icon={<VideoCameraOutlined style={{ color: '#722ed1' }} />}
        color="#722ed1"
        showUpgrade={!isPro}
        onUpgrade={onUpgrade}
      />
      
      <UsageProgress
        label="Websites"
        used={usage.sitesCount}
        limit={limits.maxSites}
        icon={<GlobalOutlined style={{ color: '#fa8c16' }} />}
        color="#fa8c16"
        showUpgrade={!isPro}
        onUpgrade={onUpgrade}
      />
      
      {!isPro && (
        <Button 
          type="primary" 
          icon={<CrownOutlined />}
          onClick={onUpgrade}
          style={{ 
            width: '100%', 
            marginTop: 16,
            background: 'linear-gradient(45deg, #ffd700, #ffed4a)',
            borderColor: '#ffd700',
            color: '#000',
            fontWeight: 'bold'
          }}
        >
          Upgrade to Pro
        </Button>
      )}
    </Card>
  );
};

/**
 * Upgrade Benefits Modal Content
 */
export const UpgradeBenefits = ({ onUpgrade, onCancel }) => {
  const benefits = getUpgradeBenefits();
  
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: 16 }}>
        <CrownOutlined style={{ color: '#ffd700' }} />
      </div>
      
      <Title level={3} style={{ color: '#ffd700', marginBottom: 8 }}>
        Upgrade to Pro
      </Title>
      
      <Text type="secondary" style={{ fontSize: '16px', display: 'block', marginBottom: 24 }}>
        Unlock unlimited potential for your websites
      </Text>
      
      <div style={{ textAlign: 'left', marginBottom: 24 }}>
        {benefits.map((benefit, index) => (
          <div key={index} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12, 
            marginBottom: 12,
            padding: '8px 16px',
            background: '#f9f9f9',
            borderRadius: '8px'
          }}>
            <div style={{ 
              background: '#52c41a', 
              color: 'white', 
              borderRadius: '50%', 
              width: 20, 
              height: 20, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              ✓
            </div>
            <Text strong>{benefit}</Text>
          </div>
        ))}
      </div>
      
      <div style={{ 
        background: 'linear-gradient(45deg, #ffd700, #ffed4a)',
        padding: '16px',
        borderRadius: '12px',
        marginBottom: 24,
        border: '2px solid #ffd700'
      }}>
        <Title level={2} style={{ color: '#000', margin: 0 }}>
          $9.99<Text style={{ fontSize: '16px', color: '#666' }}>/month</Text>
        </Title>
        <Text style={{ color: '#000' }}>Everything you need to create amazing websites</Text>
      </div>
      
      <Space style={{ width: '100%' }}>
        <Button size="large" onClick={onCancel} style={{ flex: 1 }}>
          Maybe Later
        </Button>
        <Button 
          type="primary" 
          size="large" 
          icon={<CrownOutlined />}
          onClick={onUpgrade}
          style={{ 
            flex: 2,
            background: 'linear-gradient(45deg, #ffd700, #ffed4a)',
            borderColor: '#ffd700',
            color: '#000',
            fontWeight: 'bold',
            fontSize: '16px',
            height: '48px'
          }}
        >
          Upgrade Now
        </Button>
      </Space>
    </div>
  );
};

/**
 * Limitation Warning Component
 */
export const LimitationWarning = ({ 
  reason, 
  upgradeRequired, 
  onUpgrade, 
  type = 'warning' 
}) => {
  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: '8px',
      background: type === 'error' ? '#fff2f0' : '#fffbe6',
      border: `1px solid ${type === 'error' ? '#ffccc7' : '#ffe58f'}`,
      marginBottom: 16
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <Text style={{ color: type === 'error' ? '#ff4d4f' : '#d48806' }}>
          {reason}
        </Text>
        {upgradeRequired && (
          <Button 
            type="primary" 
            size="small"
            icon={<CrownOutlined />}
            onClick={onUpgrade}
            style={{
              background: 'linear-gradient(45deg, #ffd700, #ffed4a)',
              borderColor: '#ffd700',
              color: '#000'
            }}
          >
            Upgrade
          </Button>
        )}
      </div>
    </div>
  );
};

export default {
  SubscriptionBadge,
  UsageProgress,
  StorageUsageCard,
  UpgradeBenefits,
  LimitationWarning
};
