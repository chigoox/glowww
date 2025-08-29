import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/email/messages/export?siteId=...&limit=1000&status=...&template=...&to=...&from=ISO&toDate=ISO
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const siteId = url.searchParams.get('siteId');
    const limit = Math.min(Number(url.searchParams.get('limit')) || 1000, 5000);
  const status = url.searchParams.get('status');
  const templateKey = url.searchParams.get('template');
  const toEmail = url.searchParams.get('to');
  const start = url.searchParams.get('from');
  const end = url.searchParams.get('toDate');
    if (!siteId) return NextResponse.json({ ok:false, error:'siteId required' }, { status:400 });
  let q = adminDb.collection('emailMessages').where('siteId','==', siteId).orderBy('createdAt','desc');
  if (status) q = q.where('status','==', status);
  if (templateKey) q = q.where('templateKey','==', templateKey);
  if (toEmail) q = q.where('to','==', toEmail);
  if (start) q = q.where('createdAt','>=', new Date(start));
  if (end) q = q.where('createdAt','<=', new Date(end));
  q = q.limit(limit);
    const snap = await q.get();
    const rows = [];
    snap.forEach(d => {
      const data = d.data();
      rows.push({ id: d.id, to: data.to, subject: data.subject, templateKey: data.templateKey||'', status: data.status, sentAt: data.createdAt?.toDate? data.createdAt.toDate().toISOString(): '' , opens: data.opensCount||0, clicks: data.clicksCount||0 });
    });
    const header = 'id,to,subject,templateKey,status,sentAt,opens,clicks';
    const csv = [header, ...rows.map(r=> [r.id,r.to,quote(r.subject),r.templateKey,r.status,r.sentAt,r.opens,r.clicks].join(','))].join('\n');
    return new Response(csv, { status:200, headers:{ 'Content-Type':'text/csv', 'Content-Disposition':`attachment; filename="emails_${siteId}.csv"` } });
  } catch (e) {
    return NextResponse.json({ ok:false, error:e.message }, { status:500 });
  }
}
function quote(s=''){ const esc = (s||'').replace(/"/g,'""'); return `"${esc}"`; }