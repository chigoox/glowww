import { NextResponse } from 'next/server';
import { getTemplateDefinition, assertTemplateData } from '@/lib/email/registry';
import { resolveBranding } from '@/lib/email/branding';
import { renderEmail } from '@/lib/email/render';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST { templateKey, data, siteId }
export async function POST(req) {
  try {
    const { templateKey, data = {}, siteId } = await req.json();
    if (!templateKey) return NextResponse.json({ ok:false, error:'templateKey required' }, { status:400 });
    const def = getTemplateDefinition(templateKey);
    if (!def) return NextResponse.json({ ok:false, error:'Unknown template' }, { status:404 });
    try { assertTemplateData(def, data); } catch (e) { return NextResponse.json({ ok:false, error:e.message }, { status:400 }); }
    const branding = await resolveBranding({ siteId });
    const { html, text } = await renderEmail(def.component, { branding, data, to:'preview@example.com' });
    const subject = def.subject(data, branding);
    return NextResponse.json({ ok:true, html, text, subject });
  } catch (e) {
    return NextResponse.json({ ok:false, error:e.message }, { status:500 });
  }
}