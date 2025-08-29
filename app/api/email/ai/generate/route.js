import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST { prompt, kind: 'subject'|'body' }
export async function POST(req) {
  try {
    const { prompt, kind = 'subject' } = await req.json();
    if (!prompt) return NextResponse.json({ ok:false, error:'Missing prompt' }, { status:400 });
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ ok:false, error:'AI not configured' }, { status:500 });
    // Lazy import to keep cold start lower
    const { OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey });
    const system = kind === 'subject'
      ? 'You write concise high-converting email subjects (max 12 words, no spammy ALL CAPS). Return only the subject line.'
      : 'You write clear, friendly marketing/transactional email bodies in simple HTML paragraphs (<p>). Keep it under 180 words. Return only HTML markup, no backticks.';
    const res = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ],
      temperature: kind === 'subject' ? 0.7 : 0.8,
      max_tokens: kind === 'subject' ? 40 : 600
    });
    const text = res.choices?.[0]?.message?.content?.trim();
    if (!text) return NextResponse.json({ ok:false, error:'Empty response' }, { status:500 });
    return NextResponse.json({ ok:true, text });
  } catch (e) {
    console.error('AI generate error', e);
    return NextResponse.json({ ok:false, error: e.message || 'AI error' }, { status:500 });
  }
}
