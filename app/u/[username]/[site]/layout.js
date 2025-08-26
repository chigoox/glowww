import React from 'react';
import { fetchSiteByUsernameAndParam, buildSiteMetadata } from '../../../../lib/seo';

// Revalidate SEO metadata periodically to reduce Firestore load
export const revalidate = 300; // 5 minutes

export async function generateMetadata({ params }) {
  const { username, site } = params || {};
  const siteData = await fetchSiteByUsernameAndParam(username, site);
  return buildSiteMetadata(siteData);
}

export default async function SiteLayout({ children, params }) {
  // Fetch site again for structured data (kept separate to avoid coupling buildSiteMetadata output with large fields)
  let siteData = null;
  try {
    if (params?.username && params?.site) {
      siteData = await fetchSiteByUsernameAndParam(params.username, params.site);
    }
  } catch {
    // ignore
  }
  const structuredJson = siteData?.seoStructuredData || null;
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        {children}
        {structuredJson && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: structuredJson }}
          />
        )}
      </body>
    </html>
  );
}
