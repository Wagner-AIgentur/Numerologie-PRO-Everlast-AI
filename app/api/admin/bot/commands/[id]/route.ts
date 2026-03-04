import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { requirePermission, demoGuard } from '@/lib/auth/admin-guard';
import { invalidateBotConfig } from '@/lib/telegram/bot-config';
import { validateBody, zodErrorResponse, botCommandSchema, isValidUUID } from '@/lib/validations/admin';

// GET: Single command
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requirePermission('bot.manage'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  const { data, error } = await adminClient
    .from('bot_commands')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PATCH: Update command (only editable ones)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requirePermission('bot.manage'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const demo = await demoGuard();
  if (demo) return demo;

  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const { data: body, error: validationError } = await validateBody(request, botCommandSchema.partial());
  if (validationError) {
    return NextResponse.json(zodErrorResponse(validationError), { status: 400 });
  }

  // Only allow updating editable fields
  const updates: Record<string, unknown> = {};
  if (body.response_de !== undefined) updates.response_de = body.response_de;
  if (body.response_ru !== undefined) updates.response_ru = body.response_ru;
  if (body.buttons !== undefined) updates.buttons = body.buttons;
  if (body.is_active !== undefined) updates.is_enabled = body.is_active;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await adminClient
    .from('bot_commands')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  invalidateBotConfig();
  return NextResponse.json(data);
}

// DELETE: Remove command (only custom type)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requirePermission('bot.manage'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const demo = await demoGuard();
  if (demo) return demo;

  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  // Only allow deleting custom commands
  const { data: cmd } = await adminClient
    .from('bot_commands')
    .select('type')
    .eq('id', id)
    .single();

  if (cmd?.type === 'builtin') {
    return NextResponse.json({ error: 'Cannot delete builtin commands' }, { status: 403 });
  }

  const { error } = await adminClient
    .from('bot_commands')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  invalidateBotConfig();
  return NextResponse.json({ success: true });
}
