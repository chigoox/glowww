import * as React from 'react';
import { PlatformLayout } from '../layout/PlatformLayout.jsx';

export function SubscriptionStartedEmail({ branding, plan, currentPeriodEnd }) {
  return (
    <PlatformLayout branding={branding} title={`Subscription started: ${plan.name}`}>
      <p style={{ fontSize:14 }}>Your subscription to the <strong>{plan.name}</strong> plan is now active.</p>
      {currentPeriodEnd && <p style={{ fontSize:14 }}>Current period ends on {new Date(currentPeriodEnd).toLocaleDateString()}.</p>}
      <p style={{ fontSize:14 }}>You can manage your subscription anytime in your dashboard.</p>
    </PlatformLayout>
  );
}
export default SubscriptionStartedEmail;
