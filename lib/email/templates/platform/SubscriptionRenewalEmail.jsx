import * as React from 'react';
import { PlatformLayout } from '../layout/PlatformLayout.jsx';

export function SubscriptionRenewalEmail({ branding, plan, currentPeriodEnd }) {
  return (
    <PlatformLayout branding={branding} title={`Subscription renewed: ${plan.name}`}>
      <p style={{ fontSize:14 }}>Your subscription to <strong>{plan.name}</strong> has renewed successfully.</p>
      {currentPeriodEnd && <p style={{ fontSize:14 }}>Next billing date: {new Date(currentPeriodEnd).toLocaleDateString()}.</p>}
      <p style={{ fontSize:14 }}>Thanks for continuing with {branding.brandName}.</p>
    </PlatformLayout>
  );
}
export default SubscriptionRenewalEmail;
