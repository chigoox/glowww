import { NextResponse } from 'next/server';
import { listTemplates } from '@/lib/email/registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/email/templates -> list of available templates (key, audience, category, description)
export async function GET() {
  try {
    const list = listTemplates();
    return NextResponse.json({ ok: true, templates: list });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
