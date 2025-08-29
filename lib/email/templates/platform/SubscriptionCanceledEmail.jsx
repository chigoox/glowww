import * as React from 'react';
import { PlatformLayout } from '../layout/PlatformLayout.jsx';

export function SubscriptionCanceledEmail({ branding, plan, canceledAt, endsAt }) {
  return (
    <PlatformLayout branding={branding} title={`Subscription canceled: ${plan.name}`}>
      <p style={{ fontSize:14 }}>Your subscription to <strong>{plan.name}</strong> has been canceled.</p>
      {endsAt && <p style={{ fontSize:14 }}>It will remain active until {new Date(endsAt).toLocaleDateString()}.</p>}
      {canceledAt && <p style={{ fontSize:14 }}>Requested on {new Date(canceledAt).toLocaleDateString()}.</p>}
      <p style={{ fontSize:14 }}>We're sorry to see you go. You can reactivate anytime from your account.</p>
    </PlatformLayout>
  );
}
export default SubscriptionCanceledEmail;
