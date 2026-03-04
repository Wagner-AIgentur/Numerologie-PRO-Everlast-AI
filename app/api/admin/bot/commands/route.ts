import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { requirePermission, demoGuard } from '@/lib/auth/admin-guard';
import { invalidateBotConfig } from '@/lib/telegram/bot-config';
import { validateBody, zodErrorResponse, botCommandSchema } from '@/lib/validations/admin';

// GET: List all bot commands
export async function GET() {
  if (!(await requirePermission('bot.manage'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await adminClient
    .from('bot_commands')
    .select('*')
    .order('command');

  if (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST: Create a new custom command
export async function POST(request: NextRequest) {
  if (!(await requirePermission('bot.manage'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const demo = await demoGuard();
  if (demo) return demo;

  const { data: body, error: validationError } = await validateBody(request, botCommandSchema);
  if (validationError) {
    return NextResponse.json(zodErrorResponse(validationError), { status: 400 });
  }

  const { command, response_de, response_ru, buttons } = body;

  // Normalize command (strip leading /, lowercase)
  const normalizedCmd = command.replace(/^\//, '').toLowerCase().trim();

  const { data, error } = await adminClient
    .from('bot_commands')
    .insert({
      command: normalizedCmd,
      type: 'custom',
      response_de,
      response_ru: response_ru ?? '',
      buttons: buttons ?? [],
      is_enabled: true,
      is_editable: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  invalidateBotConfig();
  return NextResponse.json(data, { status: 201 });
}
