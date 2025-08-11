// DELETE: remove domain from Firestore and Vercel
import { NextResponse } from 'next/server';
import { removeDomain, getDomain } from '../../../lib/domains';
import { db } from '../../../../lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';

export const runtime = 'nodejs';

const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

async function removeFromVercel(domain) {
  const url = `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains/${domain}${VERCEL_TEAM_ID ? `?teamId=${encodeURIComponent(VERCEL_TEAM_ID)}` : ''}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
  body: undefined,
  });
  return await res.json();
}

export async function DELETE(req, { params }) {
  try {
    const { userId, siteId } = await req.json();
    const { domain } = params;
    if (!userId || !siteId || !domain) return NextResponse.json({ ok: false, error: 'Missing params' }, { status: 400 });
    const domainDoc = await getDomain(userId, siteId, domain);
    if (!domainDoc) return NextResponse.json({ ok: false, error: 'Domain not found' }, { status: 404 });
    await removeFromVercel(domain);
    await removeDomain(userId, siteId, domain);
  try { await deleteDoc(doc(db, 'domains', domain)); } catch {}
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
