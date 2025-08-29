import { PlatformLayout } from '../layout/PlatformLayout';
import { Button } from '../layout/Button';
import { Footer } from '../layout/Footer';

export function PasswordResetEmail({ branding, data }) {
  const { resetUrl, userName } = data;
  return (
    <PlatformLayout branding={branding}>
      <h1 style={{ fontSize: 20, margin: '0 0 16px' }}>Reset your password</h1>
      {userName && <p style={{ margin: '0 0 12px' }}>Hi {userName},</p>}
      <p style={{ margin: '0 0 16px', lineHeight: '20px' }}>
        We received a request to reset your {branding.brandName} password. If you made this
        request, click the button below. This link will expire soon.
      </p>
      <div style={{ margin: '0 0 28px' }}>
        <Button href={resetUrl} color={branding.primaryColor}>Reset Password</Button>
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 12, color: '#555' }}>
        If you did not request a password reset, you can safely ignore this email.
      </p>
      <p style={{ margin: '0 0 16px', fontSize: 12, color: '#555' }}>
        Direct link:<br />
        <span style={{ wordBreak: 'break-all' }}>{resetUrl}</span>
      </p>
      <Footer branding={branding} />
    </PlatformLayout>
  );
}
