import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { requirePermission, demoGuard } from '@/lib/auth/admin-guard';
import { invalidateBotConfig } from '@/lib/telegram/bot-config';
import { validateBody, zodErrorResponse, botSettingsSchema } from '@/lib/validations/admin';

// GET: All bot settings
export async function GET() {
  if (!(await requirePermission('bot.manage'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await adminClient
    .from('bot_settings')
    .select('*')
    .order('key');

  if (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // Return as key-value object for easier consumption
  const settings: Record<string, unknown> = {};
  for (const row of data ?? []) {
    settings[row.key] = row.value;
  }

  return NextResponse.json(settings);
}

// PATCH: Update one or more settings (key-value pairs)
export async function PATCH(request: NextRequest) {
  if (!(await requirePermission('bot.manage'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const demo = await demoGuard();
  if (demo) return demo;

  const { data: body, error: validationError } = await validateBody(request, botSettingsSchema);
  if (validationError) {
    return NextResponse.json(zodErrorResponse(validationError), { status: 400 });
  }

  // body = { key1: value1, key2: value2, ... }
  const entries = Object.entries(body).filter(([, v]) => v !== undefined);
  if (entries.length === 0) {
    return NextResponse.json({ error: 'No settings provided' }, { status: 400 });
  }

  for (const [key, value] of entries) {
    await adminClient
      .from('bot_settings')
      .upsert(
        { key, value: value as string, updated_at: new Date().toISOString() },
        { onConflict: 'key' },
      );
  }

  invalidateBotConfig();
  return NextResponse.json({ success: true });
}
