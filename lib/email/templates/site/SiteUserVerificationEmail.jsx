import { SiteLayout } from '../layout/SiteLayout';
import { Button } from '../layout/Button';
import { Footer } from '../layout/Footer';

export function SiteUserVerificationEmail({ branding, data }) {
  const { verificationUrl, userName } = data;
  return (
    <SiteLayout branding={branding}>
      <h1 style={{ fontSize: 20, margin: '0 0 16px' }}>Confirm your email</h1>
      {userName && <p style={{ margin: '0 0 12px' }}>Hi {userName},</p>}
      <p style={{ margin: '0 0 16px', lineHeight: '20px' }}>
        Please verify your address so you can finish creating your account at {branding.brandName}.
      </p>
      <div style={{ margin: '0 0 28px' }}>
        <Button href={verificationUrl} color={branding.primaryColor}>Confirm Email</Button>
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 12, color: '#555' }}>
        If the button doesn't work, copy this link:<br />
        <span style={{ wordBreak: 'break-all' }}>{verificationUrl}</span>
      </p>
      <Footer branding={branding} />
    </SiteLayout>
  );
}
