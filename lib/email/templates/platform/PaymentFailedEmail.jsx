import { PlatformLayout } from '../layout/PlatformLayout';
import { Button } from '../layout/Button';
import { Footer } from '../layout/Footer';

export function PaymentFailedEmail({ branding, data }) {
  const {
    billingPortalUrl,
    reason,
    last4,
    amountDue,
    currency = 'USD',
    attemptCount
  } = data;

  return (
    <PlatformLayout branding={branding}>
      <h1 style={{ fontSize: 20, margin: '0 0 16px' }}>Payment failed</h1>
      <p style={{ margin: '0 0 16px', lineHeight: '20px' }}>
        We tried to process your recent payment for {branding.brandName} but it did not succeed.
      </p>
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ margin: '0 0 20px' }}>
        <tbody>
          {amountDue != null && (
            <tr>
              <td style={{ fontSize: 13, padding: '4px 0' }}>Amount due:</td>
              <td style={{ fontSize: 13, padding: '4px 0', textAlign: 'right' }}>{formatMoney(amountDue, currency)}</td>
            </tr>
          )}
          {last4 && (
            <tr>
              <td style={{ fontSize: 13, padding: '4px 0' }}>Card ending:</td>
              <td style={{ fontSize: 13, padding: '4px 0', textAlign: 'right' }}>•••• {last4}</td>
            </tr>
          )}
          {attemptCount != null && (
            <tr>
              <td style={{ fontSize: 13, padding: '4px 0' }}>Attempts:</td>
              <td style={{ fontSize: 13, padding: '4px 0', textAlign: 'right' }}>{attemptCount}</td>
            </tr>
          )}
          {reason && (
            <tr>
              <td style={{ fontSize: 13, padding: '4px 0' }}>Reason:</td>
              <td style={{ fontSize: 13, padding: '4px 0', textAlign: 'right' }}>{reason}</td>
            </tr>
          )}
        </tbody>
      </table>

      {billingPortalUrl && (
        <div style={{ margin: '0 0 28px' }}>
          <Button href={billingPortalUrl} color={branding.primaryColor}>Update Payment Method</Button>
        </div>
      )}

      <p style={{ margin: '0 0 16px', fontSize: 12, color: '#555' }}>
        If you recently updated your payment information, you can ignore this message. Otherwise, please resolve the issue to avoid interruption.
      </p>

      <Footer branding={branding} />
    </PlatformLayout>
  );
}

function formatMoney(value, currency) {
  if (value == null) return '';
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value / 100); } catch (_) {
    return (value / 100).toFixed(2) + ' ' + currency;
  }
}
