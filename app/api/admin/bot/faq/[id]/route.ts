import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { requirePermission, demoGuard } from '@/lib/auth/admin-guard';
import { invalidateBotConfig } from '@/lib/telegram/bot-config';
import { validateBody, zodErrorResponse, botFaqSchema, isValidUUID } from '@/lib/validations/admin';

// PATCH: Update FAQ rule
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

  const { data: body, error: validationError } = await validateBody(request, botFaqSchema.partial());
  if (validationError) {
    return NextResponse.json(zodErrorResponse(validationError), { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.keywords !== undefined) {
    updates.keywords = body.keywords.map((k: string) => k.toLowerCase().trim());
  }
  if (body.response_de !== undefined) updates.response_de = body.response_de;
  if (body.response_ru !== undefined) updates.response_ru = body.response_ru;
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.is_active !== undefined) updates.is_enabled = body.is_active;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await adminClient
    .from('bot_faq_rules')
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

// DELETE: Remove FAQ rule
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
  const { error } = await adminClient
    .from('bot_faq_rules')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  invalidateBotConfig();
  return NextResponse.json({ success: true });
}
