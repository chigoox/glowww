export function Footer({ branding }) {
  const supportEmail = branding?.supportEmail;
  return (
    <div style={{ marginTop: 32, fontSize: 12, color: '#555', lineHeight: '18px' }}>
      {supportEmail && (
        <div>Need help? <a href={`mailto:${supportEmail}`} style={{ color: '#555' }}>{supportEmail}</a></div>
      )}
    </div>
  );
}
