import { SiteLayout } from '../layout/SiteLayout';
import { Button } from '../layout/Button';
import { Footer } from '../layout/Footer';

export function SiteUserPasswordResetEmail({ branding, data }) {
  const { resetUrl, userName } = data;
  return (
    <SiteLayout branding={branding}>
      <h1 style={{ fontSize: 20, margin: '0 0 16px' }}>Reset your password</h1>
      {userName && <p style={{ margin: '0 0 12px' }}>Hi {userName},</p>}
      <p style={{ margin: '0 0 16px', lineHeight: '20px' }}>
        We received a request to reset your password for {branding.brandName}. If you made this request,
        click the button below. The link expires soon.
      </p>
      <div style={{ margin: '0 0 28px' }}>
        <Button href={resetUrl} color={branding.primaryColor}>Reset Password</Button>
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 12, color: '#555' }}>
        If you didn't request this, you can ignore this message.
      </p>
      <p style={{ margin: '0 0 16px', fontSize: 12, color: '#555' }}>
        Direct link:<br />
        <span style={{ wordBreak: 'break-all' }}>{resetUrl}</span>
      </p>
      <Footer branding={branding} />
    </SiteLayout>
  );
}
