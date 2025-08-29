import * as React from 'react';
import { SiteLayout } from '../layout/SiteLayout.jsx';

export function OrderShippedEmail({ branding, order, trackingUrl }) {
  return (
    <SiteLayout branding={branding} title={`Your order ${order.orderNumber} has shipped!`}>
      <p style={{ fontSize:14, lineHeight:'20px' }}>Good news! Your order <strong>{order.orderNumber}</strong> is on the way.</p>
      {trackingUrl && (
        <p style={{ fontSize:14 }}>
          Track it here: <a href={trackingUrl}>{trackingUrl}</a>
        </p>
      )}
      <p style={{ fontSize:14 }}>Items:</p>
      <ul style={{ paddingLeft:18 }}>
        {order.items?.map(it => (
          <li key={it.id} style={{ fontSize:14 }}>
            {it.name} &times; {it.quantity}
          </li>
        ))}
      </ul>
      <p style={{ fontSize:14 }}>We'll let you know once it's delivered. Thanks for shopping with {branding.brandName}.</p>
    </SiteLayout>
  );
}
export default OrderShippedEmail;
