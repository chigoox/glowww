import { headers } from 'next/headers';
import { fetchSiteByHost, isIndexable, buildHierarchicalPath, filterIndexablePages } from '../lib/seo';
import { adminDb } from '../lib/firebaseAdmin';

export const revalidate = 300;

async function fetchSitePages(userId, siteId) {
  try {
    const pagesSnap = await adminDb
      .collection('users').doc(userId)
      .collection('sites').doc(siteId)
      .collection('pages')
      .where('isDeleted', '!=', true)
      .get();
    return pagesSnap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
  } catch {
    return [];
  }
}

export default async function sitemap() {
  const host = headers().get('host');
  let site = null;
  try { site = await fetchSiteByHost(host); } catch {}
  if (!isIndexable(site)) return [];
  const base = host ? `https://${host}` : '';
  const pages = await fetchSitePages(site.userId, site.id);
  const pagesByKey = {};
  pages.forEach(p => { if (p.key) pagesByKey[p.key] = p; });
  const nowIso = new Date().toISOString();
  const entries = [];
  entries.push({ url: base + '/', lastModified: site.updatedAt?.toDate?.()?.toISOString?.() || nowIso, changeFrequency: 'weekly', priority: 1.0 });
  const indexablePages = filterIndexablePages(pages);
  for (const p of indexablePages) {
    if (p.isHome) continue;
    const path = buildHierarchicalPath(p, pagesByKey);
    if (!path) continue;
    const lm = p.updatedAt?.toDate?.()?.toISOString?.() || p.createdAt?.toDate?.()?.toISOString?.() || nowIso;
    entries.push({
      url: base + '/' + path,
      lastModified: lm,
      changeFrequency: 'weekly',
      priority: path.split('/').length === 1 ? 0.8 : 0.6
    });
  }
  return entries;
}
