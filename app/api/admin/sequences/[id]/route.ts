import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, demoGuard } from '@/lib/auth/admin-guard';
import { adminClient } from '@/lib/supabase/admin';
import { validateBody, zodErrorResponse, sequenceUpdateSchema, isValidUUID } from '@/lib/validations/admin';

interface Params { params: Promise<{ id: string }> }

/**
 * GET /api/admin/sequences/[id] — Get sequence with steps and enrollments
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await requirePermission('sequences.view');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const { data: sequence, error } = await adminClient
    .from('email_sequences')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !sequence) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Fetch steps
  const { data: steps } = await adminClient
    .from('email_sequence_steps')
    .select('*')
    .eq('sequence_id', id)
    .order('step_order', { ascending: true });

  // Fetch enrollment stats
  const { data: enrollments } = await adminClient
    .from('email_sequence_enrollments')
    .select('id, status')
    .eq('sequence_id', id);

  const allEnrollments = enrollments ?? [];

  return NextResponse.json({
    ...sequence,
    steps: steps ?? [],
    stats: {
      total: allEnrollments.length,
      active: allEnrollments.filter((e) => e.status === 'active').length,
      completed: allEnrollments.filter((e) => e.status === 'completed').length,
      paused: allEnrollments.filter((e) => e.status === 'paused').length,
      unsubscribed: allEnrollments.filter((e) => e.status === 'unsubscribed').length,
    },
  });
}

/**
 * PATCH /api/admin/sequences/[id] — Update sequence
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await requirePermission('sequences.edit');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const demo = await demoGuard();
  if (demo) return demo;

  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const { data: body, error: validationError } = await validateBody(request, sequenceUpdateSchema);
  if (validationError) {
    return NextResponse.json(zodErrorResponse(validationError), { status: 400 });
  }

  const allowed = ['name', 'description', 'trigger_type', 'is_active'];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) updates[key] = body[key as keyof typeof body];
  }

  const { data, error } = await adminClient
    .from('email_sequences')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });

  return NextResponse.json(data);
}

/**
 * DELETE /api/admin/sequences/[id] — Delete sequence (cascades steps + enrollments)
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await requirePermission('sequences.edit');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const demo = await demoGuard();
  if (demo) return demo;

  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const { error } = await adminClient
    .from('email_sequences')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });

  return NextResponse.json({ success: true });
}
