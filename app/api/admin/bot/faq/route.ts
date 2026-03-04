import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { requirePermission, demoGuard } from '@/lib/auth/admin-guard';
import { invalidateBotConfig } from '@/lib/telegram/bot-config';
import { validateBody, zodErrorResponse, botFaqSchema } from '@/lib/validations/admin';

// GET: List all FAQ rules (sorted by priority desc)
export async function GET() {
  if (!(await requirePermission('bot.manage'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await adminClient
    .from('bot_faq_rules')
    .select('*')
    .order('priority', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST: Create a new FAQ rule
export async function POST(request: NextRequest) {
  if (!(await requirePermission('bot.manage'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const demo = await demoGuard();
  if (demo) return demo;

  const { data: body, error: validationError } = await validateBody(request, botFaqSchema);
  if (validationError) {
    return NextResponse.json(zodErrorResponse(validationError), { status: 400 });
  }

  const { keywords, response_de, response_ru, priority } = body;

  const { data, error } = await adminClient
    .from('bot_faq_rules')
    .insert({
      keywords: keywords.map((k: string) => k.toLowerCase().trim()),
      response_de,
      response_ru: response_ru ?? '',
      priority: priority ?? 0,
      is_enabled: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  invalidateBotConfig();
  return NextResponse.json(data, { status: 201 });
}
