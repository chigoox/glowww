import * as React from 'react';
import { SiteLayout } from '../layout/SiteLayout.jsx';

export function OrderDeliveredEmail({ branding, order }) {
  return (
    <SiteLayout branding={branding} title={`Order ${order.orderNumber} delivered`}>
      <p style={{ fontSize:14 }}>Your order <strong>{order.orderNumber}</strong> was delivered.</p>
      <p style={{ fontSize:14 }}>We hope everything arrived in great shape. If there is any issue, simply reply to this email.</p>
      <p style={{ fontSize:14 }}>Thank you for choosing {branding.brandName}.</p>
    </SiteLayout>
  );
}
export default OrderDeliveredEmail;
