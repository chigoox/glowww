import { fetchSiteAndPages, buildPageMetadata, buildHierarchicalPath } from '../../../../../lib/seo';

export const revalidate = 300; // 5 minutes

async function resolveSiteAndPage(params) {
  const { username, site: siteParam, slug } = params || {};
  const { site, pages } = await fetchSiteAndPages(username, siteParam);
  if (!site) return { site: null, page: null, slugPath: '' };
  const slugArr = Array.isArray(slug) ? slug : slug ? [slug] : [];
  const slugPath = slugArr.join('/');
  if (!slugPath) {
    const home = pages.find(p => p.isHome) || null;
    return { site, page: home, slugPath };
  }
  // Direct map lookup
  const map = {};
  pages.forEach(p => {
    if (p.key) map[p.key] = p;
    if (p.slug) map[p.slug] = p;
    if (p.id) map[p.id] = p;
    if (p.path) map[String(p.path).replace(/^\//, '')] = p;
  });
  let target = map[slugPath] || null;
  if (!target) {
    // Hierarchical path reconstruction
    const byKey = {}; pages.forEach(p => { if (p.key) byKey[p.key] = p; });
    target = pages.find(p => buildHierarchicalPath(p, byKey) === slugPath) || null;
  }
  return { site, page: target, slugPath };
}

export async function generateMetadata({ params }) {
  // `params` may be a proxy that must be awaited in Next.js internals.
  const awaitedParams = (await params) || {};
  const { site, page, slugPath } = await resolveSiteAndPage(awaitedParams);
  return buildPageMetadata(site, page, slugPath);
}

export default function PageLayout({ children }) {
  return <>{children}</>;
}
