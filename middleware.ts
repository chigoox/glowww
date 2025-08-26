import { NextRequest, NextResponse } from 'next/server';

// PLATFORM_DOMAIN should be set to your canonical platform host (example: "glowbuildr.com" or "localhost:3000")
const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN || 'localhost:3000';
// Normalize a host without port for comparisons (e.g. 'localhost' from 'localhost:3000')
const PLATFORM_HOST_NO_PORT = PLATFORM_DOMAIN.split(':')[0];
// PLATFORM_ORIGIN selection is intentionally robust:
// 1) use explicit PLATFORM_ORIGIN env if provided
// 2) fall back to Vercel's VERCEL_URL when running on Vercel
// 3) strip subdomains from the incoming host and use that as a fallback origin
// This avoids using https://localhost in production when PLATFORM_ORIGIN is not set.
const EXPLICIT_PLATFORM_ORIGIN = process.env.PLATFORM_ORIGIN || '';
// Attempt to use Vercel's provided URL when available (server-side runtime)
const VERCEL_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';

function computePlatformOrigin(reqHost) {
  if (EXPLICIT_PLATFORM_ORIGIN) return EXPLICIT_PLATFORM_ORIGIN;
  if (VERCEL_URL) return VERCEL_URL;
  // Fallback: use the top-level domain of the incoming Host header (strip first label)
  try {
    const parts = (reqHost || '').split(':')[0].split('.');
    if (parts.length <= 1) return `https://${reqHost}`;
    const root = parts.slice(-2).join('.');
    return `https://${root}`;
  } catch (e) {
    return `https://${PLATFORM_HOST_NO_PORT}`;
  }
}

export async function middleware(req: NextRequest) {
  const host = req.headers.get('host')?.toLowerCase();
  if (!host) return NextResponse.next();

  // Skip if the request is for the canonical platform host (exact match).
  // IMPORTANT: do not `endsWith` here — that would also match subdomains like "sitename.platform.com"
  const hostNoPort = host.split(':')[0];
  if (hostNoPort === PLATFORM_HOST_NO_PORT) return NextResponse.next();

  try {
  // Use a computed platform origin for internal API calls. Fetching the incoming host
  // can result in Vercel returning DEPLOYMENT_NOT_FOUND if that host isn't aliased to this project yet.
  const base = computePlatformOrigin(host);
  // lightweight debug: write origin used to server console for diagnosis
  try { console.debug('[middleware] platform origin:', base, 'incoming host:', host); } catch (e) {}

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
