import { headers } from 'next/headers';
import { fetchSiteByHost, isIndexable, buildPrimaryHost } from '../lib/seo';

export const revalidate = 300;

export default async function robots() {
  const host = headers().get('host');
  let site = null;
  try { site = await fetchSiteByHost(host); } catch {}
  const allow = isIndexable(site);
  const primary = host || buildPrimaryHost(site);
  const sitemapUrl = primary ? `https://${primary}/sitemap.xml` : undefined;
  return {
    rules: allow ? [{ userAgent: '*', allow: '/' }] : [{ userAgent: '*', disallow: '/' }],
    sitemap: sitemapUrl,
  };
}
