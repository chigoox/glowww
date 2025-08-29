import { PlatformLayout } from '../layout/PlatformLayout';
import { Button } from '../layout/Button';
import { Footer } from '../layout/Footer';

export function AccountVerificationEmail({ branding, data }) {
  const { verificationUrl, userName } = data;
  return (
    <PlatformLayout branding={branding}>
      <h1 style={{ fontSize: 20, margin: '0 0 16px' }}>Verify your email</h1>
      {userName && (
        <p style={{ margin: '0 0 12px' }}>Hi {userName},</p>
      )}
      <p style={{ margin: '0 0 16px', lineHeight: '20px' }}>
        Please confirm this email address to activate your {branding.brandName} account.
      </p>
      <div style={{ margin: '0 0 28px' }}>
        <Button href={verificationUrl} color={branding.primaryColor}>Verify Email</Button>
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 12, color: '#555' }}>
        If the button doesn't work, copy and paste this link into your browser:<br />
        <span style={{ wordBreak: 'break-all' }}>{verificationUrl}</span>
      </p>
      <Footer branding={branding} />
    </PlatformLayout>
  );
}
