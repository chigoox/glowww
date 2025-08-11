// POST: verify domain ownership and attach to Vercel
import { NextResponse } from 'next/server';
import { getDomain, updateDomainStatus } from '../../../lib/domains';
import { db } from '../../../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const runtime = 'nodejs';

const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

async function checkTxtRecord(domain, expectedValue) {
  // Use public DNS API (e.g. Google) to check TXT record
  try {
    const res = await fetch(`https://dns.google/resolve?name=_glow-verify.${domain}&type=TXT`);
    const data = await res.json();
    const txts = (data?.Answer || []).map(a => a.data.replace(/"/g, ''));
    return txts.includes(expectedValue);
  } catch {
    return false;
  }
}

async function attachToVercel(domain) {
  const url = `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains${VERCEL_TEAM_ID ? `?teamId=${encodeURIComponent(VERCEL_TEAM_ID)}` : ''}`;
  const body = { name: domain };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return await res.json();
}

export async function POST(req) {
  try {
    const { userId, siteId, domain } = await req.json();
    if (!userId || !siteId || !domain) return NextResponse.json({ ok: false, error: 'Missing params' }, { status: 400 });
    const domainDoc = await getDomain(userId, siteId, domain);
    if (!domainDoc) return NextResponse.json({ ok: false, error: 'Domain not found' }, { status: 404 });
    // Check TXT record
    const verified = await checkTxtRecord(domain, domainDoc.verificationToken);
    if (!verified) {
      await updateDomainStatus(userId, siteId, domain, 'pending', 'TXT record not found or incorrect');
      return NextResponse.json({ ok: false, error: 'TXT record not found or incorrect' });
    }
    // Attach to Vercel
    const vercelRes = await attachToVercel(domain);
    if (vercelRes.error) {
      await updateDomainStatus(userId, siteId, domain, 'error', vercelRes.error.message || 'Vercel error');
      return NextResponse.json({ ok: false, error: vercelRes.error.message || 'Vercel error' });
    }
    await updateDomainStatus(userId, siteId, domain, 'active');

    // Create global mapping for middleware lookups
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const siteDoc = await getDoc(doc(db, 'users', userId, 'sites', siteId));
      const username = userDoc?.data()?.username || userDoc?.data()?.displayName || '';
      const siteData = siteDoc?.data() || {};
      const sitePath = (siteData.subdomain || siteData.name || '').toString();
      await setDoc(doc(db, 'domains', domain), {
        domain,
        userId,
        siteId,
        username,
        site: sitePath,
        status: 'active',
        updatedAt: Date.now(),
      });
    } catch {}

    return NextResponse.json({ ok: true, domain, status: 'active' });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
