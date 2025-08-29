import React from 'react';
import { fetchSiteByUsernameAndParam, buildSiteMetadata } from '../../../../lib/seo';
import { generateSiteTrackingCode, shouldEnableAnalytics } from '../../../../lib/userAnalytics';

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
  let trackingCode = null;
  
  try {
    if (params?.username && params?.site) {
      siteData = await fetchSiteByUsernameAndParam(params.username, params.site);
      
      // Generate analytics tracking code automatically
      if (siteData && shouldEnableAnalytics(siteData)) {
        trackingCode = generateSiteTrackingCode({
          siteId: siteData.id,
          userId: siteData.userId,
          siteName: siteData.name || 'Untitled Site'
        });
      }
    }
  } catch (error) {
    console.error('Error loading site data or generating tracking code:', error);
  }
  
  const structuredJson = siteData?.seoStructuredData || null;
  
  return (
    <html lang="en">
      <head>
        {/* Automatically inject Google Analytics tracking */}
        {trackingCode && (
          <div dangerouslySetInnerHTML={{ __html: trackingCode }} />
        )}
      </head>
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
