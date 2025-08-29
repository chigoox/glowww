// Template registry (Phase 1)
// Central catalog of email templates with metadata.
// Actual React components will be added in later steps; for now placeholders.

import { AccountVerificationEmail } from './templates/platform/AccountVerificationEmail.jsx';
import { PasswordResetEmail } from './templates/platform/PasswordResetEmail.jsx';
import { SiteUserVerificationEmail } from './templates/site/SiteUserVerificationEmail.jsx';
import { SiteUserPasswordResetEmail } from './templates/site/SiteUserPasswordResetEmail.jsx';
import { OrderConfirmationEmail } from './templates/site/OrderConfirmationEmail.jsx';
import { OrderShippedEmail } from './templates/site/OrderShippedEmail.jsx';
import { OrderDeliveredEmail } from './templates/site/OrderDeliveredEmail.jsx';
import { SubscriptionStartedEmail } from './templates/platform/SubscriptionStartedEmail.jsx';
import { SubscriptionRenewalEmail } from './templates/platform/SubscriptionRenewalEmail.jsx';
import { SubscriptionCanceledEmail } from './templates/platform/SubscriptionCanceledEmail.jsx';
import { InvoiceReceiptEmail } from './templates/platform/InvoiceReceiptEmail.jsx';
import { PaymentFailedEmail } from './templates/platform/PaymentFailedEmail.jsx';

// Placeholder component until real templates are created.
function PlaceholderEmail({ heading = 'Email Placeholder', body = 'Template pending implementation.' }) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 14, padding: 24 }}>
      <h1 style={{ fontSize: 20, margin: '0 0 16px' }}>{heading}</h1>
      <p style={{ margin: 0 }}>{body}</p>
    </div>
  );
}

// Registry object: key -> definition
// Definition fields:
//  key (string)
//  component (React component)
//  subject: (data, branding) => string
//  audience: 'platform-user' | 'creator' | 'site-user'
//  category: 'transactional' | 'marketing'
//  canUnsubscribe?: boolean
//  requiredData?: string[]
//  description?: string

const registry = new Map();

function add(def) {
  if (!def || !def.key) throw new Error('registry.add: key required');
  if (registry.has(def.key)) {
    // Overwrite allowed during development
    console.warn('Template key already exists, overwriting:', def.key);
  }
  registry.set(def.key, def);
}

// --- Platform Templates (initial placeholders) ---
add({
  key: 'account.verification',
  component: AccountVerificationEmail,
  subject: (d, b) => `Verify your ${b.brandName} account`,
  audience: 'platform-user',
  category: 'transactional',
  requiredData: ['verificationUrl'],
  description: 'User email verification link.'
});

add({
  key: 'password.reset',
  component: PasswordResetEmail,
  subject: (d, b) => `Reset your ${b.brandName} password`,
  audience: 'platform-user',
  category: 'transactional',
  requiredData: ['resetUrl'],
  description: 'Password reset link for platform account.'
});

add({
  key: 'invoice.receipt',
  component: InvoiceReceiptEmail,
  subject: (d, b) => `Your ${b.brandName} receipt${d.invoiceNumber ? ' #' + d.invoiceNumber : ''}`,
  audience: 'creator',
  category: 'transactional',
  requiredData: ['invoiceNumber', 'total'],
  description: 'Billing receipt notification.'
});

add({
  key: 'payment.failed',
  component: PaymentFailedEmail,
  subject: (d, b) => `Payment failed - action required`,
  audience: 'creator',
  category: 'transactional',
  requiredData: ['billingPortalUrl'],
  description: 'Payment failure notice with update link.'
});

// --- Site Templates (initial placeholders) ---
add({
  key: 'site.user.verification',
  component: SiteUserVerificationEmail,
  subject: (d, b) => `Verify your ${b.brandName} email`,
  audience: 'site-user',
  category: 'transactional',
  requiredData: ['verificationUrl'],
  description: 'Site user email verification.'
});

add({
  key: 'site.user.password.reset',
  component: SiteUserPasswordResetEmail,
  subject: (d, b) => `Reset your ${b.brandName} password`,
  audience: 'site-user',
  category: 'transactional',
  requiredData: ['resetUrl'],
  description: 'Password reset for site user.'
});

add({
  key: 'order.confirmation',
  component: OrderConfirmationEmail,
  subject: (d, b) => `Your order ${d.orderNumber || ''} is confirmed`,
  audience: 'site-user',
  category: 'transactional',
  requiredData: ['orderNumber', 'items', 'total'],
  description: 'Order confirmation email.'
});
add({
  key: 'order.shipped',
  component: OrderShippedEmail,
  subject: (d) => `Your order ${d.order?.orderNumber || ''} has shipped`,
  audience: 'site-user',
  category: 'transactional',
  requiredData: ['order'],
  description: 'Order shipped notification.'
});
add({
  key: 'order.delivered',
  component: OrderDeliveredEmail,
  subject: (d) => `Order ${d.order?.orderNumber || ''} delivered`,
  audience: 'site-user',
  category: 'transactional',
  requiredData: ['order'],
  description: 'Order delivered notification.'
});
add({
  key: 'subscription.started',
  component: SubscriptionStartedEmail,
  subject: (d) => `Subscription started: ${d.plan?.name}`,
  audience: 'platform-user',
  category: 'transactional',
  requiredData: ['plan'],
  description: 'Subscription started notice.'
});
add({
  key: 'subscription.renewal',
  component: SubscriptionRenewalEmail,
  subject: (d) => `Subscription renewed: ${d.plan?.name}`,
  audience: 'platform-user',
  category: 'transactional',
  requiredData: ['plan'],
  description: 'Subscription renewed notice.'
});
add({
  key: 'subscription.canceled',
  component: SubscriptionCanceledEmail,
  subject: (d) => `Subscription canceled: ${d.plan?.name}`,
  audience: 'platform-user',
  category: 'transactional',
  requiredData: ['plan'],
  description: 'Subscription canceled notice.'
});

export function listTemplates() {
  return Array.from(registry.values()).map(v => ({
    key: v.key,
    audience: v.audience,
    category: v.category,
    description: v.description
  }));
}

export function getTemplateDefinition(key) {
  return registry.get(key) || null;
}

export function assertTemplateData(def, data) {
  if (!def.requiredData) return;
  const missing = def.requiredData.filter(k => data[k] === undefined);
  if (missing.length) {
    throw new Error(`Template ${def.key} missing required data fields: ${missing.join(', ')}`);
  }
}

export function templateAllowsUnsub(def) {
  return def.canUnsubscribe || def.category === 'marketing';
}

export default {
  get: getTemplateDefinition,
  list: listTemplates
};
