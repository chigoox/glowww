import { NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { adminDb, adminStorage } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs'; // required for puppeteer (not edge)
export const dynamic = 'force-dynamic';
// export const preferredRegion = ['iad1']; // optionally pin region for cold start consistency

// In-memory single-flight locks (per target URL)
const generationLocks = new Map(); // key -> { promise, ts }
// Simple LRU-ish cache (process memory) to avoid repeated work during same runtime
const memoryCache = new Map(); // key -> { dataUrl, createdAt }
let MEMORY_TTL_MS = 1000 * 60 * 10; // 10 minutes (overridden by ttlMinutes param if smaller)
const PROD = process.env.NODE_ENV === 'production';
const PUBLIC_BUCKET = process.env.THUMBNAIL_PUBLIC_BUCKET === '1';
const DEFAULT_FRESH_HOURS = Number(process.env.THUMBNAIL_FRESH_HOURS || 24); // default age threshold
// Basic in-memory metrics (reset on cold start)
const metrics = {
	requests: 0,
	memoryHits: 0,
	firestoreHits: 0,
	generated: 0,
	placeholders: 0,
	errors: 0,
};
// Helper to get public URL (assuming uniform public access on bucket)
function buildPublicUrl(bucketName, objectPath) {
	return `https://storage.googleapis.com/${bucketName}/${objectPath}`;
}

function buildPlaceholder(siteName = 'Site') {
	const first = (siteName[0] || 'S').toUpperCase();
	const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='630'>\n  <defs>\n    <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>\n      <stop offset='0%' stop-color='#6366f1'/>\n      <stop offset='100%' stop-color='#9333ea'/>\n    </linearGradient>\n  </defs>\n  <rect width='1200' height='630' fill='url(#g)'/>\n  <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Inter,Arial,sans-serif' font-size='180' fill='rgba(255,255,255,0.15)'>${first}</text>\n  <text x='50%' y='60%' dominant-baseline='middle' text-anchor='middle' font-family='Inter,Arial,sans-serif' font-size='48' fill='#fff'>${siteName}</text>\n  <text x='50%' y='72%' dominant-baseline='middle' text-anchor='middle' font-family='Inter,Arial,sans-serif' font-size='28' fill='rgba(255,255,255,0.8)'>Thumbnail generating...</text>\n</svg>`;
	return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

async function launchBrowser() {
	try {
		const executablePath = await chromium.executablePath();
		if (!executablePath) throw new Error('Chromium executablePath empty');
		return await puppeteer.launch({
			args: chromium.args,
			defaultViewport: { width: 1200, height: 630 },
			executablePath,
			headless: chromium.headless,
			ignoreHTTPSErrors: true,
		});
	} catch (err) {
		// Fallback for local dev on Windows where @sparticuz/chromium isn't needed
		if (process.platform === 'win32') {
			const candidatePaths = [
				process.env.CHROME_PATH,
				process.env.CHROMIUM_PATH,
				'C:/Program Files/Google/Chrome/Application/chrome.exe',
				'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
			].filter(Boolean);
			for (const p of candidatePaths) {
				try {
					return await puppeteer.launch({
						args: ['--no-sandbox','--disable-setuid-sandbox'],
						defaultViewport: { width: 1200, height: 630 },
						executablePath: p,
						headless: 'new'
					});
				} catch {}
			}
		}
		throw err;
	}
}

async function waitForContent(page, { waitSelectors = [], minStableMs = 800, timeout = 10000, extraDelayMs = 0 }) {
	const start = Date.now();
	const selectors = [
		'[data-cy="editor-root"]',
		'[data-editor="true"]',
		'.craftjs-renderer',
		'[data-cy="craft-canvas"]',
		'main',
		'#__next',
		...waitSelectors.filter(Boolean)
	];
	// Wait for at least one selector to appear (best effort)
	let appeared = false;
	for (const sel of selectors) {
		try {
			// race only first success
			// eslint-disable-next-line no-await-in-loop
			const el = await page.waitForSelector(sel, { timeout: 1500, visible: true }).catch(() => null);
			if (el) { appeared = true; break; }
		} catch {}
	}
	// Stability check: observe DOM size changes
	let lastHtmlLength = 0;
	let stableFor = 0;
	while (Date.now() - start < timeout) {
		const htmlLength = await page.evaluate(() => document.body?.innerHTML.length || 0).catch(() => 0);
		if (htmlLength === lastHtmlLength && htmlLength > 0) {
			stableFor += 150;
			if (stableFor >= minStableMs) break;
		} else {
			stableFor = 0;
			lastHtmlLength = htmlLength;
		}
		// eslint-disable-next-line no-await-in-loop
		await new Promise(r => setTimeout(r, 150));
	}
	if (extraDelayMs) await new Promise(r => setTimeout(r, extraDelayMs));
	return { appeared, stableTime: stableFor };
}

async function generateScreenshot(targetUrl, { width, height, waitSelectors, extraDelayMs }) {
	const browser = await launchBrowser();
	try {
		const page = await browser.newPage();
		await page.setViewport({ width, height, deviceScaleFactor: 1 });

		// Navigation with dual strategy
		try {
			await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
		} catch (e) {
			await page.goto(targetUrl, { waitUntil: 'load', timeout: 45000 }).catch(() => {});
		}

		await page.waitForSelector('body', { timeout: 8000 }).catch(() => {});
		// Wait for content & stability
		await waitForContent(page, { waitSelectors, extraDelayMs });

		const base64 = await page.screenshot({ type: 'png', encoding: 'base64' });
		return `data:image/png;base64,${base64}`;
	} finally {
		await browser.close().catch(() => {});
	}
}

// Probe server-side to determine whether base path (/u/:user/:site) or the specific page path
// should be used for capture. This helps avoid capturing preview-restricted pages.
async function probePublicCaptureUrl(baseUrl, pageUrl, { timeoutMs = 4000 } = {}) {
	// Try baseUrl first, then pageUrl. Treat 200 responses containing phrases like
	// "preview restricted" or "must be signed in" as not-public.
	const phrases = ['preview restricted', 'must be signed in', 'sign in to preview', 'preview is restricted'];

	const check = async (url) => {
		const controller = new AbortController();
		const id = setTimeout(() => controller.abort(), timeoutMs);
		try {
			const res = await fetch(url, { method: 'GET', headers: { 'user-agent': 'Mozilla/5.0' }, signal: controller.signal, cache: 'no-store' });
			clearTimeout(id);
			if (!res.ok) return false;
			const text = await res.text().catch(() => '');
			const lower = String(text || '').toLowerCase();
			for (const p of phrases) if (lower.includes(p)) return false;
			return true;
		} catch (e) {
			// treat fetch failures/timeouts as not-ok
			return false;
		} finally {
			clearTimeout(id);
		}
	};

	if (await check(baseUrl)) return baseUrl;
	if (await check(pageUrl)) return pageUrl;
	return pageUrl; // fallback
}

async function singleFlight(key, fn) {
	const existing = generationLocks.get(key);
	if (existing) return existing.promise;
	const p = fn().finally(() => {
		generationLocks.delete(key);
	});
	generationLocks.set(key, { promise: p, ts: Date.now() });
	return p;
}

export async function POST(request) {
	const started = Date.now();
	try {
		metrics.requests++;
	const body = await request.json().catch(() => ({}));
		const { siteId, userId, username, siteName, width = 1200, height = 630, delayMs, waitSelector, pageKey, slug } = body || {};
	const { searchParams } = new URL(request.url);
	const noCache = searchParams.get('nocache') === '1';
	const ttlMinutesParam = searchParams.get('ttlMinutes');
	const freshHoursParam = searchParams.get('freshHours');
	const ttlMinutes = ttlMinutesParam ? Math.max(1, Math.min(60 * 24, Number(ttlMinutesParam))) : null; // clamp 1 minute - 24h
	if (ttlMinutes) {
		MEMORY_TTL_MS = Math.min(MEMORY_TTL_MS, ttlMinutes * 60 * 1000); // don't extend beyond base, only shrink
	}
	const freshHours = freshHoursParam ? Math.max(1/60, Math.min(24 * 7, Number(freshHoursParam))) : DEFAULT_FRESH_HOURS; // allow down to 1 minute, up to 7 days

		if (!username || !siteName) {
			return NextResponse.json({ success: false, error: 'Missing required fields: username and siteName' }, { status: 400 });
		}

		// Build target URL robustly
		const headerOrigin = request.headers.get('origin');
		const host = request.headers.get('host');
		const proto = request.headers.get('x-forwarded-proto') || 'http';
		const resolvedOrigin = process.env.PLATFORM_DOMAIN || headerOrigin || (host ? `${proto}://${host}` : 'http://localhost:3000');
		const safeUsername = encodeURIComponent(username);
		const safeSite = encodeURIComponent(siteName);
		// Decide pagePath (prefer explicit pageKey or slug; fallback to 'home')
		let pagePath = pageKey || slug || 'home';
		const baseUrl = `${resolvedOrigin}/u/${safeUsername}/${safeSite}`;
		const pageUrl = `${baseUrl}/${pagePath}`;
		// Probe server-side to prefer a publicly available URL (avoid capturing preview-restricted pages)
		const chosen = await probePublicCaptureUrl(baseUrl, pageUrl).catch(() => pageUrl);
		const targetUrl = chosen;
		const cacheKey = `${targetUrl}|${width}|${height}`;

			// 1. Memory cache (fast path)
			if (!noCache) {
				const cached = memoryCache.get(cacheKey);
				if (cached && (Date.now() - cached.createdAt) < MEMORY_TTL_MS) {
					metrics.memoryHits++;
					return NextResponse.json({ success: true, thumbnail: cached.dataUrl, url: targetUrl, cached: true, layer: 'memory' }, { headers: { 'X-Thumbnail-Cache': 'memory' } });
				}
			}

			// 2. Firestore stored thumbnail (persistent cache) with site updatedAt comparison
			if (adminDb && siteId && userId && !noCache) {
				try {
					const siteRef = adminDb.collection('users').doc(userId).collection('sites').doc(siteId);
					const snap = await siteRef.get();
					if (snap.exists) {
						const d = snap.data();
						const siteUpdatedAt = d?.updatedAt?.toMillis ? d.updatedAt.toMillis() : (d?.updatedAt?._seconds ? d.updatedAt._seconds * 1000 : 0);
						if (d?.thumbnailUrl && d?.thumbnailUpdatedAt) {
							const thumbUpdatedAt = d.thumbnailUpdatedAt.toMillis ? d.thumbnailUpdatedAt.toMillis() : (d.thumbnailUpdatedAt?._seconds ? d.thumbnailUpdatedAt._seconds * 1000 : 0);
							const maxAge = freshHours * 60 * 60 * 1000; // configurable freshness window
							const stale = (Date.now() - thumbUpdatedAt) > maxAge || (siteUpdatedAt && siteUpdatedAt > thumbUpdatedAt);
							if (!stale) {
								// ETag support: if client sent If-None-Match, compare
								const etag = `W/"${thumbUpdatedAt}-${Buffer.from(d.thumbnailUrl).length}"`;
								const ifNoneMatch = request.headers.get('if-none-match');
								if (ifNoneMatch && ifNoneMatch === etag) {
									return new NextResponse(null, { status: 304, headers: { 'ETag': etag } });
								}
								metrics.firestoreHits++;
								return NextResponse.json({ success: true, thumbnail: d.thumbnailUrl, url: targetUrl, cached: true, layer: 'firestore' }, { headers: { 'ETag': etag, 'X-Thumbnail-Cache': 'firestore' } });
							}
						}
					}
				} catch (e) {
					if (!PROD) console.warn('firestore cache check error', e?.message);
				}
			}

		// Placeholder early response if a generation is already in-flight (optional early return strategy)
		if (generationLocks.has(cacheKey)) {
			const placeholder = buildPlaceholder(siteName);
			metrics.placeholders++;
			return NextResponse.json({ success: true, thumbnail: placeholder, url: targetUrl, pending: true, placeholder: true }, { headers: { 'X-Thumbnail-Cache': 'pending' } });
		}

		// Execute single-flight generation with retry logic
		const dataUrl = await singleFlight(cacheKey, async () => {
			let attempt = 0;
			let lastErr;
			while (attempt < 2) { // up to 2 attempts
				try {
					return await generateScreenshot(targetUrl, { width: Number(width) || 1200, height: Number(height) || 630, waitSelectors: waitSelector ? [waitSelector] : [], extraDelayMs: Number(delayMs) || 0 });
				} catch (e) {
					lastErr = e;
					// Detect chromium not found scenario to break (no point retrying if binary absent)
					if (String(e?.message || '').toLowerCase().includes('could not find chrome')) {
						break;
					}
					await new Promise(r => setTimeout(r, 400 + attempt * 600));
				}
				attempt++;
			}
			throw lastErr || new Error('Unknown thumbnail generation failure');
		}).catch(err => { throw err; });

			memoryCache.set(cacheKey, { dataUrl, createdAt: Date.now() });
			metrics.generated++;

			// Persist to storage + Firestore (best-effort)
			if (adminStorage && adminDb && siteId && userId) {
				(async () => {
					try {
						// Convert data URL to buffer
						const base64 = dataUrl.split(',')[1];
						const buffer = Buffer.from(base64, 'base64');
						const bucket = adminStorage.bucket();
						const objectPath = `thumbnails/${userId}/${siteId}.png`;
						const file = bucket.file(objectPath);
						await file.save(buffer, { contentType: 'image/png', resumable: false, metadata: { cacheControl: 'public,max-age=86400' } }).catch(() => {});
						let finalUrl;
						try {
							if (PUBLIC_BUCKET) {
								finalUrl = buildPublicUrl(bucket.name, objectPath);
							} else {
								const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 1000 * 60 * 60 * 24 * 7 });
								finalUrl = signedUrl;
							}
						} catch (_u) {
							// fallback to signed URL if public path fails
							const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 1000 * 60 * 60 * 24 * 7 });
							finalUrl = signedUrl;
						}
						const siteRef = adminDb.collection('users').doc(userId).collection('sites').doc(siteId);
						await siteRef.set({ thumbnailUrl: finalUrl, thumbnailUpdatedAt: new Date() }, { merge: true });
					} catch (e) {
						if (!PROD) console.error('thumbnail persistence error:', e?.message);
					}
				})();
			}

			return NextResponse.json({ success: true, thumbnail: dataUrl, url: targetUrl, durationMs: Date.now() - started, regenerated: true }, { headers: { 'X-Thumbnail-Cache': 'generated' } });
	} catch (error) {
		const msg = error?.message || 'Failed to generate thumbnail';
		const transient = /timeout|navigation|net::|ecconn|socket|chrom(e|ium)/i.test(msg);
		// Provide graceful placeholder instead of hard 500 for transient issues
		const status = transient ? 200 : 500;
		const placeholder = buildPlaceholder(siteName);
			if (!PROD) console.error('thumbnail route error:', msg);
		metrics.errors++;
		return NextResponse.json({ success: false, error: msg, thumbnail: placeholder, placeholder: true }, { status, headers: { 'X-Thumbnail-Cache': 'error' } });
	}
}

	// Lightweight HEAD endpoint: use query params (username, siteName, siteId, userId) to check cache; returns ETag if present.
	export async function HEAD(request) {
		metrics.requests++;
		const { searchParams } = new URL(request.url);
		const username = searchParams.get('username');
		const siteName = searchParams.get('siteName');
		const siteId = searchParams.get('siteId');
		const userId = searchParams.get('userId');
		const width = Number(searchParams.get('width') || 1200);
		const height = Number(searchParams.get('height') || 630);
		if (!username || !siteName) return new NextResponse(null, { status: 400 });
		const host = request.headers.get('host');
		const proto = request.headers.get('x-forwarded-proto') || 'http';
		const resolvedOrigin = process.env.PLATFORM_DOMAIN || (host ? `${proto}://${host}` : 'http://localhost:3000');
		// Always treat main/public page as '/home' unless a specific pageKey or slug is provided
		const pagePath = searchParams.get('pageKey') || searchParams.get('slug') || 'home';
		const targetUrl = `${resolvedOrigin}/u/${4766(username)}/${encodeURIComponent(siteName)}/${encodeURIComponent(pagePath)}`;
		const cacheKey = `${targetUrl}|${width}|${height}`;

		// Memory cache check
		const mem = memoryCache.get(cacheKey);
		if (mem && (Date.now() - mem.createdAt) < MEMORY_TTL_MS) {
			metrics.memoryHits++;
			const etag = `W/"${mem.createdAt}-${Buffer.from(mem.dataUrl).length}"`;
			return new NextResponse(null, { status: 200, headers: { 'ETag': etag, 'X-Thumbnail-Cache': 'memory' } });
		}

		// Firestore check
		if (adminDb && siteId && userId) {
			try {
				const siteRef = adminDb.collection('users').doc(userId).collection('sites').doc(siteId);
				const snap = await siteRef.get();
				if (snap.exists) {
					const d = snap.data();
					if (d?.thumbnailUrl && d?.thumbnailUpdatedAt) {
						const thumbUpdatedAt = d.thumbnailUpdatedAt.toMillis ? d.thumbnailUpdatedAt.toMillis() : (d.thumbnailUpdatedAt?._seconds ? d.thumbnailUpdatedAt._seconds * 1000 : 0);
						const etag = `W/"${thumbUpdatedAt}-${Buffer.from(d.thumbnailUrl).length}"`;
						metrics.firestoreHits++;
						return new NextResponse(null, { status: 200, headers: { 'ETag': etag, 'X-Thumbnail-Cache': 'firestore' } });
					}
				}
			} catch (e) {
				if (!PROD) console.warn('HEAD firestore check error', e?.message);
			}
		}
		return new NextResponse(null, { status: 404, headers: { 'X-Thumbnail-Cache': 'miss' } });
	}

export function GET() { return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 }); }
export function PUT() { return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 }); }
export function DELETE() { return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 }); }

