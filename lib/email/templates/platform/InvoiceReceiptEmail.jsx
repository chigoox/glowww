import { PlatformLayout } from '../layout/PlatformLayout';
import { Footer } from '../layout/Footer';

export function InvoiceReceiptEmail({ branding, data }) {
  const {
    invoiceNumber,
    invoiceDate,
    dueDate,
    items = [],
    subtotal,
    tax,
    total,
    currency = 'USD',
    invoiceUrl,
    billingName,
    billingAddress,
    notes
  } = data;

  return (
    <PlatformLayout branding={branding}>
      <h1 style={{ fontSize: 20, margin: '0 0 12px' }}>Receipt</h1>
      <p style={{ margin: '0 0 16px', fontSize: 14 }}>Thank you for using {branding.brandName}. Below is your receipt.</p>

      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ margin: '0 0 20px' }}>
        <tbody>
          <tr>
            <td style={{ fontSize: 13, verticalAlign: 'top' }}>
              <strong>Invoice #:</strong> {invoiceNumber || '-'}<br />
              {invoiceDate && (<><strong>Date:</strong> {formatDate(invoiceDate)}<br /></>)}
              {dueDate && (<><strong>Due:</strong> {formatDate(dueDate)}<br /></>)}
            </td>
            <td style={{ fontSize: 13, verticalAlign: 'top' }}>
              {billingName && (<><strong>Billed To:</strong> {billingName}<br /></>)}
              {billingAddress && (<span style={{ whiteSpace: 'pre-line' }}>{billingAddress}</span>)}
            </td>
          </tr>
        </tbody>
      </table>

      {items.length > 0 && (
        <table width="100%" role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: '0 0 20px', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th align="left" style={{ fontSize: 12, padding: '6px 0', borderBottom: '1px solid #eee' }}>Description</th>
              <th align="right" style={{ fontSize: 12, padding: '6px 0', borderBottom: '1px solid #eee' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td style={{ fontSize: 13, padding: '8px 0', borderBottom: '1px solid #f2f2f2' }}>{it.description || it.name || 'Item'}</td>
                <td align="right" style={{ fontSize: 13, padding: '8px 0', borderBottom: '1px solid #f2f2f2' }}>{formatMoney(it.amount, currency)}</td>
              </tr>
            ))}
            {subtotal != null && (
              <tr>
                <td style={{ fontSize: 13, padding: '6px 0' }}>Subtotal</td>
                <td align="right" style={{ fontSize: 13, padding: '6px 0' }}>{formatMoney(subtotal, currency)}</td>
              </tr>
            )}
            {tax != null && (
              <tr>
                <td style={{ fontSize: 13, padding: '6px 0' }}>Tax</td>
                <td align="right" style={{ fontSize: 13, padding: '6px 0' }}>{formatMoney(tax, currency)}</td>
              </tr>
            )}
            {total != null && (
              <tr>
                <td style={{ fontSize: 13, padding: '8px 0', fontWeight: 600 }}>Total</td>
                <td align="right" style={{ fontSize: 13, padding: '8px 0', fontWeight: 600 }}>{formatMoney(total, currency)}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {invoiceUrl && (
        <p style={{ fontSize: 13, margin: '0 0 16px' }}>View invoice: <a href={invoiceUrl} style={{ color: branding.primaryColor }}>{invoiceUrl}</a></p>
      )}

      {notes && (
        <p style={{ fontSize: 12, margin: '0 0 16px', color: '#555', whiteSpace: 'pre-line' }}>{notes}</p>
      )}

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

function formatDate(dateLike) {
  try { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(dateLike)); } catch (_) { return dateLike; }
}
