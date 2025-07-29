import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Handle /Editor route - redirect to dashboard if no site parameter

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/Editor/:path*',
    '/u/:username/:siteName'
  ]
};
