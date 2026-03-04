import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, demoGuard } from '@/lib/auth/admin-guard';
import { adminClient } from '@/lib/supabase/admin';
import { validateBody, zodErrorResponse, sequenceStepSchema, isValidUUID } from '@/lib/validations/admin';

interface Params { params: Promise<{ id: string }> }

/**
 * GET /api/admin/sequences/[id]/steps — List steps for a sequence
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await requirePermission('sequences.view');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const { data, error } = await adminClient
    .from('email_sequence_steps')
    .select('*')
    .eq('sequence_id', id)
    .order('step_order', { ascending: true });

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });

  return NextResponse.json(data ?? []);
}

/**
 * POST /api/admin/sequences/[id]/steps — Add a step to a sequence
 */
export async function POST(request: NextRequest, { params }: Params) {
  const user = await requirePermission('sequences.edit');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const demo = await demoGuard();
  if (demo) return demo;

  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const { data: body, error: validationError } = await validateBody(request, sequenceStepSchema);
  if (validationError) {
    return NextResponse.json(zodErrorResponse(validationError), { status: 400 });
  }

  const { data, error } = await adminClient
    .from('email_sequence_steps')
    .insert({
      sequence_id: id,
      step_order: body.step_order,
      delay_days: body.delay_days ?? 0,
      delay_hours: body.delay_hours ?? 0,
      subject: body.subject,
      content_html: body.content_html,
      content_telegram: body.content_telegram ?? null,
      send_telegram: body.send_telegram ?? false,
      // Russian translations
      subject_ru: body.subject_ru ?? null,
      content_html_ru: body.content_html_ru ?? null,
      content_telegram_ru: body.content_telegram_ru ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
