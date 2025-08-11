import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
	try {
		const body = await request.json().catch(() => ({}));
		const {
			siteId,
			userId,
			username,
			siteName,
			width = 1200,
			height = 630,
		} = body || {};

		if (!username || !siteName) {
			return NextResponse.json(
				{ success: false, error: 'Missing required fields: username and siteName' },
				{ status: 400 }
			);
		}

		// Build the public URL to capture (robust origin detection)
		const headerOrigin = request.headers.get('origin');
		const host = request.headers.get('host');
		const proto = request.headers.get('x-forwarded-proto') || 'http';
		const resolvedOrigin = process.env.PLATFORM_DOMAIN || headerOrigin || (host ? `${proto}://${host}` : 'http://localhost:3000');
		const safeUsername = encodeURIComponent(username);
		const safeSite = encodeURIComponent(siteName);
		const targetUrl = `${resolvedOrigin}/u/${safeUsername}/${safeSite}`;

		// Launch Puppeteer and capture screenshot
		const browser = await puppeteer.launch({
			headless: 'new',
			args: ['--no-sandbox', '--disable-setuid-sandbox'],
		});

		try {
					const page = await browser.newPage();
					await page.setViewport({ width: Number(width) || 1200, height: Number(height) || 630, deviceScaleFactor: 1 });
					page.setDefaultNavigationTimeout(45000);
					page.setDefaultTimeout(20000);

					// First attempt: faster readiness for dev/HMR environments
					try {
						await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
					} catch (navErr) {
						// Fallback attempt with a lighter condition
						await page.goto(targetUrl, { waitUntil: 'load', timeout: 45000 }).catch(() => {});
					}
					await page.waitForSelector('body', { timeout: 10000 }).catch(() => {});
					// Small delay to allow client-side content to settle
					await new Promise((r) => setTimeout(r, 1200));

			const base64 = await page.screenshot({ type: 'png', encoding: 'base64' });
			const dataUrl = `data:image/png;base64,${base64}`;

			return NextResponse.json({ success: true, thumbnail: dataUrl, url: targetUrl });
		} finally {
			await browser.close().catch(() => {});
		}
	} catch (error) {
		console.error('thumbnail route error:', error);
		return NextResponse.json(
			{ success: false, error: error?.message || 'Failed to generate thumbnail' },
			{ status: 500 }
		);
	}
}

export function GET() {
	return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

export function PUT() {
	return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

export function DELETE() {
	return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

