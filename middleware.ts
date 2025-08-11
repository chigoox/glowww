import { NextRequest, NextResponse } from 'next/server';

const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN || 'localhost:3000';

export async function middleware(req: NextRequest) {
  const host = req.headers.get('host')?.toLowerCase();
  if (!host || host.endsWith(PLATFORM_DOMAIN)) return NextResponse.next();

  try {
    const proto = req.nextUrl.protocol || 'http:';
    const base = `${proto}//${req.nextUrl.host}`;
    const resp = await fetch(`${base}/api/domain-lookup?domain=${encodeURIComponent(host)}`, { cache: 'no-store' });
    if (resp.ok) {
      const data = await resp.json();
      if (data?.ok && data?.mapping?.username && data?.mapping?.site) {
        const url = req.nextUrl.clone();
        url.pathname = `/u/${data.mapping.username}/${data.mapping.site}${req.nextUrl.pathname}`;
        return NextResponse.rewrite(url);
      }
    }
  } catch {}
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|static|public|favicon.ico).*)'],
};
