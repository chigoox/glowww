import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const domain = (searchParams.get('domain') || '').toLowerCase();
    if (!domain) return NextResponse.json({ ok: false, error: 'Missing domain' }, { status: 400 });
    const snap = await getDoc(doc(db, 'domains', domain));
    if (!snap.exists()) return NextResponse.json({ ok: true, mapping: null });
    const data = snap.data();
    return NextResponse.json({ ok: true, mapping: { username: data.username, site: data.site } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
