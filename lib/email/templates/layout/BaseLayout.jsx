// Generic base layout for emails (Phase 1)
// Keeps to table-based layout for broad client compatibility.

export function BaseLayout({ branding, children }) {
  const primary = branding?.primaryColor || '#111111';
  const logoUrl = branding?.logoUrl;
  const brandName = branding?.brandName || 'Brand';
  const siteUrl = branding?.siteUrl || '#';

  return (
    <html>
      <body style={{ margin: 0, padding: 0, background: '#f5f5f7', fontFamily: 'Arial, sans-serif', color: '#222' }}>
        <table width="100%" role="presentation" cellPadding={0} cellSpacing={0} style={{ background: '#f5f5f7', padding: '24px 0' }}>
          <tbody>
            <tr>
              <td align="center">
                <table width="600" role="presentation" cellPadding={0} cellSpacing={0} style={{ background: '#ffffff', borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e5e9' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '24px 24px 0 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {logoUrl ? (
                            <a href={siteUrl} style={{ textDecoration: 'none' }}>
                              <img src={logoUrl} alt={brandName} width={48} height={48} style={{ display: 'block', borderRadius: 6 }} />
                            </a>
                          ) : (
                            <a href={siteUrl} style={{ fontSize: 20, fontWeight: 'bold', color: primary, textDecoration: 'none' }}>{brandName}</a>
                          )}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 24px 24px 24px' }}>
                        {children}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <table width="600" role="presentation" cellPadding={0} cellSpacing={0} style={{ marginTop: 16 }}>
                  <tbody>
                    <tr>
                      <td style={{ fontSize: 12, lineHeight: '18px', color: '#666', textAlign: 'center', padding: '0 8px' }}>
                        <div>{branding?.legalAddress || ''}</div>
                        {branding?.scope === 'site' && branding?.poweredBy && (
                          <div style={{ marginTop: 4 }}>Powered by {branding.poweredBy}</div>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}
