import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collectionGroup, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export const runtime = 'nodejs';

const RESERVED = new Set(['www','api','admin','mail','ftp','dev','localhost','app']);

function normalizeLabel(raw) {
  if (!raw) return '';
  return raw.toString().trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = (searchParams.get('subdomain') || '').toString();
    const normalized = normalizeLabel(raw);
    if (!normalized) return NextResponse.json({ ok: false, error: 'Missing subdomain' }, { status: 400 });
    if (normalized.length < 1 || normalized.length > 63) return NextResponse.json({ ok: false, error: 'Invalid length' }, { status: 400 });
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(normalized)) return NextResponse.json({ ok: false, error: 'Invalid format' }, { status: 400 });
    if (RESERVED.has(normalized)) return NextResponse.json({ ok: true, available: false, reason: 'reserved' });

    // Check top-level domains mapping (e.g. custom domains)
    try {
      const domainKey = `${normalized}.gloweditor.com`;
      const dSnap = await getDoc(doc(db, 'domains', domainKey));
      if (dSnap.exists()) {
        return NextResponse.json({ ok: true, available: false, reason: 'taken' });
      }
    } catch (e) {
      // ignore and continue
    }

    // Check sites collectionGroup for any site using this subdomain
    const q = query(collectionGroup(db, 'sites'), where('subdomain', '==', normalized));
    const snap = await getDocs(q);
    if (!snap.empty) return NextResponse.json({ ok: true, available: false, reason: 'taken' });

    return NextResponse.json({ ok: true, available: true });
  } catch (e) {
    // Log to server console to capture stack and aid debugging
    try { console.error('[subdomain-available] error:', e); } catch {}
    // Return a structured non-500 response so callers can handle availability
    // errors (e.g., permission / network) without crashing the UI.
    const msg = e?.message || String(e);
    return NextResponse.json({ ok: false, error: msg, available: null });
  }
}
