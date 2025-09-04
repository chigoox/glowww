import React from 'react';
import { fetchSiteByUsernameAndParam, buildSiteMetadata } from '../../../../lib/seo';
import { generateSiteTrackingCode, shouldEnableAnalytics } from '../../../../lib/userAnalytics';

// Revalidate SEO metadata periodically to reduce Firestore load
export const revalidate = 300; // 5 minutes

export async function generateMetadata({ params }) {
  // `params` can be an unresolved object in some Next internals — await it before using properties
  const { username, site } = (await params) || {};
  const siteData = await fetchSiteByUsernameAndParam(username, site);
  return buildSiteMetadata(siteData);
}

export default async function SiteLayout({ children, params }) {
  // Await params before using — Next may provide a proxy that requires awaiting
  const { username, site } = (await params) || {};

  // Fetch site again for structured data (kept separate to avoid coupling buildSiteMetadata output with large fields)
  let siteData = null;
  let trackingCode = null;

  try {
    if (username && site) {
      siteData = await fetchSiteByUsernameAndParam(username, site);

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
  
  // Do not render <html>/<head>/<body> in nested route layouts — the root `app/layout.js`
  // owns those elements. Return a fragment instead. If you need to inject into the
  // document head, use a dedicated `head.js` in this route. For now we render the
  // tracking and structured-data scripts inside the page (body) which avoids the
  // "multiple html/head/body" runtime errors during development.
  return (
    <>
      {/* Insert tracking script (renders into body to avoid duplicate <head> in nested layouts)
          NOTE: `trackingCode` may already contain <script> tags. Wrapping it inside a <script>
          element would create nested <script> tags and cause a parser error (Unexpected token '<').
          Render it into a harmless container via dangerouslySetInnerHTML so the markup is emitted
          as-is without creating an outer <script> wrapper. If script execution is required, we
          should inject the scripts client-side using DOM APIs instead. */}
      {trackingCode && (
        <div
          key="site-tracking"
          dangerouslySetInnerHTML={{ __html: trackingCode }}
        />
      )}

      {children}

      {/* Structured data JSON-LD (in body is acceptable) */}
      {structuredJson && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredJson }}
        />
      )}
    </>
  );
}
