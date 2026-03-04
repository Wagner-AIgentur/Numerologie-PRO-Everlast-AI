import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, demoGuard } from '@/lib/auth/admin-guard';
import { adminClient } from '@/lib/supabase/admin';
import { validateBody, zodErrorResponse, sequenceStepSchema, isValidUUID } from '@/lib/validations/admin';

interface Params { params: Promise<{ id: string; stepId: string }> }

/**
 * PATCH /api/admin/sequences/[id]/steps/[stepId] — Update a step
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await requirePermission('sequences.edit');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const demo = await demoGuard();
  if (demo) return demo;

  const { id, stepId } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  if (!isValidUUID(stepId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const { data: body, error: validationError } = await validateBody(request, sequenceStepSchema.partial());
  if (validationError) {
    return NextResponse.json(zodErrorResponse(validationError), { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.step_order !== undefined) updates.step_order = body.step_order;
  if (body.delay_days !== undefined) updates.delay_days = body.delay_days;
  if (body.delay_hours !== undefined) updates.delay_hours = body.delay_hours;
  if (body.subject !== undefined) updates.subject = body.subject;
  if (body.content_html !== undefined) updates.content_html = body.content_html;
  if (body.content_telegram !== undefined) updates.content_telegram = body.content_telegram;
  if (body.send_telegram !== undefined) updates.send_telegram = body.send_telegram;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  // Russian translations
  if (body.subject_ru !== undefined) updates.subject_ru = body.subject_ru;
  if (body.content_html_ru !== undefined) updates.content_html_ru = body.content_html_ru;
  if (body.content_telegram_ru !== undefined) updates.content_telegram_ru = body.content_telegram_ru;

  const { data, error } = await adminClient
    .from('email_sequence_steps')
    .update(updates)
    .eq('id', stepId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });

  return NextResponse.json(data);
}

/**
 * DELETE /api/admin/sequences/[id]/steps/[stepId] — Delete a step
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await requirePermission('sequences.edit');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const demo = await demoGuard();
  if (demo) return demo;

  const { id, stepId } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  if (!isValidUUID(stepId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const { error } = await adminClient
    .from('email_sequence_steps')
    .delete()
    .eq('id', stepId);

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });

  return NextResponse.json({ success: true });
}
