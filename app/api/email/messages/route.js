import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/email/messages?siteId=...&template=...&status=...&to=...&from=ISO&toDate=ISO&cursor=...&limit=20
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const siteId = url.searchParams.get('siteId');
    const templateKey = url.searchParams.get('template');
    const status = url.searchParams.get('status');
    const toEmail = url.searchParams.get('to');
    const start = url.searchParams.get('from');
    const end = url.searchParams.get('toDate');
    const cursor = url.searchParams.get('cursor');
    const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 100);

  const db = adminDb;
  if (!db) return NextResponse.json({ ok:false, error:'Firestore not initialized' }, { status:500 });
  let q = db.collection('emailMessages').orderBy('createdAt', 'desc');

    if (siteId) q = q.where('siteId', '==', siteId);
    if (templateKey) q = q.where('templateKey', '==', templateKey);
    if (status) q = q.where('status', '==', status);
    if (toEmail) q = q.where('to', '==', toEmail);

    if (start || end) {
      // Firestore requires range filters on same field; use createdAt
      if (start) q = q.where('createdAt', '>=', new Date(start));
      if (end) q = q.where('createdAt', '<=', new Date(end));
    }

    if (cursor) {
  const cursorDoc = await db.collection('emailMessages').doc(cursor).get();
      if (cursorDoc.exists) {
        q = q.startAfter(cursorDoc);
      }
    }

    q = q.limit(limit + 1);
    const snap = await q.get();
    const docs = [];
    snap.forEach(d => {
      const data = d.data();
      docs.push({ id: d.id, ...data });
    });
    let nextCursor = null;
    if (docs.length > limit) {
      const last = docs.pop();
      nextCursor = last.id; // last removed element id
    }

    return NextResponse.json({ ok: true, messages: docs, nextCursor });
  } catch (e) {
    console.error('messages list error', e);
    return NextResponse.json({ ok:false, error: e.message }, { status: 500 });
  }
}
