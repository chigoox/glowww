import { NextRequest, NextResponse } from 'next/server';

const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN || 'localhost:3000';

export async function middleware(req: NextRequest) {
  const host = req.headers.get('host')?.toLowerCase();
  if (!host) return NextResponse.next();

  // Skip if request is already for our platform domain or internal paths
  if (host.endsWith(PLATFORM_DOMAIN)) return NextResponse.next();

  try {
    const proto = req.nextUrl.protocol || 'http:';
    const base = `${proto}//${req.nextUrl.host}`;

    // First, check for explicit custom domain mapping (top-level domains managed via /api/domain-lookup)
    try {
      const resp = await fetch(`${base}/api/domain-lookup?domain=${encodeURIComponent(host)}`, { cache: 'no-store' });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.ok && data?.mapping?.username && data?.mapping?.site) {
          const url = req.nextUrl.clone();
          url.pathname = `/u/${data.mapping.username}/${data.mapping.site}${req.nextUrl.pathname}`;
          return NextResponse.rewrite(url);
        }
      }
    } catch (e) {
      // continue to subdomain lookup path on any error
    }

    // If the host is a subdomain of the platform (e.g., sitename.gloweditor.com), try subdomain lookup
    // Normalize and split host
    const parts = host.split('.');
    if (parts.length >= 3) {
      const subdomain = parts[0];
      // Skip common reserved subdomains
      const reserved = new Set(['www', 'api', 'admin', 'mail', 'ftp', 'dev']);
      if (!reserved.has(subdomain)) {
        try {
          const resp2 = await fetch(`${base}/api/subdomain-lookup?subdomain=${encodeURIComponent(subdomain)}`, { cache: 'no-store' });
          if (resp2.ok) {
            const d = await resp2.json();
            if (d?.ok && d?.mapping?.username && d?.mapping?.site) {
              const url = req.nextUrl.clone();
              url.pathname = `/u/${d.mapping.username}/${d.mapping.site}${req.nextUrl.pathname}`;
              const res = NextResponse.rewrite(url);
              // Also expose mapping headers for downstream systems if desired
              res.headers.set('x-glow-site-id', d.mapping.siteId || '');
              res.headers.set('x-glow-user-id', d.mapping.userId || '');
              return res;
            }
          }
        } catch (e) {
          // ignore and let request continue
        }
      }
    }
  } catch (e) {
    // swallow errors to avoid taking down the site; allow request to continue
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|static|public|favicon.ico).*)'],
};
