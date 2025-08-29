import { SiteLayout } from '../layout/SiteLayout';
import { Button } from '../layout/Button';
import { Footer } from '../layout/Footer';

export function OrderConfirmationEmail({ branding, data }) {
  const { orderNumber, items = [], total, orderUrl, userName } = data;
  const currency = data.currency || 'USD';

  return (
    <SiteLayout branding={branding}>
      <h1 style={{ fontSize: 20, margin: '0 0 16px' }}>Order confirmed</h1>
      {userName && <p style={{ margin: '0 0 12px' }}>Hi {userName},</p>}
      <p style={{ margin: '0 0 16px', lineHeight: '20px' }}>
        Thank you for your purchase from {branding.brandName}. Your order {orderNumber && (<strong>#{orderNumber}</strong>)} has been received.
      </p>
      {items.length > 0 && (
        <table width="100%" role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: '0 0 24px', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th align="left" style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid #eee' }}>Item</th>
              <th align="center" style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid #eee' }}>Qty</th>
              <th align="right" style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid #eee' }}>Price</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td style={{ fontSize: 13, padding: '6px 0', borderBottom: '1px solid #f2f2f2' }}>{it.name}</td>
                <td align="center" style={{ fontSize: 13, padding: '6px 0', borderBottom: '1px solid #f2f2f2' }}>{it.quantity || 1}</td>
                <td align="right" style={{ fontSize: 13, padding: '6px 0', borderBottom: '1px solid #f2f2f2' }}>{formatMoney(it.price, currency)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={2} style={{ fontSize: 13, padding: '8px 0', fontWeight: 600 }}>Total</td>
              <td align="right" style={{ fontSize: 13, padding: '8px 0', fontWeight: 600 }}>{formatMoney(total, currency)}</td>
            </tr>
          </tbody>
        </table>
      )}
      {orderUrl && (
        <div style={{ margin: '0 0 28px' }}>
          <Button href={orderUrl} color={branding.primaryColor}>View Order</Button>
        </div>
      )}
      <p style={{ margin: '0 0 16px', fontSize: 12, color: '#555' }}>
        A separate email may be sent when your items ship.
      </p>
      <Footer branding={branding} />
    </SiteLayout>
  );
}

function formatMoney(value, currency) {
  if (value == null) return '';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value / 100);
  } catch (_) {
    return (value / 100).toFixed(2) + ' ' + currency;
  }
}
