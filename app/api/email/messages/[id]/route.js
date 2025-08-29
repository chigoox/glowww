import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getTemplateDefinition } from '@/lib/email/registry';
import { resolveBranding } from '@/lib/email/branding';
import { renderEmail } from '@/lib/email/render';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  try {
    const { id } = params || {};
    if (!id) return NextResponse.json({ ok:false, error:'id required' }, { status:400 });
    const snap = await adminDb.collection('emailMessages').doc(id).get();
    if (!snap.exists) return NextResponse.json({ ok:false, error:'not found' }, { status:404 });
    const data = snap.data();
    let rendered = null;
    if (data.templateKey) {
      try {
        const def = getTemplateDefinition(data.templateKey);
        if (def) {
          const branding = await resolveBranding({ siteId: data.siteId || null });
          const { html, text } = await renderEmail(def.component, { branding, data: data.data || {}, to: data.to });
          rendered = { html, text };
        }
      } catch (e) {
        rendered = { error: e.message };
      }
    }
    return NextResponse.json({ ok:true, message: { id: snap.id, ...data }, rendered });
  } catch (e) {
    console.error('message detail error', e);
    return NextResponse.json({ ok:false, error:e.message }, { status:500 });
  }
}