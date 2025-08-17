// POST: verify domain ownership and attach to Vercel
import { NextResponse } from 'next/server';
// NOTE: This file is nested (app/api/domains/verify/), so we need four levels up to reach /lib
import { getDomain, updateDomainStatus } from '../../../../lib/domains';
import { updateSite } from '../../../../lib/sites';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const runtime = 'nodejs';

const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

async function checkTxtRecord(domain, expectedValue) {
  const host = `_glow-verify.${domain}`;
  const resolvers = [
    { name: 'google', url: `https://dns.google/resolve?name=${host}&type=TXT`, type: 'google' },
    { name: 'cloudflare', url: `https://cloudflare-dns.com/dns-query?name=${host}&type=TXT`, type: 'cloudflare', headers: { Accept: 'application/dns-json' } },
  ];
  let found = false;
  const details = [];
  for (const r of resolvers) {
    try {
      const res = await fetch(r.url, { headers: r.headers });
      const data = await res.json();
      const answers = (data?.Answer || []).map(a => (a.data || '').replace(/"/g, '').trim());
      const match = answers.includes(expectedValue.trim());
      if (match) found = true;
      details.push({ resolver: r.name, answers, match });
      if (found) break; // stop early if any resolver matches
    } catch (e) {
      details.push({ resolver: r.name, error: e.message });
    }
  }
  return { found, details };
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
  const { userId, siteId, domain, attachOnly } = await req.json();
    if (!userId || !siteId || !domain) return NextResponse.json({ ok: false, error: 'Missing params' }, { status: 400 });
    const domainDoc = await getDomain(userId, siteId, domain);
    if (!domainDoc) return NextResponse.json({ ok: false, error: 'Domain not found' }, { status: 404 });
    let details = [];
    if (!attachOnly) {
      const check = await checkTxtRecord(domain, domainDoc.verificationToken);
      details = check.details;
      if (!check.found) {
        const msg = 'TXT record not found yet. DNS may still be propagating.';
        await updateDomainStatus(userId, siteId, domain, 'pending', msg);
        return NextResponse.json({ ok: false, error: msg, resolvers: details });
      }
      if (domainDoc.status !== 'active') {
        await updateDomainStatus(userId, siteId, domain, 'verified');
      }
    } else {
      // attachOnly path: must already be verified or active
      if (!['verified','active'].includes(domainDoc.status)) {
        return NextResponse.json({ ok: false, error: 'Domain not verified yet' }, { status: 400 });
      }
    }

    // Attach to Vercel (if env configured)
    let attached = false;
    let vercelWarning = null;
    if (!VERCEL_PROJECT_ID || !VERCEL_TOKEN) {
      vercelWarning = 'VERCEL_PROJECT_ID / VERCEL_TOKEN missing; add them then re-verify to attach.';
    } else {
      const vercelRes = await attachToVercel(domain);
      if (vercelRes?.error) {
        const code = vercelRes.error.code || vercelRes.error.message || '';
        if (/already/i.test(code)) {
          attached = true; // already attached to this / another project but accessible
        } else {
          await updateDomainStatus(userId, siteId, domain, 'error', vercelRes.error.message || 'Vercel error');
          return NextResponse.json({ ok: false, error: vercelRes.error.message || 'Vercel error', resolvers: details, stage: 'attach' });
        }
      } else {
        attached = true;
      }
    }

    if (attached) {
      await updateDomainStatus(userId, siteId, domain, 'active');
    }

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

    // Update site document with customDomain if absent or different (do this once verified even if not yet attached)
    try { await updateSite(userId, siteId, { customDomain: domain }); } catch {}

  return NextResponse.json({ ok: true, domain, status: attached ? 'active' : 'verified', attached, warning: vercelWarning, resolvers: details });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
